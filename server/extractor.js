import https from 'https';

/**
 * Extract links from buffer (PDF /URI annotations) and plain text
 */
export function extractLinks(buffer, text = '', html = '') {
  const links = {
    linkedin: '',
    github: '',
    portfolio: ''
  };

  const foundUrls = new Set();

  // 1. Scan PDF binary buffer for /URI (http...)
  if (buffer && Buffer.isBuffer(buffer)) {
    const raw = buffer.toString('binary');
    const uriRegex = /\/URI\s*\(([^)]+)\)/g;
    let match;
    while ((match = uriRegex.exec(raw)) !== null) {
      const url = match[1].trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        foundUrls.add(url);
      }
    }
  }

  // 2. Scan DOCX HTML for <a href="...">
  if (html) {
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const url = match[1].trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        foundUrls.add(url);
      }
    }
  }

  // 3. Scan plain text for URLs
  if (text) {
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:[a-zA-Z0-9-]+\.)*(?:linkedin\.com\/in\/[a-zA-Z0-9_\-\/]+|github\.com\/[a-zA-Z0-9_\-\/]+|[a-zA-Z0-9_\-]+\.(?:dev|io|me|tech|com)\/[a-zA-Z0-9_\-\/]*)/gi;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      let u = match[0].trim();
      if (!u.startsWith('http')) u = `https://${u}`;
      foundUrls.add(u);
    }
  }

  // Classify URLs
  for (const url of foundUrls) {
    if (/linkedin\.com\/in\//i.test(url) && !links.linkedin) {
      links.linkedin = url.replace(/\/+$/, '');
    } else if (/github\.com\//i.test(url) && !links.github) {
      links.github = url.replace(/\/+$/, '');
    } else if (!links.portfolio && !/adobe\.com|w3\.org|schema\.org|microsoft\.com|apple\.com/i.test(url)) {
      links.portfolio = url.replace(/\/+$/, '');
    }
  }

  return links;
}

/**
 * Clean and format Name
 */
function cleanName(raw) {
  if (!raw) return '';
  let name = raw.replace(/[|•·,].*$/, '').replace(/\b(resume|cv|curriculum vitae)\b/gi, '').trim();
  // If ALL CAPS, convert to Title Case
  if (name.length > 2 && name === name.toUpperCase()) {
    name = name.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
  }
  return name.trim();
}

/**
 * Deterministic Heuristic Extractor
 */
export function extractProfileWithHeuristics(text = '', links = {}, filename = '') {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Name
  let name = '';
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    // Skip emails, phones, urls, short tokens, or known section headers
    if (/@/.test(line) || /https?:|\bgithub|\blinkedin\b|\.com\b/i.test(line)) continue;
    if (/\+?\d[\d\s\-()]{7,}\d/.test(line)) continue;
    if (/^(resume|curriculum vitae|summary|objective|skills|experience|education)$/i.test(line)) continue;

    // A valid name is usually 2 to 4 words, between 3 and 45 chars
    const words = line.split(/\s+/);
    if (words.length >= 1 && words.length <= 4 && line.length >= 3 && line.length <= 45 && !/[;{}[\]<>]/.test(line)) {
      name = cleanName(line);
      break;
    }
  }

  // Fallback: derive candidate name from filename (e.g., "Dileep_ GenAI Solutions Architect.pdf" -> "Dileep")
  if (!name && filename) {
    const base = filename.replace(/\.(pdf|docx?|txt)$/i, '');
    const candidatePart = base.split(/[_\-–|]/)[0]?.trim();
    if (candidatePart && candidatePart.length >= 2 && candidatePart.length <= 30) {
      name = cleanName(candidatePart);
    }
  }

  // 2. Skills extraction from Skills Section
  let skills = '';
  const skillsHeaderRegex = /^(?:technical\s+skills|skills\s*(?:&|and)?\s*tools|core\s+competencies|key\s+skills|technologies|skills)\b[:\s]*$/i;
  const nextHeaderRegex = /^(?:experience|professional\s+experience|work\s+history|projects|education|certifications|awards|summary)\b[:\s]*$/i;

  let inSkills = false;
  const extractedSkillLines = [];

  for (const line of lines) {
    if (skillsHeaderRegex.test(line)) {
      inSkills = true;
      continue;
    }
    if (inSkills) {
      if (nextHeaderRegex.test(line)) {
        inSkills = false;
        break;
      }
      extractedSkillLines.push(line);
    }
  }

  if (extractedSkillLines.length > 0) {
    const rawSkillsStr = extractedSkillLines.join(' ')
      .replace(/(?:languages|frameworks|libraries|databases|tools|cloud|devops|technologies|web\s+technologies|backend|frontend)\s*[:\-–]/gi, ', ')
      .replace(/[•·*|/]/g, ', ');

    const tokenSet = new Set();
    rawSkillsStr.split(/[,;\n]/)
      .map(s => s.trim())
      .filter(s => s.length >= 2 && s.length <= 35 && !/@|\.com|http/i.test(s))
      .forEach(s => tokenSet.add(s));

    skills = Array.from(tokenSet).slice(0, 15).join(', ');
  }

  // If skills section was not labeled or empty, search known keywords
  if (!skills) {
    const commonKeywords = [
      "Python", "FastAPI", "Django", "Node.js", "Express", "TypeScript", "JavaScript",
      "React", "Next.js", "Go", "Golang", "Rust", "C++", "Java", "Spring Boot",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Docker", "Kubernetes",
      "gRPC", "REST APIs", "GraphQL", "LLMs", "RAG", "Embeddings", "PyTorch", "AWS",
      "Azure", "GCP", "LangChain", "LlamaIndex", "Vector DBs", "Git", "CI/CD"
    ];
    const found = commonKeywords.filter(k => new RegExp(`\\b${k.replace(/[+]/g, '\\+')}\\b`, 'i').test(text));
    if (found.length > 0) {
      skills = found.slice(0, 14).join(', ');
    }
  }

  // 3. Current Role and Organization
  let currentRole = '';
  // Try to find in experience section or top lines
  // Match "Role at Company" or "Role | Company" or "Role, Company"
  const roleOrgPattern = /([A-Za-z\s]+?(?:Engineer|Developer|Architect|Lead|Manager|Specialist|Consultant|Scientist|Programmer))\s*(?:at|@|\||,|–|-)\s*([A-Za-z0-9\s&]+?)(?=\s*(?:\(|\||\d{4}|Present|Current|\n|$))/i;
  
  for (const line of lines) {
    const m = line.match(roleOrgPattern);
    if (m && m[1] && m[2]) {
      const r = m[1].trim();
      const o = m[2].trim();
      if (r.length >= 4 && r.length <= 40 && o.length >= 2 && o.length <= 35 && !/present|year|month/i.test(o)) {
        currentRole = `${r} at ${o}`;
        break;
      }
    }
  }

  // Fallback role if no company found
  if (!currentRole) {
    const titleRegex = /(GenAI\s+Solutions\s+Architect|Solutions\s+Architect|Backend\s+(?:Engineer|Developer)|Software\s+(?:Engineer|Developer)|Full[\s-]Stack\s+(?:Engineer|Developer)|Data\s+Engineer|Machine\s+Learning\s+Engineer|AI\s+Engineer)/i;
    const match = text.match(titleRegex);
    if (match) {
      currentRole = match[0].trim();
    } else if (filename) {
      // Check if filename contains title
      const fileMatch = filename.match(/(GenAI\s+Solutions\s+Architect|Solutions\s+Architect|Backend\s+Engineer|Software\s+Engineer|Full\s*Stack\s+Developer)/i);
      if (fileMatch) currentRole = fileMatch[0].trim();
    }
  }

  // 4. Key Experience & Quantified Wins
  let experience = '';
  const bulletLines = [];
  const expHeaderRegex = /^(?:experience|professional\s+experience|work\s+history|employment\s+history)\b[:\s]*$/i;
  let inExp = false;

  for (const line of lines) {
    if (expHeaderRegex.test(line)) {
      inExp = true;
      continue;
    }
    if (inExp) {
      if (/^(?:education|projects|skills|certifications|awards)\b[:\s]*$/i.test(line)) {
        inExp = false;
        break;
      }
      // Check if line looks like a bullet or achievement with action verbs/metrics
      if (/^[•·*\-–]/.test(line) || /\b(\d+%\b|\d+k\b|reduced|scaled|increased|architected|built|designed|developed|deployed|automated|improved)\b/i.test(line)) {
        const cleanBullet = line.replace(/^[•·*\-–\s]+/, '').trim();
        if (cleanBullet.length > 20 && !/^(company|location|date|duration)/i.test(cleanBullet)) {
          bulletLines.push(`• ${cleanBullet}`);
          if (bulletLines.length >= 4) break;
        }
      }
    }
  }

  if (bulletLines.length > 0) {
    experience = bulletLines.join('\n');
  } else {
    // Scan full text for high-impact metric lines
    const metricLines = lines.filter(l => 
      /\b(\d+%\s*(?:latency|reduction|increase|improvement|growth)|\d+\s*(?:million|billion|k|users|queries|rps))\b/i.test(l) &&
      l.length >= 25 && l.length <= 160
    );
    if (metricLines.length > 0) {
      experience = metricLines.slice(0, 3).map(l => `• ${l.replace(/^[•·*\-–\s]+/, '')}`).join('\n');
    }
  }

  // 5. Link (prefer LinkedIn, then GitHub, then portfolio)
  const link = links.linkedin || links.github || links.portfolio || '';

  return {
    name: name || '',
    currentRole: currentRole || '',
    experience: experience || '',
    skills: skills || '',
    link: link || ''
  };
}

/**
 * Intelligent LLM Resume Extraction with Cascading Fallback
 */
export async function extractCandidateProfile(text = '', buffer = null, filename = '', html = '') {
  // Extract all hyperlinks from buffer, text, and structure
  const links = extractLinks(buffer, text, html);

  // If GROQ is available, use fast LLaMA / GPT-OSS to perform high-precision extraction
  if (process.env.GROQ_API_KEY && text && text.trim().length > 50) {
    try {
      const prompt = `You are a high-precision ATS resume extractor.
Analyze this candidate's resume and extract their profile into structured JSON.

RESUME FILENAME: "${filename}"
DETECTED HYPERLINKS IN DOCUMENT: ${JSON.stringify(links)}

RESUME TEXT:
"""
${text.slice(0, 6000)}
"""

REQUIREMENTS:
1. "name": Extract candidate's full name. Clean capitalization.
2. "currentRole": Candidate's current/recent job title and organization in format: "Role Title at Company" (e.g. "GenAI Solutions Architect at Acme" or "Backend Engineer at RenoCred"). If company is not mentioned, return just the title.
3. "experience": 3 to 4 concise bullet points of their key achievements and quantified metrics from the Experience section. Each bullet must start with "• ".
4. "skills": Comma-separated list of technical skills directly from the Skills/Technical Skills section.
5. "link": Candidate's LinkedIn profile URL (e.g. "https://linkedin.com/in/..."). Prioritize LinkedIn, fallback to GitHub or portfolio if no LinkedIn.

Return ONLY a JSON object:
{
  "name": "...",
  "currentRole": "...",
  "experience": "• ...\\n• ...",
  "skills": "...",
  "link": "..."
}`;

      const postData = JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are an ATS resume parsing engine. Always respond with pure valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const res = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.groq.com',
          path: '/openai/v1/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(8000, () => {
          req.destroy(new Error('Groq extraction timeout'));
        });
        req.write(postData);
        req.end();
      });

      if (res.statusCode === 200) {
        const parsed = JSON.parse(res.data);
        const content = parsed.choices[0]?.message?.content;
        if (content) {
          const json = JSON.parse(content);
          // If experience is array, join with newlines
          let formattedExp = json.experience;
          if (Array.isArray(formattedExp)) {
            formattedExp = formattedExp.map(b => b.startsWith('•') ? b : `• ${b}`).join('\n');
          } else if (typeof formattedExp === 'string') {
            formattedExp = formattedExp.replace(/\\n/g, '\n');
          }

          // Ensure link is populated from links if LLM missed it
          const finalLink = json.link || links.linkedin || links.github || links.portfolio || '';

          return {
            name: json.name || '',
            currentRole: json.currentRole || '',
            experience: formattedExp || '',
            skills: Array.isArray(json.skills) ? json.skills.join(', ') : (json.skills || ''),
            link: finalLink
          };
        }
      }
    } catch (err) {
      console.warn('[Extractor] LLM extraction error, falling back to heuristics:', err.message);
    }
  }

  // Fallback to deterministic heuristic parser
  return extractProfileWithHeuristics(text, links, filename);
}

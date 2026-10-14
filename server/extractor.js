import https from 'https';

/**
 * Extract hyperlinks from PDF parser annotations
 */
export async function extractPdfAnnotations(parser) {
  const links = {
    linkedin: '',
    github: '',
    portfolio: ''
  };

  if (!parser || !parser.doc) return links;

  try {
    const numPages = parser.doc.numPages || 1;
    for (let i = 1; i <= numPages; i++) {
      const page = await parser.doc.getPage(i);
      const annots = await page.getAnnotations();
      if (!Array.isArray(annots)) continue;

      for (const a of annots) {
        const url = (a.url || a.unsafeUrl || '').trim();
        if (!url || !url.startsWith('http')) continue;

        if (/linkedin\.com\/in\//i.test(url) && !links.linkedin) {
          links.linkedin = url.replace(/\/+$/, '');
        } else if (/github\.com\//i.test(url) && !links.github) {
          links.github = url.replace(/\/+$/, '');
        } else if (!links.portfolio && !/adobe\.com|w3\.org|schema\.org|microsoft\.com|apple\.com/i.test(url)) {
          links.portfolio = url.replace(/\/+$/, '');
        }
      }
    }
  } catch (err) {
    console.warn('[PDF Annotations Warning]', err.message);
  }

  return links;
}

/**
 * Extract links from buffer, text, DOCX HTML, and PDF annotations
 */
export async function extractLinks(buffer, text = '', html = '', parser = null) {
  const links = {
    linkedin: '',
    github: '',
    portfolio: ''
  };

  // 1. Check PDF page annotations first (highest accuracy for clickable links in PDFs)
  if (parser) {
    const annotLinks = await extractPdfAnnotations(parser);
    if (annotLinks.linkedin) links.linkedin = annotLinks.linkedin;
    if (annotLinks.github) links.github = annotLinks.github;
    if (annotLinks.portfolio) links.portfolio = annotLinks.portfolio;
  }

  const foundUrls = new Set();

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

  // Classify found URLs if not already populated from PDF annotations
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
 * Clean and format Candidate Name to Title Case
 */
function cleanName(raw) {
  if (!raw) return '';
  let name = raw.replace(/[|•·,].*$/, '').replace(/\b(resume|cv|curriculum vitae)\b/gi, '').trim();
  // If ALL CAPS or mixed case, format to Title Case
  if (name.length > 2 && (name === name.toUpperCase() || name === name.toLowerCase())) {
    name = name.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
  }
  return name.trim();
}

/**
 * Deterministic Heuristic Extractor
 */
export function extractProfileWithHeuristics(text = '', links = {}, filename = '') {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Candidate Full Name
  let name = '';
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    // Skip lines with email, phone, web urls, or standard headers
    if (/@/.test(line) || /https?:|\bgithub|\blinkedin\b|\.com\b/i.test(line)) continue;
    if (/\+?\d[\d\s\-()]{7,}\d/.test(line)) continue;
    if (/^(resume|curriculum vitae|summary|objective|skills|experience|education)$/i.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length >= 1 && words.length <= 4 && line.length >= 3 && line.length <= 40 && !/[;{}[\]<>]/.test(line)) {
      name = cleanName(line);
      break;
    }
  }

  if (!name && filename) {
    const base = filename.replace(/\.(pdf|docx?|txt)$/i, '');
    const candidatePart = base.split(/[_\-–|]/)[0]?.trim();
    if (candidatePart && candidatePart.length >= 2 && candidatePart.length <= 30) {
      name = cleanName(candidatePart);
    }
  }

  // 2. Technical Skills from Skills Section
  let skills = '';
  const skillsHeaderIdx = lines.findIndex(l => /^(?:technical\s+skills|skills\s*(?:&|and)?\s*tools|core\s+competencies|key\s+skills|technologies|skills)\b[:\s]*$/i.test(l));
  
  if (skillsHeaderIdx !== -1) {
    const nextSectionIdx = lines.findIndex((l, idx) => 
      idx > skillsHeaderIdx && /^(?:(?:work\s+)?experience|professional\s+experience|work\s+history|projects|education|certifications|awards|summary)\b[:\s]*$/i.test(l)
    );

    const endIdx = nextSectionIdx !== -1 ? nextSectionIdx : Math.min(skillsHeaderIdx + 12, lines.length);
    const skillLines = lines.slice(skillsHeaderIdx + 1, endIdx);

    const cleanedItems = [];
    for (const rawLine of skillLines) {
      // Strip leading category labels e.g. "Languages:", "AI / ML:", "Backend / APIs:"
      const content = rawLine.replace(/^[A-Za-z0-9\s/&+\-_]+:\s*/, '').trim();
      if (!content) continue;
      
      content.split(/[,;•·|/]/)
        .map(s => s.trim())
        .filter(s => s.length >= 2 && s.length <= 40 && !/@|\.com|http/i.test(s))
        .forEach(s => cleanedItems.push(s));
    }

    if (cleanedItems.length > 0) {
      skills = Array.from(new Set(cleanedItems)).slice(0, 30).join(', ');
    }
  }

  if (!skills) {
    const commonKeywords = [
      "Python", "SQL", "Java", "LangChain", "LangGraph", "RAG", "Vector Databases",
      "PyTorch", "Hugging Face", "Agentic AI", "LLMs", "FastAPI", "Django", "Node.js",
      "Spring Boot", "React.js", "Next.js", "PostgreSQL", "Docker", "AWS", "Git"
    ];
    const found = commonKeywords.filter(k => new RegExp(`\\b${k.replace(/[+]/g, '\\+')}\\b`, 'i').test(text));
    if (found.length > 0) skills = found.join(', ');
  }

  // 3. Current Role and Organization
  let currentRole = '';
  const expIdx = lines.findIndex(l => /^(?:(?:work\s+)?experience|professional\s+experience|work\s+history|employment\s+history)\b[:\s]*$/i.test(l));

  if (expIdx !== -1 && expIdx + 1 < lines.length) {
    // Look at the top entry under Experience
    const jobLine = lines[expIdx + 1] || '';
    const nextJobLine = lines[expIdx + 2] || '';

    // Strip date ranges e.g. "July 2026 – Present"
    const cleanedTitle = jobLine.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|July|Aug|Sep|Oct|Nov|Dec|\d{4}|Present|Current|\–|\-|\—|\s)+$/gi, '').trim();
    
    // Check if next line contains company name e.g. "RenoCred Remote"
    let companyName = '';
    if (nextJobLine && !nextJobLine.startsWith('•') && !nextJobLine.startsWith('-')) {
      companyName = nextJobLine.replace(/\b(Remote|On-site|Hybrid|[A-Z][a-z]+,\s*[A-Z][a-z]+|\d{4}|Present|Current).*$/gi, '').trim();
    }

    // Check if filename suggests a specific role target
    let targetTitle = '';
    if (filename) {
      const titleMatch = filename.match(/(GenAI\s+Solutions\s+Architect|Solutions\s+Architect|AI\s+Engineer|Backend\s+Engineer|Software\s+Engineer)/i);
      if (titleMatch) targetTitle = titleMatch[0].trim();
    }

    const finalRole = targetTitle || cleanedTitle || 'Software Engineer';
    currentRole = companyName ? `${finalRole} at ${companyName}` : finalRole;
  }

  if (!currentRole) {
    const roleOrgPattern = /([A-Za-z\s]+?(?:Engineer|Developer|Architect|Lead|Manager|Specialist))\s*(?:at|@|\||,|–|-)\s*([A-Za-z0-9\s&]+?)(?=\s*(?:\(|\||\d{4}|Present|Current|\n|$))/i;
    for (const line of lines) {
      const m = line.match(roleOrgPattern);
      if (m && m[1] && m[2]) {
        currentRole = `${m[1].trim()} at ${m[2].trim()}`;
        break;
      }
    }
  }

  // 4. Key Experience & Quantified Wins
  let experience = '';
  const bulletLines = [];

  if (expIdx !== -1) {
    for (let i = expIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:projects|education|certifications|awards|summary)\b[:\s]*$/i.test(line)) break;
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        const cleanBullet = line.replace(/^[•·*\-–\s]+/, '').trim();
        if (cleanBullet.length > 25) {
          bulletLines.push(`• ${cleanBullet}`);
          if (bulletLines.length >= 4) break;
        }
      }
    }
  }

  if (bulletLines.length > 0) {
    experience = bulletLines.join('\n');
  }

  // 5. LinkedIn Link (prioritize LinkedIn, then GitHub, then portfolio)
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
 * Master Extraction with Groq LLM and Deterministic Heuristic Cascade
 */
export async function extractCandidateProfile(text = '', buffer = null, filename = '', html = '', parser = null) {
  // Extract all hyperlinks (including PDF annotations)
  const links = await extractLinks(buffer, text, html, parser);

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
1. "name": Extract candidate's full name in clean Title Case (e.g. "Dileep Sai Galla").
2. "currentRole": Candidate's current job title and organization in format: "Role Title at Company" (e.g. "GenAI Solutions Architect at RenoCred" or "Backend Developer Intern at RenoCred").
3. "experience": 3 to 4 concise bullet points of their top quantifiable achievements and metrics from the Experience section. Separate each bullet with a newline and start each with "• ".
4. "skills": Comma-separated list of technical skills directly from the Skills/Technical Skills section (e.g. "Python, SQL, Java, LangChain, RAG, Docker...").
5. "link": Candidate's LinkedIn profile URL (e.g. "https://www.linkedin.com/in/..."). Prioritize LinkedIn URL from detected hyperlinks.

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
          
          // Format experience properly into newline-separated bullets
          let formattedExp = json.experience;
          if (Array.isArray(formattedExp)) {
            formattedExp = formattedExp.map(b => b.startsWith('•') ? b : `• ${b}`).join('\n');
          } else if (typeof formattedExp === 'string') {
            formattedExp = formattedExp.replace(/\\n/g, '\n');
            if (formattedExp.includes(' • ') && !formattedExp.includes('\n• ')) {
              formattedExp = formattedExp.split(/\s*•\s*/).filter(Boolean).map(b => `• ${b}`).join('\n');
            }
          }

          // Format name in Title Case if needed
          let formattedName = json.name || '';
          if (formattedName === formattedName.toUpperCase()) {
            formattedName = formattedName.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
          }

          // Ensure link prioritizes LinkedIn annotation
          const finalLink = links.linkedin || json.link || links.github || links.portfolio || '';

          return {
            name: formattedName,
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

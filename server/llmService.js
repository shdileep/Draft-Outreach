import https from 'https';
import { PLAYBOOK_SYSTEM_PROMPT } from './rules.js';
import { sanitizeAndValidateEmail } from './validator.js';

// HTTP helper with timeout support
function makeHttpRequest(options, postData, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let timer;
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    timer = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 1. OpenAI Call
async function callOpenAI(model, systemPrompt, userPrompt, apiKey) {
  const postData = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4,
    response_format: { type: "json_object" }
  });

  const res = await makeHttpRequest({
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  if (res.statusCode !== 200) {
    throw new Error(`OpenAI error HTTP ${res.statusCode}: ${res.data}`);
  }

  const json = JSON.parse(res.data);
  const content = json.choices[0]?.message?.content;
  return JSON.parse(content);
}

// 2. Anthropic Claude Call
async function callAnthropic(model, systemPrompt, userPrompt, apiKey) {
  const postData = JSON.stringify({
    model: model,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt + "\n\nRespond with ONLY valid JSON: { \"subject\": \"...\", \"body\": \"...\" }" }
    ],
    max_tokens: 1000,
    temperature: 0.4
  });

  const res = await makeHttpRequest({
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  if (res.statusCode !== 200) {
    throw new Error(`Anthropic error HTTP ${res.statusCode}: ${res.data}`);
  }

  const json = JSON.parse(res.data);
  const text = json.content[0]?.text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { subject: "Job Application", body: text };
}

// 3. Groq Call
async function callGroq(model, systemPrompt, userPrompt, apiKey) {
  const postData = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt + "\n\nRespond with ONLY valid JSON: { \"subject\": \"...\", \"body\": \"...\" }" }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const res = await makeHttpRequest({
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  if (res.statusCode !== 200) {
    throw new Error(`Groq error HTTP ${res.statusCode}: ${res.data}`);
  }

  const json = JSON.parse(res.data);
  const content = json.choices[0]?.message?.content;
  return JSON.parse(content);
}

// 4. Deterministic Playbook Synthesis Engine (100% Guaranteed Fallback)
function deterministicPlaybookSynthesis(context) {
  const { profile, jobDescription, targetCompany, targetRole, outreachType, tone, length, recipientName, specificContext } = context;
  const name = profile.name || "Candidate";
  const currentRole = profile.currentRole || "Software Engineer";
  const company = targetCompany || "your team";
  const role = targetRole || "Backend Developer";

  // Match candidate skills to JD
  const candidateSkills = profile.skills || [];
  const matchedSkills = candidateSkills.filter(s =>
    jobDescription && jobDescription.toLowerCase().includes(s.toLowerCase())
  );
  const primarySkill = matchedSkills[0] || candidateSkills[0] || "backend API development";
  const secondarySkill = matchedSkills[1] || candidateSkills[1] || "system architecture";

  const salutation = recipientName ? `Dear ${recipientName.split(' ')[0]},` : `Dear ${company} Hiring Team,`;

  let subject = `Application for ${role} — ${name}`;
  let body = "";

  if (outreachType === 'Recruiter follow-up' || outreachType === 'Follow-up after applying') {
    subject = `Follow-up: ${role} Application — ${name}`;
    body = `${salutation}

I’m following up on my application for the ${role} opening at ${company}.

Given your focus on ${primarySkill}, my experience delivering reliable backend workflows and API integrations matches the role’s technical priorities. I remain interested in the opportunity and would appreciate any update on the hiring timeline.

Thank you for your time and consideration.

Best regards,
${name}
${profile.links?.linkedin || ''}`;
  } else if (outreachType === 'Referral request') {
    subject = `Referral Request — ${role} at ${company}`;
    body = `Hi ${recipientName || 'there'},

I’m planning to apply for the ${role} role at ${company} and noticed your familiarity with the team.

My background includes delivering ${primarySkill} and ${secondarySkill} workflows, which aligns with the team's engineering standards. If you feel my background is a reasonable fit, would you be comfortable referring me for the position?

I’ve attached my resume for context. Thank you for considering it.

Best regards,
${name}`;
  } else if (outreachType === 'Post-interview follow-up') {
    subject = `Thank You — ${role} Interview`;
    body = `${salutation}

Thank you for discussing the ${role} opening with me. Our conversation regarding ${specificContext || 'team priorities and system scalability'} reinforced how my experience with ${primarySkill} could support the team.

I remain interested in the position and look forward to the next steps.

Best regards,
${name}`;
  } else {
    // Initial Experienced / Project-based Application
    subject = `Application for ${role} — ${name}`;
    body = `${salutation}

I’m ${name}, currently working as ${currentRole}. I’m contacting you regarding the ${role} opening at ${company}. My background in ${primarySkill} and ${secondarySkill} aligns directly with the role's requirements.

In my recent work, I designed and implemented backend workflows and API integrations, addressing scalability requirements and enabling robust service execution. I've attached my resume for your review.

Would you be available to discuss how my technical experience fits what the team is looking for?

Best regards,
${name}
${profile.links?.github ? `GitHub: ${profile.links.github}` : ''}
${profile.links?.linkedin ? `LinkedIn: ${profile.links.linkedin}` : ''}`;
  }

  return { subject, body };
}

/**
 * Multi-Tier Cascading Fallback Executor
 */
export async function generateWithFallbackCascade(context) {
  const { profile, jobDescription, targetCompany, targetRole, outreachType, tone, length, recipientName, specificContext } = context;

  const userPrompt = `
Generate a tailored, high-impact email based on the following inputs:

Target Company: ${targetCompany || "Not specified"}
Target Role: ${targetRole || "Engineering"}
Outreach Type: ${outreachType}
Tone: ${tone}
Length: ${length}
Recipient Name: ${recipientName || "None"}
Specific Context / Discussion Point: ${specificContext || "None"}

JOB DESCRIPTION / POSTING / RECRUITER MESSAGE:
"""
${jobDescription}
"""

CANDIDATE INTERNAL SOURCE OF TRUTH (VERIFIED RESUME FACTS ONLY):
- Name: ${profile.name}
- Current Role: ${profile.currentRole}
- Headline: ${profile.headline}
- Verified Skills: ${profile.skills.join(', ')}
- Verified Experience: ${profile.experience.map(e => `${e.role} at ${e.company}: ${e.highlights.join('; ')}`).join('\n')}
- Verified Projects: ${profile.projects.map(p => `${p.name} (${p.stack.join(', ')}): ${p.implementation}. Outcome: ${p.outcome}`).join('\n')}
- Links: GitHub: ${profile.links?.github || 'None'} | LinkedIn: ${profile.links?.linkedin || 'None'}

Remember:
- NO weak phrases ("I am interested in", "excited", "passionate", "give me a chance", "kindly do the needful", etc.).
- Follow ACTION + TECHNICAL CONTRIBUTION + METHOD/TECHNOLOGY + IMPACT.
- Evidence-led opening, mirror required tech from the job description that matches candidate skills, single clear polite next step.
- Return ONLY JSON: { "subject": "...", "body": "..." }
`;

  // Fallback cascade definitions
  const cascade = [
    // 1. Primary: OpenAI
    {
      provider: 'OpenAI (gpt-4o-mini)',
      fn: () => callOpenAI('gpt-4o-mini', PLAYBOOK_SYSTEM_PROMPT, userPrompt, process.env.OPENAI_API_KEY)
    },
    // 2. OpenAI Fallback
    {
      provider: 'OpenAI (gpt-4o)',
      fn: () => callOpenAI('gpt-4o', PLAYBOOK_SYSTEM_PROMPT, userPrompt, process.env.OPENAI_API_KEY)
    },
    // 3. Anthropic Claude Fallback
    {
      provider: 'Anthropic (claude-3-5-haiku)',
      fn: () => callAnthropic('claude-3-5-haiku-20241022', PLAYBOOK_SYSTEM_PROMPT, userPrompt, process.env.ANTHROPIC_API_KEY)
    },
    // 4. Groq High-Tier (Verified Available 200 OK)
    {
      provider: 'Groq (openai/gpt-oss-120b)',
      fn: () => callGroq('openai/gpt-oss-120b', PLAYBOOK_SYSTEM_PROMPT, userPrompt, process.env.GROQ_API_KEY)
    },
    // 5. Groq Fast-Tier
    {
      provider: 'Groq (qwen/qwen3.8-27b)',
      fn: () => callGroq('qwen/qwen3.8-27b', PLAYBOOK_SYSTEM_PROMPT, userPrompt, process.env.GROQ_API_KEY)
    },
    // 6. Groq Compact-Tier
    {
      provider: 'Groq (openai/gpt-oss-20b)',
      fn: () => callGroq('openai/gpt-oss-20b', PLAYBOOK_SYSTEM_PROMPT, userPrompt, process.env.GROQ_API_KEY)
    }
  ];

  let rawResult = null;
  const attemptedProviders = [];

  for (const tier of cascade) {
    try {
      attemptedProviders.push(tier.provider);
      rawResult = await tier.fn();
      if (rawResult && rawResult.subject && rawResult.body) {
        console.log(`[LLM Fallback Cascade] Successfully generated using: ${tier.provider}`);
        break;
      }
    } catch (err) {
      console.warn(`[LLM Fallback Cascade] ${tier.provider} unavailable: ${err.message}. Switching to next fallback...`);
    }
  }

  // If all API calls were exhausted or failed, use deterministic playbook engine
  if (!rawResult || !rawResult.subject || !rawResult.body) {
    console.log(`[LLM Fallback Cascade] Using Deterministic Playbook Synthesis Engine`);
    rawResult = deterministicPlaybookSynthesis(context);
  }

  // Strictly sanitize, enforce weak-word removal, and validate
  return sanitizeAndValidateEmail(rawResult);
}

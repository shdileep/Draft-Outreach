# Draft Outreach — Editorial Cold Email & Outreach Generator

Draft Outreach is an evidence-led, high-craft cold email and job application outreach generator designed around the editorial principles of **specificity, verifiable impact, and zero boilerplate clichés**.

Built using React, Vite, Tailwind CSS, Express, and a resilient multi-tier LLM fallback architecture.

---

## Key Features

1. **Evidence-Led Synthesis Engine**:
   - Implements the strict rules from `Recruiter Outreach: Weak Words to Remove Guide` and `Job Application & Follow-Up Email Playbook`.
   - Strictly eliminates prohibited/weak words and phrases (e.g., *"I am interested in"*, *"I am excited"*, *"I would love to"*, *"kindly do the needful"*, *"give me a chance"*).
   - Follows the high-impact formula: **ACTION + TECHNICAL CONTRIBUTION + METHOD/TECHNOLOGY + MEASURABLE IMPACT**.
   - Mirrored tech stack: Connects required role requirements directly to verified candidate contributions.

2. **Internal Source of Truth (Strict Privacy Guarantee)**:
   - Maintains the candidate's resume internally on the backend as the single source of truth.
   - Never exposes internal profiles, skill extraction, candidate matching scores, or prompt reasoning to the frontend.
   - Frontend receives only the polished, ready-to-send email and subject line.

3. **Automatic Multi-Tier Model Calling & Fallback**:
   - Seamless cascading failover across three major LLM providers:
     - **Primary Tier**: OpenAI (`gpt-4o-mini`, `gpt-4o`)
     - **Fallback Tier 1**: Anthropic Claude (`claude-3-5-haiku`, `claude-3-5-sonnet`)
     - **Fallback Tier 2**: Groq High-Performance (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`)
     - **Fallback Tier 3**: Local Deterministic Playbook Synthesis Engine
   - Automatic timeout and error detection switches to the next provider instantly without interrupting the user.

4. **Multiple Outreach Modalities**:
   - Cold Outreach
   - Direct Application
   - Application Follow-Up (5–7 days post-submission)
   - Recruiter Nudge
   - Alumni Referral Request
   - Post-Interview Thank You Note

5. **Responsive & Flexible Design**:
   - Monochrome editorial UI inspired by craft-first design systems.
   - Responsive across mobile, tablet, and desktop viewports without horizontal scrollbars.

---

## Architecture

```
d:\Draftline
├── public/                 # Static assets (logo, screenshot)
├── server/
│   ├── llmService.js       # Multi-tier cascading fallback engine
│   ├── profileStore.js     # Internal candidate source of truth
│   ├── rules.js            # Extracted playbook templates and prohibited phrases
│   ├── server.js           # Express API server (port 5000)
│   └── validator.js        # Post-generation sanitizer & weak-word cleaner
├── src/
│   ├── App.jsx             # React application (Landing + Studio)
│   ├── index.css           # Tailwind directives & typography
│   └── main.jsx            # React root mount
├── .env.example            # Environment variable template
├── index.html              # HTML shell with Google Fonts
├── package.json            # Project dependencies & scripts
├── tailwind.config.js      # Brand design tokens & styling
└── vite.config.js          # Vite config with API proxy
```


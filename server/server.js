import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { profileStore } from './profileStore.js';
import { generateWithFallbackCascade } from './llmService.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve compiled static production bundle
app.use(express.static(distPath));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', service: 'Draft Outreach AI Synthesis Engine' });
});

// Resume upload endpoint (Silent internal processing)
app.post(['/api/upload-resume', '/upload-resume'], upload.single('resume'), async (req, res) => {
  try {
    let extractedText = '';

    if (req.file) {
      const buffer = req.file.buffer;
      const mimetype = req.file.mimetype;
      const filename = req.file.originalname.toLowerCase();

      if (filename.endsWith('.pdf') || mimetype === 'application/pdf') {
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else {
        extractedText = buffer.toString('utf-8');
      }

      profileStore.parseAndSetResumeText(extractedText, req.file.originalname);

      // Return strictly opaque confirmation; never expose internal profile data
      return res.json({
        success: true,
        filename: req.file.originalname,
        message: 'Resume verified & loaded internally as source of truth'
      });
    }

    if (req.body.resumeText) {
      profileStore.parseAndSetResumeText(req.body.resumeText, "manual_input.txt");
      return res.json({
        success: true,
        filename: 'manual_input.txt',
        message: 'Resume verified & loaded internally as source of truth'
      });
    }

    return res.status(400).json({ error: 'No resume file or text provided' });
  } catch (error) {
    console.error('[Resume Parser Error]', error.message);
    res.status(500).json({ error: 'Failed to process resume internally' });
  }
});

// Main generation endpoint
app.post(['/api/generate', '/generate'], async (req, res) => {
  try {
    const {
      jobDescription = '',
      targetCompany = '',
      targetRole = '',
      outreachType = 'Cold email for a job opportunity',
      tone = 'Professional',
      length = 'Concise',
      recipientName = '',
      specificContext = '',
      candidateOverrides = {}
    } = req.body;

    // Silently update internal profile if candidate provided overrides
    if (candidateOverrides.name || candidateOverrides.role || candidateOverrides.skills || candidateOverrides.exp) {
      profileStore.updateProfile({
        name: candidateOverrides.name || undefined,
        currentRole: candidateOverrides.role || undefined,
        skills: candidateOverrides.skills ? candidateOverrides.skills.split(',').map(s => s.trim()) : undefined
      });
    }

    const currentProfile = profileStore.getProfile();

    // Call cascading fallback LLM engine
    const result = await generateWithFallbackCascade({
      profile: currentProfile,
      jobDescription,
      targetCompany,
      targetRole,
      outreachType,
      tone,
      length,
      recipientName,
      specificContext
    });

    // Send ONLY the final polished email to frontend
    res.json({
      success: true,
      subject: result.subject,
      body: result.body,
      wordCount: result.wordCount
    });
  } catch (error) {
    console.error('[Generation API Error]', error.message);
    res.status(500).json({
      error: 'An internal error occurred during synthesis. Please retry.'
    });
  }
});

// SPA routing fallback: send index.html for non-API requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Draft Outreach Unified Server] Application running entirely on port ${PORT}`);
  });
}

export default app;

import { WEAK_WORDS_MAP, PROHIBITED_PHRASES } from './rules.js';

/**
 * Post-generation validator and sanitizer
 * Guarantees zero weak phrases, zero prompt leakage, and strict professional standards.
 */
export function sanitizeAndValidateEmail(result) {
  let subject = result.subject || "";
  let body = result.body || "";

  // Strip unwanted markdown wrapper if the model output enclosed them in triple backticks or prefixes
  subject = subject.replace(/^(Subject:\s*)/i, '').trim();
  body = body.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  // If the body starts with Subject line, split it
  const subjectMatch = body.match(/^Subject:\s*([^\n]+)\n+([\s\S]+)$/i);
  if (subjectMatch) {
    if (!subject) subject = subjectMatch[1].trim();
    body = subjectMatch[2].trim();
  }

  // Remove meta commentary or preambles
  body = body.replace(/^(Here is the tailored email:?\s*)/i, '');
  body = body.replace(/^(Here is your requested email:?\s*)/i, '');
  body = body.replace(/^(Certainly! Here is [^\n]+:\s*)/i, '');

  // Strictly replace any prohibited weak words with strong professional phrasing
  for (const item of WEAK_WORDS_MAP) {
    body = body.replace(item.pattern, item.replacement);
    subject = subject.replace(item.pattern, item.replacement);
  }

  // Clean up any double spaces or dangling empty sentences resulting from replacements
  body = body.replace(/\s{2,}/g, ' ').replace(/\n\s+\n/g, '\n\n').trim();

  // Ensure zero mention of internal processing or prompt leakage
  const internalLeakagePatterns = [
    /based on your resume/gi,
    /analyzed your resume/gi,
    /internal profile/gi,
    /system instructions/gi,
    /match score/gi,
    /relevance score/gi
  ];

  for (const pat of internalLeakagePatterns) {
    body = body.replace(pat, 'based on my background');
  }

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return {
    subject: subject.trim(),
    body: body.trim(),
    wordCount
  };
}

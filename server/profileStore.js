/**
 * Internal Source of Truth Profile Store
 * Strictly maintains candidate profile on the backend.
 * Never exposed to the frontend.
 */

class ProfileStore {
  constructor() {
    this.currentProfile = {
      name: "",
      currentRole: "",
      headline: "",
      summary: "",
      skills: [],
      experience: [],
      projects: [],
      education: [],
      links: {
        portfolio: "",
        github: "",
        linkedin: ""
      },
      verifiedMetrics: [],
      rawText: ""
    };
  }

  getProfile() {
    return { ...this.currentProfile };
  }

  updateProfile(partial) {
    this.currentProfile = {
      ...this.currentProfile,
      ...partial,
      skills: partial.skills ? Array.from(new Set([...partial.skills])) : this.currentProfile.skills
    };
    return this.getProfile();
  }

  parseAndSetResumeText(text, filename = "") {
    this.currentProfile.rawText = text;

    // Intelligent extraction of candidate information
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      // Name heuristic: usually first non-empty line if short
      const firstLine = lines[0];
      if (firstLine.length < 50 && !firstLine.toLowerCase().includes('resume') && !firstLine.toLowerCase().includes('curriculum')) {
        this.currentProfile.name = firstLine;
      }
    }

    // Extract links
    const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_\-]+/i);
    if (githubMatch) this.currentProfile.links.github = githubMatch[0];

    const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_\-]+/i);
    if (linkedinMatch) this.currentProfile.links.linkedin = linkedinMatch[0];

    // Detect technical keywords present in resume
    const techKeywords = [
      "Python", "FastAPI", "Django", "Node.js", "Express", "TypeScript", "JavaScript",
      "React", "Next.js", "Go", "Golang", "Rust", "C++", "Java", "Spring Boot",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Docker", "Kubernetes",
      "gRPC", "REST", "GraphQL", "LLM", "RAG", "Embeddings", "PyTorch", "AWS", "Git"
    ];

    const foundSkills = [];
    techKeywords.forEach(tech => {
      const regex = new RegExp(`\\b${tech}\\b`, 'i');
      if (regex.test(text)) {
        foundSkills.push(tech);
      }
    });

    if (foundSkills.length > 0) {
      this.currentProfile.skills = Array.from(new Set([...foundSkills, ...this.currentProfile.skills]));
    }

    // Look for role / title
    const roleMatches = text.match(/(backend developer|software engineer|full[ -]stack developer|frontend developer|data engineer|machine learning engineer)/i);
    if (roleMatches) {
      this.currentProfile.currentRole = roleMatches[0];
    }

    return {
      name: this.currentProfile.name,
      skillsCount: this.currentProfile.skills.length,
      hasText: true
    };
  }
}

export const profileStore = new ProfileStore();

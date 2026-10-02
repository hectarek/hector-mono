# Application / Repo Specification

## 1. Summary
This is a personal portfolio website for myself.

---

## 2. Goals
- [ ] Should be a portfolio to convey my skills and experience
- [ ] Should be mobile responsive and accessible on all devices 
- [ ] Should be professional and visually appealing to potential employers
- [ ] Should be SEO friendly and easy to find on search engines
- [ ] Should be clean and simple to navigate and use
- [ ] Should effectively convey my brand and personality
- [ ] Should lead with the positioning: a full-stack engineer, strongest on the front end, who ships AI features
- [ ] Should link proof people can open: live sites, playable games, screenshots, and code


---

## 3. Non-Goals
- [ ] Should not include authentication or role-based permissions
- [ ] Should not include a blog section
- [ ] Should not include a contact form section

---

## 4. Layout and Design

- Main Page
    - Should have a hero section with my name, image and a short description of what I do
    - Should have a section with my skills 
    - Should have a section with my projects (with badges for the technologies used)
    - Should have a section with my experience
    - Should have a section with my contact information (email) CTA to contact me
    - Should have a footer with social media links
- About Me Page
    - Should be a page that explains my background, experience, and skills
    - Should be a page that explains my brand and personality
    - Should be a page that explains how I work and where my depth is
- Projects Page
    - Should be a list of my projects with a short description and a link to the project
        - There should be a dynamic page that shows the details of the project
- Contact Page
    - Simple page with links to my social media profiles, email, etc.
- Now Page
    - What I'm working on right now: current projects, focus, and learning
- Reading Page
    - Newsletters, blogs, podcasts, and feeds I use to stay current (unlisted: not in the nav, and `noIndex`)

## 5. My Brand and Personality

Portfolio Voice & Style Guide

For Hector Gonzalez — full-stack engineer (front end and applied AI), co-founder and CTO, and former instructor

1. Brand Positioning Statement

A product-minded full-stack engineer, strongest on the front end, who ships AI features. Owns a product end to end, from interface to data to the AI pipeline, and turns ambiguous asks into shipped systems. The shape is a T: front-end product engineering is the depth, applied AI the specialty, and the rest of the stack the breadth (updated 2026-10).

⸻

2. Tone & Voice

Voice Qualities
	•	Direct — information-first, no fluff.
	•	Analytical — grounded in reasoning, structure, and constraints.
	•	Pragmatic — minimal, efficient, purpose-driven.
	•	Builder Mindset — focuses on systems, pipelines, architecture, and execution.
	•	Modern Technical — uses contemporary stacks, patterns, and automation approaches.

Tone Adjustments by Context
	•	Homepage: confident, concise, high-level.
	•	Project Pages: structured, technical, explicit about process and decisions.

⸻

3. Style Rules

A. Sentence Style
	•	Prefer short, declarative sentences.
	•	Avoid filler (“excited,” “passionate,” “synergy,” etc.).
	•	Default to active voice.
	•	Use parallel structure (e.g., “Plan → Build → Ship”).

Example:
“I built a Next.js + Bun microservice that ingests recipes, normalizes data, and syncs it to Notion.”

B. Structural Style
	•	Use bullet points often.
	•	Lead with the outcome, then the method.
	•	Include constraints and design choices explicitly.
	•	Use clear section headers: “Problem,” “Constraints,” “Solution,” “Results.”

C. Technical Style
	•	Name the tools only where relevant (Next.js 16, Bun, Drizzle, Vercel Blob, Railroad microservices).
	•	Show architecture diagrams or schemas (JSON, TypeScript interfaces, system flows).
	•	Emphasize reproducibility and automation.

⸻

4. What to Emphasize About Yourself

In this order (updated 2026-10; copy that drifts back to "generalist" or IT operations undersells the work):

A. Front-end product engineering (the depth)
	•	Interfaces people use every day, in React and Next.js
	•	Design systems, and 2D and 3D games in Pixi.js and Three.js
	•	Whole-product ownership: what the user actually gets out of it

B. Applied AI with a person in the loop (the specialty)
	•	Multi-step pipelines with review at every step
	•	Model choice across providers, fact checks, scoring, and approvals
	•	AI-assisted grading that staff review before it counts

C. Full-stack ownership (the breadth)
	•	Data, auth, integrations, CI/CD, monitoring, and tests
	•	Architecture and rebuilds, sized for a small team
	•	Leading a team through a build, then running the product alone

D. Learning systems (the domain)
	•	Game-based learning, mastery pathways, and micro-credentials
	•	Tools for teachers, staff, and program operators
	•	The teaching record: curriculum written and taught, graduates placed

⸻

6. Visual Style Guidance

This controls how your portfolio should feel visually.

A. Overall Aesthetic
	•	Minimal
	•	Clean grids
	•	Neutral colors (white, black, gray, accents sparingly)
	•	Code snippets + diagrams as core visuals
	•	Small animations/transitions (Framer Motion)
	•	No heavy illustration unless functional (e.g., diagrams)

B. Components That Fit Your Brand
	•	Architecture diagrams
	•	Flowcharts
	•	JSON schemas
	•	Data tables
	•	Mini demos of systems
	•	XP / mastery / pathways visuals
	•	Screenshots of internal tools (Notion, Sheets, etc.)

Your work is inherently technical and system-oriented—your visuals should reflect that.

⸻

7. One-Sentence Brand Summary

I build modern, scalable systems for learning and operations—combining engineering clarity, product strategy, and educational impact.

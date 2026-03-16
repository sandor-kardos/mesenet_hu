# Mesenet.hu - AI-Powered Story Generation Pipeline 🚀

A high-performance Progressive Web App (PWA) built in a **24-hour sprint** to replace a traditional 12-week agency content pipeline. 

Live Demo: [mesenet.hu](https://mesenet.hu) | Case Study: [sandorkardos.com](https://sandorkardos.com/projects/how-far-ai-gets-you-in-24-hours-the-mesenet-hu-pwa-case-study/)

---

## 🏗 The Architecture
The project solves a major bottleneck: high-quality, safe content generation at scale. I enforced a hard decoupling between the data layer and the presentation layer to prevent "AI logic drift."

- **Backend (Python):** Scrapes raw data and orchestrates the AI pipeline.
- **LLM Layer (Claude 4.6 Sonnet):** Rewrites stories using specific child psychology and pedagogical guidelines.
- **Image Gen (Gemini 3 Flash):** Generates consistent 3:4 vertical illustrations for a mobile-first experience.
- **Frontend (React + Vite):** A lightweight, PWA-enabled UI optimized for readability (Light/Dark/Sepia modes).
- **Hosting:** Self-hosted on a Plesk VPS with a headless WordPress/MySQL backend.

## 🛠 Tech Stack
* **Frontend:** React, Vite, Tailwind CSS, Workbox (PWA).
* **Backend:** Python (BeautifulSoup, Requests).
* **Database:** MySQL (Headless WP REST API).
* **AI:** Claude 4.6 Sonnet, Gemini 3 Flash.

## ⚡ Key Engineering Challenges Solved
* **Decoupling:** Forced strict separation between Python data owner and React UI owner to maintain clean code during AI-assisted development.
* **PWA Lifecycle:** Custom Workbox configuration to ensure offline reading capabilities and "Install to Home Screen" functionality.
* **UX Optimization:** Implemented a non-intrusive interactive reader with custom rating systems and AI-generated follow-up questions for children.

## 📈 The Result
Reduced the cost of a full production pipeline from an estimated **£12,000+** to essentially zero operational cost (API usage only), with a 24-hour time-to-market.

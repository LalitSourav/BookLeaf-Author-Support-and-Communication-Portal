# Project Plan — BookLeaf Author Support & Communication Portal

## 1. Project Objectives
- Build a production-quality, fully responsive Author Support & Communication Portal for BookLeaf Publishing.
- Implement Author Portal (Authentication, My Books, Support Ticket submission, My Tickets with near-real-time updates).
- Implement Admin Portal (Ticket Queue with filters, AI Auto-Classification, AI Priority Scoring, AI-Drafted Responses backed by KB, Ticket Management, Internal Notes).
- Ensure high code quality, robust error handling, secure API key management, and complete test coverage.
- Document every technical decision and justification in `docs/DESIGN_DECISIONS.md` for technical interview preparation.

## 2. 4-Day Development Schedule & Milestones

### **Day 1: Foundation, Database Design & Authentication**
- [x] Requirement analysis and architecture planning.
- [x] Create comprehensive documentation structure (`docs/`, `AGENTS.md`, `README.md`, `TASKS.md`, `TESTING.md`, `DESIGN_DECISIONS.md`).
- [ ] Initialize backend project structure (Express + TypeScript + Prisma with MySQL).
- [ ] Define Prisma schema for MySQL (`Author`, `Book`, `Admin`, `Ticket`, `TicketMessage`).
- [ ] Create database seeding script (`seed.ts`) using `bookleaf_sample_data.json`.
- [ ] Implement JWT Authentication & RBAC middleware.

### **Day 2: Core Backend Services & AI Integration**
- [ ] Implement Author APIs (Books, Dashboard stats).
- [ ] Implement Ticket Management APIs (Create, List, Detail, Messages, Status update, Internal notes).
- [ ] Implement AI Service (`aiService.ts`) for auto-classification, priority scoring, and KB-backed response drafting with graceful degradation.
- [ ] Verify API endpoints using Postman / curl / integration tests.

### **Day 3: Frontend Implementation & Portal UI**
- [ ] Set up Vite + React + Tailwind CSS frontend structure.
- [ ] Implement Authentication pages (Login / Register).
- [ ] Build Author Portal views: Dashboard, My Books financial table, Submit Ticket modal, My Tickets view with polling/real-time sync.
- [ ] Build Admin Portal views: Ticket Queue with advanced filters, Ticket Detail view, AI Draft review & edit panel, Internal Notes drawer.

### **Day 4: Testing, Security Review & Deployment Preparation**
- [ ] End-to-end integration testing of Author and Admin workflows.
- [ ] Review security practices (API keys in `.env`, SQL injection prevention via Prisma, CORS, input validation).
- [ ] Write comprehensive README.md setup instructions and final interview prep guide.

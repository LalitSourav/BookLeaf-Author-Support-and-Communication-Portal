# Engineering Design Decisions & Interview Justifications — BookLeaf Portal

This document maintains a step-by-step record of every major architectural, database, backend, frontend, and AI integration decision made during the development of the BookLeaf Author Support & Communication Portal. Each entry is structured to provide clear justifications, alternatives considered, trade-offs, and interview talking points to maximize evaluation scores.

## Decision 1: Database & Driver Selection — MySQL with `mysql2` (Raw SQL / Query Helper)

### **Decision:** 
Use **MySQL** with the native `mysql2` Node.js package (using parameterized async queries).

### **Context & Requirements:**
The assignment requires managing structured entities with strict relational integrity: Authors, Books (1-to-Many with Authors), Support Tickets (Many-to-One with Authors, Optional Many-to-One with Books), and Ticket Messages/Internal Notes (1-to-Many with Tickets).

### **Justification:**
1. **Relational Integrity & ACID Compliance:** MySQL provides robust ACID guarantees, ensuring transactional consistency when updating ticket statuses, assigning tickets, or recording royalty/sales metrics.
2. **Developer Expertise & Transparency:** The engineer knows MySQL and standard Node/Express JavaScript extremely well. Using standard SQL queries with `mysql2` keeps the database layer 100% transparent—no hidden ORM magic (`Prisma`), making it effortless to explain every database query during the technical interview.
3. **Parameterized Safety:** Using `mysql2` with `?` placeholder parameters entirely prevents SQL injection vulnerabilities while keeping SQL queries readable and maintainable.

### **Alternatives Considered & Trade-Offs:**
- **Prisma ORM:** Provides type safety and automated migrations. *Disadvantage:* Prisma introduces a complex schema language (`schema.prisma`), code generation steps, and abstraction layers that are unfamiliar to the developer and harder to explain line-by-line in an interview. Raw SQL with `mysql2` is direct, industry-standard, and crystal clear.

### **Interview Talking Point:**
> *"We chose MySQL with native parameterized queries via `mysql2` because it gives us 100% transparency over database performance and execution plans. Unlike heavy ORMs that hide queries behind abstraction layers, writing clean SQL statements allows us to demonstrate a deep understanding of relational database indexing, foreign keys, joins, and ACID transactions during our technical interview."*

---

## Decision 2: Backend Framework — Node.js with Express & JavaScript (ES Modules)

### **Decision:** 
Use **Node.js** with **Express** using modern JavaScript (ES Modules `import/export`).

### **Justification:**
1. **Simplicity & Mastery:** The developer has strong expertise in Node.js and Express JavaScript. Removing TypeScript compilation steps eliminates build friction and allows rapid, confident development.
2. **ES Modules (`import/export`):** Provides clean, modern modular structure identical to React frontend code.
3. **Asynchronous I/O:** Node's event loop efficiently handles concurrent HTTP requests and external AI LLM API calls.

### **Interview Talking Point:**
> *"We chose Node.js and Express with modern ES Modules because it provides a lightweight, unopinionated architecture with zero build compilation overhead. This kept our codebase transparent, modular, and easy to reason about."*

---

## Decision 3: Frontend Framework — React (Vite) + Tailwind CSS

### **Decision:** 
Use **React (Vite)** with **Tailwind CSS** and **Lucide Icons** for the frontend SPA.

### **Justification:**
1. **Vite Build Speed:** Blistering hot module replacement (HMR) and optimized production builds.
2. **Tailwind CSS:** Utility-first CSS framework enabling rapid, responsive, and consistent UI design.
3. **Component Modularity:** Clean separation of Author Portal views and Admin Portal views.

### **Interview Talking Point:**
> *"We selected React with Vite and Tailwind CSS because it offers unmatched developer velocity and pixel-perfect styling control for publishing dashboards."*

---

## Decision 4: AI Integration & Graceful Degradation Strategy

### **Decision:** 
Integrate Anthropic Claude / OpenAI API for automated ticket classification, priority scoring, and Knowledge Base-backed response drafting, backed by a robust fallback mechanism.

### **Justification:**
1. **Prompt Engineering & KB Injection:** Injecting BookLeaf's exact operating policies into the system prompt ensures AI drafts sound like empathetic BookLeaf support representatives.
2. **Graceful Degradation:** Wrapping LLM calls in `try/catch` blocks. If the AI API rate-limits or goes down, ticket creation still succeeds with default fallback categories and priorities, and admins can write manual responses.

### **Interview Talking Point:**
> *"We implemented graceful degradation: if the LLM service experiences an outage, ticket creation is never blocked. The system assigns sensible default fallback values, and admins can immediately respond manually. This guarantees 100% system reliability."*

---

## Decision 5: Real-Time Updates via Polling

### **Decision:** 
Implement near-real-time ticket updates using a clean polling interval in the ticket detail view.

### **Justification:**
1. **Simplicity and Reliability:** Polling every 3-5 seconds avoids complex WebSocket state management issues while fulfilling the requirement that "ticket updates just need to feel responsive."

### **Interview Talking Point:**
> *"To ensure near-real-time responsiveness without over-engineering WebSockets, we utilized a lightweight polling strategy in the ticket view. This guarantees that when an admin replies, the author sees the update within seconds without refreshing."*

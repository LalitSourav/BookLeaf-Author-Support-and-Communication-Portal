# Engineering Design Decisions — BookLeaf Portal

This document maintains a step-by-step record of every major architectural, database, backend, frontend, and AI integration decision made during the development of the BookLeaf Author Support & Communication Portal. Each entry is structured to provide clear justifications, alternatives considered, and trade-offs reflecting my engineering mindset and design choices.

## Decision 1: Database & Driver Selection — MySQL with `mysql2` (Raw SQL / Query Helper)

### **Decision:** 
Use **MySQL** with the native `mysql2` Node.js package (using parameterized async queries).

### **Context & Requirements:**
The project requires managing structured entities with strict relational integrity: Authors, Books (1-to-Many with Authors), Support Tickets (Many-to-One with Authors, Optional Many-to-One with Books), and Ticket Messages/Internal Notes (1-to-Many with Tickets).

### **Justification:**
1. **Relational Integrity & ACID Compliance:** MySQL provides robust ACID guarantees, ensuring transactional consistency when updating ticket statuses, assigning tickets, or recording royalty/sales metrics.
2. **Developer Control & Transparency:** Using standard SQL queries with `mysql2` keeps the database layer 100% transparent—avoiding hidden ORM abstractions (`Prisma`), making it effortless to inspect, optimize, and explain every database query.
3. **Parameterized Safety:** Using `mysql2` with `?` placeholder parameters entirely prevents SQL injection vulnerabilities while keeping SQL queries readable and maintainable.

### **Alternatives Considered & Trade-Offs:**
- **Prisma ORM:** Provides type safety and automated migrations. *Disadvantage:* Prisma introduces a complex schema language (`schema.prisma`), code generation steps, and abstraction layers that add unnecessary overhead. Raw SQL with `mysql2` is direct, industry-standard, and crystal clear.

---

## Decision 2: Backend Framework — Node.js with Express & JavaScript (ES Modules)

### **Decision:** 
Use **Node.js** with **Express** using modern JavaScript (ES Modules `import/export`).

### **Justification:**
1. **Simplicity & Mastery:** Removing TypeScript compilation steps eliminates build friction and allows rapid, confident development.
2. **ES Modules (`import/export`):** Provides clean, modern modular structure identical to React frontend code.
3. **Asynchronous I/O:** Node's event loop efficiently handles concurrent HTTP requests and external AI LLM API calls.

---

## Decision 3: Frontend Framework — React (Vite) + Tailwind CSS

### **Decision:** 
Use **React (Vite)** with **Tailwind CSS** and **Lucide Icons** for the frontend SPA.

### **Justification:**
1. **Vite Build Speed:** Blistering hot module replacement (HMR) and optimized production builds.
2. **Tailwind CSS:** Utility-first CSS framework enabling rapid, responsive, and consistent UI design.
3. **Component Modularity:** Clean separation of Author Portal views and Admin Portal views.

---

## Decision 4: AI Integration & Graceful Degradation Strategy

### **Decision:** 
Integrate Anthropic Claude / Google Gemini API for automated ticket classification, priority scoring, and Knowledge Base-backed response drafting, backed by a robust fallback mechanism.

### **Justification:**
1. **Prompt Engineering & KB Injection:** Injecting BookLeaf's exact operating policies into the system prompt ensures AI drafts sound like empathetic BookLeaf support representatives.
2. **Graceful Degradation:** Wrapping LLM calls in `try/catch` blocks. If the AI API rate-limits or goes down, ticket creation still succeeds with default fallback categories and priorities, and admins can write manual responses.

---

## Decision 5: Real-Time Updates via Polling

### **Decision:** 
Implement near-real-time ticket updates using a clean polling interval in the ticket detail view.

### **Justification:**
1. **Simplicity and Reliability:** Polling every 3-5 seconds avoids complex WebSocket state management issues while fulfilling the requirement that ticket updates feel responsive and seamless.

---

## Decision 6: AI LLM Provider — Google Gemini (`gemini-3.5-flash`)

### **Decision:**
Integrate Google Gemini (`gemini-3.5-flash`) using the official `@google/genai` SDK because it provides state-of-the-art LLM reasoning with high availability and zero friction, combined with a robust graceful degradation layer.

---

## Decision 7: Cost Optimization via Modular Knowledge Base Snippet Injection

### **Decision:** 
Optimize LLM input token consumption by dynamically selecting and sending **only the relevant Knowledge Base policy chunk** (Royalty, Printing, Distribution, Profile & Tax, or ISBN & Metadata) instead of sending the entire 2,000-token Knowledge Base context on every request.

### **Justification:**
1. **Token Economy:** Sending the entire KB on every classification and response drafting call leads to redundant token expenditure and increased latency.
2. **Targeted Prompting:** By filtering the KB using keyword matching (`royalty`, `isbn`, `print`, `distrib`, `metadata`, `profile`), the LLM receives highly focused context, resulting in faster inference times and higher reasoning accuracy.

---

## Decision 8: Scoring-Based Knowledge Base Retrieval & Weighted Keyword Matching

### **Decision:**
Upgrade the Knowledge Base retrieval from simple `.includes()` keyword scanning to a structured, score-based matching mechanism with regex phrase boundaries, weighted priority keywords, category mapping, and relevance filtering.

### **Justification:**
1. **Precision:** The previous substring approach produced false positives and missed multi-word concepts like "pending payment" or "bank account".
2. **Relevance Scoring:** Assigning weight 4 to high-priority terms (`royalty`, `defective`, `isbn`), weight 3 to multi-word phrases, and weight 2 to standard words ensures only genuinely relevant sections surface.
3. **Category Alignment:** Mapping each ticket category to its KB sections and applying a +6 category boost guarantees the most policy-relevant context reaches Gemini.

---

## Decision 9: Category-Specific Author Database Context Filtering (`selectAuthorContext`)

### **Decision:**
Introduce `selectAuthorContext()` inside `ticketContextService.js` so that `aiService.js` receives only the database fields relevant to the ticket category, rather than the entire author catalog.

### **Justification:**
1. **Data Privacy:** Prevents unrelated financial, production, or distribution data from being injected into prompts where they do not belong.
2. **Focus:** If a ticket is about distribution unavailability, the AI receives only `distributionHealth`; if it is about royalties, it receives only `royaltyAggregate`.
3. **Null Safety:** The `sumFinancialField()` helper explicitly returns `null` when data is missing rather than treating it as zero.

---

## Decision 10: Safe Financial Formatting & Anti-Hallucination Prompt Guards

### **Decision:**
Add `formatCurrency()` and `formatValue()` helpers inside `aiService.js`, plus an explicit `buildAuthorDbSnippet()` that includes anti-invention instructions in the Gemini prompt.

### **Justification:**
1. **No False Zeroes:** `formatCurrency` returns "Not available" for null/undefined values instead of displaying `₹0.00`.
2. **Structured Context Block:** Organizes data cleanly and adds an `IMPORTANT:` block instructing Gemini not to invent figures, not to expose internal DB notes, and not to treat missing values as zero.
3. **Defense Against Prompt Injection:** Includes explicit rules telling Gemini to ignore any instructions embedded in the ticket body that try to override its task.

---

## Decision 11: Resilient Ticket Creation & Graceful Error Handling

### **Decision:** 
Decouple AI ticket classification from database persistence. The ticket is immediately saved to MySQL, and AI classification runs independently. If the AI service fails or hits rate limits, ticket creation still succeeds successfully with robust rule-based fallback classification.

### **Justification:**
1. **Uninterrupted Operations:** Author support tickets must never fail to be created due to an external third-party LLM rate limit or network timeout.
2. **Graceful Degradation (`ai_status` tracking):** Tracking `ai_status` (`success` or `fallback_used`) allows the admin portal to know whether the ticket was auto-classified by Gemini or via rule-based fallback.

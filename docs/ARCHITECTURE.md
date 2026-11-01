# Architecture Documentation — BookLeaf Author Support & Communication Portal

## 1. System Overview
The BookLeaf Author Support & Communication Portal is a full-stack web application designed to streamline author support operations at BookLeaf Publishing. It consists of two primary interfaces:
- **Author Portal:** For authors to manage books, view royalties/sales, submit support queries, and track tickets with near-real-time responses.
- **Admin Portal:** For internal ops teams to manage incoming tickets, utilize AI auto-classification and priority scoring, review AI-drafted responses backed by the BookLeaf Knowledge Base, update ticket status, add internal notes, and assign tickets.

## 2. Technology Stack
- **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons + React Router.
- **Backend:** Node.js, Express.js, JavaScript (ES Modules).
- **Database & Driver:** MySQL, `mysql2` (Parameterized Async SQL queries).
- **AI Integration:** Anthropic Claude / OpenAI API with Knowledge Base context injection.

## 3. High-Level Architecture Diagram
```mermaid
graph TD
    subgraph Client ["Frontend (React + Tailwind SPA)"]
        AP[Author Portal]
        AdP[Admin Portal]
    end

    subgraph Server ["Backend (Node.js + Express + JavaScript)"]
        API[REST API Routes]
        Auth[JWT Authentication & RBAC Middleware]
        TicketSvc[Ticket Management Service]
        AISvc[AI Classification & Response Service]
    end

    subgraph External ["External Services & Database"]
        DB[(MySQL Database)]
        LLM[Anthropic Claude / OpenAI API]
    end

    AP -->|HTTP / JWT| API
    AdP -->|HTTP / JWT| API
    API --> Auth
    Auth --> TicketSvc
    Auth --> AISvc
    TicketSvc --> DB
    AISvc --> LLM
    TicketSvc --> DB
```

## 4. Security, AI Integration & Data Flow
1. **Authentication:** Stateless JWT issued upon email/password login. Stored in client localStorage and sent via `Authorization: Bearer <token>` header.
2. **Authorization (RBAC):** Middleware validates user role (`author` or `admin`). Authors can only access their own profile, books, and tickets. Admins have global access.
3. **AI Service & Knowledge Base Integration (`aiService.js` & `bookleafKB.js`):**
   - Utilizes Google Gen AI SDK (`@google/genai`) with model `gemini-3.5-flash`.
   - Injects BookLeaf Knowledge Base context (80/20 royalty split, 45-day payout, 5-7 days printing turnaround, distribution partners) into system/prompt instructions.
   - **Ticket Auto-Classification & Summarization:** Automatically categorizes incoming support queries into 6 valid categories, scores priority (Low/Medium/High/Critical), and generates a 1-sentence `ai_summary` stored in the `tickets` table.
   - **Context-Aware Response Drafting:** Admins can click "Generate AI Response" on any ticket, injecting both KB policy rules and author database records (sales, royalties, book details) to draft empathetic, policy-compliant support replies.
4. **Graceful Degradation:**
   - If the LLM API fails, times out (>8s), hits rate limits, or API key is unconfigured, the system logs the warning and falls back to a robust rule-based intelligent classifier.
   - **Important:** Ticket creation **succeeds** regardless of LLM availability, preventing author support disruption.

# Testing Strategy — BookLeaf Portal

## Test Scenarios & Cases

| Test Case | Input / Action | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **Author Login** | Valid author credentials (`priya.sharma@email.com`) | JWT token returned; redirects to Author Dashboard | Pending |
| **Admin Login** | Valid admin credentials (`admin@bookleaf.com`) | JWT token returned; redirects to Admin Ticket Queue | Pending |
| **My Books View** | GET `/api/author/books` | Returns author's published & in-production books with financials | Pending |
| **Submit Ticket** | Support query with book selection | Ticket created; AI automatically classifies category & assigns priority | Pending |
| **AI Fallback** | Simulated LLM API failure during ticket submission | Ticket created successfully with default category/priority; no crash | Pending |
| **Admin KB Response** | Click "Generate AI Response" on ticket | AI drafts empathetic response based on BookLeaf Knowledge Base | Pending |

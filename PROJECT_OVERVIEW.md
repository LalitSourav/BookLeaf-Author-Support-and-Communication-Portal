# BookLeaf – Author Support & Communication Portal

## 1. Project Overview

BookLeaf is a full-stack Author Support and Communication Portal designed to streamline communication between authors and publishing administrators. It provides a centralized platform where authors can raise support requests, track their progress, and receive assistance, while administrators can manage tickets, access author information, and coordinate support operations.

The platform also integrates AI capabilities to assist with ticket classification, conversation summaries, and response drafting, helping make support workflows more organized and efficient.

## 2. Problem Statement

Managing author queries and support requests through scattered communication channels can make it difficult to track conversations, maintain context, and ensure timely responses.

BookLeaf addresses this challenge by bringing author support operations into a single platform with structured ticket management, centralized information, and AI-assisted workflows.

## 3. Key Features

- **Author Portal:** Allows authors to access their accounts, raise support tickets, and follow the status of their requests.
- **Admin Dashboard:** Provides administrators with an interface to manage authors, books, tickets, and support activities.
- **Ticket Management:** Supports ticket creation, status tracking, and structured communication between authors and administrators.
- **AI-Powered Ticket Classification:** Uses AI to assist in categorizing incoming support requests.
- **AI Response Assistance:** Generates contextual response drafts using relevant ticket and author information.
- **Conversation Summaries:** Helps administrators understand ticket discussions more quickly.
- **Knowledge Base:** Provides a centralized place for support-related information.
- **Internal Notes:** Enables administrators to maintain internal context while handling support requests.

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MySQL-compatible TiDB Cloud |
| Authentication | JWT |
| AI Integration | Google Gemini API |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

## 5. Development Contributions

The development work covered both frontend and backend implementation, including:

- Building responsive user interfaces for author and administrator workflows.
- Developing REST APIs for authentication, ticket operations, and application data.
- Integrating the frontend with backend services and the database.
- Implementing AI-assisted workflows using the Google Gemini API.
- Connecting AI response generation with relevant application context retrieved from the database.
- Configuring production environment variables and deploying the frontend and backend.
- Establishing a cloud-hosted database connection for the deployed application.

## 6. Technical Highlights

One important aspect of the project is its AI integration architecture. Rather than allowing the AI service to access the database directly, the backend retrieves the relevant application data and supplies the necessary context to the AI service.

This approach keeps database access within the backend and allows AI-generated responses to consider relevant ticket, author, and book information.

The application is deployed using separate frontend and backend hosting services, with TiDB Cloud providing the database infrastructure.

## 7. Challenges & Learnings

Working on BookLeaf provided practical experience in:

- Designing and implementing a full-stack application.
- Managing authentication and role-oriented application workflows.
- Building and integrating REST APIs.
- Connecting a cloud-hosted backend to a managed MySQL-compatible database.
- Integrating generative AI into real application workflows.
- Managing environment-specific configurations.
- Troubleshooting production deployment and connectivity issues.

## 8. Project Links

- **GitHub Repository:** https://github.com/LalitSourav/BookLeaf-Author-Support-and-Communication-Portal
- **Live Application:** https://bookleaf-portal-snowy.vercel.app
- **Backend Health Check:** https://bookleaf-backend-cktn.onrender.com/api/health

---

*BookLeaf demonstrates the development of a full-stack support platform that combines structured communication workflows, database-driven operations, and AI-assisted functionality in a deployed web application.*

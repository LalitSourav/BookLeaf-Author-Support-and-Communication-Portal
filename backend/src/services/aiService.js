import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getKBSectionForQuery } from '../knowledgeBase/bookleafKB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend folder regardless of CWD
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // fallback to default CWD .env

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = 'gemini-3.5-flash';

let ai = null;
if (GEMINI_API_KEY && !GEMINI_API_KEY.startsWith('your-')) {
    try {
        ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        console.log('🤖 [AI Initialized] Google Gen AI SDK initialized successfully with bookleafKB module.');
    } catch (err) {
        console.error('⚠️ [AI Warning] Failed to initialize GoogleGenAI client:', err.message);
    }
} else {
    console.log('⚠️ [AI Warning] GEMINI_API_KEY not found or invalid in environment variables.');
}

// Allowed Categories & Priorities (Validation against assignment rubric)
const VALID_CATEGORIES = [
    'Royalty & Payments',
    'ISBN & Metadata Issues',
    'Printing & Quality',
    'Distribution & Availability',
    'Book Status & Production Updates',
    'General Inquiry'
];

const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Helper to race an async promise against a timeout
 */
const withTimeout = (promise, ms = 8000) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('AI request timed out')), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

/**
 * Automatically classify ticket category and priority using official Google Gen AI SDK with strict validation & graceful degradation
 */
export const classifyTicketAI = async (subject, description) => {
    const safeSubject = (subject || '').trim();
    const safeDesc = (description || '').trim();
    const text = `${safeSubject} ${safeDesc}`.toLowerCase();

    const result = {
        category: 'General Inquiry',
        priority: 'Medium',
        ai_summary: null,
        ai_status: 'success'
    };

    // Rule-based fallback classifier
    const runIntelligentFallback = (isError = false) => {
        if (isError) {
            result.ai_status = 'fallback_used';
        }
        if (text.includes('isbn') || text.includes('different isbn') || text.includes('wrong isbn')) {
            result.category = 'ISBN & Metadata Issues';
            result.priority = 'High';
            result.ai_summary = `Author reported ISBN mismatch between marketplace listing and physical copy, treated as high priority data issue.`;
        } else if (text.includes('defective') || text.includes('print quality') || text.includes('blurry') || text.includes('misaligned') || text.includes('torn') || text.includes('damaged')) {
            result.category = 'Printing & Quality';
            result.priority = 'High';
            result.ai_summary = `Author reported severe printing or quality defect requiring inspection and free reprint.`;
        } else if (text.includes('royalty') || text.includes('payout') || text.includes('payment') || text.includes('money') || text.includes('sales') || text.includes('earnings')) {
            result.category = 'Royalty & Payments';
            if (text.includes('months') || text.includes('delayed') || text.includes('missing') || text.includes('never received')) {
                result.priority = 'High';
            } else {
                result.priority = 'Medium';
            }
            result.ai_summary = `Author inquiry regarding royalty earnings, commission breakdown, or payout schedules.`;
        } else if (text.includes('distrib') || text.includes('amazon') || text.includes('flipkart') || text.includes('unavailable') || text.includes('stock')) {
            result.category = 'Distribution & Availability';
            result.priority = 'Medium';
            result.ai_summary = `Author inquiry concerning online marketplace availability and stock distribution sync.`;
        } else if (text.includes('status') || text.includes('typesetting') || text.includes('production') || text.includes('progress') || text.includes('week')) {
            result.category = 'Book Status & Production Updates';
            result.priority = 'Medium';
            result.ai_summary = `Author request regarding publication status or typesetting progress.`;
        } else if (text.includes('bank') || text.includes('tax') || text.includes('pan') || text.includes('profile') || text.includes('phone') || text.includes('details')) {
            result.category = 'General Inquiry';
            result.priority = 'Low';
            result.ai_summary = `Author request to update profile metadata, bank account details, or tax documents.`;
        } else {
            result.category = 'General Inquiry';
            result.priority = 'Medium';
            result.ai_summary = `General support inquiry from author regarding BookLeaf publishing services.`;
        }
    };

    if (!ai) {
        runIntelligentFallback(true);
        return result;
    }

    try {
        const relevantKB = getKBSectionForQuery(text);
        console.log(`🤖 [AI Active] Calling Google Gemini (${MODEL_ID}) for classification using modular KB module...`);

        const prompt = `BookLeaf Policy Context:
${relevantKB}

Analyze the support ticket below carefully and classify into JSON:
1. "category": one of ${JSON.stringify(VALID_CATEGORIES)}
2. "priority": one of ${JSON.stringify(VALID_PRIORITIES)} (Note: ISBN mismatches and print defects must be High or Critical).
3. "ai_summary": 1-sentence summary of the author's core issue.

Subject: ${safeSubject}
Description: ${safeDesc}

Respond ONLY with valid JSON in this exact format:
{
  "category": "...",
  "priority": "...",
  "ai_summary": "..."
}`;

        const apiCall = ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 300
            }
        });

        const response = await withTimeout(apiCall, 8000);

        const contentText = response.text || '';
        const cleanText = contentText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.category && VALID_CATEGORIES.includes(parsed.category)) {
                result.category = parsed.category;
            }
            if (parsed.priority && VALID_PRIORITIES.includes(parsed.priority)) {
                result.priority = parsed.priority;
            }
            if (parsed.ai_summary) {
                result.ai_summary = parsed.ai_summary;
            }
            result.ai_status = 'success';
            console.log('✅ [AI Success] Ticket classified and validated successfully via Gemini.');
        } else {
            runIntelligentFallback(true);
        }
    } catch (error) {
        console.warn('⚠️ [AI Quota/Network Notice] Using robust fallback classification:', error.message);
        runIntelligentFallback(true);
    }

    return result;
};

/**
 * Draft a Knowledge Base & Database Context-backed response for support tickets
 */
export const draftAIResponse = async (ticketSubject, ticketDescription, authorName, bookTitle, authorContext = null) => {
    const safeSubject = (ticketSubject || '').trim();
    const safeDesc = (ticketDescription || '').trim();
    const safeAuthor = (authorName || 'Author').trim();
    const safeBook = (bookTitle || 'your book').trim();
    const sub = safeSubject.toLowerCase();

    let fallbackResponse = `Dear ${safeAuthor},\n\nThank you for reaching out to BookLeaf Publishing Support regarding "${safeSubject}". We have received your inquiry regarding "${safeBook}" and our support team is reviewing the details.\n\nOur support team will investigate your request and follow up with an update within 24-48 hours.\n\nBest regards,\nBookLeaf Support Team`;

    if (sub.includes('royalty') || sub.includes('payout') || sub.includes('money') || sub.includes('payment')) {
        fallbackResponse = `Dear ${safeAuthor},\n\nThank you for contacting BookLeaf Support regarding your royalty inquiry for "${safeBook}". \n\nWe understand your concern regarding your pending payment. As per BookLeaf policy, royalties are calculated on an 80/20 net profit split (80% to author) on a quarterly cycle and disbursed within 45 days of the quarter ending, provided you meet the ₹1,000 minimum payout threshold.\n\nOur support team is reviewing your account statement. We will follow up with a detailed breakdown shortly.\n\nBest regards,\nBookLeaf Support Team`;
    } else if (sub.includes('isbn') || sub.includes('print') || sub.includes('quality') || sub.includes('cover') || sub.includes('defective')) {
        fallbackResponse = `Dear ${safeAuthor},\n\nThank you for reaching out to BookLeaf Production regarding "${safeSubject}" for "${safeBook}". \n\nWe take print and publishing quality very seriously. For any ISBN mismatches or printing defects, please share clear photos of the issue so our production team can verify and initiate a free reprint as per policy.\n\nBest regards,\nBookLeaf Support Team`;
    } else if (sub.includes('distrib') || sub.includes('unavailable') || sub.includes('amazon')) {
        fallbackResponse = `Dear ${safeAuthor},\n\nThank you for reaching out regarding the distribution status of "${safeBook}". \n\n"Currently Unavailable" notices on marketplace listings typically stem from temporary stock synchronization. We are coordinating with our distribution partners to re-sync inventory.\n\nBest regards,\nBookLeaf Support Team`;
    }

    if (!ai) {
        console.log('⚠️ [AI Fallback] Google Gen AI client not initialized. Using static fallback draft.');
        return fallbackResponse;
    }

    try {
        const relevantKB = getKBSectionForQuery(safeSubject + ' ' + safeDesc);
        console.log(`🤖 [AI Active] Calling Google Gemini (${MODEL_ID}) for context-aware drafting...`);

        // Format Author DB Context accurately without property mismatch
        let authorDbSnippet = '';
        if (authorContext) {
            if (authorContext.relevantBook) {
                const b = authorContext.relevantBook;
                authorDbSnippet = `
Author Database Records (Specific Book):
- Book Title: ${b.title || safeBook}
- ISBN: ${b.isbn || 'N/A'}
- Publication Status: ${b.status || 'N/A'}
- Total Copies Sold: ${b.total_copies_sold ?? 0}
- Total Royalty Earned: ₹${b.total_royalty_earned ?? '0.00'}
- Royalty Paid: ₹${b.royalty_paid ?? '0.00'}
- Royalty Pending Payout: ₹${b.royalty_pending ?? '0.00'}
`;
            } else if (authorContext.aggregatedRoyaltyData) {
                const r = authorContext.aggregatedRoyaltyData;
                authorDbSnippet = `
Author Database Records (Aggregated Royalty Across Catalog):
- Total Books: ${r.booksCount}
- Total Copies Sold: ${r.totalCopiesSold}
- Total Royalty Earned: ₹${r.totalRoyaltyEarned}
- Total Royalty Paid: ₹${r.totalRoyaltyPaid}
- Total Royalty Pending Payout: ₹${r.totalRoyaltyPending}
- Top Performing Book: ${r.topPerformingBook ? `${r.topPerformingBook.title} (Earned: ₹${r.topPerformingBook.totalRoyaltyEarned})` : 'N/A'}
`;
            } else {
                authorDbSnippet = `
Author Context:
- Author Name: ${authorContext.authorName || safeAuthor}
- Ticket Category: ${authorContext.ticketCategory || 'General'}
`;
            }
        }

        const prompt = `BookLeaf Policy Context:
${relevantKB}
${authorDbSnippet}

You are an expert customer support agent for BookLeaf Publishing. Write a complete, professional, empathetic, and policy-compliant support reply draft for an administrator to review before sending to author "${safeAuthor}" regarding their book "${safeBook}" and ticket subject "${safeSubject}".
Author's description: "${safeDesc}"

CRITICAL RULES:
- Do NOT output any thinking, reasoning checklists, or planning notes.
- Start your response immediately with "Dear ${safeAuthor},"
- Acknowledge their concern with empathy.
- Apply relevant BookLeaf policy and incorporate author database records accurately if provided (use the exact figures from Author Database Records: e.g., Copies Sold, Royalty Earned, Royalty Pending Payout).
- Conclude gracefully and sign off with "Best regards,\nBookLeaf Support Team".
- Output ONLY the final email draft text. Keep it concise, direct, and complete without trailing off.`;

        const apiCall = ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                temperature: 0.3,
                maxOutputTokens: 2000
            }
        });

        const response = await withTimeout(apiCall, 8000);

        let text = response.text || '';
        text = text.replace(/```(text)?/gi, '').replace(/```/g, '').trim();

        const dearIndex = text.indexOf(`Dear ${safeAuthor}`);
        if (dearIndex > 0) {
            text = text.substring(dearIndex);
        }

        // Ensure signature is present; if truncated or missing, append sign-off cleanly
        if (text && text.length > 30) {
            if (!text.includes('Best regards')) {
                text += `\n\nBest regards,\nBookLeaf Support Team`;
            }
            console.log('✅ [AI Success] Context-aware response drafted successfully by Gemini.');
            return text;
        } else {
            return fallbackResponse;
        }
    } catch (error) {
        console.warn('⚠️ [AI Quota/Network Notice] Using policy-compliant draft fallback:', error.message);
        return fallbackResponse;
    }
};

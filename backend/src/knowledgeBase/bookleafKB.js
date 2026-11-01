
/**
 * Complete BookLeaf Publishing Knowledge Base & Policy Reference
 *
 * Features:
 * 1. Structured knowledge base
 * 2. Category-based retrieval
 * 3. Weighted keyword matching
 * 4. Phrase matching
 * 5. Relevance scoring
 * 6. Top relevant section selection
 * 7. Communication guidelines always included
 */

export const BOOKLEAF_KB = {
    company: {
        title: "Company Overview",
        keywords: [
            "bookleaf", "publishing", "publisher", "company",
            "about", "services", "self-publishing", "packages"
        ],
        name: "BookLeaf Publishing",
        overview: "A premier self-publishing and author support platform empowering authors across India and globally with professional publishing, distribution, and marketing services.",
        packages: [
            "Essential Self-Publishing",
            "Advanced Self-Publishing",
            "Global Distribution & Marketing Suite"
        ]
    },

    royalty: {
        title: "Royalty & Payments",
        keywords: [
            "royalty", "payment", "payout", "earnings", "income",
            "money", "bank transfer", "settlement", "revenue",
            "commission", "pending payment", "unpaid",
            "missing payment", "months", "received",
            "credited", "bank", "account", "sold", "copies"
        ],
        split: "80/20 net profit split (80% to author, 20% BookLeaf).",
        netProfitFormula: "Net Profit = MRP minus printing cost, marketplace commission, and shipping charges.",
        payoutCycle: "Paid quarterly within 45 days of the quarter ending.",
        minimumThreshold: "₹1,000 minimum payout threshold required for bank disbursement.",
        rubricExamples: [
            {
                query: "I published my book months ago and still haven't received any royalty. What's going on?",
                category: "Royalty & Payments",
                priority: "High"
            },
            {
                query: "My royalty amount seems too low. I sold 200 copies but only received ₹3,000.",
                category: "Royalty & Payments",
                priority: "Medium"
            }
        ]
    },

    isbnAndMetadata: {
        title: "ISBN & Metadata Policy",
        keywords: [
            "isbn", "metadata", "description", "subtitle", "title",
            "cover", "author name", "wrong isbn", "different isbn",
            "mismatch", "book details", "listing update"
        ],
        imprint: "BookLeaf Publishing official ISBN imprint assigned via National ISBN Agency.",
        mismatchPolicy: "ISBN mismatches between marketplace listings and physical copies are treated as serious data issues requiring immediate review.",
        metadataUpdates: "Author metadata, book descriptions, and subtitle updates take 3-5 business days to reflect across online distribution channels.",
        rubricExamples: [
            {
                query: "My book is showing a different ISBN on Amazon than what's on the physical copy.",
                category: "ISBN & Metadata Issues",
                priority: "High"
            },
            {
                query: "Can I update the description of my book on Amazon after it's already live?",
                category: "General Inquiry",
                priority: "Low"
            }
        ]
    },

    printing: {
        title: "Publishing, Printing & Quality Policy",
        keywords: [
            "print", "printing", "quality", "blurry", "misaligned",
            "defective", "damaged", "torn", "pages", "binding",
            "reprint", "typesetting", "typeset", "cover proof",
            "production", "weeks", "done", "delay"
        ],
        partners: [
            "Delhi Production Facility",
            "Repro India",
            "Epitome Books"
        ],
        turnaround: "5-7 business days standard printing and typesetting turnaround.",
        defectPolicy: "For defective print batches (blurry images, misaligned pages, damaged binding), photo verification is required. Upon verification, free reprints are dispatched.",
        rubricExamples: [
            {
                query: "I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.",
                category: "Printing & Quality",
                priority: "High"
            },
            {
                query: "It's been 3 weeks and my book is still in typesetting. When will it be done?",
                category: "Book Status & Production Updates",
                priority: "Medium"
            }
        ]
    },

    distribution: {
        title: "Distribution & Availability Policy",
        keywords: [
            "distribution", "distrib", "amazon", "flipkart",
            "unavailable", "stock", "live", "store", "bookstore",
            "google books", "out of stock", "listing", "online"
        ],
        partners: [
            "Amazon India",
            "Flipkart",
            "BookLeaf Bookstore",
            "Google Books"
        ],
        newListingTimeframe: "7-10 business days for new titles to go live across all major online channels.",
        unavailablePolicy: "\"Currently Unavailable\" notices on Amazon or Flipkart typically stem from temporary stock synchronization delays. Re-syncing inventory resolves this.",
        rubricExamples: [
            {
                query: "My book is published but it's showing as 'Currently Unavailable' on Amazon.",
                category: "Distribution & Availability",
                priority: "Medium"
            }
        ]
    },

    productionWorkflow: {
        title: "Production Stages & Workflow",
        keywords: [
            "status", "stage", "progress", "workflow", "process",
            "review", "editing", "proof", "allocation", "inspection"
        ],
        stages: [
            "Manuscript Submission & Initial Review",
            "Editing (Proofreading & Copyediting)",
            "Interior Formatting & Typesetting",
            "Cover Design & Proof Approval",
            "ISBN Allocation & Registration",
            "Printing & Quality Inspection",
            "Global Distribution & Live Listing"
        ],
        commonDelays: "Delays commonly occur during cover proof approvals and extensive author feedback cycles."
    },

    profileAndTax: {
        title: "Profile, Bank & Tax Policy",
        keywords: [
            "bank", "tax", "pan", "profile", "phone", "details",
            "update", "ifsc", "account number", "address",
            "email", "contact"
        ],
        requirements: "Bank account details, PAN card, and tax information updates are verified by support to ensure secure royalty disbursements.",
        processingTime: "Profile and bank details updates are processed within 24-48 hours."
    },

    communicationGuidelines: {
        title: "Communication Guidelines",
        keywords: ["tone", "support", "help", "inquiry"],
        tone: "Professional, empathetic, polite, reassuring, and highly accountable.",
        accountability: "Never make unverified promises. Clearly outline next steps and expected timeframes based strictly on BookLeaf policies.",
        signatures: "Always sign off with 'Best regards,\\nBookLeaf Support Team'."
    }
};


// Map ticket categories to their corresponding KB sections.

const CATEGORY_MAPPING = {
    "royalty & payments": ["royalty"],
    "isbn & metadata issues": ["isbnAndMetadata"],
    "printing & quality": ["printing"],
    "distribution & availability": ["distribution"],
    "book status & production updates": ["productionWorkflow"],
    "general inquiry": ["company", "profileAndTax"]
};


// Assign higher weights to important keywords.

const HIGH_PRIORITY_KEYWORDS = [
    "royalty",
    "isbn",
    "damaged",
    "defective",
    "payout",
    "printing",
    "unavailable",
    "distribution",
    "mismatch"
];


// Normalize text before matching.

const normalizeText = (text = "") => {
    return String(text)
        .toLowerCase()
        .replace(/[^\w\s₹]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};


// Calculate relevance score for a KB section.

const calculateSectionScore = (text, section) => {

    let score = 0;

    const normalizedText = normalizeText(text);

    const keywords = section.keywords || [];

    for (const keyword of keywords) {

        const normalizedKeyword = normalizeText(keyword);

        if (!normalizedKeyword) continue;

        // Match complete phrases or words.
        const regex = new RegExp(
            `(^|\\s)${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s)`,
            "i"
        );

        if (regex.test(normalizedText)) {

            score += HIGH_PRIORITY_KEYWORDS.includes(normalizedKeyword)
                ? 4
                : normalizedKeyword.includes(" ")
                    ? 3
                    : 2;
        }
    }

    return score;
};


// Retrieve relevant KB sections.

export const getKBSectionForQuery = (text, category = "") => {

    const normalizedCategory = normalizeText(category);

    const categorySections =
        CATEGORY_MAPPING[normalizedCategory] || [];

    const matchedSections = [];

    for (const [key, section] of Object.entries(BOOKLEAF_KB)) {

        if (key === "communicationGuidelines") continue;

        let score = calculateSectionScore(text, section);

        // Give a strong boost to category-matched sections.
        if (categorySections.includes(key)) {
            score += 6;
        }

        if (score > 0) {

            matchedSections.push({
                key,
                score,
                section
            });
        }
    }

    // Highest relevance first.
    matchedSections.sort((a, b) => b.score - a.score);

    // Select only relevant sections.
    const selectedSections = matchedSections
        .filter(item => item.score >= 2)
        .slice(0, 3)
        .map(item => item.section);

    // Use company information only for general queries.
    if (selectedSections.length === 0) {

        if (normalizedCategory === "general inquiry") {
            selectedSections.push(BOOKLEAF_KB.company);
        }
    }

    // Always include communication guidelines.
    selectedSections.push(
        BOOKLEAF_KB.communicationGuidelines
    );

    return selectedSections
        .map(section => JSON.stringify(section, null, 2))
        .join("\n\n");
};

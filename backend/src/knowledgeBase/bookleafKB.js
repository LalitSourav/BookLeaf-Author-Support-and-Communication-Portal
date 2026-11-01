/**
 * Complete BookLeaf Publishing Knowledge Base & Policy Reference
 * Preserves all company rules, royalty calculations, printing specs,
 * distribution platforms, production stages, communication tone, and rubric examples.
 */

export const BOOKLEAF_KB = {
    company: {
        name: "BookLeaf Publishing",
        overview: "A premier self-publishing and author support platform empowering authors across India and globally with professional publishing, distribution, and marketing services.",
        packages: ["Essential Self-Publishing", "Advanced Publishing", "Global Distribution & Marketing Suite"]
    },

    royalty: {
        title: "Royalty & Payout Policy",
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
        partners: ["Delhi Production Facility", "Repro India", "Epitome Books"],
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
        partners: ["Amazon India", "Flipkart", "BookLeaf Bookstore", "Google Books"],
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
        requirements: "Bank account details, PAN card, and tax information updates are verified by support to ensure secure royalty disbursements.",
        processingTime: "Profile and bank details updates are processed within 24-48 hours."
    },

    communicationGuidelines: {
        tone: "Professional, empathetic, polite, reassuring, and highly accountable.",
        accountability: "Never make unverified promises. Clearly outline next steps and expected timeframes based strictly on BookLeaf policies.",
        signatures: "Always sign off with 'Best regards,\nBookLeaf Support Team'."
    }
};

/**
 * Retrieve targeted KB sections based on query keywords
 */
export const getKBSectionForQuery = (text) => {
    const lower = (text || '').toLowerCase();
    let sections = [];

    if (lower.includes('royalty') || lower.includes('payout') || lower.includes('payment') || lower.includes('money') || lower.includes('sales') || lower.includes('earnings')) {
        sections.push(BOOKLEAF_KB.royalty);
    }
    if (lower.includes('isbn') || lower.includes('metadata') || lower.includes('description') || lower.includes('subtitle')) {
        sections.push(BOOKLEAF_KB.isbnAndMetadata);
    }
    if (lower.includes('print') || lower.includes('quality') || lower.includes('blurry') || lower.includes('misaligned') || lower.includes('defective') || lower.includes('damaged') || lower.includes('typesetting')) {
        sections.push(BOOKLEAF_KB.printing);
    }
    if (lower.includes('distrib') || lower.includes('amazon') || lower.includes('flipkart') || lower.includes('unavailable') || lower.includes('stock') || lower.includes('live')) {
        sections.push(BOOKLEAF_KB.distribution);
    }
    if (lower.includes('status') || lower.includes('production') || lower.includes('progress') || lower.includes('stage') || lower.includes('week')) {
        sections.push(BOOKLEAF_KB.productionWorkflow);
    }
    if (lower.includes('bank') || lower.includes('tax') || lower.includes('pan') || lower.includes('profile') || lower.includes('phone') || lower.includes('details')) {
        sections.push(BOOKLEAF_KB.profileAndTax);
    }

    // Default fallback if no specific section matched
    if (sections.length === 0) {
        sections.push(BOOKLEAF_KB.company, BOOKLEAF_KB.communicationGuidelines);
    } else {
        // Always include communication guidelines for tone
        sections.push(BOOKLEAF_KB.communicationGuidelines);
    }

    return sections.map(s => JSON.stringify(s, null, 2)).join('\n\n');
};

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { retrieveRelevantDocs } from "../../rag/retriever/retrieveDocs.js";
import fs from "fs";
import path from "path";

const DOCS_DIR = path.resolve(process.cwd(), "src", "rag", "docs");
const KNOWLEDGE_TIMEOUT_MS = Number(process.env.KNOWLEDGE_TOOL_TIMEOUT_MS || 15000);

const withTimeout = (promise, timeoutMs, label) =>
    Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);

const scoreDocument = (query, content) => {
    const terms = String(query || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2);
    const lower = String(content || "").toLowerCase();
    return terms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
};

const fallbackDocsSearch = (query) => {
    const files = fs.readdirSync(DOCS_DIR).filter((file) => file.endsWith(".md"));
    const ranked = files
        .map((file) => {
            const content = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
            return { file, content, score: scoreDocument(query, content) };
        })
        .sort((a, b) => b.score - a.score)
        .filter((doc) => doc.score > 0)
        .slice(0, 2);

    if (!ranked.length) return "";

    return ranked
        .map((doc, index) => {
            const clean = doc.content.replace(/\s+/g, " ").trim();
            const snippet = clean.length > 400 ? `${clean.slice(0, 397).trimEnd()}...` : clean;
            return `### Source ${index + 1} (${doc.file})\n${snippet}`;
        })
        .join("\n\n");
};

export const knowledgeBaseTool = new DynamicStructuredTool({
    name: "search_knowledge_base",
    description: `
        Search the e-Swasthya knowledge base for platform-specific information.
        Use this ONLY for:
        - symptom-to-specialty mapping, such as "chest pain -> Cardiology"
        - registration processes, platform rules, fees, and how-to instructions.
        Do NOT use this to find doctor names, available doctors, doctor profiles,
        appointment slots, hospitals, or live database records. Use search_doctors
        or availability tools for those.
        Input should be a search query string.
    `,
    schema: z.preprocess((val) => {
        let current = val;
        let depth = 0;
        while (typeof current === 'string' && depth < 5) {
            try {
                const parsed = JSON.parse(current);
                if (parsed === current) break;
                current = parsed;
                depth++;
            } catch (e) { break; }
        }
        if (typeof current === 'string') return { query: current };
        if (current && typeof current === 'object') {
            return { query: current.query || current.q || "" };
        }
        return current;
    }, z.object({
        query: z.string().describe("The search query to look up in the knowledge base"),
    })),
    func: async (input) => {
        try {
            const query = typeof input === 'string' ? input : (input?.query || JSON.stringify(input));
            if (/\b(doctor names?|available doctors?|specialists?|profiles?|appointment slots?|availability|cardiology specialists?|dermatology specialists?)\b/i.test(query)
                && !/\b(symptom|chest pain|pain|fever|cough|rash|headache|blood pressure|swelling|registration|register|how to|requirements?|documents?)\b/i.test(query)) {
                return "This query asks for live doctor listings or availability. Use the search_doctors tool with the specialty/name instead of the knowledge base.";
            }
            const { contextText } = await withTimeout(
                retrieveRelevantDocs(query, { k: 2, maxChars: 1200, maxCharsPerDoc: 400 }),
                KNOWLEDGE_TIMEOUT_MS,
                "Knowledge base vector search",
            );
            if (!contextText || contextText.trim().length === 0) {
                return fallbackDocsSearch(query) || "The knowledge base did not return any specific results for that query.";
            }
            return contextText;
        } catch (error) {
            const query = typeof input === 'string' ? input : (input?.query || input?.q || JSON.stringify(input));
            const fallback = fallbackDocsSearch(query);
            return fallback || `Error searching knowledge base: ${error.message}`;
        }
    },
});

export const knowledgeTools = [knowledgeBaseTool];

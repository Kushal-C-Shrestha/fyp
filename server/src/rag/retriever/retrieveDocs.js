import dotenv from "dotenv";
import pool from "../../config/db.js";
import { fileURLToPath } from "url";

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { CohereEmbeddings } from "@langchain/cohere";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
dotenv.config({ path: envPath });

const DEFAULT_TABLE = "documents_embeddings";

let vectorStore;

function sanitizeTableName(name) {
    const table = (name || "").trim() || DEFAULT_TABLE;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid VECTOR_TABLE "${name}". Use only letters, numbers, underscore.`);
    }
    return table;
}

async function createVectorStore() {
    const embeddings = new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY,
        model: process.env.COHERE_EMBEDDING_MODEL || "embed-v4.0",
        inputType: "search_query",
    });

    return PGVectorStore.initialize(embeddings, {
        pool,
        tableName: sanitizeTableName(process.env.VECTOR_TABLE),
        columns: {
            idColumnName: "id",
            vectorColumnName: "embedding",
            contentColumnName: "content",
            metadataColumnName: "metadata",
        },
    });
}

export async function getVectorStore() {
    if (!vectorStore) {
        vectorStore = await createVectorStore();
    }
    return vectorStore;
}

export async function retrieveRelevantDocs(query, opts = {}) {
    const q = (query || "").trim();
    if (!q) {
        throw new Error("retrieveRelevantDocs: query must be a non-empty string");
    }

    const { k = 3, filter = null, maxChars = 2500, maxCharsPerDoc = 700 } = opts;

    const store = await getVectorStore();
    const docs = filter
        ? await store.similaritySearch(q, k, filter)
        : await store.similaritySearch(q, k);

    let contextText = docs
        .map((d, i) => {
            const src = d?.metadata?.source ? ` (${d.metadata.source})` : "";
            const raw = String(d.pageContent ?? "").replace(/\s+/g, " ").trim();
            const snippet =
                raw.length > maxCharsPerDoc
                    ? raw.slice(0, maxCharsPerDoc - 3).trimEnd() + "..."
                    : raw;
            return `### Source ${i + 1}${src}\n${snippet}`;
        })
        .join("\n\n");

    if (contextText.length > maxChars) {
        contextText = contextText.slice(0, maxChars) + "\n\n[Context truncated]";
    }

    return { docs, contextText };
}

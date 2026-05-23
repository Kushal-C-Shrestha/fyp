import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pool from "../../config/db.js";

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CohereEmbeddings } from "@langchain/cohere";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
dotenv.config({ path: envPath });


const DOCS_DIR = path.resolve(__dirname, "..", "docs");
const DEFAULT_TABLE = "documents_embeddings";

function getAllFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const out = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...getAllFiles(fullPath));
        else out.push(fullPath);
    }

    return out;
}

function isSupported(filePath) {
    return /\.(md|txt|json)$/i.test(filePath);
}

function sanitizeTableName(name) {
    const table = (name || "").trim() || DEFAULT_TABLE;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(
            `Invalid VECTOR_TABLE "${name}". Use only letters, numbers, underscore.`
        );
    }
    return table;
}

function metadataFor(docsRoot, filePath) {
    const rel = path.relative(docsRoot, filePath).replace(/\\/g, "/");
    const base = path.basename(rel).replace(/\.(md|txt|json)$/i, "");

    return {
        source: rel,
        domain: base,
        type: "general",
        country: "nepal",
    };
}

function loadDocuments(docsRoot, files) {
    return files.map((filePath) => {
        const content = fs.readFileSync(filePath, "utf8");
        return new Document({
            pageContent: content,
            metadata: metadataFor(docsRoot, filePath),
        });
    });
}

async function splitDocuments(documents) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 900,
        chunkOverlap: 150,
    });
    return splitter.splitDocuments(documents);
}

function createEmbeddings() {
    return new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY,
        model: process.env.COHERE_EMBEDDING_MODEL || "embed-v4.0",
        inputType: "search_document",
    });
}

async function storeChunks({ chunks, embeddings, tableName }) {
    const vectorStore = await PGVectorStore.initialize(embeddings, {
        pool,
        tableName,
        columns: {
            idColumnName: "id",
            vectorColumnName: "embedding",
            contentColumnName: "content",
            metadataColumnName: "metadata",
        },
    });

    await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY;`);
    await vectorStore.addDocuments(chunks);

    await vectorStore.end?.();

    return chunks.length;
}

async function main() {
    if (!fs.existsSync(DOCS_DIR)) {
        throw new Error(`Docs folder not found: ${DOCS_DIR}`);
    }

    const files = getAllFiles(DOCS_DIR).filter(isSupported);
    if (files.length === 0) {
        console.log("No supported docs found (.md, .txt, .json).");
        return;
    }

    console.log(`Loading ${files.length} documents...`);

    const documents = loadDocuments(DOCS_DIR, files);
    const chunks = await splitDocuments(documents);

    console.log(`Found ${files.length} files -> ${chunks.length} chunks`);


    const tableName = sanitizeTableName(process.env.VECTOR_TABLE);
    const embeddings = createEmbeddings();

    const stored = await storeChunks({ chunks, embeddings, tableName });
    console.log(`Stored ${stored} chunks into table: ${tableName}`);
}

try {
    await main();
} catch (err) {
    console.error("Ingestion failed:", err);
    process.exitCode = 1;
} finally {
    await pool.end();
    process.exit(process.exitCode ?? 0);
}

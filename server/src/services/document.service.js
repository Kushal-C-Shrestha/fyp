import fs from "fs";
import path from "path";
import pool from "../config/db.js";
import { ADMIN_ROLES, normalizeRole } from "../utils/helpers.js";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

const resolveStoredUploadPath = (value = "") => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const normalized = raw.replace(/^\/+/, "");
    const absolutePath = path.isAbsolute(raw)
        ? path.resolve(raw)
        : path.resolve(process.cwd(), normalized);

    if (!absolutePath.startsWith(uploadsRoot)) return "";
    return absolutePath;
};

export const getVerificationDocumentById = async ({
    documentId,
    requesterId,
    requesterRole,
}) => {
    const normalizedDocumentId = Number.parseInt(documentId, 10);
    const normalizedRequesterId = Number.parseInt(requesterId, 10);

    if (!Number.isInteger(normalizedDocumentId)) {
        const error = new Error("Invalid document id.");
        error.status = 400;
        throw error;
    }

    if (!Number.isInteger(normalizedRequesterId)) {
        const error = new Error("Invalid requester.");
        error.status = 400;
        throw error;
    }

    const { rows } = await pool.query(
        `
          SELECT
            id,
            user_id,
            document_url,
            file_name,
            mime_type
          FROM verification_documents
          WHERE id = $1
          LIMIT 1
        `,
        [normalizedDocumentId]
    );

    const document = rows[0];
    if (!document) {
        const error = new Error("Document not found.");
        error.status = 404;
        throw error;
    }

    const isAdmin = ADMIN_ROLES.has(normalizeRole(requesterRole));
    const isOwner = Number(document.user_id) === normalizedRequesterId;
    if (!isAdmin && !isOwner) {
        const error = new Error("You do not have permission to view this document.");
        error.status = 403;
        throw error;
    }

    const filePath = resolveStoredUploadPath(document.document_url);
    if (!filePath || !fs.existsSync(filePath)) {
        const error = new Error("The requested document file is missing.");
        error.status = 404;
        throw error;
    }

    return {
        document_id: document.id,
        file_path: filePath,
        file_name: document.file_name || path.basename(filePath),
        mime_type: document.mime_type || "",
    };
};

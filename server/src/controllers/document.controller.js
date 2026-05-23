import path from "path";
import * as documentService from "../services/document.service.js";

const sanitizeFileName = (value = "", fallback = "document") =>
    String(value || fallback)
        .replace(/[\r\n"]/g, "")
        .trim() || fallback;

export const viewVerificationDocument = async (req, res) => {
    try {
        const requesterId = req.user?.id ?? req.user?.user_id;
        const requesterRole = req.user?.role ?? req.user?.user_role;
        const document = await documentService.getVerificationDocumentById({
            documentId: req.params.id,
            requesterId,
            requesterRole,
        });

        if (document.mime_type) {
            res.type(document.mime_type);
        }
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${sanitizeFileName(document.file_name, path.basename(document.file_path))}"`
        );

        return res.sendFile(document.file_path, (error) => {
            if (error && !res.headersSent) {
                res.status(500).json({ success: false, message: "Failed to open document." });
            }
        });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

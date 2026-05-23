import * as recordService from "../services/record.service.js";

const handleFileUpload = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const file = req.file;
        const { title } = req.body;

        const record = await recordService.handleFileUpload(userId, file, title);

        return res.status(200).json({
            success: true,
            message: "Medical record uploaded successfully!",
            record
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const getUserRecords = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const records = await recordService.getUserRecords(userId);
        return res.status(200).json({ success: true, records });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};


const renameRecord = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { id: recordId } = req.params;
        const { title } = req.body;

        const record = await recordService.renameRecord(userId, recordId, title);
        return res.status(200).json({ success: true, record });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const deleteRecord = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { id: recordId } = req.params;

        await recordService.deleteRecord(userId, recordId);
        return res.status(200).json({ success: true, message: "Record deleted successfully." });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

const viewRecord = async (req, res) => {
    try {
        const { id: recordId } = req.params;
        const { id: userId, role } = req.user;
        const result = await recordService.getRecordViewPath(userId, role, recordId);

        // S3 mode — redirect to a pre-signed URL
        if (result.signedUrl) {
            return res.redirect(302, result.signedUrl);
        }

        // Local mode — stream the file
        const { filePath, fileName } = result;
        const safeName = String(fileName || "record").replace(/[\r\n"]/g, "").trim();
        res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
        res.sendFile(filePath, (err) => {
            if (err && !res.headersSent) {
                console.error("Error sending file:", err);
                res.status(500).json({ success: false, message: "Error opening file." });
            }
        });
    } catch (error) {
        console.error("viewRecord controller error:", error);
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export { handleFileUpload, getUserRecords, renameRecord, deleteRecord, viewRecord };

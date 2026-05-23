import api from "../api/axios";
import { getSafeErrorMessage } from "./errorMessages";

const parseFileNameFromDisposition = (value = "") => {
  const header = String(value || "");
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = header.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || "";
};

export const getRecordViewPath = (recordId) => `/records/view/${recordId}`;
export const getVerificationDocumentViewPath = (documentId) => `/documents/verification/${documentId}/view`;
export const getAppointmentChatAttachmentViewPath = (messageId) => `/video-call/chat/attachment/${messageId}`;

export const openProtectedFile = async (path, fallbackFileName = "document") => {
  if (!path) {
    throw new Error("File path is missing.");
  }

  const previewWindow = window.open("", "_blank");
  if (previewWindow) {
    previewWindow.opener = null;
    previewWindow.document.title = "Opening document";
    previewWindow.document.body.innerHTML =
      '<p style="font-family: sans-serif; padding: 16px;">Opening document...</p>';
  }

  try {
    const response = await api.get(path, { responseType: "blob" });
    const contentType =
      response.headers?.["content-type"] || response.data?.type || "application/octet-stream";

    // If the server returned a JSON error instead of a file, parse and throw it
    if (contentType.includes("application/json")) {
      const text = await response.data.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = {}; }
      const err = new Error(getSafeErrorMessage(parsed, "Failed to open file."));
      err.status = response.status;
      throw err;
    }

    const fileName =
      parseFileNameFromDisposition(response.headers?.["content-disposition"]) || fallbackFileName;
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(
      blob.type === contentType ? blob : new Blob([blob], { type: contentType })
    );

    if (previewWindow) {
      previewWindow.location.href = blobUrl;
    } else {
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }

    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }
    // If it's an axios error with a blob response body, parse the real message
    if (error?.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        const err = new Error(getSafeErrorMessage(parsed, "Failed to open file."));
        err.status = error.response.status;
        throw err;
      } catch (parseError) {
        if (parseError?.message && parseError.message !== "Failed to open file.") throw parseError;
      }
    }
    throw error;
  }
};

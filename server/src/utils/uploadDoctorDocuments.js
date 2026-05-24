import createUpload from "../middlewares/upload.middleware.js";

const uploadDoctorRequestDocs = createUpload({
  folder: (req) => `doctor-requests/${req.params?.requestId || "pending"}`,
  allowedTypes: [".pdf", ".jpg", ".jpeg", ".png"],
  fileSize: 5 * 1024 * 1024,
}).fields([
  { name: "citizenshipFront", maxCount: 1 },
  { name: "citizenshipBack", maxCount: 1 },
  { name: "medicalLicenseCertificate", maxCount: 1 },
  { name: "degreeCertificate", maxCount: 1 },
  { name: "additionalCertificates", maxCount: 10 },
]);

export default uploadDoctorRequestDocs;

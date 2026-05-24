import createUpload from "../middlewares/upload.middleware.js";

const uploadHospitalRequestDocs = createUpload({
  folder: "hospital-requests",
  allowedTypes: [".pdf", ".jpg", ".jpeg", ".png"],
  fileSize: 5 * 1024 * 1024,
}).fields([
  { name: "adminCitizenshipFront", maxCount: 1 },
  { name: "adminCitizenshipBack", maxCount: 1 },
  { name: "registrationCertificates", maxCount: 5 },
  { name: "taxClearanceDocs", maxCount: 5 },
  { name: "otherDocs", maxCount: 10 },
]);

export default uploadHospitalRequestDocs;

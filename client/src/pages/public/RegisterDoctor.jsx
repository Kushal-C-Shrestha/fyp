import React, { useEffect, useState } from "react";
import {
  User,
  Stethoscope,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  ChevronLeft,
  Upload,
  X,
  Plus,
  Trash2,
  ChevronRight,
  BadgeCheck,
  Building2,
  Search,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerDoctorSchema } from "../../schemas/registerDoctorSchema";
import api from "../../api/axios";
import AuthHeader from "../../components/AuthHeader.jsx";

const doctorSteps = [
  { id: 1, title: "Personal Information", description: "Basic profile details", icon: User },
  { id: 2, title: "Professional Details", description: "Credentials and experience", icon: Stethoscope },
  { id: 3, title: "Account Security", description: "Login credentials", icon: Lock },
  { id: 4, title: "Hospital Affiliation", description: "Select hospitals to apply to", icon: Building2 },
  { id: 5, title: "Documents", description: "Upload verification files", icon: Upload },
  { id: 6, title: "Review & Submit", description: "Confirm and finish", icon: BadgeCheck },
];

const getSpecializationOptionId = (specialization) =>
  String(specialization?.id ?? specialization?.specialization_id ?? "").trim();

const getSpecializationOptionName = (specialization) =>
  String(specialization?.name ?? specialization?.specialization_name ?? "").trim();

const normalizeSpecializationOptions = (payload) => {
  const rawOptions =
    [
      payload?.specializations,
      payload?.specialities,
      payload?.specialities?.specialities,
      payload?.specialities?.specializations,
      payload?.specializations?.specialities,
      payload?.specializations?.specializations,
      payload?.data?.specializations,
      payload?.data?.specialities,
      payload?.data,
      payload,
    ].find(Array.isArray) || [];

  const optionsById = new Map();

  rawOptions.forEach((item) => {
    const id = getSpecializationOptionId(item);
    const name = getSpecializationOptionName(item);

    if (!id || !name) return;
    optionsById.set(id, { id, name });
  });

  return Array.from(optionsById.values());
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultDaySchedule = () => ({
  enabled: false,
  startTime: "09:00",
  endTime: "17:00",
  slotInterval: 30,
});

const RegisterDoctor = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [ongoingWorkById, setOngoingWorkById] = useState({});

  const [citizenshipFront, setCitizenshipFront] = useState(null);
  const [citizenshipBack, setCitizenshipBack] = useState(null);
  const [medicalLicenseCertificate, setMedicalLicenseCertificate] = useState(null);
  const [degreeCertificate, setDegreeCertificate] = useState(null);
  const [additionalCertificates, setAdditionalCertificates] = useState([]);
  const [specializationOptions, setSpecializationOptions] = useState([]);
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [affiliations, setAffiliations] = useState({});
  const [hospitalSearch, setHospitalSearch] = useState("");
  const allowedFileMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
  const allowedFileExtensions = [".pdf", ".jpeg", ".jpg", ".png"];

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerDoctorSchema),
    mode: "onChange",
    defaultValues: {
      workExperience: [{ institute: "", post: "", startDate: "", endDate: "" }],
      qualification: [{ degreeName: "", institution: "", graduationDate: "" }],
      specializationId: [],
    },
  });

  const formData = watch();
  const selectedSpecializationNames = (Array.isArray(formData.specializationId) ? formData.specializationId : [])
    .map((id) => specializationOptions.find((specialization) => specialization.id === String(id))?.name)
    .filter(Boolean);

  const { fields: workExperienceFields, append: appendWorkExperience, remove: removeWorkExperience } = useFieldArray({
    control,
    name: "workExperience",
  });

  const { fields: qualificationFields, append: appendQualification, remove: removeQualification } = useFieldArray({
    control,
    name: "qualification",
  });

  const stepFields = {
    1: ["doctorName", "doctorGender", "doctorDob", "doctorAddress", "doctorDescription"],
    2: ["medicalLicenseNumber", "specializationId", "doctorExperience", "qualification", "workExperience"],
    3: ["doctorEmail", "doctorPhone", "doctorPassword", "confirmPassword"],
    4: [],
    5: [],
    6: [],
  };

  const toggleHospital = (h) => {
    const hId = String(h.hospital_id ?? h.id);
    setAffiliations((prev) => {
      if (prev[hId]) {
        const next = { ...prev };
        delete next[hId];
        return next;
      }
      return {
        ...prev,
        [hId]: { name: h.hospital_name ?? h.full_name, schedule: Object.fromEntries(DAYS.map((d) => [d, defaultDaySchedule()])) },
      };
    });
  };

  const toggleDay = (hId, day) => {
    setAffiliations((prev) => ({
      ...prev,
      [hId]: { ...prev[hId], schedule: { ...prev[hId].schedule, [day]: { ...prev[hId].schedule[day], enabled: !prev[hId].schedule[day].enabled } } },
    }));
  };

  const updateScheduleField = (hId, day, field, value) => {
    setAffiliations((prev) => ({
      ...prev,
      [hId]: { ...prev[hId], schedule: { ...prev[hId].schedule, [day]: { ...prev[hId].schedule[day], [field]: value } } },
    }));
  };

  const hasMissingAffiliationSchedule = () =>
    Object.values(affiliations).some(({ schedule }) =>
      !Object.values(schedule || {}).some((day) => day.enabled)
    );

  const handleNext = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // Custom validation for steps that don't use react-hook-form fields
    if (currentStep === 4) {
      if (Object.keys(affiliations).length === 0) {
        setSubmitError("Please select at least one hospital to apply to.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (hasMissingAffiliationSchedule()) {
        setSubmitError("Please enable at least one available day for each selected hospital.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    if (currentStep === 5) {
      if (!citizenshipFront || !citizenshipBack || !medicalLicenseCertificate || !degreeCertificate) {
        setSubmitError("Please upload all required documents: Citizenship (Front/Back), Medical License, and Degree Certificate.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    const isValid = await trigger(stepFields[currentStep]);
    if (isValid) {
      setSubmitError(null);
      setCurrentStep((prev) => Math.min(prev + 1, doctorSteps.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isAllowedFileType = (file) => {
    const fileName = String(file?.name || "").toLowerCase();
    const hasAllowedExt = allowedFileExtensions.some((ext) => fileName.endsWith(ext));
    return allowedFileMimeTypes.includes(file?.type) || hasAllowedExt;
  };

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAllowedFileType(file)) {
      setSubmitError("Only PDF, JPEG/JPG, and PNG files are allowed.");
      e.target.value = "";
      return;
    }
    setSubmitError(null);
    setter(file);
  };

  const handleAdditionalCertificatesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const invalidFiles = files.filter((file) => !isAllowedFileType(file));
    if (invalidFiles.length > 0) {
      setSubmitError("Only PDF, JPEG/JPG, and PNG files are allowed.");
      e.target.value = "";
      return;
    }
    setSubmitError(null);
    setAdditionalCertificates((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const autoResizeTextarea = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const onSubmit = async (data, e) => {
    if (e) e.preventDefault();

    if (currentStep !== 6) {
      await handleNext();
      return;
    }

    if (!citizenshipFront || !citizenshipBack || !medicalLicenseCertificate || !degreeCertificate) {
      setSubmitError("Please upload all required documents: Citizenship (Front/Back), Medical License, and Degree Certificate.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (Object.keys(affiliations).length === 0) {
      setSubmitError("Please select at least one hospital to apply to.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (hasMissingAffiliationSchedule()) {
      setSubmitError("Please enable at least one available day for each selected hospital.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitError(null);
    const payload = new FormData();

    Object.keys(data).forEach((key) => {
      if (data[key] === undefined || data[key] === null) return;
      if (key === "workExperience" || key === "qualification" || key === "specializationId") {
        payload.append(key, JSON.stringify(data[key]));
      } else {
        payload.append(key, data[key]);
      }
    });

    const hospitalAffiliations = Object.entries(affiliations).map(([hId, { schedule }]) => ({
      hospitalId: hId,
      schedule: Object.entries(schedule)
        .filter(([, s]) => s.enabled)
        .map(([day, s]) => ({ day, startTime: s.startTime, endTime: s.endTime, slotIntervalMinutes: s.slotInterval })),
    }));
    payload.append("hospitalAffiliations", JSON.stringify(hospitalAffiliations));
    payload.append("citizenshipFront", citizenshipFront);
    payload.append("citizenshipBack", citizenshipBack);
    payload.append("medicalLicenseCertificate", medicalLicenseCertificate);
    payload.append("degreeCertificate", degreeCertificate);
    additionalCertificates.forEach((file) => payload.append("additionalCertificates", file));

    try {
      const response = await api.post("/doctor-requests", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Internal server error. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [specResponse, hospitalResponse] = await Promise.all([
          api.get("/specializations").catch(() => api.get("/specialities")),
          api.get("/hospitals"),
        ]);
        setSpecializationOptions(normalizeSpecializationOptions(specResponse.data));
        setHospitalOptions(hospitalResponse.data?.hospitals || []);
      } catch (error) {
        console.error("Failed to load reference data", error);
      }
    };

    loadReferenceData();
  }, []);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-700 text-white rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Application Submitted</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Your registration has been received and is under review. You will be notified once your application is approved.
          </p>
          <Link to="/" className="inline-block px-6 py-3 bg-slate-900 text-white rounded-md font-semibold hover:bg-slate-800 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col">
      <AuthHeader promptText="Already registered?" actionText="Login" actionTo="/login" />

      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:flex lg:w-80 border-r border-slate-200 bg-white px-6 py-3 lg:px-10 lg:py-8 flex-col">
          <div className="mb-4">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">Doctor Onboarding</p>
          </div>

          <div className="flex-1 pr-1">
            <div className="space-y-2">
              {doctorSteps.map((step) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <div key={step.id} className="relative">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-emerald-700 text-white" : isCurrent ? "bg-emerald-700 text-white" : "bg-white border border-slate-300 text-slate-400"}`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                      </div>

                      <div>
                        <p className={`text-sm font-medium ${isCurrent || isCompleted ? "text-slate-900" : "text-slate-600"}`}>{step.title}</p>
                        <p className={`text-xs ${isCurrent || isCompleted ? "text-slate-600" : "text-slate-400"}`}>{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-200">
            <Link to="/register" className="text-emerald-700 hover:text-emerald-800 text-sm flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to registration
            </Link>
          </div>
        </aside>

        <div className="flex-1 min-h-0 flex items-start p-2 sm:p-3">
          <div className="h-full w-full overflow-y-auto pl-12 pr-16 py-2 sm:pl-8 sm:pr-10 sm:py-3 lg:pl-12 lg:pr-20 lg:py-4">
            <div className="lg:hidden mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">Step {currentStep} of {doctorSteps.length}</span>
                <span className="text-sm font-medium text-emerald-700">{doctorSteps[currentStep - 1].title}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-700 transition-all duration-300" style={{ width: `${(currentStep / doctorSteps.length) * 100}%` }} />
              </div>
            </div>

            <div className="mb-4">
              <h1 className="text-2xl font-bold text-slate-800">{doctorSteps[currentStep - 1].title}</h1>
              <p className="text-slate-500 text-sm mt-1">
                {currentStep === 1 && "Tell us about your profile"}
                {currentStep === 2 && "Provide credentials and work history"}
                {currentStep === 3 && "Create account credentials"}
                {currentStep === 4 && "Select hospitals you are applying to work at"}
                {currentStep === 5 && "Upload required verification documents"}
                {currentStep === 6 && "Review all details before final submission"}
              </p>
              <div className="mt-2 hidden lg:block">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Step {currentStep} of {doctorSteps.length}</span>
                  <span className="font-semibold text-emerald-700">{Math.round((currentStep / doctorSteps.length) * 100)}% complete</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-700 transition-all duration-300" style={{ width: `${(currentStep / doctorSteps.length) * 100}%` }} />
                </div>
              </div>
            </div>

            {submitError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                <X className="w-4 h-4" />
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" {...register("doctorName")} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" placeholder="Enter your full name" />
                    </div>
                    {errors.doctorName && <p className="text-red-500 text-xs mt-1">{errors.doctorName.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                    <select {...register("doctorGender")} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.doctorGender && <p className="text-red-500 text-xs mt-1">{errors.doctorGender.message}</p>}
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                      <input type="date" {...register("doctorDob")} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" />
                      {errors.doctorDob && <p className="text-red-500 text-xs mt-1">{errors.doctorDob.message}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Clinic/Personal Address *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" {...register("doctorAddress")} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" placeholder="Enter your clinic or personal address" />
                      </div>
                      {errors.doctorAddress && <p className="text-red-500 text-xs mt-1">{errors.doctorAddress.message}</p>}
                    </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Professional Bio *</label>
                    <textarea
                      {...register("doctorDescription")}
                      rows="4"
                      onInput={autoResizeTextarea}
                      className="w-full resize-none overflow-hidden px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                      placeholder="Enter your professional bio"
                    />
                    {errors.doctorDescription && <p className="text-red-500 text-xs mt-1">{errors.doctorDescription.message}</p>}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800">Credentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Medical License Number *</label>
                        <input type="text" {...register("medicalLicenseNumber")} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" />
                        {errors.medicalLicenseNumber && <p className="text-red-500 text-xs mt-1">{errors.medicalLicenseNumber.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Experience (Years) *</label>
                        <input type="number" {...register("doctorExperience", { valueAsNumber: true })} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" placeholder="Enter total years of experience" />
                        {errors.doctorExperience && <p className="text-red-500 text-xs mt-1">{errors.doctorExperience.message}</p>}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Specializations *</label>
                        {specializationOptions.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2">
                            {specializationOptions.map((specialization) => (
                              <label key={specialization.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  value={specialization.id}
                                  {...register("specializationId")}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-0"
                                />
                                <span>{specialization.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="py-1 text-sm text-slate-500">
                            No specializations are available right now. Please try again in a moment.
                          </div>
                        )}
                        {errors.specializationId && <p className="text-red-500 text-xs mt-1">{errors.specializationId.message}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-800">Qualifications *</label>
                      <button
                        type="button"
                        onClick={() => appendQualification({ degreeName: "", institution: "", graduationDate: "" })}
                        className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <div className="space-y-3">
                      {qualificationFields.map((field, index) => (
                        <div key={field.id} className="relative grid grid-cols-1 gap-3 pr-8 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Degree Name</label>
                            <input
                              type="text"
                              {...register(`qualification.${index}.degreeName`)}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-emerald-500"
                              placeholder="MBBS, MD, BDS"
                            />
                            {errors.qualification?.[index]?.degreeName && (
                              <p className="text-red-500 text-xs mt-1">{errors.qualification[index].degreeName.message}</p>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Institution</label>
                            <input
                              type="text"
                              {...register(`qualification.${index}.institution`)}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-emerald-500"
                              placeholder="Enter institution name"
                            />
                            {errors.qualification?.[index]?.institution && (
                              <p className="text-red-500 text-xs mt-1">{errors.qualification[index].institution.message}</p>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Graduation Date</label>
                            <input
                              type="date"
                              {...register(`qualification.${index}.graduationDate`)}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-emerald-500"
                            />
                            {errors.qualification?.[index]?.graduationDate && (
                              <p className="text-red-500 text-xs mt-1">{errors.qualification[index].graduationDate.message}</p>
                            )}
                          </div>
                          {qualificationFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQualification(index)}
                              className="absolute right-0 top-0 p-1 text-slate-400 transition-colors hover:text-red-500"
                              aria-label="Remove qualification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {errors.qualification?.message && <p className="text-red-500 text-xs mt-1">{errors.qualification.message}</p>}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-800">Work Experience</label>
                      <button type="button" onClick={() => appendWorkExperience({ institute: "", post: "", startDate: "", endDate: "" })} className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <div className="space-y-4">
                      {workExperienceFields.map((item, index) => (
                        <div key={item.id} className="relative grid grid-cols-1 gap-3 border-b border-slate-200 pb-4 pr-8 md:grid-cols-2">
                          <input type="text" {...register(`workExperience.${index}.institute`)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" placeholder="Enter hospital or institute name" />
                          <input type="text" {...register(`workExperience.${index}.post`)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" placeholder="Enter your role or title" />
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">From</label>
                            <input type="date" {...register(`workExperience.${index}.startDate`)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">To</label>
                            <input
                              type="date"
                              {...register(`workExperience.${index}.endDate`)}
                              disabled={!!ongoingWorkById[item.id]}
                              className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 ${ongoingWorkById[item.id] ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50"}`}
                            />
                          </div>
                          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={!!ongoingWorkById[item.id]}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setOngoingWorkById((prev) => ({ ...prev, [item.id]: checked }));
                                if (checked) {
                                  setValue(`workExperience.${index}.endDate`, "", { shouldValidate: true });
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-0"
                            />
                            Currently working here
                          </label>
                          {workExperienceFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setOngoingWorkById((prev) => {
                                  const next = { ...prev };
                                  delete next[item.id];
                                  return next;
                                });
                                removeWorkExperience(index);
                              }}
                              className="absolute right-0 top-0 p-1 text-slate-400 transition-colors hover:text-red-500"
                              aria-label="Remove work experience"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" {...register("doctorEmail")} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" placeholder="Enter your email address" />
                    </div>
                    {errors.doctorEmail && <p className="text-red-500 text-xs mt-1">{errors.doctorEmail.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" {...register("doctorPhone")} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" placeholder="Enter your phone number" />
                    </div>
                    {errors.doctorPhone && <p className="text-red-500 text-xs mt-1">{errors.doctorPhone.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Create Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={showPass ? "text" : "password"} {...register("doctorPassword")} className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" placeholder="Enter your password" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.doctorPassword && <p className="text-red-500 text-xs mt-1">{errors.doctorPassword.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={showConfirmPass ? "text" : "password"} {...register("confirmPassword")} className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white" placeholder="Confirm your password" />
                      <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Select the hospitals you wish to apply to and set your weekly availability for each.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Hospitals</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={hospitalSearch}
                        onChange={(e) => setHospitalSearch(e.target.value)}
                        placeholder="Search hospitals..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {hospitalOptions
                        .filter((h) => (h.hospital_name ?? "").toLowerCase().includes(hospitalSearch.toLowerCase()))
                        .map((h) => {
                          const hId = String(h.hospital_id ?? h.id);
                          const checked = !!affiliations[hId];
                          return (
                            <label key={hId} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleHospital(h)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-0"
                              />
                              <span className="text-sm text-slate-700">{h.hospital_name ?? h.full_name}</span>
                            </label>
                          );
                        })}
                      {hospitalOptions.filter((h) => (h.hospital_name ?? "").toLowerCase().includes(hospitalSearch.toLowerCase())).length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">No hospitals found.</p>
                      )}
                    </div>
                  </div>

                  {Object.entries(affiliations).map(([hId, aff]) => (
                    <div key={hId} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <span className="text-sm font-semibold text-slate-800">{aff.name}</span>
                        <button type="button" onClick={() => toggleHospital({ hospital_id: hId })} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Weekly Schedule</p>
                        {DAYS.map((day) => {
                          const s = aff.schedule[day];
                          return (
                            <div key={day} className={`rounded-lg border transition-all ${s.enabled ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-slate-50"}`}>
                              <label className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={s.enabled}
                                  onChange={() => toggleDay(hId, day)}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-0"
                                />
                                <span className={`text-sm font-medium w-24 ${s.enabled ? "text-slate-800" : "text-slate-400"}`}>{day}</span>
                                {s.enabled && (
                                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-slate-500">From</span>
                                      <input
                                        type="time"
                                        value={s.startTime}
                                        onChange={(e) => updateScheduleField(hId, day, "startTime", e.target.value)}
                                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-slate-500">To</span>
                                      <input
                                        type="time"
                                        value={s.endTime}
                                        onChange={(e) => updateScheduleField(hId, day, "endTime", e.target.value)}
                                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-slate-500">Slot</span>
                                      <select
                                        value={s.slotInterval}
                                        onChange={(e) => updateScheduleField(hId, day, "slotInterval", Number(e.target.value))}
                                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
                                      >
                                        <option value={15}>15 min</option>
                                        <option value={20}>20 min</option>
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>60 min</option>
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="step5-docs">
                    {[
                      { id: "f", label: "Citizenship Front", state: citizenshipFront, setter: setCitizenshipFront },
                      { id: "b", label: "Citizenship Back", state: citizenshipBack, setter: setCitizenshipBack },
                      { id: "l", label: "Medical License", state: medicalLicenseCertificate, setter: setMedicalLicenseCertificate },
                      { id: "d", label: "Degree Certificate", state: degreeCertificate, setter: setDegreeCertificate },
                    ].map((up) => (
                      <div key={up.id} className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{up.label}</label>
                        <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${up.state ? "bg-emerald-50 border-emerald-400" : "bg-slate-50 border-slate-200 hover:border-emerald-400"}`}>
                          <input type="file" id={`up-${up.id}`} className="hidden" onChange={(e) => handleFileChange(e, up.setter)} />
                          {up.state ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                                <Check className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-medium text-slate-600 truncate max-w-full px-2">{up.state.name}</span>
                              <button type="button" onClick={() => up.setter(null)} className="text-[10px] font-semibold text-red-500 hover:underline">
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label htmlFor={`up-${up.id}`} className="cursor-pointer flex flex-col items-center gap-2">
                              <Upload className="w-6 h-6 text-slate-400" />
                              <span className="text-[10px] font-semibold text-slate-500">Tap to Upload</span>
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Additional Academic Certificates (Optional)</label>
                    <div className="border-2 border-dashed rounded-2xl p-5 bg-slate-50 border-slate-200">
                      <input
                        id="up-additional-certificates"
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleAdditionalCertificatesChange}
                      />
                      <label htmlFor="up-additional-certificates" className="cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
                        <Upload className="w-4 h-4 text-slate-400" />
                        Add certificates
                      </label>
                      {additionalCertificates.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {additionalCertificates.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700">
                              <span className="truncate pr-2">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => setAdditionalCertificates((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-5">
                  <section className="border-b border-slate-200 pb-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Personal Information</h3>
                      <button type="button" onClick={() => setCurrentStep(1)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                      <p><span className="font-medium">Name:</span> {formData.doctorName || "-"}</p>
                      <p><span className="font-medium">Gender:</span> {formData.doctorGender || "-"}</p>
                      <p><span className="font-medium">DOB:</span> {formData.doctorDob || "-"}</p>
                      <p className="md:col-span-2"><span className="font-medium">Bio:</span> {formData.doctorDescription || "-"}</p>
                    </div>
                  </section>

                  <section className="border-b border-slate-200 pb-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Professional Details</h3>
                      <button type="button" onClick={() => setCurrentStep(2)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                      <p><span className="font-medium">License:</span> {formData.medicalLicenseNumber || "-"}</p>
                      <p><span className="font-medium">Experience:</span> {formData.doctorExperience ?? "-"} years</p>
                      <p className="md:col-span-2"><span className="font-medium">Specializations:</span> {selectedSpecializationNames.join(", ") || "-"}</p>
                      <div className="md:col-span-2">
                        <p className="font-medium">Qualifications:</p>
                        {(formData.qualification || []).length ? (
                          <ul className="mt-1 space-y-1 text-sm text-slate-700">
                            {(formData.qualification || []).map((qualification, index) => (
                              <li key={`${qualification?.degreeName || "qualification"}-${index}`}>
                                {[qualification?.degreeName, qualification?.institution, qualification?.graduationDate].filter(Boolean).join(" - ") || "-"}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-slate-700">-</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <p className="font-medium">Work Experience:</p>
                        {(formData.workExperience || []).length ? (
                          <ul className="mt-1 space-y-1 text-sm text-slate-700">
                            {(formData.workExperience || []).map((w, idx) => (
                              <li key={`${w?.institute || "work"}-${idx}`}>
                                {w?.post || "-"} at {w?.institute || "-"} ({w?.startDate || "-"} to {w?.endDate || "Present"})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-slate-700">-</p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="border-b border-slate-200 pb-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Account Security</h3>
                      <button type="button" onClick={() => setCurrentStep(3)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                      <p><span className="font-medium">Email:</span> {formData.doctorEmail || "-"}</p>
                      <p><span className="font-medium">Phone:</span> {formData.doctorPhone || "-"}</p>
                      <p><span className="font-medium">Password:</span> {formData.doctorPassword ? "Set" : "-"}</p>
                      <p><span className="font-medium">Confirm Password:</span> {formData.confirmPassword ? "Set" : "-"}</p>
                    </div>
                  </section>

                  <section className="border-b border-slate-200 pb-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Hospital Affiliation</h3>
                      <button type="button" onClick={() => setCurrentStep(4)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                    </div>
                    {Object.entries(affiliations).length > 0 ? (
                      <ul className="space-y-2 text-sm text-slate-700">
                        {Object.entries(affiliations).map(([hId, aff]) => {
                          const enabledDays = DAYS.filter((d) => aff.schedule[d]?.enabled);
                          return (
                            <li key={hId}>
                              <span className="font-medium">{aff.name}</span>
                              {enabledDays.length > 0 ? (
                                <span className="text-slate-500"> — {enabledDays.join(", ")}</span>
                              ) : (
                                <span className="text-slate-400"> — No days scheduled</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400">No hospitals selected.</p>
                    )}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Uploaded Documents</h3>
                      <button type="button" onClick={() => setCurrentStep(5)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-700">
                      <li><span className="font-medium">Citizenship Front:</span> {citizenshipFront?.name || "-"}</li>
                      <li><span className="font-medium">Citizenship Back:</span> {citizenshipBack?.name || "-"}</li>
                      <li><span className="font-medium">Medical License:</span> {medicalLicenseCertificate?.name || "-"}</li>
                      <li><span className="font-medium">Degree Certificate:</span> {degreeCertificate?.name || "-"}</li>
                      <li>
                        <span className="font-medium">Additional Certificates:</span>{" "}
                        {additionalCertificates.length ? additionalCertificates.map((f) => f.name).join(", ") : "-"}
                      </li>
                    </ul>
                  </section>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentStep === 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {currentStep < doctorSteps.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Registration"}
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterDoctor;

import React, { useState } from "react";
import { Building2, MapPin, FileText, Phone, Mail, Globe, Check, ChevronRight, ChevronLeft, BadgeCheck, ClipboardList, Contact, User, Lock, Eye, EyeOff, Upload, X, FileCheck, UserCog, Map, Stethoscope, Clock, Ambulance, Calendar, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerHospitalSchema } from "../../schemas/registerHospitalSchema";
import { useNavigate } from "react-router-dom";
import AuthHeader from "../../components/AuthHeader.jsx";
import api from "../../api/axios.js";

// Step configuration
const steps = [
    { id: 1, title: "Basic Information", description: "Hospital details", icon: Building2 },
    { id: 2, title: "Legal Details", description: "Registration & license", icon: ClipboardList },
    { id: 3, title: "Contact Information", description: "Phone & email", icon: Contact },
    { id: 4, title: "Admin Account", description: "Administrator setup", icon: UserCog },
    { id: 5, title: "Medical Services", description: "Departments & facilities", icon: Stethoscope },
    { id: 6, title: "Availability", description: "Schedule & emergency", icon: Clock },
    { id: 7, title: "Documents", description: "Upload verification", icon: Upload },
    { id: 8, title: "Review & Submit", description: "Confirm details", icon: FileCheck },
];

const medicalDepartmentsList = [
    "General Medicine", "Cardiology", "Orthopedics", "Neurology", "Pediatrics", "Gynecology",
    "Dermatology", "ENT", "Dental", "Psychiatry", "Oncology", "Urology", "Ophthalmology", "Gastrology"
];

const hospitalServicesList = [
    "ICU", "NICU", "Ventilator", "Operation Theater", "Pharmacy", "Laboratory",
    "X-Ray", "MRI/CT Scan", "Ambulance", "Blood Bank", "Physiotherapy", "Cafeteria", "Parking"
];

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const RegisterHospital = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [showAdminPass, setShowAdminPass] = useState(false);
    const [showAdminConfirmPass, setShowAdminConfirmPass] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [adminCitizenshipFront, setAdminCitizenshipFront] = useState(null);
    const [adminCitizenshipBack, setAdminCitizenshipBack] = useState(null);
    const [submitError, setSubmitError] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const allowedFileMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
    const allowedFileExtensions = [".pdf", ".jpeg", ".jpg", ".png"];

    const {
        register,
        handleSubmit,
        trigger,
        watch,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(registerHospitalSchema),
        mode: "onChange",
        defaultValues: {
            medicalDepartments: [],
            hospitalServices: [],
            daysOpen: [],
            emergencyServices: false,
        }
    });

    const formData = watch();


    // Fields for each step (for validation)
    const stepFields = {
        1: ["hospitalName", "hospitalLocation", "hospitalMapURL", "hospitalType", "hospitalDescription"],
        2: ["registrationNumber", "yearEstablished", "licenseAuthority"],
        3: ["primaryEmail", "primaryPhone", "receptionNumber", "alternateEmail", "alternatePhone", "websiteURL"],
        4: ["adminName", "adminEmail", "adminPhone", "adminPassword", "adminConfirmPassword", "adminDob", "adminGender"],
        5: ["medicalDepartments", "hospitalServices"],
        6: ["openingTime", "closingTime", "daysOpen", "emergencyServices"],
        7: [], // Documents handled separately
        8: [], // Review step
    };

    const handleNext = async () => {
        if (currentStep === 7) {
            const hasReg = documents.some(d => d.category === "Registration Certificate");
            const hasTax = documents.some(d => d.category === "Tax/PAN Document");
            if (!adminCitizenshipFront || !adminCitizenshipBack || !hasReg || !hasTax) {
                setSubmitError("Please upload admin citizenship front/back, Registration Certificate, and Tax/PAN Document.");
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
        }

        const isValid = await trigger(stepFields[currentStep]);
        if (isValid) {
            setSubmitError(null);
            setCurrentStep((prev) => Math.min(prev + 1, steps.length));
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handlePrevious = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        setSubmitError(null);
    };

    const validateDocumentFiles = (files) => {
        const invalidFiles = files.filter((file) => {
            const fileName = String(file?.name || "").toLowerCase();
            const hasAllowedExt = allowedFileExtensions.some((ext) => fileName.endsWith(ext));
            return !(allowedFileMimeTypes.includes(file?.type) || hasAllowedExt);
        });

        if (invalidFiles.length > 0) {
            setSubmitError("Only PDF, JPEG/JPG, and PNG files are allowed.");
            return false;
        }

        setSubmitError(null);
        return true;
    };

    const handleSingleDocumentUpload = (e, setter) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!validateDocumentFiles([file])) {
            e.target.value = "";
            return;
        }
        setter(file);
        e.target.value = "";
    };

    const handleDocumentUpload = (e, category) => {
        const files = Array.from(e.target.files);
        if (!validateDocumentFiles(files)) {
            e.target.value = "";
            return;
        }

        const newDocs = files.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            category: category,
            file: file,
        }));
        setDocuments(prev => [...prev, ...newDocs]);
        e.target.value = "";
    };

    const removeDocument = (id) => {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
    };

    const onSubmit = async (data, e) => {
        if (e) e.preventDefault();
        
        if (currentStep !== 8) {
            await handleNext();
            return;
        }

        const hasReg = documents.some(d => d.category === "Registration Certificate");
        const hasTax = documents.some(d => d.category === "Tax/PAN Document");
        if (!adminCitizenshipFront || !adminCitizenshipBack || !hasReg || !hasTax) {
            setSubmitError("Please upload admin citizenship front/back, Registration Certificate, and Tax/PAN Document.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        setSubmitError(null);
        const submitData = new FormData();

        // Append text fields and arrays
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (Array.isArray(value)) {
                value.filter(item => item !== undefined && item !== null && item !== "").forEach(item => submitData.append(key, item));
            } else if (value !== undefined && value !== null) {
                submitData.append(key, value);
            }
        });

        submitData.append("adminCitizenshipFront", adminCitizenshipFront);
        submitData.append("adminCitizenshipBack", adminCitizenshipBack);

        // Append documents based on category
        documents.forEach(doc => {
            if (doc.category === "Registration Certificate") {
                submitData.append("registrationCertificates", doc.file);
            } else if (doc.category === "Tax/PAN Document") {
                submitData.append("taxClearanceDocs", doc.file);
            } else if (doc.category === "Other Document") {
                submitData.append("otherDocs", doc.file);
            }
        });

        try {
            const response = await api.post("/hospital-requests", submitData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data.success) {
                setIsSubmitted(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch (error) {
            console.error("Error registering hospital:", error);
            setSubmitError(error?.response?.data?.message || "Failed to submit hospital registration.");
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleCheckboxChange = (field, value) => {
        const currentValues = getValues(field) || [];
        if (currentValues.includes(value)) {
            setValue(field, currentValues.filter(item => item !== value), { shouldValidate: true });
        } else {
            setValue(field, [...currentValues, value], { shouldValidate: true });
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900">
                <div className="w-full max-w-md text-center">
                    <div className="w-16 h-16 bg-emerald-700 text-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Registration Submitted</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        Your hospital registration request has been received and is under review. You will be notified by email once the process is complete.
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
                {/* Left Side - Steps */}
                <aside className="hidden lg:flex lg:w-80 border-r border-slate-200 bg-white px-6 py-3 lg:px-10 lg:py-5 flex-col">

                    {/* Header */}
                    <div className="mb-4">
                        <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">Hospital Onboarding</p>
                    </div>
                    {/* Steps */}
                    <div className="flex-1 pr-1">
                        <div className="space-y-2">
                            {steps.map((step, index) => {
                                const StepIcon = step.icon;
                                const isCompleted = currentStep > step.id;
                                const isCurrent = currentStep === step.id;

                                return (
                                    <div key={step.id} className="relative">
                                        <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all">
                                            {/* Step icon */}
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted
                                                    ? "bg-emerald-700 text-white"
                                                    : isCurrent
                                                        ? "bg-emerald-700 text-white"
                                                        : "bg-white border border-slate-300 text-slate-400"
                                                    }`}
                                            >
                                                {isCompleted ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <StepIcon className="w-4 h-4" />
                                                )}
                                            </div>

                                            {/* Step text */}
                                            <div>
                                                <p
                                                    className={`text-sm font-medium ${isCurrent || isCompleted
                                                        ? "text-slate-900"
                                                        : "text-slate-600"
                                                        }`}
                                                >
                                                    {step.title}
                                                </p>
                                                <p
                                                    className={`text-xs ${isCurrent || isCompleted
                                                        ? "text-slate-600"
                                                        : "text-slate-400"
                                                        }`}
                                                >
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Back to register */}
                    <div className="mt-auto pt-4 border-t border-slate-200">
                        <Link
                            to="/register"
                            className="text-emerald-700 hover:text-emerald-800 text-sm flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back to registration
                        </Link>
                    </div>
                </aside>

                {/* Right Side - Form */}
                <div className="flex-1 min-h-0 flex items-start p-2 sm:p-3">
                    <div className="h-full w-full overflow-y-auto pl-6 pr-8 py-2 sm:pl-8 sm:pr-10 sm:py-3 lg:pl-12 lg:pr-14 lg:py-4">
                        {/* Mobile step indicator */}
                        <div className="lg:hidden mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-500">Step {currentStep} of {steps.length}</span>
                                <span className="text-sm font-medium text-emerald-700">{steps[currentStep - 1].title}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-700 transition-all duration-300"
                                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Form Header */}
                        <div className="mb-4">
                            <h1 className="text-2xl font-bold text-slate-800">
                                {steps[currentStep - 1].title}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                {currentStep === 1 && "Tell us about your hospital"}
                                {currentStep === 2 && "Provide your registration and licensing details"}
                                {currentStep === 3 && "How can patients reach you?"}
                                {currentStep === 4 && "Set up the hospital administrator account"}
                                {currentStep === 5 && "Select available medical departments and facilities"}
                                {currentStep === 6 && "Set your operating hours and availability"}
                                {currentStep === 7 && "Upload verification documents"}
                                {currentStep === 8 && "Review your information before submitting"}
                            </p>
                            <div className="mt-2 hidden lg:block">
                                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                    <span>Step {currentStep} of {steps.length}</span>
                                    <span className="font-semibold text-emerald-700">{Math.round((currentStep / steps.length) * 100)}% complete</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-emerald-700 transition-all duration-300"
                                        style={{ width: `${(currentStep / steps.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {submitError && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                                <X className="w-4 h-4" />
                                {submitError}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data">
                            {/* Step 1: Basic Information */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    {/* Row 1: Hospital Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Hospital Name *
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Enter hospital name"
                                                {...register("hospitalName")}
                                                className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.hospitalName ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                            />
                                        </div>
                                        {errors.hospitalName && <p className="text-red-500 text-xs mt-1">{errors.hospitalName.message}</p>}
                                    </div>

                                    {/* Row 2: Location & Map URL */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Location *
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Full address"
                                                    {...register("hospitalLocation")}
                                                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.hospitalLocation ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                                />
                                            </div>
                                            {errors.hospitalLocation && <p className="text-red-500 text-xs mt-1">{errors.hospitalLocation.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Google Maps URL
                                            </label>
                                            <div className="relative">
                                                <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="url"
                                                    placeholder="https://maps.google.com/..."
                                                    {...register("hospitalMapURL")}
                                                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.hospitalMapURL ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                                />
                                            </div>
                                            {errors.hospitalMapURL && <p className="text-red-500 text-xs mt-1">{errors.hospitalMapURL.message}</p>}
                                        </div>
                                    </div>

                                    {/* Row 3: Hospital Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Hospital Type *
                                        </label>
                                        <select
                                            {...register("hospitalType")}
                                            className={`w-full px-3 py-2.5 bg-slate-50 border ${errors.hospitalType ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                        >
                                            <option value="">Select type</option>
                                            <option value="General">General Hospital</option>
                                            <option value="Specialty">Specialty Hospital</option>
                                            <option value="Teaching">Teaching Hospital</option>
                                            <option value="Clinic">Clinic</option>
                                        </select>
                                        {errors.hospitalType && <p className="text-red-500 text-xs mt-1">{errors.hospitalType.message}</p>}
                                    </div>

                                    {/* Row 4: Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Description *
                                        </label>
                                        <textarea
                                            placeholder="Brief description of your hospital (min 20 characters)"
                                            rows={4}
                                            {...register("hospitalDescription")}
                                            className={`w-full px-3 py-2.5 bg-slate-50 border ${errors.hospitalDescription ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none`}
                                        />
                                        {errors.hospitalDescription && <p className="text-red-500 text-xs mt-1">{errors.hospitalDescription.message}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Legal Details */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Registration Number *
                                            </label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Registration number"
                                                    {...register("registrationNumber")}
                                                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.registrationNumber ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                                />
                                            </div>
                                            {errors.registrationNumber && <p className="text-red-500 text-xs mt-1">{errors.registrationNumber.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Year Established *
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="e.g., 1995"
                                                {...register("yearEstablished", { valueAsNumber: true })}
                                                className={`w-full px-3 py-2.5 bg-slate-50 border ${errors.yearEstablished ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                            />
                                            {errors.yearEstablished && <p className="text-red-500 text-xs mt-1">{errors.yearEstablished.message}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Licensing Authority *
                                        </label>
                                        <div className="relative">
                                            <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Issuing authority name"
                                                {...register("licenseAuthority")}
                                                className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.licenseAuthority ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                            />
                                        </div>
                                        {errors.licenseAuthority && <p className="text-red-500 text-xs mt-1">{errors.licenseAuthority.message}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Contact Information */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Email *</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="email" placeholder="email@hospital.com" {...register("primaryEmail")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.primaryEmail ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.primaryEmail && <p className="text-red-500 text-xs mt-1">{errors.primaryEmail.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Phone *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="text" placeholder="+977-XXX-XXXXXX" {...register("primaryPhone")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.primaryPhone ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.primaryPhone && <p className="text-red-500 text-xs mt-1">{errors.primaryPhone.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Reception Number *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="text" placeholder="Reception desk number" {...register("receptionNumber")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.receptionNumber ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.receptionNumber && <p className="text-red-500 text-xs mt-1">{errors.receptionNumber.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Website URL</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="url" placeholder="https://www.yourhospital.com (Optional)" {...register("websiteURL")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.websiteURL ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.websiteURL && <p className="text-red-500 text-xs mt-1">{errors.websiteURL.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="email" placeholder="Optional" {...register("alternateEmail")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.alternateEmail ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.alternateEmail && <p className="text-red-500 text-xs mt-1">{errors.alternateEmail.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Phone</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="text" placeholder="Optional" {...register("alternatePhone")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.alternatePhone ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.alternatePhone && <p className="text-red-500 text-xs mt-1">{errors.alternatePhone.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Admin Account */}
                            {currentStep === 4 && (
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
                                        <p className="text-emerald-800 text-sm">
                                            This account will be used to manage your hospital on e-Swasthya.
                                        </p>
                                    </div>

                                    {/* Admin Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Admin Full Name *</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input type="text" placeholder="Administrator name" {...register("adminName")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.adminName ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                        </div>
                                        {errors.adminName && <p className="text-red-500 text-xs mt-1">{errors.adminName.message}</p>}
                                    </div>

                                    {/* Email & Phone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email *</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="email" placeholder="admin@email.com" {...register("adminEmail")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.adminEmail ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.adminEmail && <p className="text-red-500 text-xs mt-1">{errors.adminEmail.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Phone *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type="text" placeholder="+977-XXX-XXXXXX" {...register("adminPhone")} className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.adminPhone ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                            </div>
                                            {errors.adminPhone && <p className="text-red-500 text-xs mt-1">{errors.adminPhone.message}</p>}
                                        </div>
                                    </div>

                                    {/* --- NEW: DOB & Gender Row --- */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                <input
                                                    type="date"
                                                    {...register("adminDob")}
                                                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.adminDob ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                                />
                                            </div>
                                            {errors.adminDob && <p className="text-red-500 text-xs mt-1">{errors.adminDob.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                <select
                                                    {...register("adminGender")}
                                                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.adminGender ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none`}
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            {errors.adminGender && <p className="text-red-500 text-xs mt-1">{errors.adminGender.message}</p>}
                                        </div>
                                    </div>

                                    {/* Passwords */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type={showAdminPass ? "text" : "password"} placeholder="Create password" {...register("adminPassword")} className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${errors.adminPassword ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                                <button type="button" onClick={() => setShowAdminPass(!showAdminPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {errors.adminPassword && <p className="text-red-500 text-xs mt-1">{errors.adminPassword.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input type={showAdminConfirmPass ? "text" : "password"} placeholder="Confirm password" {...register("adminConfirmPassword")} className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${errors.adminConfirmPassword ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`} />
                                                <button type="button" onClick={() => setShowAdminConfirmPass(!showAdminConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    {showAdminConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {errors.adminConfirmPassword && <p className="text-red-500 text-xs mt-1">{errors.adminConfirmPassword.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Medical Services */}
                            {currentStep === 5 && (
                                <div className="space-y-6">
                                    {/* Departments */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                            <Stethoscope className="w-4 h-4 text-emerald-700" />
                                            Medical Departments *
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {medicalDepartmentsList.map((dept) => (
                                                <label key={dept} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        value={dept}
                                                        checked={(formData.medicalDepartments || []).includes(dept)}
                                                        onChange={() => handleCheckboxChange("medicalDepartments", dept)}
                                                        className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600"
                                                    />
                                                    <span className="text-sm text-slate-700">{dept}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {errors.medicalDepartments && <p className="text-red-500 text-xs mt-1">{errors.medicalDepartments.message}</p>}
                                    </div>

                                    {/* Services */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-emerald-700" />
                                            Hospital Facilities *
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {hospitalServicesList.map((service) => (
                                                <label key={service} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        value={service}
                                                        checked={(formData.hospitalServices || []).includes(service)}
                                                        onChange={() => handleCheckboxChange("hospitalServices", service)}
                                                        className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-600"
                                                    />
                                                    <span className="text-sm text-slate-700">{service}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {errors.hospitalServices && <p className="text-red-500 text-xs mt-1">{errors.hospitalServices.message}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Step 6: Availability */}
                            {currentStep === 6 && (
                                <div className="space-y-6">
                                    {/* Emergency Services */}
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-100 p-2 rounded-xl text-red-600">
                                                <Ambulance className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-red-900">24/7 Emergency Services</h4>
                                                <p className="text-xs text-red-700 mt-0.5">Does your hospital provide round-the-clock emergency care?</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                {...register("emergencyServices")}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>

                                    {/* Operating Hours */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Time</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="time"
                                                    {...register("openingTime")}
                                                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.openingTime ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                                />
                                            </div>
                                            {errors.openingTime && <p className="text-red-500 text-xs mt-1">{errors.openingTime.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Closing Time</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="time"
                                                    {...register("closingTime")}
                                                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.closingTime ? "border-red-300" : "border-slate-200"} rounded-xl text-slate-800 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all`}
                                                />
                                            </div>
                                            {errors.closingTime && <p className="text-red-500 text-xs mt-1">{errors.closingTime.message}</p>}
                                        </div>
                                    </div>

                                    {/* Days Open */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-3">Days of Operation *</label>
                                        <div className="flex flex-wrap gap-2">
                                            {daysOfWeek.map((day) => {
                                                const isSelected = (formData.daysOpen || []).includes(day);
                                                return (
                                                    <label
                                                        key={day}
                                                        className={`px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-all ${isSelected
                                                            ? "bg-emerald-700 text-white border-emerald-700"
                                                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={isSelected}
                                                            onChange={() => handleCheckboxChange("daysOpen", day)}
                                                        />
                                                        {day}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        {errors.daysOpen && <p className="text-red-500 text-xs mt-1">{errors.daysOpen.message}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Step 7: Documents */}
                            {currentStep === 7 && (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                                        <p className="text-amber-800 text-sm">
                                            Please upload clear copies of the following documents. You can upload multiple files for each category.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {[
                                            {
                                                id: "admin-citizenship-front",
                                                label: "Admin Citizenship Front *",
                                                state: adminCitizenshipFront,
                                                setter: setAdminCitizenshipFront,
                                            },
                                            {
                                                id: "admin-citizenship-back",
                                                label: "Admin Citizenship Back *",
                                                state: adminCitizenshipBack,
                                                setter: setAdminCitizenshipBack,
                                            },
                                        ].map((item) => (
                                            <div key={item.id}>
                                                <h4 className="text-sm font-medium text-slate-700 mb-2">{item.label}</h4>
                                                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${item.state ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-slate-50/50 hover:border-emerald-500"}`}>
                                                    <input
                                                        type="file"
                                                        onChange={(e) => handleSingleDocumentUpload(e, item.setter)}
                                                        className="hidden"
                                                        id={item.id}
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                    />
                                                    {item.state ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Check className="w-8 h-8 text-emerald-700" />
                                                            <span className="max-w-full truncate text-sm text-slate-700">{item.state.name}</span>
                                                            <button type="button" onClick={() => item.setter(null)} className="text-xs font-semibold text-red-500 hover:underline">
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label htmlFor={item.id} className="cursor-pointer">
                                                            <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                                            <p className="text-slate-700 font-medium">Upload Citizenship</p>
                                                            <p className="text-slate-400 text-xs mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Registration Certificate */}
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">Registration Certificate *</h4>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) => handleDocumentUpload(e, "Registration Certificate")}
                                                className="hidden"
                                                id="doc-registration"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                            />
                                            <label htmlFor="doc-registration" className="cursor-pointer">
                                                <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                                <p className="text-slate-700 font-medium">Upload Registration Certificate</p>
                                                <p className="text-slate-400 text-xs mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                            </label>
                                        </div>
                                        {documents.filter(d => d.category === "Registration Certificate").length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {documents.filter(d => d.category === "Registration Certificate").map((doc) => (
                                                    <div key={doc.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                                                            <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeDocument(doc.id)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* PAN/VAT & Tax Clearance */}
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">PAN/VAT & Tax Clearance *</h4>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) => handleDocumentUpload(e, "Tax/PAN Document")}
                                                className="hidden"
                                                id="doc-tax"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                            />
                                            <label htmlFor="doc-tax" className="cursor-pointer">
                                                <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                                <p className="text-slate-700 font-medium">Upload Tax/PAN Documents</p>
                                                <p className="text-slate-400 text-xs mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                            </label>
                                        </div>
                                        {documents.filter(d => d.category === "Tax/PAN Document").length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {documents.filter(d => d.category === "Tax/PAN Document").map((doc) => (
                                                    <div key={doc.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                                                            <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeDocument(doc.id)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Other Documents */}
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">Operating License / Other Documents</h4>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) => handleDocumentUpload(e, "Other Document")}
                                                className="hidden"
                                                id="doc-other"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                            />
                                            <label htmlFor="doc-other" className="cursor-pointer">
                                                <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                                <p className="text-slate-700 font-medium">Upload Other Documents</p>
                                                <p className="text-slate-400 text-xs mt-1">Optional</p>
                                            </label>
                                        </div>
                                        {documents.filter(d => d.category === "Other Document").length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {documents.filter(d => d.category === "Other Document").map((doc) => (
                                                    <div key={doc.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                                                            <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeDocument(doc.id)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 8: Review & Submit */}
                            {currentStep === 8 && (
                                <div className="space-y-5">
                                    <section className="border-b border-slate-200 pb-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Basic Information</h3>
                                            <button type="button" onClick={() => setCurrentStep(1)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                                            <p><span className="font-medium">Hospital Name:</span> {formData.hospitalName || "-"}</p>
                                            <p><span className="font-medium">Hospital Type:</span> {formData.hospitalType || "-"}</p>
                                            <p className="md:col-span-2"><span className="font-medium">Location:</span> {formData.hospitalLocation || "-"}</p>
                                            <p className="md:col-span-2"><span className="font-medium">Map URL:</span> {formData.hospitalMapURL || "-"}</p>
                                            <p className="md:col-span-2"><span className="font-medium">Description:</span> {formData.hospitalDescription || "-"}</p>
                                        </div>
                                    </section>

                                    <section className="border-b border-slate-200 pb-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Legal Details</h3>
                                            <button type="button" onClick={() => setCurrentStep(2)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                                            <p><span className="font-medium">Registration Number:</span> {formData.registrationNumber || "-"}</p>
                                            <p><span className="font-medium">Year Established:</span> {formData.yearEstablished || "-"}</p>
                                            <p className="md:col-span-2"><span className="font-medium">License Authority:</span> {formData.licenseAuthority || "-"}</p>
                                        </div>
                                    </section>

                                    <section className="border-b border-slate-200 pb-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Contact Information</h3>
                                            <button type="button" onClick={() => setCurrentStep(3)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                                            <p><span className="font-medium">Primary Email:</span> {formData.primaryEmail || "-"}</p>
                                            <p><span className="font-medium">Primary Phone:</span> {formData.primaryPhone || "-"}</p>
                                            <p><span className="font-medium">Reception Number:</span> {formData.receptionNumber || "-"}</p>
                                            <p><span className="font-medium">Alternate Email:</span> {formData.alternateEmail || "-"}</p>
                                            <p><span className="font-medium">Alternate Phone:</span> {formData.alternatePhone || "-"}</p>
                                            <p><span className="font-medium">Website:</span> {formData.websiteURL || "-"}</p>
                                        </div>
                                    </section>

                                    <section className="border-b border-slate-200 pb-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Admin Account</h3>
                                            <button type="button" onClick={() => setCurrentStep(4)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                                            <p><span className="font-medium">Admin Name:</span> {formData.adminName || "-"}</p>
                                            <p><span className="font-medium">Admin Email:</span> {formData.adminEmail || "-"}</p>
                                            <p><span className="font-medium">Admin Phone:</span> {formData.adminPhone || "-"}</p>
                                            <p><span className="font-medium">Admin DOB:</span> {formData.adminDob || "-"}</p>
                                            <p><span className="font-medium">Admin Gender:</span> {formData.adminGender || "-"}</p>
                                            <p><span className="font-medium">Password:</span> {formData.adminPassword ? "Set" : "-"}</p>
                                        </div>
                                    </section>

                                    <section className="border-b border-slate-200 pb-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Medical Services</h3>
                                            <button type="button" onClick={() => setCurrentStep(5)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm text-slate-700">
                                            <p><span className="font-medium">Departments:</span> {(formData.medicalDepartments || []).join(", ") || "-"}</p>
                                            <p><span className="font-medium">Hospital Services:</span> {(formData.hospitalServices || []).join(", ") || "-"}</p>
                                        </div>
                                    </section>

                                    <section className="border-b border-slate-200 pb-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Availability</h3>
                                            <button type="button" onClick={() => setCurrentStep(6)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                                            <p><span className="font-medium">Emergency Services:</span> {formData.emergencyServices ? "Available 24/7" : "Not available"}</p>
                                            <p><span className="font-medium">Operating Hours:</span> {formData.openingTime || "-"} - {formData.closingTime || "-"}</p>
                                            <p className="md:col-span-2"><span className="font-medium">Days Open:</span> {(formData.daysOpen || []).join(", ") || "-"}</p>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Uploaded Documents</h3>
                                            <button type="button" onClick={() => setCurrentStep(7)} className="text-xs font-semibold text-emerald-700 hover:underline">Edit</button>
                                        </div>
                                        <div className="space-y-2 text-sm text-slate-700">
                                            <p><span className="font-medium">Admin Citizenship Front:</span> {adminCitizenshipFront?.name || "-"}</p>
                                            <p><span className="font-medium">Admin Citizenship Back:</span> {adminCitizenshipBack?.name || "-"}</p>
                                            {["Registration Certificate", "Tax/PAN Document", "Other Document"].map((category) => (
                                                <p key={category}>
                                                    <span className="font-medium">{category}:</span>{" "}
                                                    {documents.filter((d) => d.category === category).length
                                                        ? documents.filter((d) => d.category === category).map((d) => d.name).join(", ")
                                                        : "-"}
                                                </p>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    disabled={currentStep === 1}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${currentStep === 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:bg-slate-100"}`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>

                                {currentStep < steps.length ? (
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

export default RegisterHospital;

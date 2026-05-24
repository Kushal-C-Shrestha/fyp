import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getVerificationDocumentViewPath, openProtectedFile } from "../../utils/fileAccess";
import { ChevronLeft, Check, X, FileText, Calendar, User, Phone, Mail, MapPin, Briefcase } from "lucide-react";

const formatAppointmentDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatText = (value) => {
  const normalized = String(value || "").trim();
  return normalized || "-";
};

const formatList = (value) => {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.map((item) => formatText(item)).join(", ");
};

const formatExperienceRange = (startDate, endDate) => {
  const startLabel = formatAppointmentDate(startDate);
  const endLabel = endDate ? formatAppointmentDate(endDate) : "Present";
  return `${startLabel} to ${endLabel}`;
};

const DetailRow = ({ label, value, icon: Icon, href, linkLabel }) => (
  <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
    {Icon && (
      <div className="mt-0.5 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-sky-600 hover:text-sky-700 hover:underline">
            {linkLabel || value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  </div>
);

const AdminDoctorRequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const loadRequest = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/admin/doctor-requests/${requestId}`);
        setRequest(data?.request);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load doctor request details.");
      } finally {
        setLoading(false);
      }
    };

    if (requestId) loadRequest();
  }, [requestId]);

  const handleVerify = async (status) => {
    try {
      setVerifying(true);
      setError("");
      await api.put(`/doctor-requests/${requestId}/verify`, { status });
      setRequest(prev => ({ ...prev, request_status: status }));
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${status} request.`);
    } finally {
      setVerifying(false);
    }
  };

  const openDocument = async (document) => {
    try {
      setError("");
      await openProtectedFile(
        getVerificationDocumentViewPath(document?.id),
        document?.file_name || document?.document_type || "verification-document"
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open document.");
    }
  };

  const Section = ({ title, children }) => (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h3>
      {children}
    </section>
  );

  const DetailGrid = ({ children }) => (
    <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
      {children}
    </div>
  );

  if (loading) {
    return (
      <>
        <div className="flex h-[60vh] items-center justify-center font-medium text-slate-500">
          Loading request details...
        </div>
      </>
    );
  }

  if (error && !request) {
    return (
      <>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-rose-700">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm font-semibold text-rose-800 hover:underline"
          >
            Go back
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Requests
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              request.request_status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
              request.request_status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
              {request.request_status}
            </span>
            <span className="text-xs font-medium text-slate-500">
              Submitted {formatAppointmentDate(request.created_at)}
            </span>

            {request?.request_status?.toLowerCase() === "pending" && (
              <>
              <button
                onClick={() => handleVerify("rejected")}
                disabled={verifying}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-3.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
              <button
                onClick={() => handleVerify("approved")}
                disabled={verifying}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-700 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Approve Registration
              </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) }

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
          <div className="space-y-5">
          {/* Basic Info */}
          <Section title="Basic Information">
              <DetailGrid>
                <DetailRow label="Full Name" value={formatText(request.doctor_name)} icon={User} />
                <DetailRow label="Email Address" value={formatText(request.doctor_email)} icon={Mail} />
                <DetailRow label="Phone Number" value={formatText(request.doctor_phone)} icon={Phone} />
                <DetailRow label="Gender" value={formatText(request.doctor_gender)} icon={User} />
                <DetailRow label="Date of Birth" value={formatAppointmentDate(request.doctor_date_of_birth)} icon={Calendar} />
                <DetailRow label="Address" value={formatText(request.doctor_address)} icon={MapPin} />
              </DetailGrid>
            </Section>

            <Section title="Education & Work">
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Qualifications</p>
                  {Array.isArray(request.qualifications) && request.qualifications.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {request.qualifications.map((q, idx) => (
                        <div key={idx} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px] sm:items-center">
                          <p className="text-sm font-semibold text-slate-900">{formatText(q.degree_name)}</p>
                          <p className="text-sm text-slate-600">{formatText(q.institution)}</p>
                          <p className="text-xs font-medium text-slate-500">{formatAppointmentDate(q.graduation_date)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No qualifications provided.</p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Work Experience</p>
                  {Array.isArray(request.experiences) && request.experiences.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {request.experiences.map((e, idx) => (
                        <div key={idx} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px] sm:items-center">
                          <p className="text-sm font-semibold text-slate-900">{formatText(e.position)}</p>
                          <p className="text-sm text-slate-600">{formatText(e.organization)}</p>
                          <p className="text-xs font-medium text-slate-500">{formatExperienceRange(e.start_date, e.end_date)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No professional experience listed.</p>
                  )}
                </div>
              </div>
            </Section>

          {/* Professional Stuff */}
            <Section title="Professional Profile">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="License Number" value={formatText(request.doctor_license_number)} icon={FileText} />
                <DetailRow label="Experience" value={`${formatText(request.doctor_experience_years)} Years`} icon={Briefcase} />
              </div>
              <div className="mt-6 border-t border-slate-100 pt-6">
                <DetailRow label="Specializations" value={formatList(request.specializations)} />
                <div className="mt-8">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Professional Summary</dt>
                  <dd className="mt-3 max-w-3xl break-words text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {formatText(request.doctor_description)}
                  </dd>
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-5">
            <Section title="Verification Documents">
              {Array.isArray(request.verification_documents) && request.verification_documents.length > 0 ? (
                <div className="space-y-3">
                  {request.verification_documents.map((doc, idx) => (
                    <div key={idx} className="group relative rounded-xl border border-slate-200 p-3 transition">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-50 p-2 text-slate-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{formatText(doc.document_type)}</p>
                          <p className="truncate text-[10px] text-slate-400 uppercase tracking-tight">{formatText(doc.file_name)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => openDocument(doc)}
                        className="mt-3 w-full rounded-lg border border-slate-100 bg-slate-50/50 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        View Document
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No documents uploaded.</p>
              )}
            </Section>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDoctorRequestDetail;

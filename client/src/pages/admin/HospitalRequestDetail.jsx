import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Modal from "../../components/ui/Modal";
import { getVerificationDocumentViewPath, openProtectedFile } from "../../utils/fileAccess";
import { DUMMY_HOSPITAL_REQUEST_ID, dummyHospitalRequest } from "../../utils/adminRequestDummies";
import { ChevronLeft, Check, X, FileText, Calendar, User, Phone, Mail, MapPin, Building2, Globe, Clock, ShieldCheck, Ambulance } from "lucide-react";

const formatAppointmentDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatAppointmentTime = (value) => {
  if (!value) return '-';
  const [hh, mm] = String(value).split(':');
  const h = parseInt(hh, 10);
  return `${h % 12 || 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
};

const formatText = (value) => {
  const normalized = String(value || "").trim();
  return normalized || "-";
};

const formatList = (value) => {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.map((item) => formatText(item)).join(", ");
};

const formatBoolean = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
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

const AdminHospitalRequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const loadRequest = async () => {
      try {
        setLoading(true);
        setError("");
        if (String(requestId) === DUMMY_HOSPITAL_REQUEST_ID) {
          setRequest(dummyHospitalRequest);
          return;
        }
        const { data } = await api.get(`/admin/hospital-requests/${requestId}`);
        setRequest(data?.request);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load hospital request details.");
      } finally {
        setLoading(false);
      }
    };

    if (requestId) loadRequest();
  }, [requestId]);

  const handleVerify = async (status, reason = "") => {
    try {
      setVerifying(true);
      setError("");
      if (String(requestId) === DUMMY_HOSPITAL_REQUEST_ID) {
        setRequest(prev => ({ ...prev, request_status: status }));
        setShowRejectModal(false);
        setRejectionReason("");
        return;
      }
      await api.put(`/hospital-requests/${requestId}/verify`, {
        verify: status,
        reason: String(reason || "").trim() || null,
      });
      setRequest(prev => ({ ...prev, request_status: status }));
      setShowRejectModal(false);
      setRejectionReason("");
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
                onClick={() => {
                  setRejectionReason("");
                  setShowRejectModal(true);
                }}
                disabled={verifying}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600">
                  <X className="h-3.5 w-3.5" />
                </span>
                Reject
              </button>
              <button
                onClick={() => handleVerify("approved")}
                disabled={verifying}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-700 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Approve Hospital
              </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) }

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
          <div className="space-y-5">
          {/* Organization & Request Info */}
          <Section title="Hospital Overview">
              <DetailGrid>
                <DetailRow label="Hospital Name" value={formatText(request.hospital_name)} icon={Building2} />
                <DetailRow label="Reg. Number" value={formatText(request.registration_number)} icon={FileText} />
                <DetailRow label="Type" value={formatText(request.hospital_type_label)} icon={ShieldCheck} />
                <DetailRow label="Established" value={request.hospital_established_year} icon={Calendar} />
                <DetailRow label="Website" value={request.hospital_website || "No website"} icon={Globe} href={request.hospital_website} />
              </DetailGrid>
            </Section>

            <Section title="Admin Account">
              <DetailGrid>
                <DetailRow label="Admin Name" value={formatText(request.admin_name)} icon={User} />
                <DetailRow label="Admin Email" value={formatText(request.admin_email)} icon={Mail} />
                <DetailRow label="Admin Phone" value={formatText(request.admin_phone)} icon={Phone} />
                <DetailRow label="Address" value={formatText(request.admin_address)} icon={MapPin} />
              </DetailGrid>
            </Section>

            <Section title="Request Data">
              <DetailGrid>
                <DetailRow label="Request ID" value={request.request_id} />
                <DetailRow label="Status" value={
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    request.request_status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    request.request_status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}>
                    {request.request_status}
                  </span>
                } />
                <DetailRow label="Date Submitted" value={formatAppointmentDate(request.created_at)} icon={Calendar} />
              </DetailGrid>
            </Section>

          {/* Detailed Hospital Data */}
            <Section title="Location & Operations">
              <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2 text-sm">
                 <div className="sm:col-span-2">
                    <DetailRow label="Full Address" value={formatText(request.hospital_address)} icon={MapPin} />
                 </div>
                 <DetailRow label="Opening Time" value={formatAppointmentTime(request.hospital_opening_time)} icon={Clock} />
                 <DetailRow label="Closing Time" value={formatAppointmentTime(request.hospital_closing_time)} icon={Clock} />
                 <div className="sm:col-span-2">
                    <DetailRow label="Operational Days" value={formatList(request.hospital_days_open)} icon={Calendar} />
                 </div>
                 <DetailRow label="Emergency Services" value={formatBoolean(request.hospital_emergency_services)} icon={Ambulance} />
                 <DetailRow label="License Authority" value={formatText(request.hospital_license_authority)} icon={ShieldCheck} />
              </div>
            </Section>
          </div>

          <div className="space-y-5">
            <Section title="Hospital Details">
              <div className="space-y-8 text-sm">
                <div>
                   <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Departments</dt>
                   <dd className="mt-3 flex flex-wrap gap-2">
                      {Array.isArray(request.departments) && request.departments.length > 0 ? (
                         request.departments.map((d, i) => (
                            <span key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 font-medium text-slate-700">{d}</span>
                         ))
                      ) : "None specified"}
                   </dd>
                </div>
                <div className="pt-8 border-t border-slate-100">
                   <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Facilities</dt>
                   <dd className="mt-3 flex flex-wrap gap-2">
                      {Array.isArray(request.facilities) && request.facilities.length > 0 ? (
                         request.facilities.map((f, i) => (
                            <span key={i} className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">{f}</span>
                         ))
                      ) : "None specified"}
                   </dd>
                </div>
                <div className="pt-8 border-t border-slate-100">
                   <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">About Hospital</dt>
                   <dd className="mt-3 leading-relaxed text-slate-700 max-w-3xl">{formatText(request.hospital_description)}</dd>
                </div>
              </div>
            </Section>

            <Section title="Contact Information">
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 text-sm divide-y divide-slate-100">
                 <div className="sm:col-span-2 pb-2"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">External Contacts</p></div>
                 <DetailRow label="Pr. Email" value={formatText(request.hospital_primary_email)} icon={Mail} />
                 <DetailRow label="Pr. Phone" value={formatText(request.hospital_primary_phone)} icon={Phone} />
                 <DetailRow label="Alt. Email" value={formatText(request.hospital_alternate_email)} icon={Mail} />
                 <DetailRow label="Alt. Phone" value={formatText(request.hospital_alternate_phone)} icon={Phone} />
                 <div className="sm:col-span-2 pt-8 pb-2"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Internal / Reception</p></div>
                 <DetailRow label="Reception" value={formatText(request.hospital_reception_phone)} icon={Phone} />
                 <DetailRow label="Alt. Reception" value={formatText(request.hospital_alternate_reception_phone)} icon={Phone} />
              </div>
            </Section>

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
        <Modal
          isOpen={showRejectModal}
          onClose={() => {
            if (verifying) return;
            setShowRejectModal(false);
            setRejectionReason("");
          }}
          title="Reject Hospital Request"
          subtitle="Add a short reason so the hospital admin understands what needs to change."
          size="md"
          footer={(
            <>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={verifying}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerify("rejected", rejectionReason)}
                disabled={verifying || !rejectionReason.trim()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying ? "Rejecting..." : "Reject Request"}
              </button>
            </>
          )}
        >
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Reason</span>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={5}
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-sky-100"
              placeholder="Example: Missing license document or unclear registration details."
            />
          </label>
        </Modal>
    </>
  );
};

export default AdminHospitalRequestDetail;

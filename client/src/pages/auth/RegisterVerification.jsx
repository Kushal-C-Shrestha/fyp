import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthHeader from "../../components/AuthHeader.jsx";
import api from "../../api/axios.js";

const RESEND_COOLDOWN = 30;

const formatCountdown = (seconds) =>
  `00:${String(seconds).padStart(2, "0")}`;

const RegisterVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = String(location.state?.email || "").trim();

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  if (!email) {
    navigate("/register", { replace: true });
    return null;
  }

  const handleDigitChange = (index, value) => {
    const next = value.replace(/\D/g, "").slice(-1);
    const digits = [...otpDigits];
    digits[index] = next;
    setOtpDigits(digits);
    if (next && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const digits = ["", "", "", "", "", ""];
    pasted.split("").forEach((d, i) => { digits[i] = d; });
    setOtpDigits(digits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const otp = otpDigits.join("");
    if (otp.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await api.post("/auth/register/verify-otp", { email, otp });
      if (data.success) {
        let registrationData = sessionStorage.getItem("registrationData")
          ? JSON.parse(sessionStorage.getItem("registrationData"))
          : {};
        registrationData = { ...registrationData, registrationToken: data.token };
        const { data: registration } = await api.post("/auth/register", registrationData);
        if (registration.success) {
          sessionStorage.removeItem("registrationData");
          navigate("/login", { replace: true, state: { message: "Registration successful. Please login." } });
        }
      }
    } catch (err) {
      const message = err?.response?.data?.message || "";
      const status = err?.response?.status;
      const lower = message.toLowerCase();
      if (status === 410 || lower.includes("expired") || lower.includes("already been used") || lower.includes("no otp was found")) {
        setError(message || "This code has expired or was already used. Please request a new one.");
      } else if (status === 400 && (lower.includes("incorrect") || lower.includes("invalid otp"))) {
        setError("Incorrect code. Please check and try again.");
      } else if (lower.includes("phone")) {
        sessionStorage.removeItem("registrationData");
        navigate("/register", { replace: true, state: { fieldError: { field: "phone", message } } });
      } else if (lower.includes("email")) {
        sessionStorage.removeItem("registrationData");
        navigate("/register", { replace: true, state: { fieldError: { field: "email", message } } });
      } else {
        setError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      setResending(true);
      await api.post("/auth/register/resend-otp", { email });
      setOtpDigits(["", "", "", "", "", ""]);
      setCountdown(RESEND_COOLDOWN);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const message = err?.response?.data?.message || "";
      if (message.toLowerCase().includes("email")) {
        
        sessionStorage.removeItem("registrationData");
        navigate("/login", { replace: true, state: { message: "This email is already registered. Please log in." } });
      } else {
        setError(message || "Failed to resend code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  const canResend = countdown <= 0 && !resending;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthHeader promptText="Already have an account?" actionText="Login" actionTo="/login" />

      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <section className="mx-auto w-full max-w-90">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Email Verification
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Check your email
              </h1>
              <p className="text-sm leading-7 text-slate-600">
                We sent a 6-digit code to <span className="font-semibold text-slate-800">{email}</span>. It expires in 5 minutes.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-6 gap-2.5" onPaste={handlePaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    placeholder="0"
                    className="h-12 w-full rounded-lg bg-slate-100 text-center text-lg font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:placeholder-transparent focus:ring-2 focus:ring-emerald-600"
                  />
                ))}
              </div>

              {error ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Verifying…" : "Verify"}
              </button>
            </form>

            <div className="flex items-center justify-between gap-4 text-sm">
              <p className="text-slate-600">
                Wrong email?{" "}
                <Link to="/register" className="font-semibold text-emerald-700 hover:underline">
                  Edit
                </Link>
              </p>

              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend code"}
                </button>
              ) : (
                <span className="text-sm text-slate-400">
                  Resend in {formatCountdown(countdown)}
                </span>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RegisterVerification;

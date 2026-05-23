import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import AuthHeader from "../../components/AuthHeader.jsx";
import Modal from "../../components/ui/Modal.jsx";

const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  const identifier = location.state?.identifier;

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");

  const isOtpVerified = Boolean(resetToken);

  useEffect(() => {
    if (!identifier) navigate("/login", { replace: true });
  }, [identifier]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleDigitChange = (index, value) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = nextValue;
    setOtpDigits(nextDigits);

    if (nextValue && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pastedValue = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (!pastedValue) {
      return;
    }

    event.preventDefault();

    const nextDigits = ["", "", "", "", "", ""];
    pastedValue.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });
    setOtpDigits(nextDigits);

    const nextFocusIndex = Math.min(pastedValue.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter the 6 digit OTP.");
      return;
    }
    setIsSubmitting(true);

    // Verifying the OTP and getting the reset token.
    try {
      const { data } = await api.post("/auth/forgot-password/verify-otp", { identifier, otp });
      if (!data?.token) throw new Error("Reset token missing.");
      setError("");
      setResetToken(data.token);
      sessionStorage.setItem("passwordResetToken", data.token);
    } catch (err) {
      const message = err?.response?.data?.message || "";
      const status = err?.response?.status;
      const lower = message.toLowerCase();
      if (status === 410 || lower.includes("expired") || lower.includes("already been used") || lower.includes("no otp was found")) {
        setError(message || "This code has expired or was already used. Please request a new one.");
      } else if (status === 400 && (lower.includes("incorrect") || lower.includes("invalid otp"))) {
        setError("Incorrect code. Please check and try again.");
      } else {
        setError(message || "Unable to verify code. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      setResending(true);
      await api.post("/auth/forgot-password/resend-otp", { identifier });
      setOtpDigits(["", "", "", "", "", ""]);
      setCountdown(30);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post("/auth/forgot-password/reset-password", {
        resetToken,
        newPassword,
        confirmPassword,
      });

      sessionStorage.removeItem("passwordResetIdentifier");
      sessionStorage.removeItem("passwordResetToken");
      setResetSuccessMessage(data?.message || "Password reset successfully. Please login.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccessModal = () => {
    navigate("/login", {
      replace: true,
      state: { message: resetSuccessMessage || "Password reset successfully. Please login." },
    });
  };

  if (!identifier) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthHeader promptText="Remember your password?" actionText="Login" actionTo="/login" />

      <Modal
        isOpen={Boolean(resetSuccessMessage)}
        onClose={closeSuccessModal}
        title="Password reset successful"
        subtitle={resetSuccessMessage}
        variant="success"
        size="sm"
        footer={
          <button
            type="button"
            onClick={closeSuccessModal}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Back to login
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          You can now sign in using your new password.
        </p>
      </Modal>

      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <section className="mx-auto w-full max-w-90">
          <div className="space-y-6">
            {!isOtpVerified ? (
              <>
                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Email Verification
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    An OTP has been sent to
                  </h1>
                  <p className="mx-auto max-w-70 break-all text-sm font-semibold text-slate-700">
                    {identifier}
                  </p>
                  <p className="text-sm leading-7 text-slate-600">
                    Please enter the 6 digit code we sent to your email to continue with resetting your password.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleVerifyOtp}>
                  <div className="grid grid-cols-6 gap-2.5" onPaste={handlePaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          inputRefs.current[index] = element;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={digit}
                        onChange={(event) => handleDigitChange(index, event.target.value)}
                        onKeyDown={(event) => handleKeyDown(index, event)}
                        placeholder="0"
                        className="h-12 w-full rounded-lg bg-slate-100 text-center text-lg font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:placeholder-transparent focus:ring-2 focus:ring-emerald-600"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </form>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <p className="text-slate-600">
                    Wrong email?{" "}
                    <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                      Edit
                    </Link>
                  </p>

                  {countdown > 0 || resending ? (
                    <span className="text-sm text-slate-400">
                      {resending ? "Sending…" : `Resend in 00:${String(countdown).padStart(2, "0")}`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-sm font-semibold text-emerald-700 hover:underline"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Reset Password
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Create a new password
                  </h1>
                  <p className="text-sm leading-7 text-slate-600">
                    Your OTP has been verified. Enter your new password below.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleResetPassword}>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="New password"
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ForgotPassword;

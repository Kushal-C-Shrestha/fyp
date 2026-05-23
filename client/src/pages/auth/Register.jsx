import React, { useEffect, useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, Building2, Stethoscope, Calendar, Users, MapPin } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUserSchema } from "../../schemas/registerUserSchema";
import api from "../../api/axios.js";
import AuthHeader from "../../components/AuthHeader.jsx";

import { generateKeyPair, encryptPrivateKey, saveEncryptedPrivateKey } from "../../utils/encryptionKeys.js";
import { encodeBase64 } from "tweetnacl-util";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerUserSchema) });

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    const fieldError = location.state?.fieldError;
    if (fieldError?.field && fieldError?.message) {
      setError(fieldError.field, { type: "server", message: fieldError.message });
    }
  }, [location.state, setError]);



  const handleRegister = async (formData) => {
    const payload = { ...formData };
    delete payload.agreeToTerms;

    // Generating key pair and encrypting private key before sending to server for e2ee.
    const keyPair = await generateKeyPair();
    const encryptedPrivateKeyData = await encryptPrivateKey(keyPair.secretKey, formData.password);
    // Attaching the keys to the payload for the backend.
    payload.publicKey = keyPair.publicKey;
    payload.encryptedPrivateKey = {
      data: encodeBase64(encryptedPrivateKeyData.encryptedData),
      salt: encodeBase64(encryptedPrivateKeyData.salt),
      iv: encodeBase64(encryptedPrivateKeyData.iv)
    };
    // Saving the encrypted private key locally in the indexedDB for later use.
    try {
      await saveEncryptedPrivateKey(payload.encryptedPrivateKey);
    } catch (error) {
      console.error("Failed to save encrypted private key locally.", error);
    }
    
    try {
      const { data } = await api.post("/auth/register/send-otp", payload);
      if (data.success) {
        sessionStorage.setItem("registrationData", JSON.stringify(payload));
      }
      navigate("/register/verify-otp", {
        replace: true,
        state: { email: payload.email },
      });
    } catch (error) {
      const message = error?.response?.data?.message || "";
      const lower = message.toLowerCase();
      if (lower.includes("email")) {
        setError("email", { type: "server", message });
      } else if (lower.includes("phone")) {
        setError("phone", { type: "server", message });
      } else {
        setError("root", { type: "server", message: message || "Registration failed. Please try again." });
      }
    }
  };

  const inputBase =
    "w-full rounded-lg border bg-white px-3 py-2.5 pl-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-0";
  const primaryButtonBase =
    "inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthHeader promptText="Already have an account?" actionText="Login" actionTo="/login" />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-6 lg:pr-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-slate-900">Create your account</h1>
              <p className="text-sm text-slate-600">
                For patients: sign up to book appointments and manage your care journey.
              </p>
            </div>

            <form onSubmit={handleSubmit(handleRegister)} className="space-y-6 pt-4">
              {errors.root ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.root.message}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      {...register("fullname")}
                      className={`${inputBase} ${errors.fullname ? "border-rose-300" : "border-slate-300"}`}
                    />
                  </div>
                  {errors.fullname && <p className="text-xs text-rose-500">{errors.fullname.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Address"
                      {...register("address")}
                      className={`${inputBase} ${errors.address ? "border-rose-300" : "border-slate-300"}`}
                    />
                  </div>
                  {errors.address && <p className="text-xs text-rose-500">{errors.address.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Phone"
                      {...register("phone")}
                      className={`${inputBase} ${errors.phone ? "border-rose-300" : "border-slate-300"}`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Email"
                      {...register("email")}
                      className={`${inputBase} ${errors.email ? "border-rose-300" : "border-slate-300"}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      {...register("dateOfBirth")}
                      className={`${inputBase} ${errors.dateOfBirth ? "border-rose-300" : "border-slate-300"}`}
                    />
                  </div>
                  {errors.dateOfBirth && <p className="text-xs text-rose-500">{errors.dateOfBirth.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      {...register("gender")}
                      className={`${inputBase} ${errors.gender ? "border-rose-300" : "border-slate-300"}`}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {errors.gender && <p className="text-xs text-rose-500">{errors.gender.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Password"
                      {...register("password")}
                      className={`${inputBase} pr-10 ${errors.password ? "border-rose-300" : "border-slate-300"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="Confirm Password"
                      {...register("confirmPassword")}
                      className={`${inputBase} pr-10 ${errors.confirmPassword ? "border-rose-300" : "border-slate-300"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-rose-500">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    {...register("agreeToTerms")}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-0"
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/terms" className="text-emerald-700 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-emerald-700 hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms && <p className="text-xs text-rose-500">{errors.agreeToTerms.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className={primaryButtonBase}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          </section>

          <aside className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-8">
            <div>
              <p className="text-base font-bold uppercase tracking-[0.12em] text-emerald-700">For providers</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Register as a hospital or doctor to manage your profile and appointments.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <Link to="/register/hospital" className="btn-ghost px-3 py-2 gap-2 text-center">
                <Building2 className="h-4 w-4" />
                Hospital
              </Link>
              <Link to="/register/doctor" className="btn-ghost px-3 py-2 gap-2 text-center">
                <Stethoscope className="h-4 w-4" />
                Doctor
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <footer className="px-4 pb-4 sm:px-6">
        <p className="mx-auto max-w-2xl text-center text-xs leading-5 text-slate-500">
          By clicking on Create account you acknowledge that you have read and understood and agree to the{" "}
          <Link to="/terms" className="text-emerald-700 underline underline-offset-2">
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-emerald-700 underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  );
};

export default Register;

import React, { useState } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios.js";
import googleIcon from "../../assets/googleIcon.svg";
import AuthHeader from "../../components/AuthHeader.jsx";
import { loginSchema } from "../../schemas/loginSchema.js";
import { getDefaultRouteForRole } from "../../utils/roleRouting.js";



const Login = () => {
  const { setAccessToken, setUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    watch
  } = useForm({ resolver: zodResolver(loginSchema) });

  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [forgotError, setForgotError] = useState("");

  const handleLoginSubmit = handleSubmit(async (data) => {
    try {
      const { data: newData } = await api.post("/auth/login", data);
      setUser(newData.user);
      setAccessToken(newData.accessToken);
      navigate(getDefaultRouteForRole(newData?.user?.role));
    } catch (error) {
      const message = error?.response?.data?.message || "Login failed. Please try again.";
      const status = error?.response?.status;
      if (status === 403) {
        setError("password", { type: "server", message });
      } else if (status === 404) {
        setError("username", { type: "server", message });
      } else {
        setError("root", { type: "server", message });
      }
    }
  });

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setGoogleError("");
        const { data } = await api.post("/auth/google", { accessToken: tokenResponse.access_token });
        setUser(data.user);
        setAccessToken(data.accessToken);
        navigate(getDefaultRouteForRole(data?.user?.role));
      } catch (error) {
        setGoogleError(error?.response?.data?.message || "Google sign-in failed. Please try again.");
      }
    },
    onError: () => setGoogleError("Google sign-in was cancelled or failed."),
  });

  const handleGoogleSignIn = () => {
    setGoogleError("");
    googleLogin();
  };

  const handleForgotPassword = async () => {
    setForgotError("");
    const identifier = watch("username");
    if (!identifier) {
      setForgotError("Enter your email or phone above first.");
      return;
    }

    try {
      const { data } = await api.post("/auth/forgot-password/send-otp", { identifier });
      if (data?.success) {
        sessionStorage.removeItem("passwordResetToken");
        sessionStorage.setItem("passwordResetIdentifier", identifier);
        navigate("/forgot-password", { state: { identifier } });
      }
    } catch (error) {
      setForgotError(error?.response?.data?.message || "Failed to send OTP. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AuthHeader promptText="Don't have an account?" actionText="Register" actionTo="/register" />

      <main className="flex flex-1 justify-center px-6 py-8">
        <div className="w-[clamp(360px,30vw,520px)] p-2 sm:p-4">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold leading-none text-slate-700 transition hover:bg-slate-50"
          >
            <img src={googleIcon} alt="Google" className="block h-4 w-4 self-center" />
            Continue with Google
          </button>
          {googleError ? (
            <p className="mt-2 text-xs text-rose-500">{googleError}</p>
          ) : null}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200"></div>
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {errors.root ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.root.message}</p>
            ) : null}
            <div className="space-y-1.5">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Email or Phone"
                  {...register("username")}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-0 ${errors.username ? "border-rose-300" : "border-slate-300"
                    }`}
                />
              </div>
              {errors.username && <p className="mt-1 text-xs text-rose-500">{errors.username.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  {...register("password")}
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-0 ${errors.password ? "border-rose-300" : "border-slate-300"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="block h-4 w-4 self-center" /> : <Eye className="block h-4 w-4 self-center" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-0" />
                Remember me
              </label>
              <a className="text-sm text-emerald-700 cursor-pointer" onClick={handleForgotPassword}>Forgot password?</a>
            </div>
            {forgotError ? (
              <p className="text-xs text-rose-500">{forgotError}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </main>

      <footer className="mt-auto px-4 pb-6 sm:px-6">
        <p className="mx-auto max-w-2xl text-center text-xs leading-5 text-slate-500">
          By clicking on Continue with Google you acknowledge that you have read and understood and agree to the{" "}
          <a href="" className="text-emerald-700 underline underline-offset-2">
            Terms and Conditions
          </a>{" "}
          and{" "}
          <a href="" className="text-emerald-700 underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </div>
  );
};

export default Login;




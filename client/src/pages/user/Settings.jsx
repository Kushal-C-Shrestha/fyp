import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const normalizeDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [savedMessage, setSavedMessage] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    const applySettings = (settings) => {
      const account = settings?.account || {};

      setForm({
        ...emptyForm,
        fullName: account.fullName || user?.name || user?.full_name || "",
        email: account.email || user?.email || "",
        phone: account.phone || user?.phone || "",
        gender: String(account.gender || user?.gender || "").trim().toLowerCase(),
        dateOfBirth: account.dateOfBirth || user?.dateOfBirth || "",
        address: account.address || user?.address || "",
      });
    };

    const applyFallback = () => {
      setForm({
        ...emptyForm,
        fullName: user?.name || user?.full_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        gender: String(user?.gender || "").trim().toLowerCase(),
        dateOfBirth: user?.dateOfBirth || "",
        address: user?.address || "",
      });
    };

    const loadSettings = async () => {
      try {
        setLoading(true);
        setErrors({});
        const { data } = await api.get("/auth/me/settings");
        applySettings(data?.settings || {});
      } catch (error) {
        applyFallback();
        setErrors({ general: error?.response?.data?.message || "Failed to load settings." });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadSettings();
    } else {
      applyFallback();
      setLoading(false);
    }
  }, [user?.address, user?.dateOfBirth, user?.email, user?.full_name, user?.gender, user?.id, user?.name, user?.phone]);

  const onFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const saveSettings = async () => {
    setErrors({});
    setSavedMessage("");

    const newErrors = {};
    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (!form.currentPassword) newErrors.currentPassword = "Current password is required.";
      if (!form.newPassword) newErrors.newPassword = "New password is required.";
      if (form.newPassword !== form.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        account: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          address: form.address,
        },
        security: {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        },
      };

      const { data } = await api.put("/auth/me/settings", payload);
      const updatedAccount = data?.settings?.account || {};

      setForm((prev) => ({
        ...prev,
        fullName: updatedAccount.fullName || prev.fullName,
        email: updatedAccount.email || prev.email,
        phone: updatedAccount.phone || prev.phone,
        gender: String(updatedAccount.gender || prev.gender).trim().toLowerCase(),
        dateOfBirth: updatedAccount.dateOfBirth || prev.dateOfBirth,
        address: updatedAccount.address || prev.address,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setUser((prev) => {
        const nextUser = data?.user || {};
        if (!prev) return prev;

        return {
          ...prev,
          ...nextUser,
          name: nextUser?.name || form.fullName || prev.name,
          full_name: nextUser?.full_name || form.fullName || prev.full_name,
          email: nextUser?.email || form.email || prev.email,
          phone: nextUser?.phone || form.phone || prev.phone,
          gender: nextUser?.gender || form.gender || prev.gender,
          dateOfBirth: nextUser?.dateOfBirth || form.dateOfBirth || prev.dateOfBirth,
          address: nextUser?.address || form.address || prev.address,
          profile_picture: nextUser?.profile_picture || prev.profile_picture || "",
        };
      });

      setSavedMessage(data?.message || "Settings updated successfully.");
      window.setTimeout(() => setSavedMessage(""), 2400);
    } catch (error) {
      const msg = error?.response?.data?.message || "Failed to save account settings.";
      if (msg.toLowerCase().includes("email")) setErrors({ email: msg });
      else if (msg.toLowerCase().includes("phone")) setErrors({ phone: msg });
      else if (msg.toLowerCase().includes("password")) setErrors({ currentPassword: msg });
      else setErrors({ general: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {errors.general ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errors.general}
          </div>
        ) : null}

        {savedMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {savedMessage}
          </div>
        ) : null}

        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
            <p className="mt-1 text-sm text-slate-500">
              These details are used across bookings and account communication.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Full name</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => onFieldChange("fullName", event.target.value)}
                className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.fullName ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
                placeholder="Enter your full name"
              />
              {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>}
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Email address</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.email ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Phone number</span>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.phone ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
                placeholder="98XXXXXXXX"
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Gender</span>
              <select
                value={form.gender}
                onChange={(event) => onFieldChange("gender", event.target.value)}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-slate-900 outline-none transition ${errors.gender ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <p className="mt-1 text-xs text-rose-600">{errors.gender}</p>}
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Date of birth</span>
              <input
                type="date"
                value={normalizeDateInput(form.dateOfBirth)}
                onChange={(event) => onFieldChange("dateOfBirth", event.target.value)}
                className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.dateOfBirth ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
              />
              {errors.dateOfBirth && <p className="mt-1 text-xs text-rose-600">{errors.dateOfBirth}</p>}
            </label>

            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Address</span>
              <textarea
                rows={4}
                value={form.address}
                onChange={(event) => onFieldChange("address", event.target.value)}
                className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.address ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
                placeholder="Add your current address"
              />
              {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
            </label>
          </div>
        </section>

        <section className="space-y-6 border-t border-slate-200 pt-8">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Leave these fields blank if you only want to update your personal details.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Current password</span>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(event) => onFieldChange("currentPassword", event.target.value)}
                  className={`w-full rounded-lg border pr-12 py-3 pl-4 text-slate-900 outline-none transition ${errors.currentPassword ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 transition hover:text-slate-600"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && <p className="mt-1 text-xs text-rose-600">{errors.currentPassword}</p>}
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">New password</span>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(event) => onFieldChange("newPassword", event.target.value)}
                  className={`w-full rounded-lg border pr-12 py-3 pl-4 text-slate-900 outline-none transition ${errors.newPassword ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 transition hover:text-slate-600"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="mt-1 text-xs text-rose-600">{errors.newPassword}</p>}
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-slate-700">Confirm new password</span>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(event) => onFieldChange("confirmPassword", event.target.value)}
                  className={`w-full rounded-lg border pr-12 py-3 pl-4 text-slate-900 outline-none transition ${errors.confirmPassword ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 transition hover:text-slate-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>}
            </label>
          </div>

          <div className="text-sm leading-6 text-slate-600">
            <p className="font-medium text-slate-800">Password tips</p>
            <p className="mt-2">
              Use 8-20 characters with uppercase, lowercase, a number, and a special character.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Save your changes</p>
            <p className="mt-1 text-sm text-slate-500">
              Updates are applied directly to your account and used in future bookings.
            </p>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={loading || saving}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : loading ? "Loading..." : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
};

export default Settings;

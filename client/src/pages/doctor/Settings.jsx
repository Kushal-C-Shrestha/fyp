import React, { useState, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios";
import UserAvatar from "../../components/UserAvatar";

const DoctorSettings = () => {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors({ photo: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ photo: "Image size should be less than 5MB." });
      return;
    }

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      setUploading(true);
      setErrors({});
      const { data } = await api.post("/auth/me/profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.success) {
        setUser((prev) => ({ ...prev, profile_picture: data.profile_picture }));
        setSavedMessage("Profile photo updated successfully!");
        window.setTimeout(() => setSavedMessage(""), 2400);
      }
    } catch (error) {
      setErrors({ photo: error.response?.data?.message || "Failed to upload photo." });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.profile_picture) return;

    try {
      setUploading(true);
      setErrors({});
      const { data } = await api.delete("/auth/me/profile-picture");
      if (data.success) {
        setUser((prev) => ({ ...prev, profile_picture: "" }));
        setSavedMessage("Profile photo removed successfully!");
        window.setTimeout(() => setSavedMessage(""), 2400);
      }
    } catch (error) {
      setErrors({ photo: error.response?.data?.message || "Failed to remove photo." });
    } finally {
      setUploading(false);
    }
  };

  const savePassword = async () => {
    setErrors({});
    setSavedMessage("");

    const newErrors = {};
    if (!form.currentPassword) newErrors.currentPassword = "Current password is required.";
    if (!form.newPassword) newErrors.newPassword = "New password is required.";
    if (form.newPassword.length < 8) newErrors.newPassword = "Password must be at least 8 characters.";
    if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        security: {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        },
      };

      await api.put("/doctors/me/settings", payload);
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSavedMessage("Password updated successfully!");
      window.setTimeout(() => setSavedMessage(""), 2400);
    } catch (error) {
      const msg = error?.response?.data?.message || "Failed to update password.";
      if (msg.toLowerCase().includes("current")) {
        setErrors({ currentPassword: msg });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.name || user?.full_name || "Doctor";

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

        {/* Profile Photo Section */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Profile Photo</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload or update your public profile picture.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                </div>
              )}
              <UserAvatar src={user?.profile_picture} name={displayName} size="h-full w-full" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Upload new photo
                </button>
                {user?.profile_picture && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">JPG, PNG or GIF. Max 5MB.</p>
              {errors.photo && <p className="text-xs font-semibold text-rose-600">{errors.photo}</p>}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </section>

        {/* Security & Password Section */}
        <section className="space-y-6 border-t border-slate-200 pt-8">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Security & Password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Change your password to keep your portal secure.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Current password</span>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => onFieldChange("currentPassword", e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.currentPassword ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
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
                  onChange={(e) => onFieldChange("newPassword", e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.newPassword ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
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
                  onChange={(e) => onFieldChange("confirmPassword", e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition ${errors.confirmPassword ? 'border-rose-500' : 'border-slate-200 focus:border-slate-400'}`}
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
        </section>

        {/* Action Panel */}
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Save your changes</p>
            <p className="mt-1 text-sm text-slate-500">
              Updates are applied directly to your account.
            </p>
          </div>

          <button
            type="button"
            onClick={savePassword}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
};

export default DoctorSettings;

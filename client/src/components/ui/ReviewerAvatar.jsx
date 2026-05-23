import React from "react";

/**
 * ReviewerAvatar
 *
 * Displays a reviewer's profile image with a letter fallback.
 *
 * Props
 * ─────
 * src   string   Profile image URL (optional)
 * name  string   Reviewer name (used for fallback initial and alt text)
 * size  string   Tailwind h-* w-* class pair, default "h-9 w-9"
 */
const ReviewerAvatar = ({ src = "", name = "", size = "h-9 w-9" }) => {
  const initial = String(name || "?").charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Reviewer"}
        className={`${size} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${size} flex items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500`}
    >
      {initial}
    </div>
  );
};

export default ReviewerAvatar;

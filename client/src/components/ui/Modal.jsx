import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/**
 * Modal
 *
 * A single-responsibility modal shell. Handles overlay, backdrop click,
 * Escape key, body scroll lock, and the header. Content and footer are
 * fully controlled by the caller via props.
 *
 * Props
 * ─────
 * isOpen    boolean           Controls visibility
 * onClose   () => void        Called on backdrop click or Escape key
 * title     string            Header heading (optional)
 * subtitle  string            Small line below the title (optional)
 * size      "sm"|"md"|"lg"|"xl"  Max-width of the panel (default "md")
 * zIndex    string            Tailwind z-* class override (default "z-[100]")
 * footer    ReactNode         Rendered in a bordered footer bar (optional)
 * children  ReactNode         Body content
 */

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
};

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle2,
    wrap: "bg-emerald-50 text-emerald-600",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "bg-amber-50 text-amber-600",
  },
  error: {
    icon: XCircle,
    wrap: "bg-rose-50 text-rose-600",
  },
  info: {
    icon: Info,
    wrap: "bg-sky-50 text-sky-600",
  },
};

const Modal = ({
  isOpen,
  onClose,
  title = "",
  subtitle = "",
  size = "md",
  zIndex = "z-[100]",
  variant = "",
  showIcon = true,
  footer,
  children,
}) => {
  const variantMeta = VARIANT_STYLES[variant];
  const Icon = variantMeta?.icon;

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 ${zIndex} flex items-start justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:p-4`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className={`my-auto flex max-h-[calc(100dvh-1.5rem)] w-full ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose || Icon) && (
          <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex min-w-0 items-start gap-3 pr-3">
              {Icon && showIcon && (
                <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${variantMeta.wrap}`}>
                  <Icon className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                {title && (
                  <h2 className="text-base font-bold leading-snug text-slate-900">{title}</h2>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                )}
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;

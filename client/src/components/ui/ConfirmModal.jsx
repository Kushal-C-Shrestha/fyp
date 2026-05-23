import React from "react";
import Modal from "./Modal";

const CONFIRM_BTN = {
  danger:  "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60",
  primary: "rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60",
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  tone = variant === "danger" ? "error" : "warning",
  loading = false,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    variant={tone}
    size="sm"
    footer={
      <>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={CONFIRM_BTN[variant] ?? CONFIRM_BTN.danger}
        >
          {loading ? "Please wait…" : confirmLabel}
        </button>
      </>
    }
  >
    {description && (
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
    )}
  </Modal>
);

export default ConfirmModal;

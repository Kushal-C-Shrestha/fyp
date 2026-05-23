import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Modal from "../ui/Modal";

const AddRecordModal = ({
  isOpen,
  onClose,
  onSubmit,
  onChange,
  isSubmitting,
  error,
  selectedRecord = { id: null, title: "" },
}) => {
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle(selectedRecord.id ? selectedRecord.title : "");
  }, [selectedRecord]);

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        form="add-record-form"
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 py-2 pl-3 pr-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedRecord.id ? "Rename Record" : "Add Medical Record"}
      size="md"
      footer={footer}
    >
      {error && (
        <p className="mb-3 text-sm font-medium text-rose-600">{error}</p>
      )}

      <form id="add-record-form" onSubmit={onSubmit} className="space-y-3">
        <input
          name="title"
          value={title}
          onChange={(e) => {
            onChange(e);
            setTitle(e.target.value);
          }}
          placeholder="Record name"
          className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-emerald-500"
          required
        />

        {selectedRecord.id ? (
          <p className="text-xs text-slate-400">
            Renaming existing record. File cannot be changed.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Enter a name and select a PDF file to upload.
          </p>
        )}

        {!selectedRecord.id && (
          <>
            <input
              type="file"
              name="file"
              accept=".pdf"
              onChange={onChange}
              className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold"
              required
            />
            <p className="text-xs text-slate-400">PDF files only, max 5 MB.</p>
          </>
        )}
      </form>
    </Modal>
  );
};

export default AddRecordModal;
import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const Popup = ({ isOpen, message, type = "success", onClose, autoCloseTime = 4000 }) => {
  useEffect(() => {
    if (isOpen && autoCloseTime) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseTime, onClose]);

  if (!isOpen) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isSuccess ? "Success" : "Error"}
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          {message}
        </p>
        <button
          onClick={onClose}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
            isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Popup;

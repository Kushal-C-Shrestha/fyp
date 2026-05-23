import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios.js';
import { contactSchema } from '../../schemas/contactSchema';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';

const ContactUs = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email,
        phone: data.phone,
        message: data.message,
      };

      const res = await api.post('/contact', payload);
      if (res.status >= 200 && res.status < 300) {
        setShowSuccess(true);
        reset();
      }
    } catch (error) {
      console.error('Contact submission error:', error);
    }
  };

  return (
    <section className="bg-white py-24">
      <div className="page-shell">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Contact Us</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Let's start a conversation</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
              Share your question and our team will get back with the right support.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Visit Us</p>
                  <p className="text-sm text-slate-600">New Baneshwor, Kathmandu, Nepal</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Call Us</p>
                  <p className="text-sm text-slate-600">+977 9801234567</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Email Us</p>
                  <p className="text-sm text-slate-600">eswasthya@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">First Name</label>
                  <input
                    type="text"
                    {...register('firstName')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  />
                  {errors.firstName && <span className="mt-1 block text-xs text-red-500">{errors.firstName.message}</span>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Last Name</label>
                  <input
                    type="text"
                    {...register('lastName')}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                  />
                  {errors.lastName && <span className="mt-1 block text-xs text-red-500">{errors.lastName.message}</span>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
                {errors.email && <span className="mt-1 block text-xs text-red-500">{errors.email.message}</span>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
                <input
                  type="text"
                  {...register('phone')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
                {errors.phone && <span className="mt-1 block text-xs text-red-500">{errors.phone.message}</span>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message</label>
                <textarea
                  rows="4"
                  {...register('message')}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                />
                {errors.message && <span className="mt-1 block text-xs text-red-500">{errors.message.message}</span>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
              >
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Thank you for reaching out. Our team will get back to you shortly.
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactUs;

import React from 'react';
import { Search, Calendar, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import recordsImage from '../../assets/home/supporting image.jpg';

const steps = [
  {
    id: "01",
    title: "Find Your Specialist",
    desc: "Search by speciality, doctor, or hospital.",
    icon: <Search className="h-4 w-4 text-emerald-700" />,
  },
  {
    id: "02",
    title: "Schedule Consultation",
    desc: "Pick a slot and confirm in seconds.",
    icon: <Calendar className="h-4 w-4 text-emerald-700" />,
  },
  {
    id: "03",
    title: "Secure Consultation",
    desc: "Consult online or in person, securely.",
    icon: <MessageSquare className="h-4 w-4 text-emerald-700" />,
  },
  {
    id: "04",
    title: "Continuous Care",
    desc: "Access records, prescriptions, and follow-ups.",
    icon: <ShieldCheck className="h-4 w-4 text-emerald-700" />,
  },
];

const HowItWorks = () => {
  const navigate = useNavigate();
  return (
    <section className="bg-white py-20">
      <div className="page-shell">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="lg:max-w-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">How It Works</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Care in four simple steps</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
              Fast booking, secure consultations, and follow-up support in one place.
            </p>
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-none border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
              onClick={() => navigate('/doctors')}
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.id} className="p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-slate-800">{step.id}</span>
                <span className="inline-flex h-7 w-7 items-center justify-center">
                  {step.icon}
                </span>
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

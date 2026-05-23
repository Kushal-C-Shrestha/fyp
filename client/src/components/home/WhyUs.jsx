import React from 'react';
import { ShieldCheck, Users, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import supportingImage from '../../assets/home/care.jpg';

const reasons = [
  {
    title: 'Verified Doctors',
    desc: 'Every listed doctor is screened before going live.',
    icon: <ShieldCheck className="h-5 w-5 text-emerald-700" />,
  },
  {
    title: 'Patient Trust',
    desc: 'Thousands of patients rely on the platform every day.',
    icon: <Users className="h-5 w-5 text-emerald-700" />,
  },
  {
    title: 'Fast Booking',
    desc: 'Book appointments quickly with minimal steps.',
    icon: <Clock className="h-5 w-5 text-emerald-700" />,
  },
  {
    title: 'Top Facilities',
    desc: 'Access hospitals and clinics across key specialties.',
    icon: <Building2 className="h-5 w-5 text-emerald-700" />,
  },
];

const WhyUs = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-white py-24">
      <div className="page-shell">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
          {/* Left Column: Text Content */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Why Us</p>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              Healthcare built around clarity and trust.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              We keep the process simple so patients can focus on care, not complexity.
              From discovery to follow-up, every step is designed to be fast and reliable.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
              {reasons.map((item) => (
                <div key={item.title}>
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    {item.icon}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Image */}
          <div>
            <img 
              src={supportingImage} 
              alt="Care support" 
              className="h-[400px] w-full rounded-2xl object-cover lg:h-[540px]" 
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;

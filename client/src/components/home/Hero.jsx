import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import heroImage from '../../assets/home/hero section.png';

const Hero = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/doctors?query=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <section className="bg-white pt-24 pb-16 lg:pt-32 lg:pb-24">
      <div className="page-shell">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Healthcare that feels calm, clear, and close.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Find specialists, book appointments, and manage care in one clean experience built for speed and trust.
            </p>

            <div className="flex max-w-xl items-center gap-3 bg-slate-50 px-4 py-3 border border-slate-100 rounded-2xl focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
              <button 
                type="button" 
                onClick={handleSearch} 
                className="focus:outline-none flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Submit search"
              >
                <Search className="h-4 w-4 text-slate-400 hover:text-emerald-600 transition-colors" />
              </button>
              <input
                type="text"
                placeholder="Search doctor, speciality, hospital..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="mx-auto mt-8 w-full max-w-lg lg:mt-0 lg:max-w-none">
            <img
              src={heroImage}
              alt="Healthcare platform showcase"
              className="w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

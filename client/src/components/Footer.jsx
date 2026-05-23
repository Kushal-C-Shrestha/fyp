import React from "react";
import { NavLink } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-emerald-700 bg-emerald-800">
      <div className="page-shell grid grid-cols-1 gap-12 py-16 md:grid-cols-4">
        <div>
          <h2 className="mb-3 text-2xl font-bold text-white">e-Swasthya</h2>
          <p className="text-sm leading-relaxed text-emerald-100">
            Book consultations, find trusted doctors, and keep your healthcare experience simple.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Explore</h3>
          <div className="space-y-2 text-sm text-emerald-100">
            <NavLink to="/" className="block transition hover:text-white">Home</NavLink>
            <NavLink to="/doctors" className="block transition hover:text-white">Doctors</NavLink>
            <NavLink to="/hospitals" className="block transition hover:text-white">Hospitals</NavLink>
            <NavLink to="/blogs" className="block transition hover:text-white">Blogs</NavLink>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">For Providers</h3>
          <div className="space-y-2 text-sm text-emerald-100">
            <NavLink to="/register/hospital" className="block transition hover:text-white">Register Hospital</NavLink>
            <NavLink to="/register/doctor" className="block transition hover:text-white">Register Doctor</NavLink>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Contact</h3>
          <p className="text-sm text-emerald-100">support@eswasthya.com</p>
          <p className="text-sm text-emerald-100">+977 9866486559</p>
          <p className="text-sm text-emerald-100">New Baneshwor, Kathmandu, Nepal</p>
        </div>
      </div>

      <div className="border-t border-emerald-700 py-5 text-center text-xs text-emerald-100">
        &copy; {new Date().getFullYear()} e-Swasthya. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;


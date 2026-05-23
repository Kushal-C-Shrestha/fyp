import React from "react";
import { NavLink } from "react-router-dom";

const BrandMark = ({ className = "", textClassName = "text-lg font-bold tracking-tight text-slate-900" }) => (
  <NavLink to="/" className={["inline-flex items-center", className].filter(Boolean).join(" ")}>
    <span className={textClassName}>e-Swasthya</span>
  </NavLink>
);

export default BrandMark;

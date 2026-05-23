import React from "react";
import { Star } from "lucide-react";

/**
 * RatingStars
 *
 * Displays a star icon next to a numeric rating value.
 *
 * Props
 * ─────
 * rating    number   Rating value (0–5)
 * decimals  number   Decimal places to show (default 1)
 */
const RatingStars = ({ rating = 0, decimals = 1 }) => (
  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
    {Number(rating || 0).toFixed(decimals)}
  </span>
);

export default RatingStars;

import React from "react";
import { getBlogStatusMeta } from "../../utils/blogs.js";

const BlogStatusBadge = ({ status }) => {
  const meta = getBlogStatusMeta(status);

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${meta.className}`}>
      {meta.label}
    </span>
  );
};

export default BlogStatusBadge;

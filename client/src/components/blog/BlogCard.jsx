import React from "react";
import { ArrowRight, Clock, User } from "lucide-react";
import { Link } from "react-router-dom";
import { formatBlogDate } from "../../utils/blogs.js";

const BlogCard = ({ blog }) => {
  const image = blog?.coverImage || blog?.image || "";
  const title = blog?.title || "Untitled Blog";
  const excerpt = blog?.excerpt || blog?.desc || "";
  const author = blog?.author?.name || blog?.authorName || blog?.author || "Unknown author";
  const tags = Array.isArray(blog?.tags) ? blog.tags.slice(0, 2) : [];
  const readTime = Number(blog?.readTimeMinutes) || null;
  const target = `/blogs/${blog?.slug || blog?.id}`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <Link to={target} className="block">
        <div className="relative h-48 overflow-hidden bg-slate-100">
          {image ? (
            <img src={image} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-end p-5">
              <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {blog?.category || "Health"}
              </span>
            </div>
          )}
          {image && blog?.category ? (
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {blog.category}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatBlogDate(blog?.publishedAt || blog?.createdAt) || blog?.date}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {author}
          </span>
          {readTime ? <span>{readTime} min read</span> : null}
        </div>

        <Link to={target} className="group">
          <h3 className="text-xl font-semibold leading-snug text-slate-900 transition group-hover:text-emerald-700">
            {title}
          </h3>
        </Link>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{excerpt}</p>

        {tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.slug} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto border-t border-slate-100 pt-4">
          <Link to={target} className="group inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Read Article
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;


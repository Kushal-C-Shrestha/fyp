import React, { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Clock3, User2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import api from "../../api/axios.js";
import { formatBlogDate } from "../../utils/blogs.js";
import "react-quill-new/dist/quill.snow.css";

const BlogDetail = ({ isPreview = false }) => {
  const { slugOrId, id } = useParams();
  const targetId = isPreview ? id : slugOrId;
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBlog = async () => {
      try {
        setLoading(true);
        setError("");
        const endpoint = isPreview ? `/blogs/me/${targetId}` : `/blogs/${targetId}`;
        const { data } = await api.get(endpoint);
        setBlog(data?.blog || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load this article.");
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };
    if (targetId) {
      loadBlog();
    }
  }, [targetId, isPreview]);

  return (
    <div className="min-h-screen bg-white">
      {isPreview && (
        <div className="bg-amber-500 text-black text-center py-1.5 text-xs font-bold uppercase tracking-widest relative z-50">
          Preview Mode - Admin / Author View
        </div>
      )}
      <Navbar />

      {loading ? (
        <div className="mx-auto max-w-[740px] px-5 pt-32 pb-20 sm:px-8">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="mt-10 h-10 w-3/4 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-3 h-8 w-1/2 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-6 h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-10 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-4 animate-pulse rounded bg-slate-200 ${i % 3 === 0 ? "w-4/5" : "w-full"}`} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="mx-auto max-w-[740px] px-5 pt-32 pb-20 text-center sm:px-8">
          <p className="text-2xl font-bold text-slate-900">Article unavailable</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link
            to="/blogs"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all articles
          </Link>
        </div>
      ) : blog ? (
        <article>
          {/* ── Hero image ─────────────────────────────────────────── */}
          {blog.coverImage ? (
            <div className="h-[300px] w-full overflow-hidden bg-slate-100 sm:h-[460px]">
              <img
                src={blog.coverImage}
                alt={blog.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-[200px] w-full bg-gradient-to-br from-emerald-50 to-teal-100 sm:h-[280px]" />
          )}

          {/* ── Content column ─────────────────────────────────────── */}
          <div className="mx-auto max-w-[740px] px-5 pb-24 sm:px-8">

            {/* Back link */}
            <Link
              to="/blogs"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All articles
            </Link>

            {/* Tags */}
            {Array.isArray(blog.tags) && blog.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <span
                    key={tag.slug}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.2]">
              {blog.title}
            </h1>

            {/* Excerpt */}
            {blog.excerpt && (
              <p className="mt-4 text-lg leading-relaxed text-slate-500">{blog.excerpt}</p>
            )}

            {/* Author / meta row */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 pb-6 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                  <User2 className="h-4 w-4 text-slate-500" />
                </span>
                {blog.author?.name || "Unknown author"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatBlogDate(blog.publishedAt || blog.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {blog.readTimeMinutes} min read
              </span>
            </div>

            {/* Body content */}
            <div className="mt-8 ql-snow">
              <div
                className="blog-prose ql-editor"
                dangerouslySetInnerHTML={{ __html: blog.contentHtml }}
              />
            </div>

            {/* Footer nav */}
            <div className="mt-16 border-t border-slate-100 pt-8">
              <Link
                to="/blogs"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all articles
              </Link>
            </div>
          </div>
        </article>
      ) : null}

      <Footer />
    </div>
  );
};

export default BlogDetail;

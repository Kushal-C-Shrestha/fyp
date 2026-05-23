import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, FilePlus2, Pencil, Search, Trash2 } from "lucide-react";
import api from "../../api/axios.js";
import BlogStatusBadge from "./BlogStatusBadge.jsx";
import { formatBlogDate, isApprovedBlog } from "../../utils/blogs.js";

const AuthorBlogsPanel = ({ compact = false }) => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/blogs/me");
      setBlogs(Array.isArray(data?.blogs) ? data.blogs : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load your blogs.");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBlogs(); }, []);

  const filteredBlogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return blogs;
    return blogs.filter((blog) => {
      const tagText = Array.isArray(blog.tags) ? blog.tags.map((t) => t.name).join(" ") : "";
      return [blog.title, blog.excerpt, blog.status, tagText].some((v) =>
        String(v || "").toLowerCase().includes(query)
      );
    });
  }, [blogs, searchTerm]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/blogs/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadBlogs();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete blog.");
    } finally {
      setDeleting(false);
    }
  };

  const getViewTarget = (blog) =>
    isApprovedBlog(blog?.status) ? `/blogs/${blog.slug || blog.id}` : `/blogs/preview/${blog.id}`;

  const getViewLabel = (blog) =>
    isApprovedBlog(blog?.status) ? "View Live" : "Preview";

  return (
    <div className="space-y-5">
      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900">Delete blog?</h2>
            <p className="mt-1 text-sm text-slate-500">
              "<span className="font-medium text-slate-700">{deleteTarget.title}</span>" will be permanently deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Search blogs…"
          />
        </div>
        <Link
          to="/blogs/write"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          <FilePlus2 className="h-4 w-4" />
          New Blog
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : filteredBlogs.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBlogs.map((blog) => (
                <tr
                  key={blog.id}
                  className="cursor-pointer transition hover:bg-slate-50"
                  onClick={() => navigate(`/blogs/edit/${blog.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {blog.title || <span className="text-slate-400 italic">Untitled</span>}
                    {blog.reviewNotes && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Note</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><BlogStatusBadge status={blog.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatBlogDate(blog.updatedAt)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <Link
                        to={`/blogs/edit/${blog.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>
                      <Link
                        to={getViewTarget(blog)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {getViewLabel(blog)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(blog)}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">No blogs yet</h3>
          <p className="mt-1 text-sm text-slate-500">Start your first post and submit it for approval when ready.</p>
          <Link
            to="/blogs/write"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <FilePlus2 className="h-4 w-4" />
            Create a Blog
          </Link>
        </div>
      )}
    </div>
  );
};

export default AuthorBlogsPanel;

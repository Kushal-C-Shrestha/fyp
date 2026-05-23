import React, { useEffect, useState } from "react";
import { Check, Eye, Loader2, X } from "lucide-react";
import Popup from "../../components/Popup.jsx";
import ActionIconButton from "../../components/ui/ActionIconButton.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import SearchFilterBar from "../../components/ui/SearchFilterBar.jsx";
import api from "../../api/axios.js";

const extractBlogPreview = (blog) => {
  const excerpt = String(blog?.excerpt || "").trim();
  if (excerpt) return excerpt;

  return String(blog?.contentHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const COLUMNS = [
  { label: "Blog Title" },
  { label: "Author" },
  { label: "Preview" },
  { label: "Admin Feedback" },
  { label: "Moderation", className: "text-right" },
];


const AdminBlogRequests = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionState, setActionState] = useState({ blogId: null, status: "" });
  const [notesById, setNotesById] = useState({});
  const [popupContent, setPopupContent] = useState({ isOpen: false, message: "", type: "success" });

  const loadPendingBlogs = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/blogs/admin/moderation", {
        params: {
          status: "pending",
          search: searchTerm || undefined
        }
      });
      setBlogs(Array.isArray(data?.blogs) ? data.blogs : []);
    } catch (err) {
      setBlogs([]);
      setError(err?.response?.data?.message || "Unable to load pending blog requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPendingBlogs();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const reviewBlog = async (blogId, status) => {
    try {
      setActionState({ blogId, status });
      await api.patch(`/blogs/admin/${blogId}/review`, {
        status,
        notes: notesById[blogId] || "",
      });
      setBlogs((current) => current.filter((blog) => blog.id !== blogId));
      setPopupContent({ isOpen: true, message: `Blog successfully ${status}.`, type: "success" });
    } catch (err) {
      setPopupContent({ isOpen: true, message: err?.response?.data?.message || "Unable to review this blog.", type: "error" });
    } finally {
      setActionState({ blogId: null, status: "" });
    }
  };

  const openBlog = (blog) => {
    window.open(`/blogs/preview/${blog.id}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <SearchFilterBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search title or author..."
            maxWidth="sm:max-w-xs"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}

        <DataTable
          columns={COLUMNS}
          data={blogs}
          getRowKey={(blog) => blog.id}
          loading={loading && !searchTerm}
          loadingText="Scanning for pending requests..."
          emptyText="Clear queue. No pending blog requests found."
          pagination
          pageSize={10}
          resetPageKey={searchTerm}
          renderRow={(blog) => {
                  const isProcessing = actionState.blogId === blog.id;
                  return (
                    <tr key={blog.id} className="align-top hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 leading-snug">{blog.title || "-"}</span>
                          <button
                            onClick={() => openBlog(blog)}
                            className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold uppercase mt-1.5 hover:text-emerald-700 w-max"
                          >
                            <Eye className="h-2.5 w-2.5" />
                            Read Draft
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 truncate max-w-[120px]">{blog.author?.name || "Anonymous"}</td>
                      <td className="px-4 py-3">
                        <p className="line-clamp-2 text-xs text-slate-500 max-w-xs leading-relaxed italic">
                          {extractBlogPreview(blog) || "No preview available..."}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={notesById[blog.id] || ""}
                          onChange={(e) => setNotesById({ ...notesById, [blog.id]: e.target.value })}
                          placeholder="Optional feedback..."
                          className="w-full min-h-[60px] text-xs bg-white border border-slate-200 rounded p-2 outline-none focus:border-slate-300 transition-colors resize-none"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <ActionIconButton
                            icon={isProcessing && actionState.status === "approved" ? Loader2 : Check}
                            label="Approve blog"
                            tone="success"
                            onClick={() => reviewBlog(blog.id, "approved")}
                            disabled={isProcessing}
                            className={isProcessing && actionState.status === "approved" ? "[&_svg]:animate-spin" : ""}
                          />
                          <ActionIconButton
                            icon={isProcessing && actionState.status === "rejected" ? Loader2 : X}
                            label="Reject blog"
                            tone="danger"
                            onClick={() => reviewBlog(blog.id, "rejected")}
                            disabled={isProcessing}
                            className={isProcessing && actionState.status === "rejected" ? "[&_svg]:animate-spin" : ""}
                          />
                        </div>
                      </td>
                    </tr>
                  );
          }}
        />
      </div>

      <Popup 
          isOpen={popupContent.isOpen} 
          message={popupContent.message} 
          type={popupContent.type} 
          onClose={() => setPopupContent({ ...popupContent, isOpen: false })} 
      />
    </>
  );
};

export default AdminBlogRequests;

import React, { useEffect, useMemo, useState } from "react";
import BlogStatusBadge from "../../components/blog/BlogStatusBadge.jsx";
import Popup from "../../components/Popup.jsx";
import ActionIconButton from "../../components/ui/ActionIconButton.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Modal from "../../components/ui/Modal.jsx";
import SearchFilterBar from "../../components/ui/SearchFilterBar.jsx";
import api from "../../api/axios.js";
import { ExternalLink, Trash2 } from "lucide-react";

const filterOptions = [
  { value: "", label: "All blogs" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
];

const COLUMNS = [
  { label: "Title" },
  { label: "Author" },
  { label: "Status" },
  { label: "Tags" },
  { label: "Updated" },
  { label: "Actions" },
];

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [popupContent, setPopupContent] = useState({ isOpen: false, message: "", type: "success" });

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/blogs/admin/moderation", {
          params: {
            status: statusFilter || undefined,
            search: searchTerm || undefined,
          },
      });
      setBlogs(Array.isArray(data?.blogs) ? data.blogs : []);
    } catch (err) {
      setBlogs([]);
      setError(err?.response?.data?.message || "Unable to load blogs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [searchTerm, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      setActionLoading(deleteTarget.id);
      await api.delete(`/blogs/${deleteTarget.id}`);
      setBlogs((prev) => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
      setPopupContent({ isOpen: true, message: "Blog successfully deleted.", type: "success" });
    } catch (err) {
      setPopupContent({ isOpen: true, message: err?.response?.data?.message || "Failed to delete blog.", type: "error" });
    } finally {
      setActionLoading("");
    }
  };

  const openBlog = (blog) => {
    window.open(blog.status === "Approved" ? `/blogs/${blog.slug || blog.id}` : `/blogs/preview/${blog.id}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <SearchFilterBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search title, author, or tags..."
            maxWidth="sm:max-w-xs"
          />
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
            >
              {filterOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}

        <DataTable
          columns={COLUMNS}
          data={blogs}
          getRowKey={(blog) => blog.id}
          loading={loading}
          loadingText="Loading platform blogs..."
          emptyText="No blogs found in the platform database."
          pagination
          pageSize={10}
          resetPageKey={`${searchTerm}|${statusFilter}`}
          renderRow={(blog) => (
                  <tr key={blog.id}>
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {blog.title || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{blog.author?.name || "Anonymous"}</td>
                    <td className="px-4 py-3">
                      <BlogStatusBadge status={blog.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                       {blog.tags?.length > 0 ? blog.tags.map(t => t.name).join(", ") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                       {new Date(blog.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActionIconButton
                          icon={ExternalLink}
                          label="View blog"
                          tone="primary"
                          onClick={() => openBlog(blog)}
                        />
                        <ActionIconButton
                          icon={Trash2}
                          label="Delete blog"
                          tone="danger"
                          onClick={() => setDeleteTarget(blog)}
                          disabled={actionLoading === blog.id}
                        />
                      </div>
                    </td>
                  </tr>
          )}
        />
      </div>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (actionLoading) return;
          setDeleteTarget(null);
        }}
        title="Delete blog?"
        subtitle="This action cannot be undone."
        variant="error"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900">{deleteTarget?.title || "this blog"}</span>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(actionLoading)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>

      <Popup 
          isOpen={popupContent.isOpen} 
          message={popupContent.message} 
          type={popupContent.type} 
          onClose={() => setPopupContent({ ...popupContent, isOpen: false })} 
      />
    </>
  );
};
   

export default AdminBlogs;

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  ImagePlus,
  LoaderCircle,
  Send,
  Tag,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import api from "../../api/axios.js";
import { useAuth } from "../../hooks/useAuth.js";
import BlogStatusBadge from "../../components/blog/BlogStatusBadge.jsx";
import { parseTagInput, resolveBlogManagerPath } from "../../utils/blogs.js";
import Navbar from "../../components/Navbar.jsx";

const createInitialState = () => ({
  title: "",
  excerpt: "",
  tagsInput: "",
  contentHtml: "",
  coverFile: null,
  coverPreview: "",
  removeCoverImage: false,
});

const BlogEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  const isEditing = Boolean(id);
  const managerPath = resolveBlogManagerPath(user?.role);

  const [form, setForm] = useState(createInitialState);
  const [initialBlog, setInitialBlog] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isEditing) return undefined;
    let isMounted = true;

    const loadBlog = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/blogs/me/${id}`);
        const blog = data?.blog;
        if (!isMounted || !blog) return;

        setInitialBlog(blog);
        const loadedTags = Array.isArray(blog.tags) ? blog.tags.map((t) => t.name) : [];
        setTags(loadedTags);
        setForm({
          title: blog.title || "",
          excerpt: blog.excerpt || "",
          tagsInput: loadedTags.join(", "),
          contentHtml: blog.contentHtml || "",
          coverFile: null,
          coverPreview: blog.coverImage || "",
          removeCoverImage: false,
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err?.response?.data?.message || "Unable to load this blog for editing.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBlog();
    return () => { isMounted = false; };
  }, [id, isEditing]);

  const handleInlineImageUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setUploadingInlineImage(true);
        setError("");
        const payload = new FormData();
        payload.append("image", file);
        const { data } = await api.post("/blogs/images", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const range = editor.getSelection(true);
        const insertAt = range?.index ?? editor.getLength();
        editor.insertEmbed(insertAt, "image", data?.url);
        editor.setSelection(insertAt + 1);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to upload image to the editor.");
      } finally {
        setUploadingInlineImage(false);
      }
    };
    input.click();
  }, []);

  const editorModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
      ],
      handlers: { image: handleInlineImageUpload },
    },
  }), [handleInlineImageUpload]);

  const setField = (key, value) => {
    setForm((cur) => ({ ...cur, [key]: value }));
  };

  const chooseCoverImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((cur) => ({
      ...cur,
      coverFile: file,
      coverPreview: URL.createObjectURL(file),
      removeCoverImage: false,
    }));
  };

  const removeCoverImg = () => {
    setForm((cur) => ({ ...cur, coverFile: null, coverPreview: "", removeCoverImage: true }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addTag = (raw) => {
    const value = raw.trim().replace(/,+$/, "").trim();
    if (!value) return;
    setTags((prev) => {
      if (prev.length >= 8 || prev.includes(value)) return prev;
      const next = [...prev, value];
      setForm((cur) => ({ ...cur, tagsInput: next.join(", ") }));
      return next;
    });
    setTagDraft("");
  };

  const removeTag = (tag) => {
    setTags((prev) => {
      const next = prev.filter((t) => t !== tag);
      setForm((cur) => ({ ...cur, tagsInput: next.join(", ") }));
      return next;
    });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const submitBlog = async (status) => {
    try {
      setSavingAction(status);
      setError("");
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("excerpt", form.excerpt);
      payload.append("tags", JSON.stringify(parseTagInput(form.tagsInput)));
      payload.append("contentHtml", form.contentHtml);
      payload.append("status", status);
      payload.append("removeCoverImage", String(form.removeCoverImage));
      if (form.coverFile) payload.append("coverImage", form.coverFile);

      if (isEditing) {
        await api.patch(`/blogs/${id}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/blogs", payload, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setShowSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save your blog right now.");
    } finally {
      setSavingAction("");
    }
  };

  const isBusy = loading || Boolean(savingAction);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Blog submitted!</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your blog has been submitted for review. An admin will approve it before it goes live. We'll notify you once it's published.
            </p>
            <button
              type="button"
              onClick={() => navigate(managerPath)}
              className="mt-6 w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Back to my blogs
            </button>
          </div>
        </div>
      )}

      {/* Top bar — back link + status only */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-100 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        <Link
          to={managerPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        {initialBlog?.status ? (
          <>
            <span className="text-slate-300">/</span>
            <BlogStatusBadge status={initialBlog.status} />
          </>
        ) : null}
        {uploadingInlineImage ? (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            Uploading image…
          </span>
        ) : null}
      </header>

      {/* Full-width writing canvas */}
      <main className="w-full px-5 pb-32 sm:px-10 lg:px-16">

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {initialBlog?.reviewNotes ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Admin note</p>
            <p className="mt-0.5 leading-6">{initialBlog.reviewNotes}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-20 flex flex-col items-center gap-3 text-slate-500">
            <LoaderCircle className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading editor…</p>
          </div>
        ) : (
          <>
            {/* Cover image */}
            <div className="mt-8">
              {form.coverPreview ? (
                <div className="group relative overflow-hidden rounded-2xl">
                  <img
                    src={form.coverPreview}
                    alt="Cover"
                    className="h-64 w-full object-cover sm:h-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={removeCoverImg}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                >
                  <ImagePlus className="h-4 w-4" />
                  Add a cover image
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={chooseCoverImage}
              />
            </div>

            {/* Title */}
            <textarea
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Title"
              rows={2}
              className="mt-8 w-full resize-none bg-transparent text-4xl font-bold leading-snug text-slate-900 outline-none placeholder:text-slate-300 sm:text-5xl"
            />

            {/* Excerpt */}
            <textarea
              value={form.excerpt}
              onChange={(e) => setField("excerpt", e.target.value)}
              placeholder="Write a short summary readers will see on listing pages…"
              rows={2}
              className="mt-3 w-full resize-none bg-transparent text-lg leading-relaxed text-slate-500 outline-none placeholder:text-slate-300"
            />

            {/* Tags */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-5">
              <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 text-slate-400 hover:text-slate-700"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {tags.length < 8 && (
                <input
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => addTag(tagDraft)}
                  placeholder={tags.length === 0 ? "Add tags (press Enter or ,)" : "Add tag…"}
                  className="min-w-35 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              )}
            </div>

            {/* Rich text editor */}
            <div className="blog-editor mt-2">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={form.contentHtml}
                onChange={(value) => setField("contentHtml", value)}
                modules={editorModules}
                placeholder="Tell your story…"
              />
            </div>

            {/* Submit for approval — at the bottom of the content */}
            <div className="mt-10 flex items-center justify-end border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => submitBlog("pending")}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAction === "pending" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit for Approval
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BlogEditorPage;

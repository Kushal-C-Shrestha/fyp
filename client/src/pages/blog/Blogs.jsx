import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PenSquare, Search } from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import BlogCard from "../../components/blog/BlogCard.jsx";
import Footer from "../../components/Footer.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import api from "../../api/axios.js";
import { useAuth } from "../../hooks/useAuth.js";
import { resolveBlogManagerPath } from "../../utils/blogs.js";

const Blogs = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/blogs", {
          params: {
            search: searchTerm || undefined,
            tag: activeTag || undefined,
            page: pagination.page,
            limit: pagination.limit,
          },
        });
        setBlogs(Array.isArray(data?.blogs) ? data.blogs : []);
        setPagination(data?.pagination || { page: 1, limit: 9, total: 0, totalPages: 1 });
      } catch (err) {
        setBlogs([]);
        setError(err?.response?.data?.message || "Unable to load blogs right now.");
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, [searchTerm, activeTag, pagination.page, pagination.limit]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchTerm, activeTag]);

  const visibleTags = useMemo(() => {
    const map = new Map();

    blogs.forEach((blog) => {
      if (!Array.isArray(blog.tags)) return;

      blog.tags.forEach((tag) => {
        if (!map.has(tag.slug)) {
          map.set(tag.slug, tag.name);
        }
      });
    });

    return Array.from(map.entries()).slice(0, 10);
  }, [blogs]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-32 pb-20 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Expert Health Insights</h1>
          <p className="mt-4 text-base text-slate-600 max-w-2xl mx-auto leading-7">
            Read practical tips, patient-friendly explainers, and health awareness content written by our medical community.
          </p>
          <div className="mt-8 flex justify-center">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSearchTerm(searchInput.trim());
              }}
              className="relative w-full max-w-lg"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                placeholder="Search topics like nutrition, sleep, or heart health"
              />
            </form>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            {visibleTags.map(([slug, name]) => (
              <button
                key={slug}
                type="button"
                onClick={() => setActiveTag(slug)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTag === slug ? "bg-emerald-700 text-white" : "bg-white text-slate-600 hover:text-emerald-700"
                }`}
              >
                #{name}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[360px] animate-pulse rounded-[28px] bg-white" />
            ))}
          </section>
        ) : blogs.length > 0 ? (
          <>
            <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </section>
            {pagination.totalPages > 1 ? (
              <Pagination
                className="mt-8"
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                pageSize={pagination.limit}
                itemLabel="blogs"
                onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              />
            ) : null}
          </>
        ) : (
          <section className="mt-16 text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900">No approved blogs found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Try a different search term or be the first to submit a new article.
            </p>
            {user ? (
              <Link to="/blogs/write" className="btn-primary mt-6">
                Write a Blog
              </Link>
            ) : null}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blogs;



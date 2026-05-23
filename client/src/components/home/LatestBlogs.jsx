import React, { useEffect, useState } from 'react';
import BlogCard from '../blog/BlogCard.jsx';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';

const LatestBlogs = () => {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const { data } = await api.get('/blogs');
        setBlogs(Array.isArray(data?.blogs) ? data.blogs : []);
      } catch {
        setBlogs([]);
      }
    };

    loadBlogs();
  }, []);

  return (
    <section className="border-t border-slate-200 bg-white py-24">
      <div className="page-shell">

        <div className="mb-10 text-center">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Health Insights
          </span>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Latest News & Articles
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            Short reads and practical guidance to support better health decisions.
          </p>
        </div>

        {blogs.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {blogs.slice(0, 3).map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-500">Approved blogs will appear here once authors publish them.</p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            to="/blogs"
            className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            View All Articles
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LatestBlogs;



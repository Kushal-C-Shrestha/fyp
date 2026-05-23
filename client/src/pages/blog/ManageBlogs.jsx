import React from "react";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import AuthorBlogsPanel from "../../components/blog/AuthorBlogsPanel.jsx";

const ManageBlogs = () => {
  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="page-shell pt-28 pb-20">
        <AuthorBlogsPanel />
      </main>
      <Footer />
    </div>
  );
};

export default ManageBlogs;

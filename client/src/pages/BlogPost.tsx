import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import type { Post } from "@shared/schema";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery<Post>({
    queryKey: ["/api/posts", slug],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6 py-12 text-center text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Post Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <Link href="/blog" className="text-sky-600 dark:text-sky-400 font-bold hover:underline inline-flex items-center gap-2" data-testid="link-back-to-blog">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20">
      {post.coverImage && (
        <section className="relative h-[300px] md:h-[400px] overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </section>
      )}

      {!post.coverImage && (
        <section className="relative bg-slate-900 dark:bg-black py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-900/30 to-sky-900/30" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        </section>
      )}

      <div className="container mx-auto px-4 md:px-6">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto -mt-20 relative z-10"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12 border border-slate-200 dark:border-slate-700">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 font-medium text-sm mb-6 hover:underline" data-testid="link-back-to-blog">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>

            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" data-testid="text-blog-post-title">
              {post.title}
            </h1>

            <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {post.createdAt
                  ? new Date(post.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {post.author || "Admin"}
              </div>
            </div>

            {post.summary && (
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed italic border-l-4 border-sky-500 pl-4">
                {post.summary}
              </p>
            )}

            <div
              className="prose dark:prose-invert prose-sky max-w-none text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line"
              data-testid="text-blog-post-content"
            >
              {post.content}
            </div>
          </div>
        </motion.article>
      </div>
    </div>
  );
}

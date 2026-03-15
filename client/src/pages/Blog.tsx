import { motion } from "framer-motion";
import { Calendar, User } from "lucide-react";

const POSTS = [
  {
    id: 1,
    title: "The Future of Web Development in 2026",
    excerpt: "Discover the latest trends shaping the web, from AI-driven interfaces to WebAssembly.",
    image: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&q=80",
    date: "Oct 15, 2025",
    author: "Admin"
  },
  {
    id: 2,
    title: "Why SEO is Crucial for Small Businesses",
    excerpt: "Learn how search engine optimization can level the playing field for growing companies.",
    image: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&q=80",
    date: "Sep 28, 2025",
    author: "Marketing Team"
  },
  {
    id: 3,
    title: "Mobile App Design Principles",
    excerpt: "Key principles for designing intuitive and engaging mobile experiences.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80",
    date: "Sep 10, 2025",
    author: "Design Lead"
  }
];

export default function Blog() {
  return (
    <div className="pt-24 pb-20">
      <section className="relative bg-slate-900 dark:bg-black py-20 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/30 to-sky-900/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/20 text-sky-300 text-sm font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Our Blog
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">Latest Insights</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Stay updated with the latest trends, tips, and news from the digital world.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {POSTS.map((post, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group"
              data-testid={`card-blog-post-${post.id}`}
            >
              <div className="h-56 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <div className="flex gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {post.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {post.author}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2" data-testid={`text-blog-title-${post.id}`}>
                  {post.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <button className="text-sky-600 dark:text-sky-400 font-bold text-sm hover:underline" data-testid={`button-read-article-${post.id}`}>
                  Read Article
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

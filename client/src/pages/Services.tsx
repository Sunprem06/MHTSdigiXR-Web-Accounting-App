import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video, Server, CheckCircle2 } from "lucide-react";

const SERVICES_LIST = [
  {
    slug: "web-development",
    icon: Code,
    title: "Web Development",
    desc: "From corporate websites to complex web applications, we build robust, scalable, and secure web solutions.",
    features: ["Custom CMS", "E-commerce Solutions", "Progressive Web Apps"],
    color: "from-blue-500 to-blue-600"
  },
  {
    slug: "mobile-app",
    icon: Smartphone,
    title: "Mobile App Development",
    desc: "Native and cross-platform mobile applications that provide seamless user experiences on iOS and Android.",
    features: ["iOS & Android", "React Native / Flutter", "App Store Optimization"],
    color: "from-purple-500 to-purple-600"
  },
  {
    slug: "digital-marketing",
    icon: BarChart3,
    title: "Digital Marketing",
    desc: "Data-driven marketing strategies to increase brand visibility, drive traffic, and boost conversions.",
    features: ["Social Media Marketing", "PPC Campaigns", "Content Strategy"],
    color: "from-orange-500 to-orange-600"
  },
  {
    slug: "ui-ux",
    icon: Monitor,
    title: "UI/UX Design",
    desc: "Creating intuitive and engaging user interfaces that delight users and solve complex problems.",
    features: ["User Research", "Wireframing", "Interactive Prototyping"],
    color: "from-pink-500 to-pink-600"
  },
  {
    slug: "seo",
    icon: Search,
    title: "SEO Optimization",
    desc: "Improve your search engine rankings and drive organic traffic with our proven SEO strategies.",
    features: ["On-page SEO", "Technical Audits", "Link Building"],
    color: "from-green-500 to-green-600"
  },
  {
    slug: "branding",
    icon: Palette,
    title: "Branding & Graphics",
    desc: "Build a memorable brand identity with professional logo design and visual assets.",
    features: ["Logo Design", "Brand Guidelines", "Marketing Collateral"],
    color: "from-red-500 to-red-600"
  },
  {
    slug: "hosting",
    icon: Server,
    title: "Domain & Hosting",
    desc: "Secure and reliable hosting solutions to keep your website running 24/7.",
    features: ["SSL Certificates", "Cloud Hosting", "Domain Management"],
    color: "from-cyan-500 to-cyan-600"
  },
  {
    slug: "video-animation",
    icon: Video,
    title: "Video & Animation",
    desc: "Captivate your audience with high-quality video content and motion graphics.",
    features: ["Explainer Videos", "Social Media Shorts", "3D Animation"],
    color: "from-yellow-500 to-yellow-600"
  }
];

export default function Services() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero Section */}
      <section className="relative bg-slate-900 dark:bg-black py-20 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 to-sky-900/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              World-Class Solutions
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">Our Services</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Comprehensive digital solutions crafted with precision to help your business dominate online.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES_LIST.map((service, index) => (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8 }}
            >
              <Link href={`/services/${service.slug}`}>
                <div className="h-full bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer group">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <service.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors dark:text-white">{service.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    {service.desc}
                  </p>
                  <ul className="space-y-2 mb-8">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-2 transition-transform">
                    Learn more <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Need a Custom Solution?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Every business is unique. Let's discuss how we can create a tailored solution that perfectly fits your needs.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg" data-testid="button-custom-solution">
              Get a Free Consultation <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video, Database, Server, Layers } from "lucide-react";

const SERVICES_LIST = [
  {
    slug: "web-development",
    icon: Code,
    title: "Web Development",
    desc: "From corporate websites to complex web applications, we build robust, scalable, and secure web solutions.",
    features: ["Custom CMS", "E-commerce Solutions", "Progressive Web Apps"]
  },
  {
    slug: "mobile-app",
    icon: Smartphone,
    title: "Mobile App Development",
    desc: "Native and cross-platform mobile applications that provide seamless user experiences on iOS and Android.",
    features: ["iOS & Android", "React Native / Flutter", "App Store Optimization"]
  },
  {
    slug: "digital-marketing",
    icon: BarChart3,
    title: "Digital Marketing",
    desc: "Data-driven marketing strategies to increase brand visibility, drive traffic, and boost conversions.",
    features: ["Social Media Marketing", "PPC Campaigns", "Content Strategy"]
  },
  {
    slug: "ui-ux",
    icon: Monitor,
    title: "UI/UX Design",
    desc: "Creating intuitive and engaging user interfaces that delight users and solve complex problems.",
    features: ["User Research", "Wireframing", "Interactive Prototyping"]
  },
  {
    slug: "seo",
    icon: Search,
    title: "SEO Optimization",
    desc: "Improve your search engine rankings and drive organic traffic with our proven SEO strategies.",
    features: ["On-page SEO", "Technical Audits", "Link Building"]
  },
  {
    slug: "branding",
    icon: Palette,
    title: "Branding & Graphics",
    desc: "Build a memorable brand identity with professional logo design and visual assets.",
    features: ["Logo Design", "Brand Guidelines", "Marketing Collateral"]
  },
  {
    slug: "hosting",
    icon: Server,
    title: "Domain & Hosting",
    desc: "Secure and reliable hosting solutions to keep your website running 24/7.",
    features: ["SSL Certificates", "Cloud Hosting", "Domain Management"]
  },
  {
    slug: "video-animation",
    icon: Video,
    title: "Video & Animation",
    desc: "Captivate your audience with high-quality video content and motion graphics.",
    features: ["Explainer Videos", "Social Media Shorts", "3D Animation"]
  }
];

export default function Services() {
  return (
    <div className="pt-24 pb-20">
      <section className="bg-slate-50 py-16 mb-16 border-b border-slate-200">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Our Services</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            We offer a comprehensive suite of digital services to help your business thrive in the modern world.
          </p>
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
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/services/${service.slug}`}>
                <div className="h-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group">
                  <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                    <service.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-emerald-700 transition-colors">{service.title}</h3>
                  <p className="text-slate-500 mb-6 leading-relaxed">
                    {service.desc}
                  </p>
                  <ul className="space-y-2 mb-8">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center text-emerald-600 font-bold group-hover:translate-x-2 transition-transform">
                    Learn more <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

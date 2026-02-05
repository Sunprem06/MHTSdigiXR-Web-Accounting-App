import { useParams } from "wouter";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

// This would typically come from the API, but hardcoding for now as per requirements
const SERVICES_DATA: Record<string, any> = {
  "web-development": {
    title: "Web Development",
    desc: "We build high-performance, secure, and scalable websites tailored to your business goals. From simple landing pages to complex e-commerce platforms, our team delivers excellence.",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80",
    features: [
      "Custom Frontend Development (React, Vue, Angular)",
      "Backend API Development (Node.js, Python)",
      "Database Design & Optimization",
      "Cloud Infrastructure Setup (AWS, Azure)",
      "Maintenance & Support"
    ]
  },
  "mobile-app": {
    title: "Mobile App Development",
    desc: "Reach your customers on the go with our native and cross-platform mobile app development services. We create intuitive, fast, and feature-rich apps for iOS and Android.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
    features: [
      "iOS App Development (Swift)",
      "Android App Development (Kotlin)",
      "Cross-Platform Solutions (Flutter, React Native)",
      "UI/UX Design for Mobile",
      "App Store Optimization & Launch"
    ]
  },
  // Fallback for other routes
  "default": {
    title: "Digital Service",
    desc: "We offer top-tier digital solutions to help your business grow. Contact us to learn more about this specific service.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    features: [
      "Consultation & Strategy",
      "Implementation & Development",
      "Quality Assurance",
      "Ongoing Support"
    ]
  }
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const service = SERVICES_DATA[slug || ""] || SERVICES_DATA["default"];

  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-6">
        <Link href="/services" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 mb-8 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">{service.title}</h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              {service.desc}
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 mb-8">
              <h3 className="text-xl font-bold mb-6">What We Deliver</h3>
              <ul className="space-y-4">
                {service.features.map((feature: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/contact" className="inline-block w-full text-center py-4 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/25">
              Start Your Project
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <img 
              src={service.image} 
              alt={service.title} 
              className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
            />
            <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/10" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

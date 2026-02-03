import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video } from "lucide-react";
import { useServices } from "@/hooks/use-services";

const FEATURES = [
  { icon: Globe, title: "Domain & Hosting", desc: "Reliable infrastructure for your digital presence" },
  { icon: Code, title: "Web Development", desc: "Custom, responsive websites built for performance" },
  { icon: Palette, title: "Logo & Graphic Design", desc: "Creative branding that tells your story" },
  { icon: Monitor, title: "UI/UX Design", desc: "User-centric interfaces that engage and convert" },
  { icon: Smartphone, title: "Mobile Apps", desc: "Native iOS and Android solutions" },
  { icon: Search, title: "SEO Optimization", desc: "Rank higher and drive organic traffic" },
  { icon: BarChart3, title: "Digital Marketing", desc: "Strategic campaigns for measurable growth" },
  { icon: Video, title: "Video & Animation", desc: "Engaging visual content for your brand" },
];

export default function Home() {
  const { data: services } = useServices();

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-brand opacity-30 -z-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-100/40 to-transparent -z-10" />
        
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Transforming Ideas into Digital Reality
              </div>
              <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.1] mb-6 text-slate-900">
                Elevate Your <br />
                <span className="text-gradient">Digital Presence</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
                Maanagaram Hi Tech Solutions provides end-to-eind digital services. From stunning websites to powerful AI integrations, we build the future of your business.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact" className="px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/services" className="px-8 py-4 rounded-xl bg-white text-slate-900 border border-slate-200 font-semibold hover:bg-slate-50 transition-all">
                  View Services
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50">
                {/* Hero image - tech team working */}
                <img 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80" 
                  alt="Team collaboration" 
                  className="w-full h-auto object-cover"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-200 rounded-full blur-3xl opacity-50" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-200 rounded-full blur-3xl opacity-50" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Our Services</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Comprehensive digital solutions tailored to your business needs. We deliver excellence in every pixel and line of code.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <Link key={i} href={`/services`}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="group h-full p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-emerald-600">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-700 transition-colors">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About Snippet */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="grid grid-cols-2 gap-4">
                <img 
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&q=80" 
                  alt="Office meeting" 
                  className="rounded-2xl shadow-lg mt-8"
                />
                <img 
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&q=80" 
                  alt="Strategy planning" 
                  className="rounded-2xl shadow-lg"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Why Choose <br /><span className="text-gradient">Maanagaram?</span></h2>
              <p className="text-slate-600 mb-6 text-lg">
                We are more than just a tech company; we are your growth partners. Founded in 2022, our young and dynamic team is obsessed with quality and innovation.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Cost-effective tailored solutions",
                  "Transparent & collaborative process",
                  "Dedicated support team",
                  "Cutting-edge technology stack"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium text-slate-700">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/about" className="text-emerald-600 font-bold hover:text-emerald-700 inline-flex items-center gap-2">
                Learn more about us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80')] opacity-10 bg-cover bg-center" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Ready to Scale Your Business?</h2>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10">
            Join hundreds of satisfied clients who have transformed their digital presence with Maanagaram Solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="px-8 py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/25">
              Start Your Project
            </Link>
            <a href="https://wa.me/917358105995" target="_blank" className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/20 font-bold hover:bg-white/20 transition-all">
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video, Star, Users, Award, TrendingUp, Quote } from "lucide-react";
import { useServices } from "@/hooks/use-services";
import { useRef, useEffect, useState } from "react";

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

const STATS = [
  { value: 3, suffix: "+", label: "Years Experience", icon: Award },
  { value: 150, suffix: "+", label: "Projects Delivered", icon: Code },
  { value: 50, suffix: "+", label: "Happy Clients", icon: Users },
  { value: 98, suffix: "%", label: "Client Satisfaction", icon: Star },
];

const TESTIMONIALS = [
  {
    content: "MHTSdigiX transformed our online presence completely. Their web development team delivered a stunning e-commerce platform that increased our sales by 200%.",
    name: "Rajesh Kumar",
    role: "CEO, RetailMax",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
  },
  {
    content: "The mobile app they built for our restaurant chain is phenomenal. User-friendly interface and seamless ordering experience. Highly recommend!",
    name: "Priya Sharma",
    role: "Founder, Spice Garden",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
  },
  {
    content: "Their digital marketing strategies helped us reach new markets we never thought possible. ROI increased by 300% in just 6 months.",
    name: "Arun Venkatesh",
    role: "Marketing Head, TechFlow",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
  },
  {
    content: "Professional, responsive, and creative team. They understood our vision and delivered beyond expectations. Best decision we made for our startup.",
    name: "Divya Nair",
    role: "Co-founder, EduSpark",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
  },
];

const CLIENT_LOGOS = [
  { name: "TechFlow", initial: "TF" },
  { name: "RetailMax", initial: "RM" },
  { name: "Spice Garden", initial: "SG" },
  { name: "EduSpark", initial: "ES" },
  { name: "HealthPlus", initial: "HP" },
  { name: "AutoDrive", initial: "AD" },
  { name: "GreenEnergy", initial: "GE" },
  { name: "FinanceHub", initial: "FH" },
];

// Animated counter component
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Home() {
  const { data: services } = useServices();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
                Want More <br />
                <span className="text-gradient">Customers Online?</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
                Build a brand that is data-driven, performance-based, and customer-led. We deliver 10X growth in every aspect of your digital venture.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact" className="px-8 py-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2" data-testid="button-get-started">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/services" className="px-8 py-4 rounded-xl bg-white text-slate-900 border border-slate-200 font-semibold hover:bg-slate-50 transition-all" data-testid="link-view-services">
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
                <img 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80" 
                  alt="Team collaboration" 
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-200 rounded-full blur-3xl opacity-50" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-200 rounded-full blur-3xl opacity-50" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-16 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 to-sky-900/20" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4">
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Logos Carousel */}
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-slate-500 text-sm font-medium mb-8">TRUSTED BY LEADING BRANDS</p>
          <div className="overflow-hidden relative">
            <motion.div 
              className="flex gap-12 items-center"
              animate={{ x: [0, -1000] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
                <div key={i} className="flex items-center gap-3 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-white font-bold text-lg">
                    {logo.initial}
                  </div>
                  <span className="text-slate-700 font-semibold text-lg whitespace-nowrap">{logo.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* What Are My Options Section - Like Social Eagle */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What are my options?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              At MHTSdigiX, we become an extended digital arm for your brand. Choose how you want to work with us.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Full Service",
                subtitle: "Hire us to do it for you",
                desc: "We take care of everything end-to-end using data-driven and performance-based approach.",
                image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500&q=80",
                color: "from-emerald-500 to-emerald-600"
              },
              {
                title: "Consulting",
                subtitle: "Let's do it together",
                desc: "We guide and support your team with battle-tested strategies and proven frameworks.",
                image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&q=80",
                color: "from-sky-500 to-sky-600"
              },
              {
                title: "Training",
                subtitle: "Learn how to do it yourself",
                desc: "We help your team learn the trade and build their own digital expertise.",
                image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&q=80",
                color: "from-violet-500 to-violet-600"
              }
            ].map((option, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-3xl overflow-hidden bg-slate-900"
              >
                <img 
                  src={option.image} 
                  alt={option.title}
                  className="w-full h-64 object-cover opacity-40 group-hover:opacity-30 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-sm text-slate-400 mb-1">{option.subtitle}</p>
                  <h3 className={`text-2xl font-bold mb-3 bg-gradient-to-r ${option.color} bg-clip-text text-transparent`}>
                    {option.title}
                  </h3>
                  <p className="text-slate-300 text-sm mb-4">{option.desc}</p>
                  <Link href="/contact" className="inline-flex items-center gap-2 text-white font-semibold hover:gap-3 transition-all">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-slate-50">
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="group h-full p-8 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white shadow-lg">
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

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Delivering top-notch service is great, but hearing how our work makes a difference is what truly matters.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative bg-gradient-to-br from-emerald-50 to-sky-50 rounded-3xl p-8 md:p-12"
            >
              <Quote className="absolute top-6 left-6 w-12 h-12 text-emerald-200" />
              <div className="relative z-10">
                <p className="text-xl md:text-2xl text-slate-700 mb-8 leading-relaxed italic">
                  "{TESTIMONIALS[currentTestimonial].content}"
                </p>
                <div className="flex items-center gap-4">
                  <img 
                    src={TESTIMONIALS[currentTestimonial].image} 
                    alt={TESTIMONIALS[currentTestimonial].name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{TESTIMONIALS[currentTestimonial].name}</div>
                    <div className="text-slate-500 text-sm">{TESTIMONIALS[currentTestimonial].role}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="flex justify-center gap-2 mt-8">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === currentTestimonial 
                      ? 'bg-emerald-500 w-8' 
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  data-testid={`button-testimonial-${i}`}
                />
              ))}
            </div>
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
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Why Choose <br /><span className="text-gradient">MHTSdigiX?</span></h2>
              <p className="text-slate-600 mb-6 text-lg">
                We are more than just a tech company; we are your growth partners. Our young and dynamic team is obsessed with quality and innovation.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Data-driven & performance-based approach",
                  "Cost-effective tailored solutions",
                  "Transparent & collaborative process",
                  "Dedicated support team 24/7",
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
              <Link href="/about" className="text-emerald-600 font-bold hover:text-emerald-700 inline-flex items-center gap-2" data-testid="link-about-us">
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Ready to Scale Your Business?</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10">
              Join hundreds of satisfied clients who have transformed their digital presence with MHTSdigiX.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="px-8 py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/25" data-testid="button-start-project">
                Start Your Project
              </Link>
              <a href="https://wa.me/917358105995" target="_blank" className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/20 font-bold hover:bg-white/20 transition-all" data-testid="link-whatsapp">
                Chat on WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

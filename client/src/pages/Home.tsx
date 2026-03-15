import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video, Star, Users, Award, TrendingUp, Quote, Trophy, Target, Lightbulb, CheckCircle2, Zap, Shield, Clock } from "lucide-react";
import { useServices } from "@/hooks/use-services";
import { useSiteSettings } from "@/hooks/use-site-settings";
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
    content: "MHTSdigiXR transformed our online presence completely. Their web development team delivered a stunning e-commerce platform that increased our sales by 200%.",
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

const AWARDS = [
  { title: "Best Digital Agency", year: "2025", org: "Digital Excellence Awards" },
  { title: "Top Web Development", year: "2024", org: "Tech Innovation India" },
  { title: "Best UI/UX Design", year: "2024", org: "Design Masters" },
];

const PROCESS_STEPS = [
  { 
    step: "01", 
    title: "Discovery", 
    desc: "We analyze your business, audience, and goals to create a strategic roadmap.",
    icon: Target
  },
  { 
    step: "02", 
    title: "Strategy", 
    desc: "We develop a customized plan with clear milestones and measurable outcomes.",
    icon: Lightbulb
  },
  { 
    step: "03", 
    title: "Execution", 
    desc: "Our expert team brings your vision to life with cutting-edge technology.",
    icon: Zap
  },
  { 
    step: "04", 
    title: "Delivery", 
    desc: "We launch, optimize, and provide ongoing support for continued success.",
    icon: CheckCircle2
  },
];

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
  const s = useSiteSettings();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section - Single White Background with Dark Tech Illustration */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white/80 dark:bg-slate-950/80">
        <div className="container mx-auto px-4 md:px-6 lg:px-12 py-20 lg:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left side - Text content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl"
            >
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sky-500 dark:text-sky-400 text-sm font-semibold tracking-wider mb-6 uppercase"
              >
                Establish Your Brand Awareness With Us
              </motion.p>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.1] mb-6">
                <span className="text-slate-900 dark:text-white">Think Big. Create</span>
                <br />
                <span className="text-slate-900 dark:text-white">Unique. </span>
                <motion.span 
                  className="text-sky-500"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Bring The
                </motion.span>
                <br />
                <motion.span 
                  className="text-sky-500"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Change.
                </motion.span>
              </h1>
              
              <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                We are a team of enthusiastic and creative developers and designers who deliver best in class websites and designs for B2B and B2C businesses.
              </p>
              
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link 
                    href="/contact" 
                    className="group px-8 py-3.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2" 
                    data-testid="button-get-started"
                  >
                    Start Your Project
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link 
                    href="/services" 
                    className="px-8 py-3.5 rounded-full bg-transparent text-sky-600 dark:text-sky-400 border-2 border-sky-500 font-semibold hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all inline-block" 
                    data-testid="link-view-services"
                  >
                    View Our Work
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Right side - Dark Gradient Tech Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Dark gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
              
              {/* Accent gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-600/30 via-transparent to-sky-500/20" />
              
              {/* Grid pattern overlay */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />

              {/* Floating tech elements */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 left-12 w-16 h-16 bg-sky-500/90 rounded-2xl shadow-xl flex items-center justify-center backdrop-blur-sm"
              >
                <Smartphone className="w-8 h-8 text-white" />
              </motion.div>

              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-20 right-16 w-14 h-14 bg-sky-500/90 rounded-full shadow-xl flex items-center justify-center"
              >
                <Globe className="w-7 h-7 text-white" />
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-24 left-20 w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center border border-white/20"
              >
                <Monitor className="w-10 h-10 text-sky-400" />
              </motion.div>

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-32 right-24 w-12 h-12"
              >
                <div className="w-full h-full bg-sky-400/80 rounded-lg shadow-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="absolute top-1/2 right-12 w-14 h-14 bg-sky-400/80 rounded-xl shadow-xl flex items-center justify-center"
              >
                <Code className="w-7 h-7 text-white" />
              </motion.div>

              {/* Center large icon */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-sky-500 to-sky-500 rounded-3xl shadow-2xl flex items-center justify-center"
              >
                <Search className="w-14 h-14 text-white" />
              </motion.div>

              {/* Network dots and lines */}
              <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 400">
                <circle cx="80" cy="80" r="2" fill="#0EA5E9" />
                <circle cx="320" cy="60" r="2" fill="#0EA5E9" />
                <circle cx="200" cy="200" r="3" fill="#0EA5E9" />
                <circle cx="60" cy="320" r="2" fill="#0EA5E9" />
                <circle cx="340" cy="300" r="2" fill="#0EA5E9" />
                <line x1="80" y1="80" x2="200" y2="200" stroke="#0EA5E9" strokeWidth="0.5" opacity="0.5" />
                <line x1="320" y1="60" x2="200" y2="200" stroke="#0EA5E9" strokeWidth="0.5" opacity="0.5" />
                <line x1="60" y1="320" x2="200" y2="200" stroke="#0EA5E9" strokeWidth="0.5" opacity="0.5" />
                <line x1="340" y1="300" x2="200" y2="200" stroke="#0EA5E9" strokeWidth="0.5" opacity="0.5" />
              </svg>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-16 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/20 to-sky-900/20" />
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
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 mb-4">
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
      <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">TRUSTED BY LEADING BRANDS WORLDWIDE</p>
          <div className="overflow-hidden relative">
            <motion.div 
              className="flex gap-12 items-center"
              animate={{ x: [0, -1000] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
                <div key={i} className="flex items-center gap-3 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {logo.initial}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold text-lg whitespace-nowrap">{logo.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Awards & Recognition - World Class Feature */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-black dark:via-slate-900 dark:to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80')] opacity-5 bg-cover bg-center" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Awards & Recognition</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Our commitment to excellence has earned us recognition from industry leaders worldwide.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {AWARDS.map((award, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/20">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{award.title}</h3>
                <p className="text-sky-400 font-semibold mb-1">{award.year}</p>
                <p className="text-slate-400 text-sm">{award.org}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section - World Class Feature */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4 dark:text-white">How We Work</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Our proven 4-step process ensures quality results and a seamless experience for every client.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-20 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-sky-500 via-sky-500 to-violet-500" />
            
            {PROCESS_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-4 border-sky-500 text-xs font-bold flex items-center justify-center text-sky-600">
                  {step.step.replace('0', '')}
                </div>
                <h3 className="text-xl font-bold mb-3 dark:text-white">{step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What Are My Options Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 dark:text-white">What are my options?</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              At {s.brandName}, we become an extended digital arm for your brand. Choose how you want to work with us.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Full Service",
                subtitle: "Hire us to do it for you",
                desc: "We take care of everything end-to-end using data-driven and performance-based approach.",
                image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500&q=80",
                color: "from-sky-500 to-sky-600"
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
                whileHover={{ y: -10 }}
                className="group relative rounded-3xl overflow-hidden bg-slate-900 shadow-xl"
              >
                <img 
                  src={option.image} 
                  alt={option.title}
                  className="w-full h-64 object-cover opacity-40 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-sm text-slate-400 mb-1">{option.subtitle}</p>
                  <h3 className={`text-2xl font-bold mb-3 bg-gradient-to-r ${option.color} bg-clip-text text-transparent`}>
                    {option.title}
                  </h3>
                  <p className="text-slate-300 text-sm mb-4">{option.desc}</p>
                  <Link href="/contact" className="inline-flex items-center gap-2 text-white font-semibold hover:gap-3 transition-all group-hover:text-sky-400">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 dark:text-white">Our Services</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
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
                  className="group h-full p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-700 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white shadow-lg">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors dark:text-white">{feature.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 dark:text-white">What Our Clients Say</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Delivering top-notch service is great, but hearing how our work makes a difference is what truly matters.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative bg-gradient-to-br from-sky-50 to-sky-50 dark:from-slate-700 dark:to-slate-700 rounded-3xl p-8 md:p-12 shadow-xl"
            >
              <Quote className="absolute top-6 left-6 w-12 h-12 text-sky-200 dark:text-sky-800" />
              <div className="relative z-10">
                <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-200 mb-8 leading-relaxed italic">
                  "{TESTIMONIALS[currentTestimonial].content}"
                </p>
                <div className="flex items-center gap-4">
                  <img 
                    src={TESTIMONIALS[currentTestimonial].image} 
                    alt={TESTIMONIALS[currentTestimonial].name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{TESTIMONIALS[currentTestimonial].name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm">{TESTIMONIALS[currentTestimonial].role}</div>
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
                      ? 'bg-sky-500 w-8' 
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                  }`}
                  data-testid={`button-testimonial-${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Snippet */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="grid grid-cols-2 gap-4">
                <motion.img 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&q=80" 
                  alt="Office meeting" 
                  className="rounded-2xl shadow-lg mt-8"
                />
                <motion.img 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&q=80" 
                  alt="Strategy planning" 
                  className="rounded-2xl shadow-lg"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 dark:text-white">Why Choose <br /><span className="text-gradient">{s.brandName}?</span></h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 text-lg">
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
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 font-medium text-slate-700 dark:text-slate-300"
                  >
                    <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {item}
                  </motion.li>
                ))}
              </ul>
              <Link href="/about" className="text-sky-600 dark:text-sky-400 font-bold hover:text-sky-700 inline-flex items-center gap-2" data-testid="link-about-us">
                Learn more about us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 dark:bg-black relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80')] opacity-10 bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/30 to-sky-900/30" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Ready to Dominate Online?</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10">
              Join 50+ brands who have transformed their digital presence with {s.brandName}. Let's build something extraordinary together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/contact" className="inline-block px-10 py-5 rounded-full bg-sky-500 text-white font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/30" data-testid="button-start-project">
                  Start Your Project
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/case-studies" className="inline-block px-10 py-5 rounded-full bg-transparent text-white border-2 border-white/50 font-bold hover:bg-white/10 transition-all" data-testid="link-view-work">
                  View Our Work
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

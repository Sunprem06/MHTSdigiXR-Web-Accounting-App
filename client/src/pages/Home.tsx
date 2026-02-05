import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Code, Smartphone, BarChart3, Palette, Monitor, Globe, Search, Video, Star, Users, Award, TrendingUp, Quote, Trophy, Target, Lightbulb, CheckCircle2, Zap, Shield, Clock } from "lucide-react";
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
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section - World Class */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Left side - Transparent to show watermark */}
        <div className="w-full lg:w-1/2 py-20 lg:py-32 px-4 md:px-6 lg:px-12 xl:px-20 relative z-10">
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
                className="text-emerald-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Bring The
              </motion.span>
              <br />
              <motion.span 
                className="text-emerald-500"
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
            
            <div className="flex flex-wrap gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/contact" 
                  className="group px-6 py-3 rounded-md bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2" 
                  data-testid="button-get-started"
                >
                  Get Started Today
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/services" 
                  className="px-6 py-3 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all" 
                  data-testid="link-view-services"
                >
                  Our Services
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Right side - Gradient background with tech illustration */}
        <div className="hidden lg:block absolute top-0 right-0 w-1/2 h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-sky-200 to-emerald-400 dark:from-sky-900 dark:via-sky-800 dark:to-emerald-700" />
          
          {/* Tech illustration elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" 
              alt="Digital technology"
              className="w-full h-full object-cover opacity-30 mix-blend-overlay"
            />
          </motion.div>

          {/* Floating elements */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-20 h-20 bg-white/80 dark:bg-white/60 rounded-2xl shadow-xl flex items-center justify-center"
          >
            <Smartphone className="w-10 h-10 text-sky-500" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-1/3 right-1/4 w-16 h-16 bg-sky-400/80 dark:bg-sky-500/60 rounded-full shadow-xl flex items-center justify-center"
          >
            <Globe className="w-8 h-8 text-white" />
          </motion.div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-white/90 dark:bg-white/70 rounded-2xl shadow-xl flex items-center justify-center"
          >
            <Monitor className="w-12 h-12 text-emerald-500" />
          </motion.div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/3 right-1/3 w-14 h-14"
          >
            <div className="w-full h-full bg-emerald-400/60 dark:bg-emerald-500/50 rounded-lg shadow-lg flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute top-1/2 right-1/5 w-12 h-12 bg-sky-300/80 dark:bg-sky-400/60 rounded-xl shadow-xl flex items-center justify-center"
          >
            <Code className="w-6 h-6 text-white" />
          </motion.div>

          {/* Network dots and lines */}
          <svg className="absolute inset-0 w-full h-full opacity-30 dark:opacity-20" viewBox="0 0 400 400">
            <circle cx="100" cy="100" r="3" fill="white" />
            <circle cx="200" cy="150" r="3" fill="white" />
            <circle cx="300" cy="100" r="3" fill="white" />
            <circle cx="150" cy="250" r="3" fill="white" />
            <circle cx="250" cy="300" r="3" fill="white" />
            <circle cx="350" cy="250" r="3" fill="white" />
            <line x1="100" y1="100" x2="200" y2="150" stroke="white" strokeWidth="1" />
            <line x1="200" y1="150" x2="300" y2="100" stroke="white" strokeWidth="1" />
            <line x1="150" y1="250" x2="200" y2="150" stroke="white" strokeWidth="1" />
            <line x1="250" y1="300" x2="350" y2="250" stroke="white" strokeWidth="1" />
            <line x1="250" y1="300" x2="150" y2="250" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        {/* Mobile gradient background - semi-transparent to show watermark */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-sky-100/50 dark:from-slate-950/80 dark:via-slate-950/70 dark:to-sky-900/30 -z-10" />
      </section>

      {/* Stats Counter Section */}
      <section className="py-16 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                <p className="text-emerald-400 font-semibold mb-1">{award.year}</p>
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
            <div className="hidden md:block absolute top-20 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500" />
            
            {PROCESS_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-4 border-emerald-500 text-xs font-bold flex items-center justify-center text-emerald-600">
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
                  <Link href="/contact" className="inline-flex items-center gap-2 text-white font-semibold hover:gap-3 transition-all group-hover:text-emerald-400">
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
                  className="group h-full p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white shadow-lg">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors dark:text-white">{feature.title}</h3>
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
              className="relative bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-slate-700 dark:to-slate-700 rounded-3xl p-8 md:p-12 shadow-xl"
            >
              <Quote className="absolute top-6 left-6 w-12 h-12 text-emerald-200 dark:text-emerald-800" />
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
                      ? 'bg-emerald-500 w-8' 
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
              <h2 className="text-3xl md:text-5xl font-bold mb-6 dark:text-white">Why Choose <br /><span className="text-gradient">MHTSdigiX?</span></h2>
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
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {item}
                  </motion.li>
                ))}
              </ul>
              <Link href="/about" className="text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-700 inline-flex items-center gap-2" data-testid="link-about-us">
                Learn more about us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 dark:bg-black relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80')] opacity-10 bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 to-sky-900/30" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Ready to Dominate Online?</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10">
              Join 50+ brands who have transformed their digital presence with MHTSdigiX. Let's build something extraordinary together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/contact" className="inline-block px-10 py-5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30" data-testid="button-start-project">
                  Start Your Project
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a href="https://wa.me/917358105995" target="_blank" className="inline-block px-10 py-5 rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/20 font-bold hover:bg-white/20 transition-all" data-testid="link-whatsapp">
                  Chat on WhatsApp
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

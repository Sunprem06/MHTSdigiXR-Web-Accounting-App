import { useParams } from "wouter";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, Code, Smartphone, BarChart3, Monitor, Search, Palette, Server, Video, Zap, Target, TrendingUp, Users, Shield, Clock, Award, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/use-site-settings";

const SERVICES_DATA: Record<string, {
  title: string;
  desc: string;
  longDesc: string;
  image: string;
  features: string[];
  benefits: { icon: any; title: string; desc: string }[];
  process: { step: number; title: string; desc: string }[];
  technologies?: string[];
}> = {
  "web-development": {
    title: "Web Development",
    desc: "We build high-performance, secure, and scalable websites tailored to your business goals.",
    longDesc: "From simple landing pages to complex e-commerce platforms, our team delivers excellence. We use modern frameworks and best practices to create websites that load fast, rank well, and convert visitors into customers.",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80",
    features: [
      "Custom Frontend Development (React, Vue, Angular)",
      "Backend API Development (Node.js, Python, PHP)",
      "Database Design & Optimization (PostgreSQL, MongoDB)",
      "Cloud Infrastructure Setup (AWS, Azure, GCP)",
      "E-commerce Solutions (Shopify, WooCommerce, Custom)",
      "Content Management Systems (WordPress, Strapi)",
      "Progressive Web Apps (PWA)",
      "Performance Optimization & Security Hardening"
    ],
    benefits: [
      { icon: Zap, title: "Lightning Fast", desc: "Optimized for speed with sub-2 second load times" },
      { icon: Shield, title: "Secure & Reliable", desc: "Built with security best practices and SSL encryption" },
      { icon: TrendingUp, title: "SEO Optimized", desc: "Structured for search engine visibility from day one" },
      { icon: Users, title: "User-Centric", desc: "Designed with your customers' experience in mind" }
    ],
    process: [
      { step: 1, title: "Discovery", desc: "We analyze your requirements, target audience, and business goals" },
      { step: 2, title: "Design", desc: "Create wireframes and visual designs for your approval" },
      { step: 3, title: "Development", desc: "Build your website with clean, maintainable code" },
      { step: 4, title: "Launch", desc: "Deploy, test, and launch with ongoing support" }
    ],
    technologies: ["React", "Next.js", "Node.js", "WordPress", "Shopify", "PostgreSQL", "AWS", "Tailwind CSS"]
  },
  "mobile-app": {
    title: "Mobile App Development",
    desc: "Reach your customers on the go with native and cross-platform mobile applications.",
    longDesc: "We create intuitive, fast, and feature-rich apps for iOS and Android. Whether you need a native app for maximum performance or a cross-platform solution for broader reach, our team delivers polished mobile experiences.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
    features: [
      "iOS App Development (Swift, SwiftUI)",
      "Android App Development (Kotlin, Jetpack Compose)",
      "Cross-Platform Solutions (Flutter, React Native)",
      "UI/UX Design for Mobile",
      "Push Notifications & Real-time Features",
      "Offline Mode & Data Sync",
      "Payment Gateway Integration",
      "App Store Optimization & Launch Support"
    ],
    benefits: [
      { icon: Smartphone, title: "Native Experience", desc: "Smooth, responsive apps that feel native to each platform" },
      { icon: Zap, title: "High Performance", desc: "Optimized for speed and battery efficiency" },
      { icon: Shield, title: "Secure", desc: "Enterprise-grade security for user data protection" },
      { icon: TrendingUp, title: "Scalable", desc: "Architecture that grows with your user base" }
    ],
    process: [
      { step: 1, title: "Ideation", desc: "Define app features, user flows, and technical requirements" },
      { step: 2, title: "UI/UX Design", desc: "Create beautiful, intuitive mobile interfaces" },
      { step: 3, title: "Development", desc: "Build and test across multiple devices and OS versions" },
      { step: 4, title: "Launch", desc: "App Store submission, optimization, and maintenance" }
    ],
    technologies: ["Swift", "Kotlin", "Flutter", "React Native", "Firebase", "REST APIs", "GraphQL"]
  },
  "digital-marketing": {
    title: "Digital Marketing",
    desc: "Data-driven marketing strategies to increase brand visibility and boost conversions.",
    longDesc: "We create comprehensive digital marketing campaigns that drive real results. From social media marketing to paid advertising, we help you reach your target audience effectively and turn clicks into customers.",
    image: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&q=80",
    features: [
      "Social Media Marketing (Facebook, Instagram, LinkedIn)",
      "Google Ads & PPC Campaigns",
      "Content Marketing & Strategy",
      "Email Marketing Automation",
      "Influencer Marketing Partnerships",
      "Analytics & Conversion Tracking",
      "Lead Generation Campaigns",
      "Remarketing & Retargeting Strategies"
    ],
    benefits: [
      { icon: Target, title: "Targeted Reach", desc: "Reach your ideal customers with precision targeting" },
      { icon: TrendingUp, title: "Measurable ROI", desc: "Track every rupee spent and optimize for results" },
      { icon: Users, title: "Brand Awareness", desc: "Build recognition and trust with your audience" },
      { icon: Zap, title: "Quick Results", desc: "See improvements in traffic and leads within weeks" }
    ],
    process: [
      { step: 1, title: "Audit", desc: "Analyze your current digital presence and competitors" },
      { step: 2, title: "Strategy", desc: "Develop a customized marketing plan for your goals" },
      { step: 3, title: "Execute", desc: "Launch campaigns across selected platforms" },
      { step: 4, title: "Optimize", desc: "Monitor, analyze, and continuously improve performance" }
    ],
    technologies: ["Google Ads", "Meta Ads", "HubSpot", "Mailchimp", "Google Analytics", "SEMrush", "Hootsuite"]
  },
  "ui-ux": {
    title: "UI/UX Design",
    desc: "Creating intuitive and engaging user interfaces that delight users and solve problems.",
    longDesc: "Great design is invisible - it just works. Our UI/UX team creates interfaces that are beautiful, functional, and user-focused. We combine research, creativity, and usability testing to deliver designs that convert.",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80",
    features: [
      "User Research & Personas",
      "Wireframing & Information Architecture",
      "High-Fidelity UI Design",
      "Interactive Prototyping (Figma, Adobe XD)",
      "Design System Creation",
      "Usability Testing & User Feedback",
      "Responsive & Adaptive Design",
      "Accessibility Compliance (WCAG)"
    ],
    benefits: [
      { icon: Users, title: "User-Centered", desc: "Designs based on real user research and behavior" },
      { icon: TrendingUp, title: "Higher Conversions", desc: "Intuitive flows that guide users to take action" },
      { icon: Award, title: "Brand Consistency", desc: "Unified design language across all touchpoints" },
      { icon: Layers, title: "Scalable Systems", desc: "Reusable components that grow with your product" }
    ],
    process: [
      { step: 1, title: "Research", desc: "Understand your users, goals, and competitive landscape" },
      { step: 2, title: "Wireframe", desc: "Create low-fidelity layouts and user flows" },
      { step: 3, title: "Design", desc: "Develop high-fidelity visuals and interactive prototypes" },
      { step: 4, title: "Validate", desc: "Test with real users and iterate based on feedback" }
    ],
    technologies: ["Figma", "Adobe XD", "Sketch", "InVision", "Principle", "Maze", "Hotjar"]
  },
  "seo": {
    title: "SEO Optimization",
    desc: "Improve your search engine rankings and drive organic traffic with proven strategies.",
    longDesc: "Get found by customers actively searching for your products and services. Our SEO experts use white-hat techniques to improve your visibility on Google, drive qualified traffic, and increase conversions organically.",
    image: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&q=80",
    features: [
      "Technical SEO Audit & Fixes",
      "Keyword Research & Strategy",
      "On-Page SEO Optimization",
      "Content Optimization & Creation",
      "Link Building & Outreach",
      "Local SEO for Business Listings",
      "Google Search Console Setup",
      "Monthly Reporting & Analytics"
    ],
    benefits: [
      { icon: TrendingUp, title: "Organic Growth", desc: "Sustainable traffic that doesn't depend on ad spend" },
      { icon: Target, title: "Qualified Leads", desc: "Attract visitors actively searching for your services" },
      { icon: Shield, title: "Long-term Value", desc: "Rankings that compound over time" },
      { icon: Award, title: "Authority Building", desc: "Establish your brand as an industry leader" }
    ],
    process: [
      { step: 1, title: "Audit", desc: "Complete technical and content SEO audit of your site" },
      { step: 2, title: "Research", desc: "Identify high-value keywords and competitor gaps" },
      { step: 3, title: "Optimize", desc: "Implement on-page, technical, and off-page improvements" },
      { step: 4, title: "Monitor", desc: "Track rankings, traffic, and continuously optimize" }
    ],
    technologies: ["Google Analytics", "Search Console", "Ahrefs", "SEMrush", "Screaming Frog", "Moz", "Yoast SEO"]
  },
  "branding": {
    title: "Branding & Graphics",
    desc: "Build a memorable brand identity with professional logo design and visual assets.",
    longDesc: "Your brand is more than just a logo - it's the entire experience customers have with your business. We create cohesive brand identities that resonate with your target audience and set you apart from competitors.",
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80",
    features: [
      "Logo Design & Variations",
      "Brand Identity Guidelines",
      "Color Palette & Typography Selection",
      "Business Card & Stationery Design",
      "Social Media Graphics & Templates",
      "Marketing Collateral (Brochures, Flyers)",
      "Packaging Design",
      "Brand Strategy & Positioning"
    ],
    benefits: [
      { icon: Award, title: "Memorable Identity", desc: "Stand out with a unique and recognizable brand" },
      { icon: Users, title: "Build Trust", desc: "Professional branding increases customer confidence" },
      { icon: Layers, title: "Consistency", desc: "Unified look across all marketing materials" },
      { icon: TrendingUp, title: "Premium Perception", desc: "Quality branding commands higher prices" }
    ],
    process: [
      { step: 1, title: "Discovery", desc: "Understand your brand values, audience, and competitors" },
      { step: 2, title: "Concepts", desc: "Present multiple creative directions for feedback" },
      { step: 3, title: "Refine", desc: "Perfect the chosen direction with your input" },
      { step: 4, title: "Deliver", desc: "Provide all assets with comprehensive brand guidelines" }
    ],
    technologies: ["Adobe Illustrator", "Photoshop", "InDesign", "Canva Pro", "Procreate", "After Effects"]
  },
  "hosting": {
    title: "Domain & Hosting",
    desc: "Secure and reliable hosting solutions to keep your website running 24/7.",
    longDesc: "Your website needs a solid foundation. We provide domain registration, cloud hosting, SSL certificates, and ongoing maintenance to ensure your site is fast, secure, and always available to your customers.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80",
    features: [
      "Domain Name Registration & Transfer",
      "Cloud Hosting (AWS, DigitalOcean, Linode)",
      "SSL Certificate Installation",
      "Email Hosting & Configuration",
      "Daily Automated Backups",
      "CDN Setup for Global Performance",
      "Server Monitoring & Uptime Alerts",
      "Security Updates & Malware Protection"
    ],
    benefits: [
      { icon: Shield, title: "99.9% Uptime", desc: "Reliable hosting with guaranteed availability" },
      { icon: Zap, title: "Fast Loading", desc: "Optimized servers and CDN for quick page loads" },
      { icon: Clock, title: "24/7 Monitoring", desc: "Proactive monitoring and instant issue resolution" },
      { icon: Server, title: "Scalable", desc: "Infrastructure that grows with your traffic" }
    ],
    process: [
      { step: 1, title: "Assess", desc: "Evaluate your hosting needs and traffic expectations" },
      { step: 2, title: "Setup", desc: "Configure domain, hosting, SSL, and email" },
      { step: 3, title: "Migrate", desc: "Safely transfer your existing site if applicable" },
      { step: 4, title: "Maintain", desc: "Ongoing monitoring, backups, and support" }
    ],
    technologies: ["AWS", "DigitalOcean", "Cloudflare", "cPanel", "Nginx", "Docker", "Let's Encrypt"]
  },
  "video-animation": {
    title: "Video & Animation",
    desc: "Captivate your audience with high-quality video content and motion graphics.",
    longDesc: "Video is the most engaging content format. We create compelling explainer videos, social media content, and animations that tell your story, explain complex concepts, and drive action from your audience.",
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&q=80",
    features: [
      "Explainer Videos (2D & 3D)",
      "Social Media Video Content",
      "Motion Graphics & Kinetic Typography",
      "Product Demo Videos",
      "Corporate Videos & Testimonials",
      "Logo Animation & Intros",
      "Whiteboard Animation",
      "Video Editing & Post-Production"
    ],
    benefits: [
      { icon: Users, title: "Higher Engagement", desc: "Video content gets 10x more engagement than text" },
      { icon: TrendingUp, title: "Better Conversions", desc: "Landing pages with video convert 80% more" },
      { icon: Award, title: "Professional Image", desc: "Quality videos elevate your brand perception" },
      { icon: Target, title: "Shareable Content", desc: "Videos are more likely to be shared on social media" }
    ],
    process: [
      { step: 1, title: "Scripting", desc: "Develop the storyline and script for your video" },
      { step: 2, title: "Storyboard", desc: "Visualize scenes and get approval before production" },
      { step: 3, title: "Production", desc: "Create animations, record voiceovers, add music" },
      { step: 4, title: "Deliver", desc: "Provide final video in all required formats" }
    ],
    technologies: ["After Effects", "Premiere Pro", "Cinema 4D", "Blender", "DaVinci Resolve", "Lottie"]
  }
};

export default function ServiceDetail() {
  const { slug } = useParams();
  const s = useSiteSettings();
  const service = SERVICES_DATA[slug || ""];

  if (!service) {
    return (
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-4xl font-bold mb-4 dark:text-white">Service Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">The service you're looking for doesn't exist.</p>
          <Link href="/services" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6">
        <Link href="/services" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 mb-8 font-medium transition-colors" data-testid="link-back-services">
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </Link>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white" data-testid="text-service-title">{service.title}</h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              {service.desc}
            </p>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              {service.longDesc}
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-bold hover:bg-sky-600 transition-all shadow-lg hover:shadow-sky-500/25" data-testid="button-start-project">
                Start Your Project
              </Link>
              {s.whatsappNumber && (
                <a href={`https://wa.me/${s.whatsappNumber}`} target="_blank" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-transparent text-sky-600 dark:text-sky-400 border-2 border-sky-500 font-bold hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all" data-testid="link-whatsapp">
                  WhatsApp Us
                </a>
              )}
            </div>
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
            <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/10 dark:ring-white/10" />
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-slate-900 dark:text-white">What We Deliver</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {service.features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl"
                >
                  <CheckCircle className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Benefits Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-slate-900 dark:text-white">Why Choose Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {service.benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow text-center border border-slate-100 dark:border-slate-700"
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-7 h-7 text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{benefit.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Process Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-white">Our Process</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {service.process.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center relative"
                >
                  <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                    {step.step}
                  </div>
                  {i < service.process.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-sky-500/30" />
                  )}
                  <h3 className="text-lg font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-slate-400 text-sm">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Technologies Section */}
        {service.technologies && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center text-slate-900 dark:text-white">Technologies We Use</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {service.technologies.map((tech, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-medium text-sm hover:bg-sky-100 dark:hover:bg-sky-900/30 hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </motion.section>
        )}

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Ready to Get Started?</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Let's discuss how our {service.title.toLowerCase()} services can help grow your business. Get a free consultation today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg" data-testid="button-contact-us">
                Get Free Quote
              </Link>
              <Link href="/services" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-transparent text-sky-600 dark:text-sky-400 border-2 border-sky-500 font-semibold hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all" data-testid="link-view-services">
                View All Services
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

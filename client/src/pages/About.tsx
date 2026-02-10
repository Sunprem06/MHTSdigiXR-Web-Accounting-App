import { motion } from "framer-motion";
import { Check, Quote, Users, Target, Lightbulb, Award, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import teamMemberImage from "@/assets/images/team-member.png";

const TEAM_VALUES = [
  { icon: Target, title: "Result-Driven", desc: "Every strategy we craft is aimed at delivering measurable outcomes for your business." },
  { icon: Lightbulb, title: "Innovation First", desc: "We stay ahead of trends to bring you cutting-edge solutions that set you apart." },
  { icon: Users, title: "Client-Centric", desc: "Your success is our success. We build partnerships, not just projects." },
  { icon: Award, title: "Quality Obsessed", desc: "We never compromise on quality. Every pixel and line of code matters." },
];

export default function About() {
  return (
    <div className="pt-24 pb-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 text-sm font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              About MHTSdigiX
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white">
              Your Extended <span className="text-gradient">Digital Team</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Maanagaram Hi Tech Solutions (MHTSdigiX) was founded in December 2022 with a vision to empower businesses through digital transformation. We genuinely feel like an extended marketing and technology arm for every brand we associate with.
            </p>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              Based in Chennai, India, we serve clients globally, providing bespoke solutions that drive growth and efficiency. Our approach combines technical expertise with creative innovation to solve complex business challenges.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {["Expert Team", "Global Reach", "24/7 Support", "Agile Methodology"].map((item) => (
                <div key={item} className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                  <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <Check className="w-4 h-4" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <img 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80" 
              alt="Our Team" 
              className="rounded-3xl shadow-2xl"
            />
            <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-w-xs">
              <p className="text-4xl font-bold text-sky-600 dark:text-sky-400 mb-1">150+</p>
              <p className="text-slate-600 dark:text-slate-300 font-medium">Projects Successfully Delivered</p>
            </div>
          </motion.div>
        </div>

        {/* Message from Leadership */}
        <section className="mb-24">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-black dark:to-slate-900 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 grid lg:grid-cols-5 gap-10 items-center">
              <div className="lg:col-span-3">
                <Quote className="w-12 h-12 text-sky-500 mb-6" />
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Message from Our Team</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-6">
                  Most businesses struggle because they don't concentrate on Marketing. If there is no lead flow, there is no cash flow. Creating multiple sources for lead generation is the key to sustainable growth.
                </p>
                <p className="text-slate-300 text-lg leading-relaxed mb-6">
                  We help you define your audience, refine your message, and identify platforms to leverage the maximum potential of the Digital Ecosystem. Only 3% of the audience are looking for a solution - the rest of the market needs education.
                </p>
                <p className="text-sky-400 font-semibold text-xl italic">
                  "Marketing + Data = New Fuel. We take you to escape velocity."
                </p>
              </div>
              <div className="lg:col-span-2">
                <img 
                  src={teamMemberImage}
                  alt="MHTSdigiX Team Representative" 
                  className="rounded-2xl shadow-2xl mx-auto w-full max-w-xs object-cover"
                />
                <div className="text-center mt-6">
                  <p className="text-white font-bold text-lg">The MHTSdigiX Team</p>
                  <p className="text-slate-400">Chennai, India</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-900 dark:bg-black text-white p-10 rounded-3xl"
          >
            <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
            <p className="text-slate-300 leading-relaxed">
              To be a global leader in digital innovation, creating solutions that not only solve today's problems but anticipate tomorrow's opportunities. We envision a world where every business has access to world-class digital solutions.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-sky-500 to-sky-500 text-white p-10 rounded-3xl"
          >
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-white/90 leading-relaxed">
              To empower businesses of all sizes with affordable, high-quality digital solutions that drive measurable growth and success. We aim to be the trusted partner for brands seeking digital transformation.
            </p>
          </motion.div>
        </div>

        {/* Core Values */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 dark:text-white">What Drives Us</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Our core values shape everything we do - from how we work with clients to how we build our solutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM_VALUES.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-8 rounded-2xl hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center mb-6 text-white">
                  <value.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 dark:text-white">{value.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-white">Ready to Work Together?</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-8">
              Let's discuss how we can help transform your business with our digital solutions.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-all shadow-lg" data-testid="button-contact-us">
              Start Your Project <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

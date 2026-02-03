import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function About() {
  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900">
              Innovating the Future of <span className="text-gradient">Technology</span>
            </h1>
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Maanagaram Hi Tech Solutions (MHTSdigiX) was founded in December 2022 with a vision to empower businesses through digital transformation. We are a team of passionate developers, designers, and strategists committed to delivering excellence.
            </p>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Based in Chennai, India, we serve clients globally, providing bespoke solutions that drive growth and efficiency. Our approach combines technical expertise with creative innovation to solve complex business challenges.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {["Expert Team", "Global Reach", "24/7 Support", "Agile Methodology"].map((item) => (
                <div key={item} className="flex items-center gap-2 font-semibold text-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
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
            <div className="absolute -bottom-6 -right-6 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-xs">
              <p className="text-4xl font-bold text-emerald-600 mb-1">100+</p>
              <p className="text-slate-600 font-medium">Projects Successfully Delivered</p>
            </div>
          </motion.div>
        </div>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <div className="bg-slate-900 text-white p-10 rounded-3xl">
            <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
            <p className="text-slate-300 leading-relaxed">
              To be a global leader in digital innovation, creating solutions that not only solve today's problems but anticipate tomorrow's opportunities.
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-sky-500 text-white p-10 rounded-3xl">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-white/90 leading-relaxed">
              To empower businesses of all sizes with affordable, high-quality digital solutions that drive measurable growth and success.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

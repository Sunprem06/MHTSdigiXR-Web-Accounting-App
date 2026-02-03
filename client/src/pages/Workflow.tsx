import { motion } from "framer-motion";
import { MessageSquare, FileText, Code, CheckCircle, Rocket, LifeBuoy } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    title: "1. Discovery",
    desc: "We discuss your ideas, requirements, and business goals to understand the scope of the project."
  },
  {
    icon: FileText,
    title: "2. Planning",
    desc: "We create a comprehensive roadmap, sitemap, and wireframes to outline the project structure."
  },
  {
    icon: Code,
    title: "3. Development",
    desc: "Our developers write clean, efficient code to bring the designs to life using modern technologies."
  },
  {
    icon: CheckCircle,
    title: "4. Testing",
    desc: "Rigorous testing across devices and browsers to ensure a bug-free and smooth experience."
  },
  {
    icon: Rocket,
    title: "5. Launch",
    desc: "We deploy your project to the live environment and ensure everything is running perfectly."
  },
  {
    icon: LifeBuoy,
    title: "6. Support",
    desc: "Ongoing maintenance and support to keep your digital solution updated and secure."
  }
];

export default function Workflow() {
  return (
    <div className="pt-24 pb-20">
      <section className="bg-slate-50 py-16 mb-16 border-b border-slate-200">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Our Workflow</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            A transparent, agile process designed to deliver exceptional results on time and within budget.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {STEPS.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="h-full bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-4">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
              
              {/* Connector Line (Desktop Only) - skipping for last item */}
              {index < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-1 bg-slate-200 -z-10" style={{ display: (index + 1) % 3 === 0 ? 'none' : 'block' }} />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

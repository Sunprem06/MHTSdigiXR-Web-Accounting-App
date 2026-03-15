import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import logoImage from "@assets/MHTSdigiXR_logo_1080x1080_1773540695277.jpg";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 dark:bg-black text-slate-200 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img 
                src={logoImage} 
                alt="MHTSdigiXR Logo" 
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-lg text-white">MHTSdigiXR</span>
                <span className="text-[10px] font-medium text-slate-400 tracking-wide">Maanagarram Hi Tech Solutions</span>
              </div>
            </div>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Empowering businesses with cutting-edge digital solutions. From web development to AI integration, we are your partner in growth.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-900 flex items-center justify-center hover:bg-sky-600 transition-colors" data-testid="link-linkedin">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-900 flex items-center justify-center hover:bg-sky-500 transition-colors" data-testid="link-twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-900 flex items-center justify-center hover:bg-pink-600 transition-colors" data-testid="link-instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-900 flex items-center justify-center hover:bg-blue-600 transition-colors" data-testid="link-facebook">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="hover:text-sky-400 transition-colors">About Us</Link></li>
              <li><Link href="/services" className="hover:text-sky-400 transition-colors">Our Services</Link></li>
              <li><Link href="/workflow" className="hover:text-sky-400 transition-colors">Workflow</Link></li>
              <li><Link href="/case-studies" className="hover:text-sky-400 transition-colors">Case Studies</Link></li>
              <li><Link href="/careers" className="hover:text-sky-400 transition-colors">Careers</Link></li>
              <li><Link href="/faq" className="hover:text-sky-400 transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-sky-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Services</h3>
            <ul className="space-y-3">
              <li><Link href="/services/web-development" className="hover:text-sky-400 transition-colors">Web Development</Link></li>
              <li><Link href="/services/mobile-app" className="hover:text-sky-400 transition-colors">Mobile Apps</Link></li>
              <li><Link href="/services/digital-marketing" className="hover:text-sky-400 transition-colors">Digital Marketing</Link></li>
              <li><Link href="/services/seo" className="hover:text-sky-400 transition-colors">SEO Optimization</Link></li>
              <li><Link href="/services/ui-ux" className="hover:text-sky-400 transition-colors">UI/UX Design</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Get in Touch</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <MapPin className="w-5 h-5 text-sky-500 shrink-0" />
                <span className="text-sm">4056, 5th Main Road, Ayyapakam, Chennai, Tamil Nadu, India - 600077</span>
              </li>
              <li className="flex gap-3 items-center">
                <Phone className="w-5 h-5 text-sky-500 shrink-0" />
                <a href="tel:+914447740195" className="text-sm hover:text-white transition-colors">+91 44 4774 0195</a>
              </li>
              <li className="flex gap-3 items-center">
                <Mail className="w-5 h-5 text-sky-500 shrink-0" />
                <a href="mailto:info@mhtsdigixr.com" className="text-sm hover:text-white transition-colors">info@mhtsdigixr.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>@2026 All rights reserved by Maanagarram Hi Tech Solutions</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

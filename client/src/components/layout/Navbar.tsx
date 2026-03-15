import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Phone, Globe, Sun, Moon, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@assets/MHTSdigiXR_logo_1080x1080_1773540695277.jpg";
import { useSiteSettings } from "@/hooks/use-site-settings";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/workflow", label: "Workflow" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/careers", label: "Careers" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const s = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const shouldBeDark = savedTheme === "dark";
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-lg py-3"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img 
              src={logoImage} 
              alt="MHTSdigiXR Logo" 
              className="w-12 h-12 rounded-xl shadow-lg group-hover:scale-105 transition-transform object-cover"
            />
            <div className="flex flex-col">
              <span className={`font-display font-extrabold text-lg leading-tight ${scrolled ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                {s.brandName}
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">
                {s.companyName}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-sky-600 ${
                  location === link.href
                    ? "text-sky-600 font-semibold"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/accounting/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-sky-500 text-sky-600 dark:text-sky-400 text-sm font-semibold hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-all"
              data-testid="link-accounting-login"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
            <button
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
              className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {s.phone && (
              <a
                href={`tel:${s.phone}`}
                className="px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md hover:shadow-xl flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-slate-600 dark:text-slate-300"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-lg font-medium p-2 rounded-lg ${
                    location === link.href
                      ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/accounting/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-lg font-medium p-2 rounded-lg text-sky-600 dark:text-sky-400"
                data-testid="link-accounting-login-mobile"
              >
                <LogIn className="w-5 h-5" />
                Login
              </Link>
              <hr className="border-slate-100 dark:border-slate-800" />
              <div className="flex flex-col gap-3 p-2">
                <button
                  onClick={toggleDarkMode}
                  data-testid="button-theme-toggle-mobile"
                  className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </button>
                {s.address && (
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <Globe className="w-4 h-4" />
                    <span>{s.address}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{s.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

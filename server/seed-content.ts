import { db } from "./db";
import { faqItems, testimonials, siteStats, posts } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedContent() {
  const [faqCount] = await db.select({ count: sql<number>`count(*)::int` }).from(faqItems);
  if ((faqCount?.count ?? 0) === 0) {
    await db.insert(faqItems).values([
      { question: "What services does MHTSdigiXR offer?", answer: "MHTSdigiXR offers comprehensive digital solutions including Web Development, Mobile App Development, Digital Marketing, UI/UX Design, SEO Optimization, Branding & Graphics, Domain & Hosting, and Video & Animation services.", category: "General Questions", displayOrder: 1, isActive: true },
      { question: "How long has MHTSdigiXR been in business?", answer: "Maanagarram Hi Tech Solutions has been serving clients since 2015, with over 10+ years of combined expertise in digital marketing and web development.", category: "General Questions", displayOrder: 2, isActive: true },
      { question: "Do you work with clients outside India?", answer: "Yes, we serve clients globally! While we are based in Chennai, India, we have successfully completed projects for clients across USA, UK, UAE, Australia, and other countries.", category: "General Questions", displayOrder: 3, isActive: true },
      { question: "What makes MHTSdigiXR different from other agencies?", answer: "We combine creativity with data-driven strategies to deliver measurable results. Our differentiators include: 24/7 customer support, transparent pricing, dedicated project managers, and a focus on ROI-driven solutions.", category: "General Questions", displayOrder: 4, isActive: true },
      { question: "What types of websites do you develop?", answer: "We develop all types of websites including corporate websites, e-commerce platforms, portfolio sites, landing pages, blog websites, educational portals, booking systems, and custom web applications.", category: "Web Development", displayOrder: 5, isActive: true },
      { question: "How long does it take to build a website?", answer: "Timeline varies based on complexity: Basic websites take 2-3 weeks, custom websites take 4-6 weeks, e-commerce sites take 6-8 weeks, and complex web applications can take 8-12+ weeks.", category: "Web Development", displayOrder: 6, isActive: true },
      { question: "Will my website be mobile-friendly?", answer: "Absolutely! All our websites are 100% responsive and optimized for all devices - desktops, tablets, and smartphones. We follow mobile-first design principles.", category: "Web Development", displayOrder: 7, isActive: true },
      { question: "Do you build iOS and Android apps?", answer: "Yes! We develop native iOS and Android apps, as well as cross-platform apps using React Native and Flutter. We choose the best technology stack based on your project requirements.", category: "Mobile App Development", displayOrder: 8, isActive: true },
      { question: "How much does a mobile app cost?", answer: "App development costs vary based on complexity, features, and platform. Basic apps start from INR 50,000, while complex enterprise apps can range up to INR 5,00,000+. Contact us for a detailed quote.", category: "Mobile App Development", displayOrder: 9, isActive: true },
      { question: "What digital marketing services do you provide?", answer: "We offer Social Media Marketing, Google Ads (PPC), Content Marketing, Email Marketing, Influencer Marketing, and Brand Strategy services. All campaigns are data-driven with transparent ROI reporting.", category: "Digital Marketing", displayOrder: 10, isActive: true },
      { question: "How long does it take to see SEO results?", answer: "SEO is a long-term strategy. You can expect to see initial improvements in 3-4 months, with significant results typically visible in 6-12 months, depending on competition and industry.", category: "SEO", displayOrder: 11, isActive: true },
      { question: "What is your design process?", answer: "Our design process includes: Research & Discovery, Wireframing, UI Design in Figma/Adobe XD, Client Review & Iterations, Prototyping, and Final Handoff. We ensure 3 rounds of revisions are included.", category: "Design", displayOrder: 12, isActive: true },
    ]);
  }

  const [testCount] = await db.select({ count: sql<number>`count(*)::int` }).from(testimonials);
  if ((testCount?.count ?? 0) === 0) {
    await db.insert(testimonials).values([
      { clientName: "Rajesh Kumar", role: "CEO", company: "RetailMax", content: "MHTSdigiXR transformed our online presence completely. Their web development team delivered a stunning e-commerce platform that increased our sales by 200%.", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", rating: 5, isActive: true, displayOrder: 1 },
      { clientName: "Priya Sharma", role: "Founder", company: "Spice Garden", content: "The mobile app they built for our restaurant chain is phenomenal. User-friendly interface and seamless ordering experience. Highly recommend!", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", rating: 5, isActive: true, displayOrder: 2 },
      { clientName: "Arun Venkatesh", role: "Marketing Head", company: "TechFlow", content: "Their digital marketing strategies helped us reach new markets we never thought possible. ROI increased by 300% in just 6 months.", imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", rating: 5, isActive: true, displayOrder: 3 },
      { clientName: "Divya Nair", role: "Co-founder", company: "EduSpark", content: "Professional, responsive, and creative team. They understood our vision and delivered beyond expectations. Best decision we made for our startup.", imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", rating: 5, isActive: true, displayOrder: 4 },
    ]);
  }

  const [statCount] = await db.select({ count: sql<number>`count(*)::int` }).from(siteStats);
  if ((statCount?.count ?? 0) === 0) {
    await db.insert(siteStats).values([
      { label: "Years Experience", value: "3", suffix: "+", icon: "Award", displayOrder: 1 },
      { label: "Projects Delivered", value: "150", suffix: "+", icon: "Code", displayOrder: 2 },
      { label: "Happy Clients", value: "50", suffix: "+", icon: "Users", displayOrder: 3 },
      { label: "Client Satisfaction", value: "98", suffix: "%", icon: "Star", displayOrder: 4 },
    ]);
  }

  const [postCount] = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
  if ((postCount?.count ?? 0) === 0) {
    await db.insert(posts).values([
      { title: "The Future of Web Development in 2026", slug: "future-web-development-2026", content: "Discover the latest trends shaping the web, from AI-driven interfaces to WebAssembly. The web development landscape continues to evolve rapidly with new frameworks, tools, and approaches emerging every year.", summary: "Discover the latest trends shaping the web, from AI-driven interfaces to WebAssembly.", coverImage: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&q=80", author: "Admin", status: "published" },
      { title: "Why SEO is Crucial for Small Businesses", slug: "seo-crucial-small-businesses", content: "Learn how search engine optimization can level the playing field for growing companies. SEO helps small businesses compete with larger corporations by improving their visibility in search results.", summary: "Learn how search engine optimization can level the playing field for growing companies.", coverImage: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&q=80", author: "Marketing Team", status: "published" },
      { title: "Mobile App Design Principles", slug: "mobile-app-design-principles", content: "Key principles for designing intuitive and engaging mobile experiences. Great mobile apps start with understanding user behavior and designing interfaces that feel natural and effortless.", summary: "Key principles for designing intuitive and engaging mobile experiences.", coverImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80", author: "Design Lead", status: "published" },
    ]);
  }

  console.log("Content seed completed");
}

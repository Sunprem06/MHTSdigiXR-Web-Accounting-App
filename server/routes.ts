import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import path from "path";
import { registerChatRoutes } from "./replit_integrations/chat/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register AI Chat Routes
  registerChatRoutes(app);

  // Temporary download route for project zip
  app.get("/download/project-zip", (req, res) => {
    const zipPath = path.resolve(process.cwd(), "mhtsdigix-project.zip");
    res.download(zipPath, "mhtsdigix-project.zip");
  });

  // Services
  app.get(api.services.list.path, async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.get(api.services.get.path, async (req, res) => {
    const service = await storage.getService(req.params.slug);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json(service);
  });

  // Posts
  app.get(api.posts.list.path, async (req, res) => {
    const posts = await storage.getPosts();
    res.json(posts);
  });

  app.get(api.posts.get.path, async (req, res) => {
    const post = await storage.getPost(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  });

  // Case Studies
  app.get(api.caseStudies.list.path, async (req, res) => {
    const studies = await storage.getCaseStudies();
    res.json(studies);
  });

  // Contact
  app.post(api.contact.create.path, async (req, res) => {
    try {
      const input = api.contact.create.input.parse(req.body);
      const message = await storage.createContactMessage(input);
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const servicesList = await storage.getServices();
  if (servicesList.length === 0) {
    const services = [
      {
        title: "Domain & Hosting",
        slug: "domain-hosting",
        description: "Reliable domain registration and web hosting solutions for your business.",
        icon: "Globe",
        image: "https://images.unsplash.com/photo-1558494949-efdeb6bf80d1?auto=format&fit=crop&q=80&w=1000",
        features: ["SSL Certificates", "24/7 Support", "99.9% Uptime", "Scalable Infrastructure"]
      },
      {
        title: "Website Development",
        slug: "web-development",
        description: "Custom website development for corporate businesses and startups.",
        icon: "Code",
        image: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&q=80&w=1000",
        features: ["Responsive Design", "Custom CMS", "E-commerce Solutions", "Performance Optimization"]
      },
      {
        title: "Logo & Graphic Design",
        slug: "graphic-design",
        description: "Creative and unique content creation and brand identity development.",
        icon: "Palette",
        image: "https://images.unsplash.com/photo-1626785774573-4b7993125486?auto=format&fit=crop&q=80&w=1000",
        features: ["Logo Design", "Brand Identity", "Marketing Materials", "Social Media Graphics"]
      },
      {
        title: "UI/UX Design",
        slug: "ui-ux-design",
        description: "User-focused design approach to enhance customer experience.",
        icon: "Layout",
        image: "https://images.unsplash.com/photo-1586717791821-3f44a5638d0f?auto=format&fit=crop&q=80&w=1000",
        features: ["User Research", "Wireframing", "Prototyping", "Usability Testing"]
      },
      {
        title: "Mobile App Development",
        slug: "mobile-apps",
        description: "Native and hybrid mobile application development for iOS and Android.",
        icon: "Smartphone",
        image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=1000",
        features: ["iOS & Android", "React Native", "Flutter", "App Store Optimization"]
      },
      {
        title: "Digital Marketing",
        slug: "digital-marketing",
        description: "Comprehensive online marketing strategies to grow your business.",
        icon: "TrendingUp",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000",
        features: ["SEO", "SMM", "PPC", "Email Marketing"]
      }
    ];

    for (const service of services) {
      await storage.createService(service);
    }
  }

  const postsList = await storage.getPosts();
  if (postsList.length === 0) {
    await storage.createPost({
      title: "The Future of Digital Marketing in 2026",
      slug: "future-of-digital-marketing-2026",
      summary: "Explore the latest trends and technologies shaping the digital marketing landscape.",
      content: "Digital marketing is evolving rapidly with AI, automation, and personalization leading the way...",
      coverImage: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&q=80&w=1000"
    });
    await storage.createPost({
      title: "Why Your Business Needs a Mobile App",
      slug: "why-business-needs-mobile-app",
      summary: "Understand the benefits of having a dedicated mobile application for your customers.",
      content: "In today's mobile-first world, having an app can significantly improve customer engagement and retention...",
      coverImage: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&q=80&w=1000"
    });
  }
}

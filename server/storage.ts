import { db } from "./db";
import {
  contactMessages,
  posts,
  services,
  caseStudies,
  type InsertContactMessage,
  type InsertPost,
  type InsertService,
  type InsertCaseStudy,
  type ContactMessage,
  type Post,
  type Service,
  type CaseStudy
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Contact
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;

  // Posts
  getPosts(): Promise<Post[]>;
  getPost(slug: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;

  // Services
  getServices(): Promise<Service[]>;
  getService(slug: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;

  // Case Studies
  getCaseStudies(): Promise<CaseStudy[]>;
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;
}

export class DatabaseStorage implements IStorage {
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db.insert(contactMessages).values(message).returning();
    return newMessage;
  }

  async getPosts(): Promise<Post[]> {
    return await db.select().from(posts);
  }

  async getPost(slug: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    return post;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getService(slug: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.slug, slug));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async getCaseStudies(): Promise<CaseStudy[]> {
    return await db.select().from(caseStudies);
  }

  async createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy> {
    const [newCaseStudy] = await db.insert(caseStudies).values(caseStudy).returning();
    return newCaseStudy;
  }
}

export const storage = new DatabaseStorage();

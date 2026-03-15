import { db } from "./db";
import { faqItems, testimonials, siteStats, posts, caseStudies, pricingPlans, legalPages } from "@shared/schema";
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
      { question: "Will my website be SEO optimized?", answer: "Yes! All our websites come with on-page SEO optimization including meta tags, structured data, fast load times, and mobile-friendly design.", category: "Web Development", displayOrder: 13, isActive: true },
      { question: "What branding services do you offer?", answer: "We offer complete branding solutions including logo design, brand identity development, brand guidelines, business cards, letterheads, brochures, social media kits, and marketing collateral.", category: "Branding & Graphics", displayOrder: 14, isActive: true },
      { question: "How many logo concepts will I receive?", answer: "Our standard logo package includes 3-5 unique concepts. After you select a direction, we provide unlimited revisions until you're completely satisfied.", category: "Branding & Graphics", displayOrder: 15, isActive: true },
      { question: "Do you help with domain registration?", answer: "Yes! We help you find and register the perfect domain name across all TLDs (.com, .in, .co, .io, etc.), and handle the complete registration process.", category: "Domain & Hosting", displayOrder: 16, isActive: true },
      { question: "What type of hosting do you provide?", answer: "We offer Shared Hosting, VPS Hosting, Cloud Hosting, and Dedicated Servers. All plans include SSL certificates, 99.9% uptime guarantee, and 24/7 monitoring.", category: "Domain & Hosting", displayOrder: 17, isActive: true },
      { question: "What types of videos do you create?", answer: "We create explainer videos, product demos, corporate videos, social media reels, testimonial videos, animated logos, motion graphics, whiteboard animations, and video ads.", category: "Video & Animation", displayOrder: 18, isActive: true },
      { question: "What are your payment terms?", answer: "We typically work with 50% advance payment to start the project and 50% upon completion. For larger projects, we offer milestone-based payments. We accept bank transfers, UPI, credit cards, and PayPal.", category: "Pricing & Payment", displayOrder: 19, isActive: true },
      { question: "Do you offer EMI or payment plans?", answer: "Yes! For projects above INR 50,000, we offer flexible payment plans spread across 3-6 months. This makes it easier for businesses to invest in quality digital solutions.", category: "Pricing & Payment", displayOrder: 20, isActive: true },
      { question: "Are there any hidden costs?", answer: "No hidden costs! We provide detailed quotations upfront covering all aspects of the project. Any additional requirements beyond the agreed scope are discussed and quoted separately.", category: "Pricing & Payment", displayOrder: 21, isActive: true },
      { question: "Do you provide website maintenance?", answer: "Yes, we offer comprehensive maintenance packages starting from INR 2,000/month. This includes security updates, bug fixes, content updates, performance monitoring, and 24/7 technical support.", category: "Support", displayOrder: 22, isActive: true },
      { question: "How can I get a quote for my project?", answer: "Getting a quote is easy! Fill out our contact form, chat with Kayal (our AI assistant), or email us at info@mhtsdigixr.com. We typically respond within 2-4 hours and provide detailed proposals within 24-48 hours.", category: "General Questions", displayOrder: 23, isActive: true },
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

  const [csCount] = await db.select({ count: sql<number>`count(*)::int` }).from(caseStudies);
  if ((csCount?.count ?? 0) === 0) {
    await db.insert(caseStudies).values([
      { title: "E-commerce Platform for Fashion Brand", client: "StyleVista", description: "Built a full-featured e-commerce platform with advanced product filtering, payment integration, and inventory management.", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80", category: "Web Development", results: ["150% Increase in Sales", "3x Faster Load Time"] },
      { title: "Healthcare Appointment App", client: "MediCare Plus", description: "Developed a cross-platform mobile app for managing doctor appointments, prescriptions, and health records.", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80", category: "Mobile App", results: ["50k+ Downloads", "4.8 Star Rating"] },
      { title: "Corporate Rebranding", client: "TechFlow Inc", description: "Complete brand identity redesign including logo, color palette, typography, and brand guidelines.", image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80", category: "Branding", results: ["Modern Identity", "Unified Brand Voice"] },
      { title: "SEO Campaign for Real Estate", client: "Urban Properties", description: "Comprehensive SEO strategy including keyword research, on-page optimization, content creation, and link building.", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80", category: "Digital Marketing", results: ["#1 Ranking for Keywords", "200% More Leads"] },
    ]);
  }

  const [ppCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pricingPlans);
  if ((ppCount?.count ?? 0) === 0) {
    await db.insert(pricingPlans).values([
      { name: "Starter", price: "15,000", period: "one-time", description: "Perfect for small businesses getting started online", features: ["Basic website (5 pages)", "Mobile responsive", "Basic SEO setup", "Contact form", "1 month support", "Social media integration"], isPopular: false, ctaLabel: "GET STARTED", displayOrder: 1, isActive: true },
      { name: "Growth", price: "35,000", period: "one-time", description: "Comprehensive solution for growing businesses", features: ["Custom website (10 pages)", "Advanced SEO", "Blog integration", "E-commerce (basic)", "3 months support", "Google Analytics", "Content management", "Email marketing setup"], isPopular: true, ctaLabel: "MOST POPULAR", displayOrder: 2, isActive: true },
      { name: "Enterprise", price: "Custom", period: "quote", description: "Tailored solutions for large-scale projects", features: ["Unlimited pages", "Custom features", "Advanced e-commerce", "API integrations", "Dedicated support", "Performance optimization", "Security hardening", "Monthly maintenance"], isPopular: false, ctaLabel: "CONTACT SALES", displayOrder: 3, isActive: true },
    ]);
  }

  const [legalCount] = await db.select({ count: sql<number>`count(*)::int` }).from(legalPages);
  if ((legalCount?.count ?? 0) === 0) {
    await db.insert(legalPages).values([
      {
        slug: "privacy-policy",
        title: "Privacy Policy",
        effectiveDate: "2024-01-01",
        content: `Privacy Policy

Maanagarram Hi Tech Solutions (operating as MHTSdigiXR), headquartered in Chennai, Tamil Nadu, India, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information.

1. Information We Collect

We collect the following personal information when you voluntarily provide it through our website:

- Name, email address, and phone number via our Contact form
- Name, email, phone, cover letter, and resume via our Careers application form
- Session cookies for website functionality

We do not collect any information automatically beyond standard server logs (IP address, browser type, pages visited).

2. How We Use Your Information

The information we collect is used solely for the following purposes:

- To respond to your enquiries and service requests
- To process job applications submitted through our Careers page
- To communicate with you about our services when you have contacted us
- To maintain and improve our website functionality

3. Data Sharing

We do not sell, trade, rent, or otherwise share your personal data with any third parties. Your information is used exclusively by Maanagarram Hi Tech Solutions for the purposes stated above.

4. Cookies

Our website uses cookies strictly for session management (keeping you logged in). We do not use tracking cookies, advertising cookies, or analytics cookies that collect personal data.

5. Data Security

We implement reasonable security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All data is stored on secure servers with encrypted connections.

6. Your Rights

You have the right to:
- Request access to the personal data we hold about you
- Request correction of inaccurate personal data
- Request deletion of your personal data
- Withdraw consent for data processing

To exercise any of these rights, please contact us at info@mhtsdigixr.com.

7. Data Retention

We retain personal data only for as long as necessary to fulfill the purposes for which it was collected. Contact form submissions are retained for up to 12 months. Job application data is retained for up to 24 months.

8. Governing Law

This Privacy Policy is governed by and construed in accordance with:
- The Information Technology Act, 2000 (IT Act)
- The Information Technology (Amendment) Act, 2008
- The Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011

9. Jurisdiction

Any disputes arising from this Privacy Policy shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.

10. Changes to This Policy

We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated effective date.

11. Contact Us

If you have any questions about this Privacy Policy, please contact us at:

Maanagarram Hi Tech Solutions (MHTSdigiXR)
Chennai, Tamil Nadu, India
Email: info@mhtsdigixr.com`
      },
      {
        slug: "terms-of-service",
        title: "Terms of Service",
        effectiveDate: "2024-01-01",
        content: `Terms of Service

These Terms of Service ("Terms") govern your engagement with Maanagarram Hi Tech Solutions (operating as MHTSdigiXR), a company registered in Chennai, Tamil Nadu, India. By engaging our services, you agree to be bound by these Terms.

1. Services

Maanagarram Hi Tech Solutions provides digital services including but not limited to:
- Web Development and Design
- Mobile Application Development
- Digital Marketing and SEO
- Branding and Graphic Design
- Domain Registration and Web Hosting
- UI/UX Design
- Video and Animation Production
- AI Integration Solutions

2. Client Responsibilities

By engaging our services, you agree to:
- Provide accurate and complete project requirements in a timely manner
- Supply all necessary content, images, credentials, and access required for the project
- Review and provide feedback on deliverables within the agreed timelines
- Make payments as per the agreed payment schedule
- Ensure that all content provided to us does not infringe on any third-party intellectual property rights

3. Intellectual Property

- All work product (code, designs, content) created by MHTSdigiXR during the engagement remains our property until full and final payment is received
- Upon receipt of full payment, ownership of the deliverables transfers to the client, except for any third-party components, open-source software, or pre-existing intellectual property of MHTSdigiXR
- MHTSdigiXR reserves the right to use completed projects in our portfolio and case studies unless explicitly agreed otherwise in writing

4. Confidentiality

Both parties agree to:
- Keep all project-related information, business data, and proprietary details confidential
- Not disclose confidential information to any third party without prior written consent
- Use confidential information solely for the purposes of the engagement
- This obligation survives the termination of the engagement

5. Payment Terms

- Payment terms are as specified in the individual project proposal or quotation
- Standard terms: 50% advance payment to commence work, 50% upon completion
- For larger projects, milestone-based payment schedules may be agreed upon
- Late payments may attract interest at 1.5% per month on the outstanding amount
- Work may be paused if payments are not received within 15 days of the due date

6. Project Timelines

- Estimated timelines are provided in good faith based on the agreed project scope
- Timelines may be extended due to delays in client feedback, content supply, or scope changes
- Any changes to the agreed scope will be documented and may result in revised timelines and costs

7. Limitation of Liability

- MHTSdigiXR's total liability under any engagement shall not exceed the total value of the contract
- We shall not be liable for any indirect, incidental, consequential, or punitive damages
- We shall not be liable for any loss of profits, data, or business opportunities arising from our services
- We do not guarantee specific business outcomes, search engine rankings, or revenue increases

8. Termination

- Either party may terminate the engagement with 15 days' written notice
- Upon termination, the client shall pay for all work completed up to the date of termination
- Any advance payments for uncompleted work will be adjusted against work done
- Termination does not affect any rights or obligations that have accrued prior to the date of termination

9. Force Majeure

Neither party shall be liable for any failure or delay in performance due to circumstances beyond their reasonable control, including but not limited to natural disasters, war, pandemic, government actions, or internet/power outages.

10. Dispute Resolution

- All disputes shall first be attempted to be resolved through amicable negotiation
- If negotiation fails, disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996
- The arbitration shall be conducted in Chennai, Tamil Nadu, India
- The language of arbitration shall be English

11. Governing Law

These Terms shall be governed by and construed in accordance with the laws of India. The courts in Chennai, Tamil Nadu shall have exclusive jurisdiction over any legal proceedings.

12. Amendments

MHTSdigiXR reserves the right to modify these Terms at any time. Updated Terms will be posted on our website with the revised effective date. Continued engagement after such changes constitutes acceptance.

13. Contact

For questions about these Terms, please contact:

Maanagarram Hi Tech Solutions (MHTSdigiXR)
Chennai, Tamil Nadu, India
Email: info@mhtsdigixr.com`
      },
      {
        slug: "refund-policy",
        title: "No Refund Policy",
        effectiveDate: "2024-01-01",
        content: `No Refund Policy

Maanagarram Hi Tech Solutions (operating as MHTSdigiXR), Chennai, Tamil Nadu, India, maintains a strict No Refund Policy for all digital services. Please read this policy carefully before engaging our services.

1. Policy Statement

Maanagarram Hi Tech Solutions does not offer refunds once a project has commenced or a digital service has been activated. This policy applies to all services including web development, mobile app development, digital marketing, SEO, branding, design, hosting, and all other digital services offered by MHTSdigiXR.

2. Legal Basis

This No Refund Policy is in compliance with applicable Indian law:

a) Consumer Protection Act, 2019: Under the Act, digital and software services are classified as services. Once a service has been delivered or commenced, refunds are at the discretion of the service provider. Digital work product, by its nature, cannot be "returned" like a physical product.

b) Information Technology Act, 2000: Electronic contracts entered into via our website or through signed proposals are valid and legally binding upon acceptance. By making payment and agreeing to our Terms of Service, you enter into a binding contract.

c) Indian Contract Act, 1872: Once consideration has been paid and service delivery has commenced, the contract is in effect and cannot be unilaterally revoked by the client without cause attributable to the service provider.

3. Rationale

Digital services involve significant investment of time, resources, and intellectual effort from the moment a project commences. Unlike physical goods, digital work product (designs, code, strategies, content) cannot be returned or resold. The work performed is specific to each client's requirements and has no residual value to MHTSdigiXR once created.

4. Exceptions

Refunds or credits may be considered solely in the following exceptional circumstances:

a) Non-Delivery: If MHTSdigiXR is unable to deliver the agreed scope of work for reasons entirely within our control and fails to provide a suitable alternative within a reasonable timeframe.

b) Duplicate Payment: If a client has made a duplicate payment in error, the duplicate amount will be refunded within 15 business days.

c) Partial Credits: At the sole discretion of the management of Maanagarram Hi Tech Solutions, partial credits toward future services may be offered in cases where a project is discontinued before completion by mutual agreement.

5. Advance Payments

- Advance payments made to commence a project are non-refundable once work has begun
- If a project is cancelled before any work has commenced (within 48 hours of payment and before any team resources are allocated), a refund of the advance may be considered on a case-by-case basis
- The decision to refund an advance payment in such cases rests solely with MHTSdigiXR's management

6. Scope Changes and Cancellations

- If a client wishes to cancel a project mid-way, payment for all work completed up to the cancellation date is due in full
- No refund will be provided for work already completed and delivered
- Any remaining balance from advance payments will be adjusted against the value of work completed

7. Dispute Resolution

- Clients who wish to raise concerns about service quality should contact us at info@mhtsdigixr.com
- We are committed to resolving service quality issues promptly through additional revisions or corrections
- If a dispute cannot be resolved amicably, it shall be subject to arbitration in Chennai, Tamil Nadu, under the Arbitration and Conciliation Act, 1996

8. Jurisdiction

This policy and any disputes arising from it shall be governed by the laws of India and subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu, India.

9. Acknowledgment

By engaging our services and making payment, you acknowledge that:
- You have read and understood this No Refund Policy
- You agree to be bound by this policy
- You have reviewed the project proposal or quotation carefully before making payment
- You understand that digital services cannot be returned once delivered or commenced

10. Contact

For any questions regarding this policy, please contact:

Maanagarram Hi Tech Solutions (MHTSdigiXR)
Chennai, Tamil Nadu, India
Email: info@mhtsdigixr.com

We strongly advise all clients to thoroughly review project proposals, quotations, and all terms before making any payment.`
      }
    ]);
  }

  console.log("Content seed completed");
}

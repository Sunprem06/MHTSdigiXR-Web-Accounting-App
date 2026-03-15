import { useQuery } from "@tanstack/react-query";

export interface SiteSettings {
  brandName: string;
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  whatsappNumber: string;
  careersEmail: string;
  websiteUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  copyrightText: string;
}

const DEFAULTS: SiteSettings = {
  brandName: "MHTSdigiXR",
  companyName: "Maanagarram Hi Tech Solutions",
  tagline: "",
  phone: "",
  email: "",
  address: "",
  whatsappNumber: "",
  careersEmail: "",
  websiteUrl: "",
  linkedinUrl: "",
  twitterUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  copyrightText: "",
};

export function useSiteSettings(): SiteSettings {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return DEFAULTS;

  return {
    brandName: data.brandName || DEFAULTS.brandName,
    companyName: data.companyName || DEFAULTS.companyName,
    tagline: data.tagline ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    address: data.address ?? "",
    whatsappNumber: data.whatsappNumber ?? "",
    careersEmail: data.careersEmail ?? "",
    websiteUrl: data.websiteUrl ?? "",
    linkedinUrl: data.linkedinUrl ?? "",
    twitterUrl: data.twitterUrl ?? "",
    instagramUrl: data.instagramUrl ?? "",
    facebookUrl: data.facebookUrl ?? "",
    copyrightText: data.copyrightText ?? "",
  };
}

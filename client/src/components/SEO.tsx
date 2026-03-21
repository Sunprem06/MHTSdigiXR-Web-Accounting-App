import { useEffect } from "react";
interface SEOProps { title?: string; description?: string; url?: string; }
const SITE="MHTSdigiX - Maanagarram Hi Tech Solutions";
const BASE="https://mhtsdigix.com";
const DESC="MHTSdigiX provides professional web development, digital marketing, SEO, and accounting solutions for businesses across India.";
export function SEO({ title, description=DESC, url="/" }: SEOProps) {
  const fullTitle = title ? `${title} | MHTSdigiX` : SITE;
  const fullUrl = `${BASE}${url}`;
  useEffect(() => {
    document.title = fullTitle;
    const set = (name: string, content: string, prop=false) => {
      const attr = prop?"property":"name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if(!el){ el=document.createElement("meta"); el.setAttribute(attr,name); document.head.appendChild(el); }
      el.setAttribute("content",content);
    };
    set("description",description); set("og:title",fullTitle,true); set("og:description",description,true);
    set("og:url",fullUrl,true); set("og:type","website",true); set("twitter:card","summary_large_image");
    set("twitter:title",fullTitle); set("twitter:description",description);
    let c=document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if(!c){ c=document.createElement("link"); c.setAttribute("rel","canonical"); document.head.appendChild(c); }
    c.setAttribute("href",fullUrl);
  }, [fullTitle, description, fullUrl]);
  return null;
}

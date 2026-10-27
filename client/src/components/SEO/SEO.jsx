import { useEffect } from "react";

/**
 * Dynamic SEO component that updates document head meta tags,
 * canonical links, social sharing cards, and structured data schemas.
 */
const SEO = ({
  title = "SocialSphere - Connect, Share, and Engage with Your Community",
  description = "SocialSphere is a modern social media platform where you can connect with friends, share posts, join groups, chat in real-time, and build meaningful communities.",
  keywords = "social media, social network, connect, share, groups, chat, community, friends, posts",
  image = "/og-image.png",
  url = typeof window !== "undefined" ? window.location.href : "https://himanshu-social-sphere.vercel.app/",
  type = "website",
  schema = null,
}) => {
  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // Helper to update or inject meta tag
    const updateMetaTag = (name, content, isProperty = false) => {
      if (!content) return;
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    // Make sure image is an absolute URL for third-party scrapers (Twitter, WhatsApp, Facebook)
    const absoluteImage = image.startsWith("http")
      ? image
      : `https://himanshu-social-sphere.vercel.app${image.startsWith("/") ? "" : "/"}${image}`;

    // 2. Primary Meta Tags
    updateMetaTag("title", title);
    updateMetaTag("description", description);
    updateMetaTag("keywords", keywords);

    // 3. Open Graph Tags
    updateMetaTag("og:title", title, true);
    updateMetaTag("og:description", description, true);
    updateMetaTag("og:image", absoluteImage, true);
    updateMetaTag("og:url", url, true);
    updateMetaTag("og:type", type, true);

    // 4. Twitter Card Tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", absoluteImage);
    updateMetaTag("twitter:url", url);

    // 5. Canonical Link Tag
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // 6. Optional Dynamic JSON-LD Schema
    let scriptTag = document.getElementById("dynamic-page-schema");
    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = "dynamic-page-schema";
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, keywords, image, url, type, schema]);

  return null;
};

export default SEO;

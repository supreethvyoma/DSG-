import { useEffect } from "react";

export function useDocumentMetadata(title, description) {
  useEffect(() => {
    // Update Document Title
    const baseTitle = "Digital Sanskrit Guru";
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;

    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute(
      "content",
      description || "Discover premium Sanskrit learning materials, grammar guides, scriptures, and traditional kits at Digital Sanskrit Guru."
    );
  }, [title, description]);
}

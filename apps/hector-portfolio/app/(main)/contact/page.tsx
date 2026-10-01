import type { Metadata } from "next";
import { getProfile } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";
import { ContactPageContent } from "./contact-page-content";

export const metadata: Metadata = generateSEOMetadata({
  title: "Contact | Hector Gonzalez",
  description:
    "Get in touch with Hector Gonzalez. Open to consulting opportunities and collaboration.",
  keywords: ["Contact", "Hector Gonzalez", "Consulting", "Collaboration"],
  type: "website",
});

export default function ContactPage() {
  const profile = getProfile();

  return <ContactPageContent profile={profile} />;
}

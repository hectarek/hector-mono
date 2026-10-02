import type { Metadata } from "next";
import { getProfile } from "@/src/lib/data";
import { generateSEOMetadata } from "@/src/shared/utils/seo";
import { ContactPageContent } from "./contact-page-content";

export const metadata: Metadata = generateSEOMetadata({
  title: "Contact | Hector Gonzalez",
  description:
    "Get in touch with Hector Gonzalez about roles, collaborations, or a technical question. Email is the fastest way in.",
  keywords: [
    "Contact",
    "Hector Gonzalez",
    "Full-Stack Engineer",
    "Collaboration",
  ],
  path: "/contact",
  type: "website",
});

export default function ContactPage() {
  const profile = getProfile();

  return <ContactPageContent profile={profile} />;
}

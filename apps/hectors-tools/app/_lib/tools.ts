import { FileText, type LucideIcon } from "lucide-react";

export type ToolStatus = "available" | "coming-soon";

export type Tool = {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: ToolStatus;
};

export const tools: readonly Tool[] = [
  {
    id: "resume-analyzer",
    name: "Resume Analyzer",
    description:
      "Score a resume against a job description and get targeted feedback to close the gap.",
    href: "/tools/resume-analyzer",
    icon: FileText,
    status: "available",
  },
] as const;

export function getTool(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}

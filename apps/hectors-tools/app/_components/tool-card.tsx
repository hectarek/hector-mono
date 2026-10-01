import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Tool } from "@/app/_lib/tools";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const isAvailable = tool.status === "available";

  return (
    <Link
      href={tool.href}
      aria-label={`Open ${tool.name}`}
      className="group focus-visible:ring-ring rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <Icon className="size-5" />
            </div>
            {!isAvailable && <Badge variant="secondary">Coming soon</Badge>}
          </div>
          <CardTitle className="mt-2">{tool.name}</CardTitle>
          <CardDescription>{tool.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1 text-sm">
            Open tool
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

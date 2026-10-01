import { FileText } from "lucide-react";
import { ResumeAnalyzerForm } from "@/app/_components/resume-analyzer/resume-analyzer-form";
import { getTool } from "@/app/_lib/tools";

export default function ResumeAnalyzerPage() {
  const tool = getTool("resume-analyzer");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
          <FileText className="size-5" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">
            {tool?.name ?? "Resume Analyzer"}
          </h1>
          <p className="text-muted-foreground text-sm">{tool?.description}</p>
        </div>
      </header>

      <ResumeAnalyzerForm />
    </main>
  );
}

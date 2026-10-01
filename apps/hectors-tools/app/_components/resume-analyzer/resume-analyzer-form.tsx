"use client";

import { Button } from "@repo/ui/components/button";
import { FileDropZone } from "@repo/ui/components/file-drop-zone";
import { Label } from "@repo/ui/components/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { useActionState, useState } from "react";
import { analyzeResume } from "@/app/actions/resume-analyzer";
import { ResumeAnalysisResult } from "./resume-analysis-result";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
type ResumeMode = "paste" | "upload";

export function ResumeAnalyzerForm() {
  const [state, formAction, isPending] = useActionState(analyzeResume, null);
  const [mode, setMode] = useState<ResumeMode>("paste");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  function handleAction(formData: FormData) {
    if (mode === "upload") {
      formData.delete("resumeText");
      if (resumeFile) formData.set("resumeFile", resumeFile);
    } else {
      formData.delete("resumeFile");
    }
    formAction(formData);
  }

  return (
    <>
      <form action={handleAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea
            id="jobDescription"
            name="jobDescription"
            placeholder="Paste the full job description here…"
            rows={8}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Resume</Label>
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as ResumeMode)}
          >
            <TabsList>
              <TabsTrigger value="paste">Paste text</TabsTrigger>
              <TabsTrigger value="upload">Upload PDF</TabsTrigger>
            </TabsList>
            <TabsContent value="paste">
              <Textarea
                name="resumeText"
                placeholder="Paste your resume text here…"
                rows={10}
              />
            </TabsContent>
            <TabsContent value="upload">
              <FileDropZone
                value={resumeFile}
                onValueChange={setResumeFile}
                accept="application/pdf"
                maxSizeBytes={MAX_FILE_BYTES}
                hint="PDF only, up to 8 MB"
              />
            </TabsContent>
          </Tabs>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto sm:self-end"
        >
          {isPending ? "Analyzing…" : "Analyze resume"}
        </Button>

        {state?.error ? (
          <p className="text-destructive text-sm">{state.error}</p>
        ) : null}
      </form>

      {state?.result ? <ResumeAnalysisResult result={state.result} /> : null}
    </>
  );
}

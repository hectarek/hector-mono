import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import { CheckCircle2, XCircle } from "lucide-react";
import type {
  ResumeAnalysis,
  SuggestionPriority,
} from "@/src/entities/models/resume-analysis.model";

function verdict(score: number): { label: string; className: string } {
  if (score >= 80) return { label: "Strong match", className: "text-success" };
  if (score >= 60) return { label: "Good match", className: "text-primary" };
  if (score >= 40) return { label: "Partial match", className: "text-warning" };
  return { label: "Weak match", className: "text-destructive" };
}

const PRIORITY_VARIANT: Record<
  SuggestionPriority,
  "destructive" | "secondary" | "outline"
> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

function SkillList({
  skills,
  empty,
  variant,
}: {
  skills: string[];
  empty: string;
  variant: "secondary" | "outline";
}) {
  if (skills.length === 0) {
    return <p className="text-muted-foreground text-sm">{empty}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <Badge key={skill} variant={variant}>
          {skill}
        </Badge>
      ))}
    </div>
  );
}

export function ResumeAnalysisResult({ result }: { result: ResumeAnalysis }) {
  const { label, className } = verdict(result.matchScore);

  return (
    <div className="mt-8 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-baseline justify-between gap-3">
              <span className={className}>{label}</span>
              <span className="text-3xl font-semibold tabular-nums">
                {result.matchScore}
                <span className="text-muted-foreground text-base">/100</span>
              </span>
            </div>
          </CardTitle>
          <CardDescription>{result.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={result.matchScore} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="text-success size-4" />
                Matched skills
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkillList
              skills={result.matchedSkills}
              empty="No clear matches found."
              variant="secondary"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <XCircle className="text-destructive size-4" />
                Missing skills
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkillList
              skills={result.missingSkills}
              empty="Nothing major missing."
              variant="outline"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ATS keyword coverage</CardTitle>
          <CardDescription>
            Literal keywords from the job description.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                Present
              </span>
              <SkillList
                skills={result.atsKeywords.present}
                empty="None detected."
                variant="secondary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                Missing
              </span>
              <SkillList
                skills={result.atsKeywords.missing}
                empty="Good coverage."
                variant="outline"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggestions</CardTitle>
          <CardDescription>Prioritized edits for this role.</CardDescription>
        </CardHeader>
        <CardContent>
          {result.suggestions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No suggestions — this resume is well-aligned.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {result.suggestions.map((item) => (
                <li key={item.suggestion} className="flex items-start gap-2.5">
                  <Badge
                    variant={PRIORITY_VARIANT[item.priority]}
                    className="mt-0.5"
                  >
                    {item.priority.charAt(0).toUpperCase() +
                      item.priority.slice(1)}
                  </Badge>
                  <span className="text-sm">{item.suggestion}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

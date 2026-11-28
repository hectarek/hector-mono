import { StepView } from "@/app/_components/walkthrough/step-view";
import { stepMetadata } from "./step-metadata";

export const metadata = stepMetadata(0);

export default function StartPage() {
  return <StepView index={0} />;
}

"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import Link from "next/link";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { withShow } from "@/app/_lib/plan-href";
import { type MealShow, mealShowFrom } from "@/src/entities/meal-days";

const SHOW_LABELS: Record<MealShow, string> = {
  all: "All meals",
  cook: "Cook days",
  eat: "Eat days",
};

const PlanShowContext = createContext<{
  show: MealShow;
  setShow: (show: MealShow) => void;
}>({ show: "all", setShow: () => {} });

// The week's filter (docs/ux-plan.md D93): all meals, cook days or eat days. The select in the
// title row changes it in place, kept in the address (`?show=`) as Groceries' `?group=` is, and
// the week, its links and the plan pills read it from here.
export function PlanShowProvider({
  initial,
  children,
}: {
  initial: MealShow;
  children: ReactNode;
}) {
  const [show, setShowState] = useState(initial);
  function setShow(next: MealShow) {
    setShowState(next);
    window.history.replaceState(
      null,
      "",
      withShow(`${window.location.pathname}${window.location.search}`, next),
    );
  }
  return (
    <PlanShowContext value={{ show, setShow }}>{children}</PlanShowContext>
  );
}

export function usePlanShow(): MealShow {
  return useContext(PlanShowContext).show;
}

export function PlanShowSelect() {
  const { show, setShow } = useContext(PlanShowContext);
  return (
    <NativeSelect
      size="lg"
      aria-label="Show"
      value={show}
      onChange={(event) => setShow(mealShowFrom(event.target.value))}
    >
      {(Object.keys(SHOW_LABELS) as MealShow[]).map((value) => (
        <NativeSelectOption key={value} value={value}>
          {SHOW_LABELS[value]}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

// A link to another week or plan that keeps the filter.
export function ShowLink({ href, ...props }: ComponentProps<typeof Link>) {
  const show = usePlanShow();
  return (
    <Link
      {...props}
      href={typeof href === "string" ? withShow(href, show) : href}
    />
  );
}

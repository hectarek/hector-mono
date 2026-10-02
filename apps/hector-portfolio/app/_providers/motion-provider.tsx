"use client";

import { LazyMotion } from "framer-motion";
import type * as React from "react";

const loadFeatures = () =>
  import("./motion-features").then((mod) => mod.domAnimation);

// Components use `m.*`, not `motion.*`: the render shell ships with the page and the
// animation features load after it, which keeps them off the critical path. `strict`
// throws if a `motion.*` component slips back in and pulls the full bundle.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}

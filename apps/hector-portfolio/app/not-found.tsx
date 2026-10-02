import { Button } from "@repo/ui/components/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-lg space-y-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          404 · Page not found
        </p>
        <h1 className="font-mono text-5xl font-medium leading-tight tracking-tight text-foreground sm:text-6xl">
          This route doesn&apos;t exist
          <span className="text-accent">.</span>
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          The page you&apos;re looking for either moved, was renamed, or never
          made it into production. Either way, here&apos;s the way back.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="label" nativeButton={false} render={<Link href="/" />}>
            Go home
          </Button>
          <Button
            size="label"
            nativeButton={false}
            render={<Link href="/projects" />}
            variant="outline"
          >
            See my work
          </Button>
        </div>
      </div>
    </div>
  );
}

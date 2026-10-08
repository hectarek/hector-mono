import { PageMotion } from "@/app/_components/page-motion";

// Cook mode: no header or tab bar, just the recipe, in large type, on the cook surface.
// It rises over the recipe as a whole sheet (D89), so its motion goes here: unlike `(main)`'s,
// this layout comes and goes with its one page. The background makes the sheet solid.
export default function CookLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PageMotion>
      <main
        data-surface="cook"
        className="bg-background pt-safe-4 pb-safe-8 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5"
      >
        {children}
      </main>
    </PageMotion>
  );
}

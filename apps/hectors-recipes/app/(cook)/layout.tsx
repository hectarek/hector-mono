// Cook mode: no header or tab bar, just the recipe, in large type, on the cook surface.
export default function CookLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main
      data-surface="cook"
      className="pt-safe-4 pb-safe-8 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5"
    >
      {children}
    </main>
  );
}

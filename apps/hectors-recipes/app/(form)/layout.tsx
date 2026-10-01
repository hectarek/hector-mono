// Adding or editing a recipe: full-screen, no header or tab bar, so one stray tap can't
// leave a half-typed recipe, and Save sits in the form's own top bar.
export default function FormLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="pb-safe-8 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4">
      {children}
    </main>
  );
}

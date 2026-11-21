// The signed-in app. U2 builds the shell here: the header, the tab bar, the bell and the piece.
export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-4">
      {children}
    </main>
  );
}

// Signed-out visitors start here (proxy.ts). Until U5 draws A1, with the ways in and A9 inside a
// chat app's browser, it shows the app's name. It reads nothing at request time, so it's
// prerendered whole.
export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Community Game Library</h1>
    </main>
  );
}

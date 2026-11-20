// Sign-up checked by a code, sign-in, sign-out and the signed-in member, as server functions
// over Neon's server toolkit. The forms post to these, so they work before hydration too.
import { formAction, query } from "@solidjs/router";
import { markSafeError, redirect } from "@solidjs/web";
import { getAuth } from "@/src/server/auth";

function requireAuth() {
  const auth = getAuth();
  if (!auth) throw markSafeError(new Error("Sign-in is switched off here."));
  return auth;
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const getAccount = query(async () => {
  "use server";
  const auth = getAuth();
  if (!auth) return null;
  const { data } = await auth.getSession();
  if (!data?.user) return null;
  return { name: data.user.name, email: data.user.email };
}, "account");

export const signUp = formAction(async (form: FormData) => {
  "use server";
  const email = field(form, "email");
  const { error } = await requireAuth().signUp.email({
    name: field(form, "name"),
    email,
    password: String(form.get("password") ?? ""),
  });
  if (error)
    throw markSafeError(
      new Error(error.message ?? "That didn't work. Try again."),
    );
  throw redirect(`/verify?email=${encodeURIComponent(email)}`);
});

export const verifyEmail = formAction(async (form: FormData) => {
  "use server";
  const { error } = await requireAuth().emailOtp.verifyEmail({
    email: field(form, "email"),
    otp: field(form, "code"),
  });
  if (error)
    throw markSafeError(
      new Error("That code didn't work. Check it, or ask for a new one."),
    );
  throw redirect("/account");
});

export const signIn = formAction(async (form: FormData) => {
  "use server";
  const { error } = await requireAuth().signIn.email({
    email: field(form, "email"),
    password: String(form.get("password") ?? ""),
  });
  if (error)
    throw markSafeError(new Error("That email and password don't match."));
  throw redirect("/account");
});

export const signOut = formAction(async () => {
  "use server";
  await requireAuth().signOut();
  throw redirect("/");
});

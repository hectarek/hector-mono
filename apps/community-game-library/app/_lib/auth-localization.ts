// Plain words with no React in this module, since the sign-in page, a Server Component, reads
// them through view-parts.tsx: auth-notice.ts holds the kit's toast and its client hook.

// The line for an email that already has an account. Neon answers one with the code
// USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL, and toAuthMessage also words it by its message.
export const EMAIL_TAKEN_LINE = "That email already has an account.";

// The line for a sign-in whose email and password don't match (A8). Neon answers with the code
// INVALID_EMAIL_OR_PASSWORD: localization words it by the code, and toAuthMessage by the
// message, for a toast that carries no code.
export const WRONG_PASSWORD_LINE = "That password doesn’t match this email.";

// Neon's wording, in the app's words (A2, A8). The kit's error codes pick their lines from here:
// an email that has an account answers with one of the first two, a wrong password with the
// third.
export const LOCALIZATION = {
  USER_ALREADY_EXISTS: EMAIL_TAKEN_LINE,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: EMAIL_TAKEN_LINE,
  INVALID_EMAIL_OR_PASSWORD: WRONG_PASSWORD_LINE,
  SIGN_IN: "Sign in",
  SIGN_IN_ACTION: "Sign in",
  SIGN_IN_DESCRIPTION: "",
  SIGN_IN_WITH: "Continue with",
  SIGN_UP: "Make your account",
  SIGN_UP_ACTION: "Make my account",
  SIGN_UP_DESCRIPTION:
    "Anyone can sign up. Add the games you own right away. You’ll see friends’ games once you have friends.",
  OR_CONTINUE_WITH: "Or",
  ALREADY_HAVE_AN_ACCOUNT: "Already have an account?",
  DONT_HAVE_AN_ACCOUNT: "New here?",
  EMAIL_VERIFICATION: "Check your email",
  EMAIL_VERIFICATION_DESCRIPTION:
    "We sent a code to your email. Type it here to finish.",
  NAME: "Your name",
};

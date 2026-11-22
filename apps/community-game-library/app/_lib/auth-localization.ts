import { EMAIL_TAKEN_LINE } from "@/app/_lib/auth-notice";

// Neon's wording, in the app's words (A2, A8). The kit's error codes pick their lines from here:
// an email that has an account answers with one of the first two.
export const LOCALIZATION = {
  USER_ALREADY_EXISTS: EMAIL_TAKEN_LINE,
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: EMAIL_TAKEN_LINE,
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

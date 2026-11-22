// A link opened inside a chat or social app's own browser (A9, R39, KTD3): Google refuses to sign
// in there, and the home-screen step is missing, so the welcome page and the link pages show A9
// in place of sign-in. The patterns are each app's marker in its user agent, taken from
// UAParser.js's published list of in-app browsers (v2.0.10, the file below, its `browser` table);
// a pattern with no source beside it doesn't belong here. Apps that open links in the phone's own
// browser, or in a web view that carries no marker of its own (iMessage, Telegram, Slack,
// Discord), can't be told apart by user agent and aren't listed.
// https://github.com/faisalman/ua-parser-js/blob/master/src/main/ua-parser.js
// Google's rule on embedded web views:
// https://developers.google.com/identity/protocols/oauth2/policies#browsers
const SOURCE =
  "https://github.com/faisalman/ua-parser-js/blob/master/src/main/ua-parser.js";

export type InAppBrowser = {
  name: string;
  pattern: RegExp;
  // Where the pattern is published.
  source: string;
};

export const IN_APP_BROWSERS: readonly InAppBrowser[] = [
  // Facebook's iOS and Android apps, and Messenger's, which carries the same FBAV token.
  {
    name: "Facebook",
    pattern: /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/[\w.]+;)/i,
    source: SOURCE,
  },
  { name: "Instagram", pattern: /instagram[/ ][-\w.]+/i, source: SOURCE },
  { name: "Snapchat", pattern: /snapchat[/ ][-\w.]+/i, source: SOURCE },
  // The Twitter, now X, apps: "Twitter for iPhone" and "TwitterAndroid".
  { name: "Twitter", pattern: /twitter(?:and| f.+e\/[\w.]+)/i, source: SOURCE },
  { name: "LinkedIn", pattern: /\[linkedinapp\]/i, source: SOURCE },
  // iOS puts "Line/" after Safari, Android before "/iab".
  {
    name: "Line",
    pattern: /safari line\/[\w.]+|\bline\/[\w.]+\/iab/i,
    source: SOURCE,
  },
  { name: "WeChat", pattern: /micromessenger\/[\w.]+/i, source: SOURCE },
  { name: "WhatsApp", pattern: /\bwa(?:4a|ios)[/ ][\w.]+/i, source: SOURCE },
  {
    name: "TikTok",
    pattern: /(?:musical_ly|trill)(?:.+app_?version\/|_)[\w.]+/i,
    source: SOURCE,
  },
];

// The app a user agent says opened the link, or undefined for a browser of the phone's own.
export function inAppBrowserOf(
  userAgent: string | null | undefined,
): string | undefined {
  if (!userAgent) {
    return undefined;
  }
  return IN_APP_BROWSERS.find(({ pattern }) => pattern.test(userAgent))?.name;
}

import { describe, expect, test } from "bun:test";
import { IN_APP_BROWSERS, inAppBrowserOf } from "@/src/entities/in-app-browser";

// Example user agents in the shape each app's marker takes in UAParser.js's published list (the
// link in in-app-browser.ts), with made-up version and device numbers.
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36";

// [what the test says, the app the list names, its user agent]
const IN_APP: [string, string, string][] = [
  [
    "Facebook (iOS)",
    "Facebook",
    `${IPHONE} Mobile/21A329 [FBAN/FBIOS;FBAV/430.0.0.0.0;FBBV/1;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/17.0;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]`,
  ],
  [
    "Facebook (Android)",
    "Facebook",
    `${ANDROID} [FB_IAB/FB4A;FBAV/430.0.0.0.0;]`,
  ],
  [
    "Messenger (iOS)",
    "Facebook",
    `${IPHONE} Mobile/21A329 [FBAN/MessengerForiOS;FBAV/430.0.0.0.0;FBBV/1;FBDV/iPhone14,2;FBSN/iOS]`,
  ],
  [
    "Instagram (iOS)",
    "Instagram",
    `${IPHONE} Mobile/21A329 Instagram 300.0.0.0.0 (iPhone14,2; iOS 17_0; en_US; en-US; scale=3.00; 1170x2532; 1)`,
  ],
  [
    "Instagram (Android)",
    "Instagram",
    `${ANDROID} Instagram 300.0.0.0.0 Android (34/14; 420dpi; 1080x2400; Google; Pixel 8; en_US; 1)`,
  ],
  [
    "Snapchat (iOS)",
    "Snapchat",
    `${IPHONE} Mobile/21A329 Snapchat/12.50.0.0 (like Safari/8612.1.29.41.4, panda)`,
  ],
  [
    "Twitter (iOS)",
    "Twitter",
    `${IPHONE} Mobile/21A329 Twitter for iPhone/10.10`,
  ],
  ["Twitter (Android)", "Twitter", `${ANDROID} TwitterAndroid`],
  [
    "LinkedIn (iOS)",
    "LinkedIn",
    `${IPHONE} Mobile/21A329 [LinkedInApp]/9.30.0`,
  ],
  ["Line (iOS)", "Line", `${IPHONE} Mobile/21A329 Safari Line/13.0.0`],
  ["Line (Android)", "Line", `${ANDROID} Line/13.0.0/IAB`],
  [
    "WeChat (Android)",
    "WeChat",
    `${ANDROID} MicroMessenger/8.0.0(0x28000000) WeChat/arm64`,
  ],
  ["WhatsApp (iOS)", "WhatsApp", `${IPHONE} Mobile/21A329 WAiOS/24.1.1`],
  ["WhatsApp (Android)", "WhatsApp", `${ANDROID} WA4A/2.24.1`],
  [
    "TikTok (Android)",
    "TikTok",
    `${ANDROID} musical_ly_33.0.0 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/33.0.0`,
  ],
];

const OWN_BROWSER: Record<string, string> = {
  Safari: `${IPHONE} Version/17.0 Mobile/15E148 Safari/604.1`,
  "Chrome on iPhone": `${IPHONE} CriOS/120.0.0.0 Mobile/15E148 Safari/604.1`,
  "Chrome on Android": ANDROID,
  "Firefox on Android":
    "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
  "Samsung Internet": `${ANDROID} SamsungBrowser/23.0`,
  "Chrome on a laptop":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

describe("inAppBrowserOf", () => {
  for (const [label, name, userAgent] of IN_APP) {
    test(`knows ${label}`, () => {
      expect(inAppBrowserOf(userAgent)).toBe(name);
    });
  }

  for (const [label, userAgent] of Object.entries(OWN_BROWSER)) {
    test(`leaves ${label} alone`, () => {
      expect(inAppBrowserOf(userAgent)).toBeUndefined();
    });
  }

  test("has no user agent to go on without a header", () => {
    expect(inAppBrowserOf(undefined)).toBeUndefined();
    expect(inAppBrowserOf("")).toBeUndefined();
  });

  test("tests every app on the list, each with a published source", () => {
    const tested = new Set(IN_APP.map(([, name]) => name));
    for (const { name, source } of IN_APP_BROWSERS) {
      expect(tested.has(name)).toBe(true);
      expect(source).toStartWith("https://");
    }
  });
});

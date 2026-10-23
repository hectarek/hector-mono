import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { GET, POST } from "@/app/(api)/api/auth/[...path]/route";
import { neonAuth } from "@/tests/_support/neon-auth";
import { signInAs, testAuth } from "@/tests/_support/session";

// A browser's call to Neon's auth endpoints, through the app's route.
const call = (method: "GET" | "POST", path: string) => {
  const request = new Request(`https://app.example/api/auth/${path}`, {
    method,
  });
  const context = { params: Promise.resolve({ path: path.split("/") }) };
  return method === "GET" ? GET(request, context) : POST(request, context);
};

describe("the auth route", () => {
  beforeEach(() => {
    neonAuth.reached = [];
  });

  it("refuses Claude's session the account endpoints, which are Hector's alone", async () => {
    signInAs("agent");
    for (const path of ["update-user", "change-email", "delete-user"]) {
      const response = await call("POST", path);
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        code: "human-only",
        message: "Only Hector can do this.",
      });
    }
    expect(neonAuth.reached).toEqual([]);
  });

  it("lets Claude's session read itself and sign out", async () => {
    signInAs("agent");
    expect((await call("GET", "get-session")).status).toBe(200);
    expect((await call("POST", "sign-out")).status).toBe(200);
    expect(neonAuth.reached).toEqual(["GET get-session", "POST sign-out"]);
  });

  it("lets Hector's session reach the account endpoints", async () => {
    signInAs("owner");
    expect((await call("POST", "update-user")).status).toBe(200);
    expect(neonAuth.reached).toEqual(["POST update-user"]);
  });

  it("refuses any other account too, without saying whose app this is", async () => {
    signInAs("stranger");
    const response = await call("POST", "update-user");
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("not-allowed");
    expect(body.message).not.toContain("Hector");
    expect((await call("POST", "sign-out")).status).toBe(200);
    expect(neonAuth.reached).toEqual(["POST sign-out"]);
  });

  it("lets a signed-out browser through, to sign in", async () => {
    signInAs("signed-out");
    expect((await call("POST", "sign-in/email")).status).toBe(200);
    expect(neonAuth.reached).toEqual(["POST sign-in/email"]);
  });

  it("refuses when the session can't be read, rather than taking it as signed out", async () => {
    signInAs("agent");
    const unreadable = spyOn(testAuth(), "getSession").mockRejectedValue(
      new Error("Couldn't read the session (502)"),
    );
    try {
      expect((await call("POST", "update-user")).status).toBe(500);
      expect(neonAuth.reached).toEqual([]);
    } finally {
      unreadable.mockRestore();
    }
  });
});

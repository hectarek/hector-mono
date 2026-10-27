import { describe, expect, it } from "bun:test";
import { postingKey } from "@/src/entities/posting-link";

// Fictional postings on real job boards' URL shapes (docs/build-plan.md KTD8).
describe("postingKey", () => {
  describe("LinkedIn", () => {
    it("keys a posting on its numeric job id, from a view path, a slug ending in it, or a search page's currentJobId", () => {
      const key = postingKey("https://www.linkedin.com/jobs/view/123?refId=x");
      expect(key).toBe("linkedin.com/jobs/view/123");
      for (const link of [
        "https://www.linkedin.com/jobs/view/engineer-at-acme-123",
        "https://linkedin.com/jobs/view/123/",
        "https://www.linkedin.com/jobs/search/?currentJobId=123&keywords=engineer",
        "http://ca.linkedin.com/jobs/view/123?trk=public_jobs",
      ]) {
        expect(postingKey(link)).toBe(key);
      }
      expect(
        postingKey("https://www.linkedin.com/jobs/search/?currentJobId=124"),
      ).not.toBe(key);
    });

    it("keeps a link with no job id whole, so two such links stay distinct", () => {
      const designers = postingKey(
        "https://www.linkedin.com/jobs/search/?keywords=designer",
      );
      const engineers = postingKey(
        "https://www.linkedin.com/jobs/search/?keywords=engineer",
      );
      expect(designers).toBe("linkedin.com/jobs/search?keywords=designer");
      expect(engineers).not.toBe(designers);
    });
  });

  describe("Indeed", () => {
    it("keys a posting on its job id from jk or vjk, on any path", () => {
      const key = postingKey("https://www.indeed.com/viewjob?jk=abc123");
      expect(key).toBe("indeed.com/viewjob?jk=abc123");
      expect(
        postingKey("https://www.indeed.com/jobs?q=engineer&vjk=abc123&from=x"),
      ).toBe(key);
      expect(postingKey("https://www.indeed.com/viewjob?jk=def456")).not.toBe(
        key,
      );
    });
  });

  it("drops Greenhouse's gh_src, and every host's utm_ parameters and trailing slash", () => {
    expect(
      postingKey(
        "https://boards.greenhouse.io/acme/jobs/4001?gh_src=abc&utm_source=board",
      ),
    ).toBe("boards.greenhouse.io/acme/jobs/4001");
    expect(
      postingKey(
        "https://careers.acme.example/jobs/42/?utm_medium=email&team=web",
      ),
    ).toBe("careers.acme.example/jobs/42?team=web");
  });

  it("drops a Workday or Lever link's whole query", () => {
    expect(
      postingKey(
        "https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Remote/Engineer_R1234?source=board",
      ),
    ).toBe(
      "acme.wd5.myworkdayjobs.com/en-US/careers/job/Remote/Engineer_R1234",
    );
    expect(
      postingKey(
        "https://jobs.lever.co/acme/0f6c7f1e-0000-4000-8000-000000000001/apply?lever-source=x",
      ),
    ).toBe("jobs.lever.co/acme/0f6c7f1e-0000-4000-8000-000000000001/apply");
  });

  it("matches a link however it's written: the scheme, www, the fragment and the order of the query", () => {
    expect(
      postingKey("http://WWW.Careers.Acme.example/jobs/42?b=2&a=1#apply"),
    ).toBe(postingKey("https://careers.acme.example/jobs/42?a=1&b=2"));
  });
});

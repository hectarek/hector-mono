import { describe, expect, it } from "bun:test";
import { videoEmbed, videoThumbnail } from "@/src/entities/video-link";

// D81: YouTube and Vimeo play in the page; other hosts open on their own.
describe("videoEmbed", () => {
  const youtube =
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1";

  it("plays YouTube's links in its cookie-less player", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(videoEmbed(link)).toBe(youtube);
    }
  });

  it("plays Vimeo's", () => {
    expect(videoEmbed("https://vimeo.com/76979871")).toBe(
      "https://player.vimeo.com/video/76979871?autoplay=1",
    );
  });

  it("leaves everything else to open on its own page", () => {
    for (const link of [
      "https://www.instagram.com/reel/Cxyz123/",
      "https://www.tiktok.com/@cook/video/7300000000000000000",
      "https://www.youtube.com/@somechannel",
      "https://vimeo.com/channels/staffpicks",
      "https://example.com/watch?v=dQw4w9WgXcQ",
      "not a link",
    ]) {
      expect(videoEmbed(link)).toBe(null);
    }
  });
});

// A recipe with a video and no photo shows the video's thumbnail.
describe("videoThumbnail", () => {
  it("gives a YouTube link's thumbnail in either size", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&pp=2AEAkAIB",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      expect(videoThumbnail(link, "medium")).toBe(
        "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      );
      expect(videoThumbnail(link, "high")).toBe(
        "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      );
    }
  });

  it("gives none for other hosts", () => {
    for (const link of [
      "https://vimeo.com/76979871",
      "https://www.tiktok.com/@cook/video/7300000000000000000",
      "https://www.youtube.com/@somechannel",
      "not a link",
    ]) {
      expect(videoThumbnail(link, "high")).toBe(null);
    }
  });
});

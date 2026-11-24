import { describe, expect, it } from "bun:test";
import { act, render } from "@testing-library/react";
import { useMoment } from "@/app/_lib/use-moment";

function Moment({ value, forward }: { value: number; forward?: boolean }) {
  const moment = useMoment(
    value,
    forward ? (before, now) => now > before : undefined,
  );
  return (
    <output data-playing={moment.playing ? "yes" : "no"}>{moment.key}</output>
  );
}

const shown = (view: ReturnType<typeof render>) => {
  const moment = view.getByRole("status");
  return `${moment.textContent} ${moment.dataset.playing}`;
};

// U26: a moment plays when its state changes while the page shows, never as the page first shows,
// and once: its mark goes after it, so a page Next.js kept doesn't play it again as it shows.
describe("useMoment", () => {
  it("rests as the page first shows", () => {
    expect(shown(render(<Moment value={1} />))).toBe("0 no");
  });

  it("plays when its value changes, with a new key each time, then rests", async () => {
    const view = render(<Moment value={1} />);
    view.rerender(<Moment value={2} />);
    expect(shown(view)).toBe("1 yes");
    view.rerender(<Moment value={3} />);
    expect(shown(view)).toBe("2 yes");
    view.rerender(<Moment value={3} />);
    expect(shown(view)).toBe("2 yes");

    await act(() => new Promise((done) => setTimeout(done, 500)));
    expect(shown(view)).toBe("2 no");
  });

  it("plays only for a change it allows", () => {
    const view = render(<Moment value={2} forward />);
    view.rerender(<Moment value={1} forward />);
    expect(shown(view)).toBe("0 no");
    view.rerender(<Moment value={3} forward />);
    expect(shown(view)).toBe("1 yes");
  });
});

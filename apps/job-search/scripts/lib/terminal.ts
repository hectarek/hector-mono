// What a script run from Hector's terminal says and asks (docs/build-plan.md KTD17): the
// production migration wrapper and the sheet's import share it.

// main passes the terminal, tests a scripted one.
export type Terminal = {
  print: (line: string) => void;
  refuse: (reason: string) => number;
  ask: (question: string) => Promise<string | null>;
};

// What a chunk of raw-mode keys does to the line typed so far: Enter ends it, Ctrl-C aborts it,
// Backspace deletes a character and any other control key does nothing.
export function typeKeys(
  line: string,
  keys: string,
): { line: string; end?: "enter" | "abort" } {
  let typed = line;
  for (const key of keys) {
    if (key === "\r" || key === "\n") {
      return { line: typed, end: "enter" };
    }
    if (key === "\u0003") {
      return { line: typed, end: "abort" };
    }
    if (key === "\u007f" || key === "\b") {
      typed = typed.slice(0, -1);
    } else if (key >= " ") {
      typed += key;
    }
  }
  return { line: typed };
}

export function print(line: string): void {
  process.stdout.write(`${line}\n`);
}

export function refuse(reason: string): number {
  process.stderr.write(`${reason}\n`);
  return 1;
}

// One line from the terminal, read in raw mode so the keys show only when `echo` is on. Null when
// Ctrl-C aborts it.
export function ask(question: string, echo: boolean): Promise<string | null> {
  const { stdin, stdout } = process;
  stdin.setRawMode(true);
  stdout.write(question);
  return new Promise((resolve) => {
    let line = "";
    const onKeys = (keys: string): void => {
      const typed = typeKeys(line, keys);
      line = typed.line;
      if (echo) {
        stdout.write(`\r${question}${line}\u001b[K`);
      }
      if (typed.end) {
        stdin.off("data", onKeys);
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write("\n");
        resolve(typed.end === "enter" ? line : null);
      }
    };
    stdin.setEncoding("utf8");
    stdin.on("data", onKeys);
    stdin.resume();
  });
}

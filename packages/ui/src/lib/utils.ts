import { createCn } from "cn/config";

// cn, told the shared stylesheet's own type sizes (text-10, text-13, text-15, text-22, text-26
// in globals.css). Without them it takes "text-13" for a text color, so cn("text-13",
// "text-destructive") would drop the size. tests/src/lib/utils.test.ts checks the list against
// globals.css. Registry components import cn from "cn" itself, as shadcn ships them.
export const cn = createCn({
  extend: {
    classGroups: { "font-size": [{ text: ["10", "13", "15", "22", "26"] }] },
  },
});

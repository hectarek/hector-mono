import { CAST } from "@/tests/_support/cast";

// Makes You the admin, as on the canvas's E5, for a screen test of the admin's pages. Import it
// first: the container reads ADMIN_USER_ID when it's made, and the preload drops it for every
// other test (Testing).
process.env.ADMIN_USER_ID = CAST.people.you.id;

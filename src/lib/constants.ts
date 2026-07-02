// Client-safe constants (no server-only imports), so both server and client
// modules can share them without pulling next/headers into the browser bundle.

/** Cookie the global admin uses to focus one unit. */
export const UNIT_COOKIE = "tp_unit";

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache is configured: every page is rendered per request because it depends
// on the signed-in person.
export default defineCloudflareConfig();

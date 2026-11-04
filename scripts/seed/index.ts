import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WORKSPACE_SEED, members } from "./data.ts";
import { buildSeedPlan } from "./plan.ts";
import { allocateIds, buildRows } from "./rows.ts";
import type { Row } from "./rows.ts";

const DEFAULT_DEMO_PASSWORD = "RelayDesk-demo-2026";
const USERS_PER_PAGE = 200;

function loadEnvFile(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    // Values may come from the shell instead, which is fine.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local (see .env.example).`);
  }
  return value;
}

function describeError(step: string, error: { message: string }): Error {
  return new Error(`${step} failed: ${error.message}`);
}

async function insertRows(client: SupabaseClient, table: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const { error } = await client.from(table).insert(rows);
  if (error) {
    throw describeError(`Inserting into ${table}`, error);
  }
}

async function findDemoWorkspaceIds(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from("workspaces")
    .select("id")
    .eq("name", WORKSPACE_SEED.name);
  if (error) {
    throw describeError("Looking for an existing demo workspace", error);
  }
  return (data ?? []).map((row: { id: string }) => row.id);
}

// Deleting a user removes the profile through its foreign key. The workspaces those
// accounts belonged to are deleted afterwards, which removes everything else with them.
async function removeDemoData(client: SupabaseClient): Promise<void> {
  const demoEmails = new Set(members.map((member) => member.email));

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("workspace_id")
    .in("email", [...demoEmails]);
  if (profilesError) {
    throw describeError("Looking up the demo profiles", profilesError);
  }
  const workspaceIds = new Set<string>(
    (profiles ?? []).map((row: { workspace_id: string }) => row.workspace_id),
  );

  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: USERS_PER_PAGE });
    if (error) {
      throw describeError("Listing users", error);
    }
    for (const user of data.users) {
      if (user.email && demoEmails.has(user.email)) {
        const { error: deleteError } = await client.auth.admin.deleteUser(user.id);
        if (deleteError) {
          throw describeError(`Deleting ${user.email}`, deleteError);
        }
      }
    }
    if (data.users.length < USERS_PER_PAGE) {
      break;
    }
  }

  for (const workspaceId of await findDemoWorkspaceIds(client)) {
    workspaceIds.add(workspaceId);
  }
  if (workspaceIds.size > 0) {
    const { error } = await client
      .from("workspaces")
      .delete()
      .in("id", [...workspaceIds]);
    if (error) {
      throw describeError("Deleting the demo workspace", error);
    }
  }
}

async function createMembers(
  client: SupabaseClient,
  workspaceId: string,
  password: string,
): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const member of members) {
    const { data, error } = await client.auth.admin.createUser({
      email: member.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: member.name },
    });
    if (error || !data.user) {
      throw new Error(`Creating ${member.email} failed: ${error?.message ?? "no user returned"}`);
    }
    ids[member.key] = data.user.id;

    const { error: attachError } = await client.rpc("add_member_to_workspace", {
      p_user_id: data.user.id,
      p_workspace_id: workspaceId,
    });
    if (attachError) {
      throw describeError(`Adding ${member.email} to the workspace`, attachError);
    }
  }
  return ids;
}

let startedWriting = false;

async function main(): Promise<void> {
  loadEnvFile();

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY");
  if (secretKey.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SECRET_KEY holds the publishable key. Use the secret key instead.");
  }
  const password = process.env.SEED_DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD;
  const reset = process.argv.includes("--reset");

  const client = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await findDemoWorkspaceIds(client);
  if (existing.length > 0 && !reset) {
    console.error(
      `The demo workspace "${WORKSPACE_SEED.name}" already exists. ` +
        "Run `npm run seed:reset` to delete it and load it again.",
    );
    process.exitCode = 1;
    return;
  }
  if (reset) {
    console.log("Removing the existing demo workspace and its accounts...");
    await removeDemoData(client);
  }

  const plan = buildSeedPlan(new Date());
  const workspaceId = randomUUID();
  startedWriting = true;

  console.log("Creating the workspace and demo accounts...");
  const { error: workspaceError } = await client.from("workspaces").insert({
    id: workspaceId,
    name: plan.workspace.name,
    waiting_threshold_days: plan.workspace.waitingThresholdDays,
    due_window_days: plan.workspace.dueWindowDays,
  });
  if (workspaceError) {
    throw describeError("Creating the workspace", workspaceError);
  }
  const memberIds = await createMembers(client, workspaceId, password);

  const { count, error: countError } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (countError) {
    throw describeError("Checking workspace members", countError);
  }
  if (count !== members.length) {
    throw new Error(
      `Expected ${members.length} members in the demo workspace but found ${count ?? 0}.`,
    );
  }

  const ids = allocateIds(plan, { workspace: workspaceId, members: memberIds }, randomUUID);
  const rows = buildRows(plan, ids);

  console.log("Loading clients, projects and requests...");
  await insertRows(client, "clients", rows.clients);
  await insertRows(client, "projects", rows.projects);
  await insertRows(client, "requests", rows.requests);
  await insertRows(client, "request_relations", rows.relations);

  console.log("Loading comments, activity and notifications...");
  await insertRows(client, "comments", rows.comments);
  await insertRows(client, "activity_events", rows.activity);
  await insertRows(client, "notifications", rows.notifications);

  console.log(
    `\nLoaded "${plan.workspace.name}": ${plan.members.length} members, ` +
      `${plan.clients.length} clients, ${plan.projects.length} projects, ` +
      `${plan.requests.length} requests, ${plan.comments.length} comments, ` +
      `${plan.events.length} activity events.`,
  );
  console.log(`\nSign in with any of these accounts (password: ${password}):`);
  for (const member of plan.members) {
    console.log(`  ${member.email}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  if (startedWriting) {
    console.error(
      "The seed stopped part-way. Run `npm run seed:reset` to clean up and start again.",
    );
  }
  process.exitCode = 1;
});

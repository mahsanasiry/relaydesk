# Deployment

RelayDesk is published as three parts: the code on GitHub, the database and authentication on Supabase, and the running app on Cloudflare Workers, built with the OpenNext adapter. The app needs only a Postgres database with the migrations applied and two public environment variables.

## What the hosted app needs

| Variable                               | Where it comes from             | Notes                                                 |
| -------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase, Project Settings, API | Public.                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase, Project Settings, API | Public. Row level security is what protects the data. |

Both are read when the app is built, so they must be present in the environment where `npm run deploy` runs. `SUPABASE_SECRET_KEY` and `SEED_DEMO_PASSWORD` are used only by `npm run seed` on a developer's machine. Do not add them to Cloudflare, to GitHub secrets, or to any committed file.

## 1. Check the repository before publishing

```
git status
git ls-files | findstr /i "\.env"
```

The second command must print only `.env.example`.

## 2. Publish the code to GitHub

1. Create an empty repository on GitHub, with no README, licence or `.gitignore`.
2. Connect and push:

   ```
   git remote add origin https://github.com/<account>/relaydesk.git
   git branch -M main
   git push -u origin main
   ```

3. Open the Actions tab. The CI workflow should finish green: format check, lint, typecheck, tests, build, and the production dependency audit.
4. Optional: in Settings, Branches, add a rule for `main` that requires the CI check "Lint, typecheck, test and build" before merging.

## 3. Prepare Supabase

1. Apply the migrations in file-name order: `supabase/migrations/20261104000100_schema.sql`, `...0200_functions_and_triggers.sql`, `...0300_row_level_security.sql`, then `...0400_member_workspace_assignment.sql`.
2. Authentication, Providers, Email: decide whether to require email confirmation.
3. Demo data is optional. To load it into a hosted project, put that project's URL, publishable key and secret key in `.env.local` on your own machine and run `npm run seed`.

A project that stays unused for a while may be paused on a free plan. Resume it from the Supabase dashboard if the app reports that data cannot be loaded.

## 4. Deploy on Cloudflare Workers

The adapter turns the Next.js build into a Worker. Support for the Next.js 16 `proxy.ts` file is marked experimental by the adapter, and the build prints a warning about it. That warning comes from the adapter and is expected.

One-time setup:

```
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
npm pkg set "scripts.preview=opennextjs-cloudflare build && opennextjs-cloudflare preview"
npm pkg set "scripts.deploy=opennextjs-cloudflare build && opennextjs-cloudflare deploy"
npx wrangler login
```

`wrangler login` opens a browser window to sign in to Cloudflare.

Deploy:

```
npm run deploy
```

The command builds the app with the values in `.env.local`, uploads it, and prints an address ending in `.workers.dev`. Run it again to publish a new version.

To try the Worker locally before publishing:

```
npm run preview
```

If the deploy is refused because the Worker is too large, the Workers Free plan limit is the usual cause. The plan limit for compressed size is documented by Cloudflare; moving to the Workers Paid plan raises it.

### Deploying from GitHub Actions instead

The `Deploy` workflow builds and deploys the Worker after a passing CI run on `main`, and can also be started by hand from the Actions tab. It does not depend on the Git connection that Cloudflare Workers Builds uses, which is useful when that connection is lost. It needs four repository secrets:

| Secret                                 | Value                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | The project URL, the same value as in `.env.local`.                                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key. It is public by design.                                          |
| `CLOUDFLARE_API_TOKEN`                 | A token created from the "Edit Cloudflare Workers" template, limited to this account. |
| `CLOUDFLARE_ACCOUNT_ID`                | The account ID shown on the Workers and Pages overview page.                          |

Use either this workflow or Workers Builds for a given Worker. Running both deploys every commit twice.

## 5. Tell Supabase where the app lives

In Supabase, Authentication, URL Configuration:

- Site URL: the `.workers.dev` address printed by the deploy.
- Redirect URLs: add that address followed by `/**`, and `http://localhost:3000/**`.

Without this, confirmation links in sign-up emails point to the wrong address.

## 6. Check the live site

1. Open the address. The landing page loads.
2. Log in with a seeded account, or sign up and confirm.
3. Create a request, move it to Blocked with a reason, and open the dashboard. The request appears under its reason.
4. Open Activity and Notifications. Both load without errors.
5. Leave the tab open for more than an hour, then navigate. You should stay signed in, because the proxy renews the session.

To run the browser tests against the live site, from your machine:

```
$env:E2E_BASE_URL = "https://<your-worker>.workers.dev"
$env:E2E_BROWSER_CHANNEL = "msedge"
npm run test:e2e
```

They need the demo accounts to exist in that project.

## 7. Produce the delivery archive

```
git archive --format=zip -o "$HOME\Downloads\relaydesk-final.zip" HEAD
```

The archive contains only committed files, so it has no `node_modules`, no build output and no `.env.local`.

## Rolling back

In the Cloudflare dashboard, open the Worker, then Deployments, and roll back to an earlier version. Database changes are made with new migrations; do not edit a migration that has already been applied.

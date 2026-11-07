# Deployment

This describes how RelayDesk is published: the code on GitHub, the database and authentication on Supabase, and the running app on Vercel. Nothing here is specific to those services except the screens and names; the app needs only a Postgres database with the migrations applied and two public environment variables.

## What the hosted app needs

| Variable                               | Where it comes from             | Notes                                                 |
| -------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase, Project Settings, API | Public.                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase, Project Settings, API | Public. Row level security is what protects the data. |

`SUPABASE_SECRET_KEY` and `SEED_DEMO_PASSWORD` are used only by `npm run seed` on a developer's machine. Do not add them to Vercel, to GitHub secrets, or to any file that is committed.

## 1. Check the repository before publishing

```
git status
git ls-files | findstr /i "\.env"
```

The second command must print only `.env.example`. If `.env.local` is listed, stop and remove it from the index before pushing.

## 2. Publish the code to GitHub

1. Create an empty repository on GitHub, with no README, licence or `.gitignore`.
2. Connect and push:

   ```
   git remote add origin https://github.com/<account>/relaydesk.git
   git branch -M main
   git push -u origin main
   ```

3. Open the Actions tab. The CI workflow starts on its own. It should finish green: format check, lint, typecheck, tests, build, and the production dependency audit.
4. Optional but recommended: in Settings, Branches, add a rule for `main` that requires the CI check "Lint, typecheck, test and build" before merging.

## 3. Prepare Supabase

1. Use a Supabase project whose migrations are applied in file-name order: `supabase/migrations/20261104000100_schema.sql`, then `...0200_functions_and_triggers.sql`, then `...0300_row_level_security.sql`, then `...0400_member_workspace_assignment.sql`.
2. Authentication, Providers, Email: decide whether to require email confirmation. With confirmation on, a new person must click the link in the message before logging in. With it off, sign-up logs them in at once.
3. Demo data is optional. To load it into a hosted project, put that project's URL, publishable key and secret key in `.env.local` on your own machine and run `npm run seed`. Remove the secret key from the file afterwards if you are done.

A project that stays unused for a while may be paused on a free plan. Resume it from the Supabase dashboard if the app reports that data cannot be loaded.

## 4. Deploy on Vercel

1. Sign in to Vercel with the GitHub account, choose Add New, Project, and import the repository.
2. Leave the framework as Next.js and the build settings as detected.
3. Under Environment Variables, add the two variables from the table above, for Production and Preview.
4. In Settings, General, set the Node.js version to 22.x.
5. Deploy. Vercel gives the project an address ending in `.vercel.app`. Every push to `main` deploys again.

## 5. Tell Supabase where the app lives

In Supabase, Authentication, URL Configuration:

- Site URL: the Vercel address, for example `https://relaydesk.vercel.app`.
- Redirect URLs: add `https://relaydesk.vercel.app/**` and `http://localhost:3000/**`.

Without this, confirmation links in sign-up emails point to the wrong address.

## 6. Check the live site

1. Open the address. The landing page loads.
2. Log in with a seeded account, or sign up and confirm.
3. Create a request, move it to Blocked with a reason, and open the dashboard. The request appears under its reason.
4. Open Activity and Notifications. Both load without errors.

To run the browser tests against the live site, from your machine:

```
$env:E2E_BASE_URL = "https://relaydesk.vercel.app"
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

In Vercel, Deployments, choose an earlier deployment and promote it. Database changes are made with new migrations; do not edit a migration that has already been applied.

# Supabase setup for BEK AI

This repository now contains the database migration and authenticated AI Edge Function. The function keeps the OpenRouter key on the server; the browser only receives the Supabase anon/public key.

## 1. Configure the frontend

Copy the Supabase project URL and anon/public key from **Supabase Dashboard → Project Settings → API** into the root `config.js`:

- `SUPABASE_URL`: project URL, usually `https://<project-ref>.supabase.co`
- `SUPABASE_ANON_KEY`: anon/public key (not the service-role key)

Never put a service-role key or OpenRouter key in `config.js`, HTML, or browser JavaScript.

## 2. Apply the database migration

Using Supabase CLI linked to the existing project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the contents of `supabase/migrations/202611180001_bekai_core.sql` into **Supabase Dashboard → SQL Editor** and run it once.

The migration adds BEK AI chat, message, project, daily quota tables, RLS policies, a server-only quota function, and a private storage bucket. It deliberately does not drop or replace the existing `profiles` or `ai_usage` tables.

## 3. Set Edge Function secrets

In **Supabase Dashboard → Edge Functions → Secrets**, set:

- `OPENROUTER_API_KEY` = your OpenRouter API key
- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = your anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` = your service-role key

The service-role key must remain in Supabase Edge Function secrets only. Do not send it in chat or commit it to GitHub.

Supabase normally supplies its own URL/key environment values to Edge Functions; if they are already present, do not overwrite them unnecessarily.

## 4. Deploy the function

```bash
supabase functions deploy ai-chat
```

The Edge Function validates the signed-in user, reserves up to 20 messages per UTC day, and calls OpenRouter server-side. Model routing uses OpenRouter Auto; actual model availability, free-tier eligibility, rate limits, and response quality are determined by OpenRouter and upstream providers.

## 5. Configure email sign-in

In **Authentication → URL Configuration**, add the deployed BEK AI website URL to the allowed redirect URLs. Configure email OTP/magic-link delivery in **Authentication → Providers → Email**. Supabase's default email limits may be low; production use may require a custom SMTP provider.

## 6. Publish

After configuring `config.js`, applying the migration, setting secrets, deploying the Edge Function, and testing login/chat, merge the rebuild pull request into `main` and confirm GitHub Pages publishes the main branch.

## Current limits

- The image studio currently calls a third-party text-to-image endpoint directly. It is not a BEK-owned image model, and availability/quality are not guaranteed.
- Reference-photo image editing is not yet wired to a verified image-editing model.
- Website/app generation creates downloadable starter files; automatic hosting, mobile app signing, and one-click deployment are not implemented.
- The daily quota in this migration is 20 chat requests per user per UTC day. It is separate from the older `ai_usage` system.

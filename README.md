# BEK AI

BEK AI is a responsive web workspace prototype for:
- AI chat with Supabase email sign-in and saved cloud chat history;
- text-to-image generation through a third-party endpoint;
- code generation with copy/download;
- website generation with sandboxed preview and HTML export;
- starter application project generation and ZIP export;
- Supabase project persistence for generated code, website, and app files.

## Backend setup

Read [Supabase setup](supabase/SETUP.md). The frontend requires the Supabase project URL and anon/public key in `config.js`. The authenticated `ai-chat` Edge Function requires server-side Supabase environment values and `OPENROUTER_API_KEY`.

Never put a Supabase service-role key or OpenRouter API key in browser files or GitHub.

## Free model routing

The Edge Function requests OpenRouter's free-model router. Free model availability, quotas, rate limits, context size, and output quality depend on upstream providers and are not guaranteed.

## Current limitations

This is not yet a finished production SaaS. The frontend and backend code are committed, but the Supabase migration and Edge Function still must be applied/deployed to the user's existing Supabase project, and `config.js` must be populated. Reference-image editing, production-grade project execution/deployment, billing, and app signing are not implemented. The image studio uses an external text-to-image endpoint and does not promise unlimited generation.

## Branch and publication

The rebuild is on `bek-ai-rebuild` and is proposed in [Pull Request #1](https://github.com/serhatbaris99-rgb/bek.ai/pull/1). It does not replace the existing live `main` branch until reviewed and merged.

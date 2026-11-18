# BEK AI — rebuild preview

BEK AI is a browser-based prototype for a unified AI workspace: chat, image generation, code assistance, website generation, and starter application projects.

## Run / publish

This is a static frontend. It can be served from GitHub Pages or any static host. Open `index.html` through a web server rather than relying on local-file mode for best results.

## Current capabilities

- **Chat:** sends conversation context to Puter.js using the `gpt-4o-mini` model. First-use authentication, provider consent, quotas, and availability are controlled by Puter.
- **Image generation:** requests an image from the Pollinations image endpoint. It is a third-party service; uptime, output quality, terms, and limits are not controlled by this project.
- **Code assistant:** generates code and provides copy/download actions.
- **Website builder:** asks the model for a single HTML document, previews it in a sandboxed iframe, and downloads the HTML.
- **App builder:** requests a JSON file tree, validates basic relative paths, and packages returned files as a ZIP using JSZip.

## Important limitations — not production cloud SaaS yet

This branch is a client-side prototype, not a finished multi-user cloud platform.

It currently has **no**:
- BEK-owned user accounts, login, or subscription system;
- server-side database, synchronized conversation history, or project storage;
- BEK-controlled model gateway, API key vault, rate limiting, or usage metering;
- secure backend for private integrations or deployment/build jobs;
- guaranteed free or unlimited AI inference;
- image editing workflow that accepts a reference photo.

The browser calls third-party services directly. Do not add private API keys or service-role credentials to frontend files. Do not describe provider access as unlimited or guaranteed.

## Production work still required

1. Create a backend project (for example Supabase) and configure authentication.
2. Add database tables for profiles, chats, messages, projects, and usage records, with Row Level Security policies.
3. Put model-provider credentials behind server-side Edge Functions or another backend; never expose secret keys in the browser.
4. Add rate limits, abuse controls, error handling, and transparent quota reporting.
5. Add private object storage for user uploads and generated assets.
6. Add a real project workspace that stores files and supports revisions, plus sandboxed build/preview and deployment jobs.
7. Add reference-image editing through a model/provider that explicitly supports image input and editing.
8. Test mobile browsers, accessibility, security, and provider failures before public launch.

## Local development

No build step is required for the current static prototype. The page loads Puter.js and JSZip from CDNs, plus Google Fonts. A network connection is required for these dependencies and the external AI services.

## Deployment status

The `bek-ai-rebuild` branch is a preview branch. It does not replace the current `main` branch or automatically become the public GitHub Pages site. Merge and Pages configuration should happen only after review and testing.

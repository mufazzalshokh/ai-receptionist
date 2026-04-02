
# AI Receptionist Platform

## Project Overview

Multi-tenant AI receptionist SaaS platform. Answers calls, handles chats, qualifies leads, books appointments, and handles FAQs for businesses across industries. First client: **VIVIDERM** (laser dermatology clinic, Riga, Latvia).

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 15 (App Router, Turbopack) + Tailwind CSS 4 + shadcn/ui
- **AI Engine**: Anthropic Claude API (claude-sonnet-4-6) via `@anthropic-ai/sdk`
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Voice**: Twilio (telephony) + Deepgram (STT) + ElevenLabs/Cartesia (TTS)
- **Booking**: Alteg/YCLIENTS API (VividDerm), extensible per business
- **Notifications**: Twilio SMS + Resend email
- **Languages**: TypeScript throughout, strict mode
- **Deployment**: Vercel (target)

## Project Structure

```
apps/
  web/              — Next.js dashboard + API routes (port 3000)
  widget/           — Embeddable chat widget (vanilla TS, self-contained)
packages/
  types/            — Shared TypeScript types (@ai-receptionist/types)
  core/             — AI conversation engine (@ai-receptionist/core)
  config/           — Business configs & industry packs (@ai-receptionist/config)
  db/               — Prisma client & schema (@ai-receptionist/db)
```

## Key Commands

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages and apps
pnpm db:push          # Push Prisma schema to database
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio (DB browser)
pnpm db:migrate       # Run database migrations
```

## Architecture Decisions

- **In-memory conversation store** for MVP (`apps/web/src/lib/conversation-store.ts`). Production: Redis (Upstash) + PostgreSQL persistence.
- **Industry "Persona Packs"**: Each business type gets pre-built FAQ libraries, qualification flows, tone profiles, and escalation rules. Stored in `packages/config/src/industries/`.
- **Multi-language by default**: EN, LV, RU. Language auto-detected per message, response in same language.
- **Immutable state updates**: All conversation store operations create new objects, never mutate.
- **Booking modes**: `direct` (API-integrated), `request` (capture + notify staff), `callback` (collect info only).

## Environment Variables

Required for development (see `.env.example`):
- `ANTHROPIC_API_KEY` — Required for AI to work
- `DATABASE_URL` — Supabase PostgreSQL connection string

Optional (Phase 2+):
- `TWILIO_*` — Voice calls and SMS
- `DEEPGRAM_API_KEY` — Speech-to-text
- `ELEVENLABS_*` — Text-to-speech
- `ALTEG_API_KEY` — Booking integration
- `RESEND_API_KEY` — Email notifications

## API Routes

- `POST /api/chat` — Main conversation endpoint (message in, AI response out)
- `GET /api/widget/config` — Widget configuration for embeddable chat
- `GET /api/conversations` — List conversations for a business
- `GET /api/leads` — List captured leads
- `POST /api/voice/incoming` — Twilio webhook for incoming calls
- `POST /api/voice/process` — Process voice transcription

## Business Configuration

Each business is defined in `packages/config/src/businesses/`. Config includes:
- Contact info, hours, timezone
- AI persona (name, tone, greetings in all languages)
- Escalation rules (urgent keywords, contact methods)
- Booking system config
- Never/always do rules

Knowledge base (services + FAQs) lives alongside business config.

## Widget Embedding

```html
<script src="https://your-domain.com/widget.js" data-business-id="vividerm" async></script>
```

Attributes: `data-language`, `data-color`, `data-position`, `data-api-url`.

## Compliance Notes

- **GDPR**: EU-based (Latvia). All data storage must comply.
- **No PHI storage** in MVP. HIPAA-tier planned for Phase 2.
- **No medical advice**: AI must never diagnose or recommend treatment.
- API keys stored in env vars only, never in source.

## Current Status

- Core AI engine: complete
- VividDerm business config + knowledge base: complete
- Chat API + conversation management: complete (with DB persistence)
- Dashboard skeleton (stats, conversations, leads, settings): complete
- Embeddable chat widget: complete
- Voice pipeline: complete (Twilio Media Streams + Deepgram STT + ElevenLabs TTS, 41 tests)
- Booking integration: scaffolded (Alteg API client exists, not wired to AI engine)
- Escalation system: complete (SMS/email/webhook, wired to chat route)
- Database schema: pushed to Supabase, seeded with VividDerm data
- Auth: complete (NextAuth v5, credentials, JWT sessions, middleware)
- Rate limiting: complete (20/min per IP on /api/chat)
- CORS: complete (widget endpoints)
- Security: Twilio signature validation, WS auth, env validation, PII masking

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Real-Time Chat App with Django Channels**

A production-grade real-time chat application built on Django Channels, delivering WebSocket-powered private messaging, group chats, and rich media sharing with end-to-end encryption. The server stores only ciphertext — never plaintext. Designed for ~10,000 concurrent connections with sub-100ms message delivery.

**Core Value:** Real-time, encrypted messaging that works instantly — if a message can't be sent, received, and decrypted in under 100ms same-region, nothing else matters.

### Constraints

- **Tech Stack**: Django 4.x + Channels 4.x + Daphne — non-negotiable per project charter
- **Database**: PostgreSQL — required for bytea columns and full-text search (tsvector)
- **Encryption**: libsodium (NaCl) — X25519 + XSalsa20-Poly1305, no rolling custom crypto
- **Scale Target**: ~10,000 concurrent WebSocket connections — architecture must support horizontal scaling
- **Message Latency**: <100ms delivery within same region
- **File Size**: Max 100MB per message attachment
- **Group Size**: Up to 1,000 members per group chat
- **Security**: Server must NEVER see plaintext message content
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack (2025)
### Backend Core
| Component | Choice | Version | Confidence | Rationale |
|-----------|--------|---------|------------|-----------|
| Framework | Django | 4.2 LTS | ⭐⭐⭐⭐⭐ | Long-term support, battle-tested ORM, built-in admin |
| ASGI Framework | Django Channels | 4.1+ | ⭐⭐⭐⭐⭐ | Reference WebSocket implementation for Django ecosystem |
| ASGI Server | Daphne | 4.1+ | ⭐⭐⭐⭐ | Reference ASGI server, native HTTP+WS, Django-maintained |
| API Framework | Django REST Framework | 3.15+ | ⭐⭐⭐⭐⭐ | Industry standard for Django REST APIs |
| Auth | djangorestframework-simplejwt | 5.3+ | ⭐⭐⭐⭐⭐ | JWT for stateless API + WebSocket auth |
### Data Layer
| Component | Choice | Version | Confidence | Rationale |
|-----------|--------|---------|------------|-----------|
| Primary DB | PostgreSQL | 16+ | ⭐⭐⭐⭐⭐ | bytea for ciphertext, tsvector for full-text search, JSONB |
| Channel Layer | channels-redis | 4.2+ | ⭐⭐⭐⭐⭐ | Only production-grade channel layer backend |
| Cache/Presence | Redis | 7.2+ | ⭐⭐⭐⭐⭐ | TTL keys for presence, pub/sub for notifications |
| ORM Async | database_sync_to_async | built-in | ⭐⭐⭐⭐ | Required to avoid blocking event loop in consumers |
### Task Processing
| Component | Choice | Version | Confidence | Rationale |
|-----------|--------|---------|------------|-----------|
| Task Queue | Celery | 5.4+ | ⭐⭐⭐⭐⭐ | Mature, proven at scale, rich ecosystem |
| Celery Broker | Redis | 7.2+ | ⭐⭐⭐⭐⭐ | Same Redis instance, reduces infrastructure |
| Task Monitor | Flower | 2.0+ | ⭐⭐⭐⭐ | Real-time Celery monitoring UI |
| Transcription | faster-whisper | 1.0+ | ⭐⭐⭐⭐ | 4x faster than OpenAI Whisper, CTranslate2 backend |
### Storage & Media
| Component | Choice | Version | Confidence | Rationale |
|-----------|--------|---------|------------|-----------|
| Object Storage | AWS S3 / MinIO | — | ⭐⭐⭐⭐⭐ | Scalable blob storage, presigned URLs for direct upload |
| Django Integration | django-storages | 1.14+ | ⭐⭐⭐⭐⭐ | Standard S3 backend for Django |
| S3 Client | boto3 | 1.34+ | ⭐⭐⭐⭐⭐ | Official AWS SDK |
### Security & Encryption
| Component | Choice | Version | Confidence | Rationale |
|-----------|--------|---------|------------|-----------|
| Crypto Library | PyNaCl | 1.5+ | ⭐⭐⭐⭐⭐ | Python binding for libsodium, X25519 + XSalsa20-Poly1305 |
| Password Hashing | Argon2 (django[argon2]) | built-in | ⭐⭐⭐⭐⭐ | Strongest Django password hasher |
| Environment Vars | django-environ | 0.11+ | ⭐⭐⭐⭐⭐ | .env file parsing, type casting |
| Content Security Policy | django-csp | 3.8+ | ⭐⭐⭐⭐ | CSP header management |
### Frontend
| Component | Choice | Version | Confidence | Rationale |
|-----------|--------|---------|------------|-----------|
| UI Framework | React | 18+ | ⭐⭐⭐⭐⭐ | Largest ecosystem, excellent WebSocket integration |
| Build Tool | Vite | 5+ | ⭐⭐⭐⭐⭐ | Fast dev server, HMR, modern bundling |
| WebSocket Client | Native WebSocket API | built-in | ⭐⭐⭐⭐ | Lighter than Socket.IO for Django Channels protocol |
| State Management | Zustand | 4+ | ⭐⭐⭐⭐ | Lightweight, no boilerplate, perfect for chat state |
| HTTP Client | Axios | 1.7+ | ⭐⭐⭐⭐⭐ | JWT interceptors, request/response transforms |
| Crypto (client) | libsodium.js (sodium-plus) | — | ⭐⭐⭐⭐ | Browser-compatible libsodium for client-side E2E |
### DevOps & Monitoring
| Component | Choice | Version | Confidence | Rationale |
|-----------|--------|---------|------------|-----------|
| Reverse Proxy | Nginx | 1.25+ | ⭐⭐⭐⭐⭐ | TLS termination, WebSocket upgrade, static serving |
| Containerization | Docker + Compose | — | ⭐⭐⭐⭐⭐ | Reproducible dev/prod environments |
| Error Tracking | Sentry | latest | ⭐⭐⭐⭐ | Django + Celery + JS integration |
| DB Migrations | Django built-in | — | ⭐⭐⭐⭐⭐ | Automatic schema migration |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| InMemoryChannelLayer | Single-process only, breaks in production | channels-redis |
| Socket.IO server | Not native to Django Channels protocol | Native WebSocket + Django Channels |
| Gunicorn alone | Cannot handle WebSockets | Daphne (or Uvicorn) for ASGI |
| SQLite | No concurrent writes, no bytea, no full-text | PostgreSQL |
| Django-Q2 | Smaller ecosystem, less monitoring | Celery + Flower |
| Rolling custom crypto | Security risk, audit burden | PyNaCl / libsodium (audited) |
| Session auth for API | Doesn't work for WebSocket/mobile | JWT (simplejwt) |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

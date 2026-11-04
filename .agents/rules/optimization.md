# Architecture Rule: Optimization, Compression & Client-Side Compute

## Mandate
- Offload all continuous math, live duration counters, and visual generation (QR, chimes) to the client device RAM/CPU.
- Do not run timer loops or polling ticking on the Bun server.
- The Elysia backend must natively compress responses $>1024$ bytes with Gzip when requested.
- Cloudflare is strictly a tunnel; the application must be self-sufficient for compression and caching.
- Next.js static assets must carry long-term immutable cache headers.
- All backend endpoints must remain 100% headless JSON/WebSocket, fully prepared for Flutter cross-platform mobile apps.
- Never use blocking `alert()` or `confirm()` dialogs.

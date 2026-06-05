# Changelog

## 0.1.0-beta.4

- **Security: receipt replay protection.** Verified receipts are now single-use —
  each `jti` is recorded and a replayed receipt returns `409 Receipt already used`.
  Previously a valid receipt could be replayed within its TTL to consume a paid
  endpoint repeatedly for one payment.
- New `replayStore` option + exported `ReplayStore` type and
  `createInMemoryReplayStore()`. The store exposes a single atomic
  `claim(jti, expiresAtMs)` so distributed implementations (Redis `SET NX`)
  stay race-free under concurrent requests. Default is an in-memory,
  per-process store; inject a shared store for multi-replica deployments.
- Receipts without a `jti` (older gateways) skip the replay check (backward compatible).

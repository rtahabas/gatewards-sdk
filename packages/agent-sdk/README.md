# @gatewards/agent-sdk

x402 payment SDK for AI agents. Automatic HTTP 402 handling with self-custody
signing — your keys never leave your process.

## Installation

```bash
npm install @gatewards/agent-sdk
```

## x402 Payments (Self-Custody)

The agent signs payments locally with its own wallet. The gateway only
verifies and settles — it never holds or operates keys.

```typescript
import { createPaymentClient } from "@gatewards/agent-sdk";

const { client, budget } = createPaymentClient({
  gatewayUrl: "https://api.gatewards.com",
  network: "base",
  privateKey: process.env.AGENT_PRIVATE_KEY,
  rpcUrl: "https://mainnet.base.org",
  usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  budgetPolicy: {
    maxSpendPerCall: "1.00", // 1 USDC max per request
    dailyLimit: "10.00", // 10 USDC daily
  },
});

// Auto-pays on 402 responses — signed locally, settled on-chain
const response = await client.get("https://merchant.example.com/api/data");
```

> **Migrating from 0.1.x:** managed (gateway-signed) mode was removed in
> v0.2.0 — the gateway no longer signs on your behalf. Register your wallet
> address with your agent in the dashboard, then pass `privateKey`, `rpcUrl`
> and `usdcAddress` as above. `apiKey` is now only used for proxy mode and
> REST calls (budget, subscriptions).

## Proxy Mode (Cost Optimizer)

Route every request through the Gatewards gateway's cache — no x402 payment
flow, just response deduplication for idempotent GETs. Drop-in: keep your
existing axios call sites, flip one flag.

```typescript
const { client } = createPaymentClient({
  gatewayUrl: "https://api.gatewards.com",
  apiKey: process.env.GATEWARDS_API_KEY,
  network: "base",
  proxy: true, // ← enable proxy mode
  axiosConfig: { baseURL: "https://api.coingecko.com" },
});

// Same call site as before. Under the hood the SDK sends:
//   POST https://api.gatewards.com/api/v1/proxy
//   X-Gatewards-Target-Url: https://api.coingecko.com/simple/price?ids=bitcoin
const r = await client.get("/simple/price", { params: { ids: "bitcoin" } });

// Gateway annotates every response:
r.headers["x-gatewards-cache"]; // "hit" | "miss" | "skip"
```

**When to use.** Multi-agent stacks that call the same upstream resources
over and over (market-data, search, embeddings lookups, signed-URL
fetches). One agent's fetch populates the cache; the next N agents in
your pipeline get the cached response with no upstream call.

**Per-call upstream auth.** If you need to pass an auth header to the
upstream (not to Gatewards), set `Authorization` as usual — the SDK promotes
it to `X-Gatewards-Upstream-Auth` before the gateway swaps in the agent key:

```typescript
await client.get("/me", {
  headers: { Authorization: "Bearer user-scoped-upstream-token" },
});
```

**Limits in v0.1.**

- Only `GET` responses are cached. `POST`/`PUT`/`DELETE` pass through
  without dedup — mutations must never be replayed from cache.
- Only `200` responses are stored. Other statuses stream through with
  `x-gatewards-cache: skip`.
- `text/event-stream` and other streaming bodies are not buffered.
- Default 60 req/min per agent rate limit. Increase on request in beta.

**Proxy mode ≠ payment mode.** `proxy: true` bypasses the x402 402
interceptor entirely — you will not trigger settlement. If your upstream
sits behind x402 paywalls, keep `proxy: false` (the default) or use two
separate clients.

## Error Handling

```typescript
import { GatewardsError, ErrorCodes } from "@gatewards/agent-sdk";

try {
  await client.get("/api/data");
} catch (err) {
  if (err instanceof GatewardsError) {
    switch (err.code) {
      case ErrorCodes.BUDGET_EXCEEDED:
        console.log("Limit hit:", err.details);
        break;
      case ErrorCodes.SIGNING_FAILED:
        console.log("Local signing failed");
        break;
      case ErrorCodes.SETTLEMENT_FAILED:
        console.log("On-chain transfer failed");
        break;
    }
  }
}
```

## Configuration

| Option         | Type    | Required   | Description                                                      |
| -------------- | ------- | ---------- | ---------------------------------------------------------------- |
| `gatewayUrl`   | string  | ✅         | Gatewards gateway URL                                             |
| `network`      | string  | ✅         | `"base"`, `"base-sepolia"`, `"ethereum"`                         |
| `privateKey`   | string  | x402 mode  | Private key for local signing (self-custody)                     |
| `rpcUrl`       | string  | x402 mode  | Blockchain RPC                                                   |
| `usdcAddress`  | string  | x402 mode  | USDC contract                                                    |
| `apiKey`       | string  | Proxy mode | Agent API key — only valid with `proxy: true`                    |
| `budgetPolicy` | object  |            | `{ maxSpendPerCall, dailyLimit }` in USDC                        |
| `timeoutMs`    | number  |            | Default: 30000                                                   |
| `proxy`        | boolean |            | Route all requests through the gateway cache. Requires `apiKey`. |

## Supported Networks

| Network          | ID                   | Chain    |
| ---------------- | -------------------- | -------- |
| Base             | `"base"`             | 8453     |
| Base Sepolia     | `"base-sepolia"`     | 84532    |
| Ethereum         | `"ethereum"`         | 1        |
| Ethereum Sepolia | `"ethereum-sepolia"` | 11155111 |

## License

Apache-2.0 — see [LICENSE](../../LICENSE) and [NOTICE](../../NOTICE).

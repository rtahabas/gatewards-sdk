# @gatewards/merchant-sdk

x402 payment middleware for Express. Monetize your API with USDC — one line of code.

## Installation

```bash
npm install @gatewards/merchant-sdk
```

## Quick Start

```typescript
import express from "express";
import { createPaymentRequiredMiddleware } from "@gatewards/merchant-sdk";

const app = express();

app.get(
  "/api/data",
  createPaymentRequiredMiddleware({
    price: "0.10", // 0.1 USDC
    wallet: "0xYourWallet",
    network: "base",
    gatewayPublicKey: process.env.GATEWAY_JWT_SECRET,
    facilitatorUrl: "https://api.gatewards.com",
  }),
  (req, res) => {
    res.json({
      data: "premium content",
      paidBy: req.paymentReceipt?.sub,
    });
  },
);
```

## How It Works

1. Request arrives without `Authorization` header → returns `402 Payment Required`
2. Agent pays via facilitator → gets JWT receipt
3. Agent retries with `Authorization: Bearer {jwt}`
4. Middleware verifies JWT: signature, wallet, amount, resource
5. If valid → `next()` called, `req.paymentReceipt` available

## Configuration

| Option              | Type     | Required | Description                              |
| ------------------- | -------- | -------- | ---------------------------------------- |
| `price`             | string   | ✅       | Price in USDC (e.g. `"0.10"` = 0.1 USDC) |
| `wallet`            | string   | ✅       | Your USDC wallet (0x + 40 hex)           |
| `network`           | string   | ✅       | `"base"`, `"base-sepolia"`, `"ethereum"` |
| `gatewayPublicKey`  | string   | ✅       | JWT verification key                     |
| `facilitatorUrl`    | string   |          | Gateway URL for agents                   |
| `currency`          | string   |          | Default: `"USDC"`                        |
| `audience`          | string   |          | Default: `"402-merchant"`                |
| `maxTimeoutSeconds` | number   |          | Default: `300`                           |
| `resourceResolver`  | function |          | Default: `req.originalUrl`               |
| `replayStore`       | object   |          | Default: in-memory (per process)         |

## Replay Protection

A receipt is single-use. Each verified receipt's `jti` is recorded so the same
receipt cannot be replayed within its TTL to hit a paid endpoint more than once
(a replay returns `409 Receipt already used`).

The default store is in-memory and **per process** — adequate for a single
instance. Running multiple replicas, inject a shared store backed by Redis/DB:

```typescript
createPaymentRequiredMiddleware({
  price: "0.10",
  wallet: "0xYourWallet",
  gatewayPublicKey: process.env.JWT_SECRET,
  network: "base",
  replayStore: {
    // SET ... NX claims the jti only if unseen and returns null otherwise, so
    // concurrent requests for the same receipt cannot both win — one atomic op.
    claim: async (jti, expiresAtMs) =>
      (await redis.set(`jti:${jti}`, "1", "NX", "PXAT", expiresAtMs)) !== null,
  },
});
```

`claim` may be sync or async and must be atomic (claim-and-test in one step,
e.g. Redis `SET NX`) so concurrent requests for the same receipt can't both
pass. It returns `true` when the jti was newly claimed, `false` on a replay.

## Payment Receipt

After verification, `req.paymentReceipt` contains:

```typescript
{
  sub: "0xMerchantWallet",   // merchant address
  amount: "100000",           // amount paid (smallest units)
  resource: "/api/data",      // resource path
  tx: "0x...",                // on-chain tx hash
  jti: "unique-id",           // JWT ID
}
```

## License

Apache-2.0 — see [LICENSE](../../LICENSE) and [NOTICE](../../NOTICE).

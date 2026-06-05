import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createPaymentRequiredMiddleware } from "../index";

const SECRET = "test-secret";
const WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const PRICE = "0.10";
const PRICE_SMALLEST = "100000";
const RESOURCE = "/api/data";

function createApp() {
  const app = express();
  app.use(express.json());
  app.get(
    "/api/data",
    createPaymentRequiredMiddleware({
      price: PRICE,
      wallet: WALLET,
      gatewayPublicKey: SECRET,
      network: "base",
      resourceResolver: () => RESOURCE,
    }),
    (_req, res) => res.json({ data: "premium content" }),
  );
  return app;
}

function makeToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      sub: WALLET,
      aud: "402-merchant",
      amount: PRICE_SMALLEST,
      resource: RESOURCE,
      jti: "test-jti",
      ...overrides,
    },
    SECRET,
    { issuer: "test-gateway", expiresIn: 60 },
  );
}

describe("replay protection", () => {
  it("rejects a replayed receipt (same jti) with 409", async () => {
    const app = createApp();
    const token = makeToken({ jti: "replay-jti-1" });

    const first = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${token}`);
    expect(second.status).toBe(409);
    expect(second.body.error).toBe("Receipt already used");
  });

  it("allows distinct jtis through", async () => {
    const app = createApp();
    const a = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${makeToken({ jti: "distinct-a" })}`);
    const b = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${makeToken({ jti: "distinct-b" })}`);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  it("skips replay check when jti is absent (backward compat)", async () => {
    const app = createApp();
    const token = makeToken({ jti: undefined });
    const res = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("uses an injected replayStore", async () => {
    const claimed: string[] = [];
    const store = {
      claim: (jti: string) => {
        claimed.push(jti);
        return jti !== "already-seen";
      },
    };
    const app = express();
    app.use(express.json());
    app.get(
      "/api/data",
      createPaymentRequiredMiddleware({
        price: PRICE,
        wallet: WALLET,
        gatewayPublicKey: SECRET,
        network: "base",
        resourceResolver: () => RESOURCE,
        replayStore: store,
      }),
      (_req, res) => res.json({ data: "premium content" }),
    );

    const fresh = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${makeToken({ jti: "fresh-jti" })}`);
    expect(fresh.status).toBe(200);
    expect(claimed).toContain("fresh-jti");

    const seen = await request(app)
      .get("/api/data")
      .set("Authorization", `Bearer ${makeToken({ jti: "already-seen" })}`);
    expect(seen.status).toBe(409);
  });
});

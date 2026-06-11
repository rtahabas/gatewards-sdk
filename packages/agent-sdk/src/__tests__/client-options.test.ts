import { describe, it, expect } from "vitest";
import { createPaymentClient } from "../index";
import { GatewardsError, PaymentClientOptions } from "../types";

const GATEWAY = "https://gateway.example.com";
const API_KEY = "ag_testapikey123456789abcdef";

const validOptions: PaymentClientOptions = {
  gatewayUrl: GATEWAY,
  apiKey: API_KEY,
  network: "base",
};

describe("createPaymentClient — unknown option rejection", () => {
  it("throws INVALID_CONFIG on the proxyMode typo instead of silently bypassing the gateway", () => {
    expect(() =>
      createPaymentClient({
        ...validOptions,
        proxyMode: true,
      } as unknown as PaymentClientOptions),
    ).toThrowError(GatewardsError);
    try {
      createPaymentClient({
        ...validOptions,
        proxyMode: true,
      } as unknown as PaymentClientOptions);
    } catch (err) {
      const e = err as GatewardsError;
      expect(e.code).toBe("INVALID_CONFIG");
      expect(e.message).toContain("proxyMode");
      expect(e.message).toContain('did you mean "proxy"');
    }
  });

  it("lists every unknown key in the error message", () => {
    try {
      createPaymentClient({
        ...validOptions,
        proxyMode: true,
        timeout: 5000,
      } as unknown as PaymentClientOptions);
      expect.unreachable("should have thrown");
    } catch (err) {
      const e = err as GatewardsError;
      expect(e.message).toContain("proxyMode");
      expect(e.message).toContain("timeout");
      expect(e.message).toContain("Valid options are:");
    }
  });

  it("accepts a fully-populated valid options object", () => {
    const result = createPaymentClient({
      gatewayUrl: GATEWAY,
      apiKey: API_KEY,
      network: "base",
      chainId: 8453,
      budgetPolicy: { dailyLimit: "10.00", maxSpendPerCall: "1.00" },
      axiosConfig: { headers: { "X-Gatewards-SDK": "test/0.0.0" } },
      timeoutMs: 5000,
      proxy: true,
    });
    expect(result.client).toBeDefined();
    expect(result.budget).toBeDefined();
  });

  it("accepts the exact options shape the langchain factory builds", () => {
    // Regression guard: createGatewardsTools constructs this object —
    // the unknown-key check must never reject it.
    const result = createPaymentClient({
      gatewayUrl: GATEWAY,
      apiKey: API_KEY,
      network: "base",
      budgetPolicy: undefined,
      axiosConfig: { headers: { "X-Gatewards-SDK": "langchain/0.1.0" } },
    });
    expect(result.client).toBeDefined();
  });
});

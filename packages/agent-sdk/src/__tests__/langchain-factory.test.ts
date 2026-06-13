import { describe, it, expect } from "vitest";
import { createGatewardsTools } from "../langchain";
import { GatewardsError } from "../types";

const validOptions = {
  gatewayUrl: "https://gateway.example.com",
  apiKey: "ag_testapikey123456789abcdef",
  privateKey: "0x" + "a".repeat(64),
  rpcUrl: "https://rpc.example.com",
  usdcAddress: "0x" + "b".repeat(40),
  network: "base",
};

describe("createGatewardsTools (self-custody signing)", () => {
  it("returns the 5 tools with stable names", () => {
    const tools = createGatewardsTools(validOptions);
    expect(tools.map((t) => t.name)).toEqual([
      "gatewards_discover_services",
      "gatewards_call_paid_api",
      "gatewards_check_budget",
      "gatewards_get_plans",
      "gatewards_subscribe",
    ]);
  });

  it("throws when privateKey is missing (managed mode removed)", () => {
    const { privateKey: _omitted, ...withoutKey } = validOptions;
    expect(() =>
      createGatewardsTools(withoutKey as typeof validOptions),
    ).toThrow(GatewardsError);
  });
});

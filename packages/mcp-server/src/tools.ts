import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getServices,
  getPlans,
  subscribe,
  getCredits,
} from "@gatewards/agent-sdk";
import type { PaymentClientResult } from "@gatewards/agent-sdk";
import { toolSuccess, toolError } from "./response";
import type { McpConfig } from "./config";

function resolveUrl(url: string, merchantBaseUrl?: string): string {
  if (merchantBaseUrl) {
    const base = new URL(merchantBaseUrl);
    const resolved = new URL(url, base);
    if (resolved.origin !== base.origin) {
      throw new Error("URL must resolve within merchantBaseUrl origin");
    }
    return resolved.toString();
  }
  if (/^https?:\/\//i.test(url)) {
    throw new Error("Absolute URLs require merchantBaseUrl to be configured");
  }
  return url;
}

export function registerTools(
  server: McpServer,
  config: McpConfig,
  payment: PaymentClientResult,
) {
  const apiKeyForCalls = config.apiKey || "";

  server.tool(
    "gatewards_discover_services",
    "Discover available paid API services on the Gatewards marketplace. Returns service names, descriptions, endpoints, and prices.",
    {
      search: z.string().optional().describe("Search term to filter services"),
    },
    async ({ search }) => {
      try {
        const result = await getServices(config.gatewayUrl, search);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "gatewards_call_api",
    "Make a paid API call through Gatewards. Payment is automatic — if the API returns 402, USDC is settled on-chain and the request retries with a receipt.",
    {
      method: z.enum(["GET", "POST"]).describe("HTTP method"),
      url: z.string().describe("Full URL or path to the API endpoint"),
      params: z
        .record(z.string(), z.string())
        .optional()
        .describe("Query params (GET) or body (POST)"),
    },
    async ({ method, url, params }) => {
      try {
        const fullUrl = resolveUrl(url, config.merchantBaseUrl);

        const budgetBefore = payment.budget.getState().dailySpent;
        const response =
          method === "POST"
            ? await payment.client.post(fullUrl, params)
            : await payment.client.get(fullUrl, { params });

        const budgetAfter = payment.budget.getState().dailySpent;
        const cost = BigInt(budgetAfter) - BigInt(budgetBefore);

        const result: Record<string, unknown> = {
          status: response.status,
          data: response.data,
        };
        if (cost > 0n) {
          result.paymentMade = true;
          result.costUnits = cost.toString();
        }

        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "gatewards_check_budget",
    "Check your current spending budget. Returns daily spend and remaining budget.",
    {},
    async () => {
      try {
        const state = payment.budget.getState();
        const credits = apiKeyForCalls
          ? await getCredits(config.gatewayUrl, apiKeyForCalls).catch(
              () => null,
            )
          : null;

        const result: Record<string, unknown> = {
          dailySpent: state.dailySpent,
          lastDay: state.lastDay,
        };
        if (credits) result.subscriptions = credits.summary;

        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "gatewards_get_plans",
    "List available subscription plans. Plans offer prepaid credits at a fixed USDC price.",
    { serviceId: z.string().optional().describe("Filter by service ID") },
    async ({ serviceId }) => {
      try {
        const result = await getPlans(config.gatewayUrl, serviceId);
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.tool(
    "gatewards_subscribe",
    "Subscribe to a credit plan. Purchases a bundle of credits for a service.",
    { planId: z.string().describe("The plan ID to subscribe to") },
    async ({ planId }) => {
      try {
        if (!apiKeyForCalls)
          return toolError("Subscribe requires API key mode");
        const result = await subscribe(
          config.gatewayUrl,
          apiKeyForCalls,
          planId,
        );
        return toolSuccess(result);
      } catch (err) {
        return toolError(err);
      }
    },
  );
}

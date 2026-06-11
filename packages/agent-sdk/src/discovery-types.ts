/**
 * @module @gatewards/agent-sdk
 * Option and response shapes for the discovery API (discovery.ts).
 */

export interface GetServicesOptions {
  gatewayUrl: string;
  search?: string;
}

export interface GetPlansOptions {
  gatewayUrl: string;
  serviceId?: string;
}

export interface SubscribeOptions {
  gatewayUrl: string;
  apiKey: string;
  planId: string;
}

export interface GetCreditsOptions {
  gatewayUrl: string;
  apiKey: string;
}

export interface ServicesResponse {
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    base_url: string | null;
    default_price: string | null;
    endpoints: Array<{ path: string; method: string; price: string }>;
  }>;
}

export interface PlansResponse {
  plans: Array<{
    id: string;
    name: string;
    total_credits: number;
    price_usdc: string;
    credits_per_call: number;
  }>;
}

export interface SubscribeResponse {
  id: string;
  credits_remaining: number;
  status: string;
}

export interface CreditsResponse {
  subscriptions: Array<{
    id: string;
    credits_remaining: number;
    credits_used: number;
    status: string;
  }>;
  summary: { totalRemaining: number; totalUsed: number };
}

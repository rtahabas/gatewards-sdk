import axios from "axios";
import { DEFAULT_TIMEOUT_MS } from "./constants";
import {
  GetServicesOptions,
  GetPlansOptions,
  SubscribeOptions,
  GetCreditsOptions,
  ServicesResponse,
  PlansResponse,
  SubscribeResponse,
  CreditsResponse,
} from "./discovery-types";

export type {
  GetServicesOptions,
  GetPlansOptions,
  SubscribeOptions,
  GetCreditsOptions,
  ServicesResponse,
  PlansResponse,
  SubscribeResponse,
  CreditsResponse,
} from "./discovery-types";

// Every function below accepts an options object (preferred — consistent
// with createPaymentClient) and keeps the original positional signature as
// a backward-compatible overload so existing callers don't break.

export async function getServices(
  options: GetServicesOptions,
): Promise<ServicesResponse>;
export async function getServices(
  gatewayUrl: string,
  search?: string,
): Promise<ServicesResponse>;
export async function getServices(
  optionsOrUrl: GetServicesOptions | string,
  positionalSearch?: string,
): Promise<ServicesResponse> {
  const { gatewayUrl, search } =
    typeof optionsOrUrl === "string"
      ? { gatewayUrl: optionsOrUrl, search: positionalSearch }
      : optionsOrUrl;
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const resp = await axios.get(`${gatewayUrl}/api/v1/services${params}`, {
    timeout: DEFAULT_TIMEOUT_MS,
  });
  return resp.data;
}

export async function getPlans(
  options: GetPlansOptions,
): Promise<PlansResponse>;
export async function getPlans(
  gatewayUrl: string,
  serviceId?: string,
): Promise<PlansResponse>;
export async function getPlans(
  optionsOrUrl: GetPlansOptions | string,
  positionalServiceId?: string,
): Promise<PlansResponse> {
  const { gatewayUrl, serviceId } =
    typeof optionsOrUrl === "string"
      ? { gatewayUrl: optionsOrUrl, serviceId: positionalServiceId }
      : optionsOrUrl;
  const params = serviceId ? `?serviceId=${serviceId}` : "";
  const resp = await axios.get(`${gatewayUrl}/api/v1/plans${params}`, {
    timeout: DEFAULT_TIMEOUT_MS,
  });
  return resp.data;
}

export async function subscribe(
  options: SubscribeOptions,
): Promise<SubscribeResponse>;
export async function subscribe(
  gatewayUrl: string,
  apiKey: string,
  planId: string,
): Promise<SubscribeResponse>;
export async function subscribe(
  optionsOrUrl: SubscribeOptions | string,
  positionalApiKey?: string,
  positionalPlanId?: string,
): Promise<SubscribeResponse> {
  const { gatewayUrl, apiKey, planId } =
    typeof optionsOrUrl === "string"
      ? {
          gatewayUrl: optionsOrUrl,
          apiKey: positionalApiKey!,
          planId: positionalPlanId!,
        }
      : optionsOrUrl;
  const resp = await axios.post(
    `${gatewayUrl}/api/v1/subscriptions/purchase`,
    { planId },
    { headers: { "x-api-key": apiKey }, timeout: DEFAULT_TIMEOUT_MS },
  );
  return resp.data;
}

export async function getCredits(
  options: GetCreditsOptions,
): Promise<CreditsResponse>;
export async function getCredits(
  gatewayUrl: string,
  apiKey: string,
): Promise<CreditsResponse>;
export async function getCredits(
  optionsOrUrl: GetCreditsOptions | string,
  positionalApiKey?: string,
): Promise<CreditsResponse> {
  const { gatewayUrl, apiKey } =
    typeof optionsOrUrl === "string"
      ? { gatewayUrl: optionsOrUrl, apiKey: positionalApiKey! }
      : optionsOrUrl;
  const resp = await axios.get(`${gatewayUrl}/api/v1/subscriptions/me`, {
    headers: { "x-api-key": apiKey },
    timeout: DEFAULT_TIMEOUT_MS,
  });
  return resp.data;
}

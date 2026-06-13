/**
 * @module @gatewards/agent-sdk
 *
 * x402 payment SDK for AI agents.
 * Automatically handles HTTP 402 responses with on-chain USDC settlement.
 */

import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { ethers } from "ethers";

import {
  PaymentClientOptions,
  PaymentClientResult,
  GatewardsError,
  ErrorCodes,
} from "./types";
import { createBudgetGuard } from "./budget";
import {
  validateEthereumAddress,
  validatePrivateKey,
  validateApiKey,
  validateNetwork,
} from "./validation";
import { DEFAULT_TIMEOUT_MS } from "./constants";
import { rejectUnknownOptions } from "./client-options";
import {
  buildPayload,
  buildRequirements,
  signLocally,
  submitSettlement,
} from "./signing";
import { parsePaymentRequired } from "./parser";
import { applyProxyRewrite } from "./proxy";

// Re-export public API
export { createBudgetGuard } from "./budget";
export { getServices, getPlans, subscribe, getCredits } from "./discovery";
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
export {
  BudgetPolicy,
  BudgetGuard,
  BudgetState,
  PaymentClientOptions,
  PaymentClientResult,
  X402PaymentRequired,
  X402SettleResponse,
  GatewardsError,
  ErrorCodes,
} from "./types";

interface PaidRequestConfig extends InternalAxiosRequestConfig {
  __paidRequest?: boolean;
}

export function createPaymentClient(
  options: PaymentClientOptions,
): PaymentClientResult {
  rejectUnknownOptions(options);
  const {
    gatewayUrl,
    apiKey,
    privateKey,
    rpcUrl,
    usdcAddress,
    network,
    chainId,
    budgetPolicy,
    axiosConfig = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    proxy = false,
  } = options;

  if (!gatewayUrl)
    throw new GatewardsError(
      "gatewayUrl is required",
      ErrorCodes.INVALID_CONFIG,
    );
  if (proxy) {
    if (!apiKey)
      throw new GatewardsError(
        "proxy mode requires apiKey (proxy auth is agent-based, not wallet-signed)",
        ErrorCodes.INVALID_CONFIG,
      );
    validateApiKey(apiKey);
    if (privateKey)
      throw new GatewardsError(
        "privateKey is not used in proxy mode — remove it. Proxy mode never " +
          "signs payments; use a separate x402 client if you need both.",
        ErrorCodes.INVALID_CONFIG,
      );
  } else {
    if (apiKey)
      throw new GatewardsError(
        "Managed (gateway-signed) mode was removed in v0.2.0 — x402 signing " +
          "is self-custody. Provide privateKey, rpcUrl and usdcAddress " +
          "instead. apiKey is only valid with proxy: true.",
        ErrorCodes.INVALID_CONFIG,
      );
    if (!privateKey)
      throw new GatewardsError(
        "privateKey is required — x402 payments are signed locally " +
          "(self-custody) as of v0.2.0.",
        ErrorCodes.INVALID_CONFIG,
      );
    validatePrivateKey(privateKey);
    if (!rpcUrl)
      throw new GatewardsError(
        "rpcUrl is required for x402 mode",
        ErrorCodes.INVALID_CONFIG,
      );
    if (!usdcAddress)
      throw new GatewardsError(
        "usdcAddress is required for x402 mode",
        ErrorCodes.INVALID_CONFIG,
      );
    validateEthereumAddress(usdcAddress, "usdcAddress");
  }
  if (!network)
    throw new GatewardsError(
      "network is required (e.g. 'base', 'base-sepolia')",
      ErrorCodes.INVALID_CONFIG,
    );
  const resolvedChainId = chainId || validateNetwork(network);

  let signer: ethers.Wallet | undefined;
  if (privateKey && rpcUrl)
    signer = new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(rpcUrl));

  const budget = createBudgetGuard(budgetPolicy);
  const sdkId =
    (axiosConfig?.headers as Record<string, string>)?.["X-Gatewards-SDK"] ||
    "agent-sdk/0.2.0";
  const client = axios.create({
    timeout: timeoutMs,
    ...axiosConfig,
    headers: {
      "X-Gatewards-SDK": sdkId,
      ...((axiosConfig?.headers as Record<string, string>) || {}),
    },
  });

  if (proxy) {
    client.interceptors.request.use((config) =>
      applyProxyRewrite(config, { gatewayUrl, apiKey: apiKey! }),
    );
    // Proxy mode bypasses x402 entirely — no 402 response interceptor,
    // no signer. Budget guard stays wired so daily spend limits still
    // surface on downstream payment clients if the caller reuses them.
    return { client, signer, budget };
  }

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const response = error.response;
      const originalConfig = error.config as PaidRequestConfig | undefined;
      if (
        !response ||
        response.status !== 402 ||
        !originalConfig ||
        originalConfig.__paidRequest
      )
        throw error;

      const paymentReq = parsePaymentRequired(response);
      if (!paymentReq)
        throw new GatewardsError(
          "402 response missing payment metadata",
          ErrorCodes.MISSING_PAYMENT_METADATA,
          402,
        );

      const { amount, payTo, facilitatorUrl, resource } = paymentReq;
      budget.check(amount);

      const settleUrl = facilitatorUrl || gatewayUrl;

      const signResult = await signLocally(
        signer!,
        resolvedChainId,
        usdcAddress!,
        payTo,
        amount,
      );
      const paymentPayload = buildPayload(
        network,
        signResult.signature,
        signResult.authorization,
      );
      const paymentRequirements = buildRequirements(
        network,
        amount,
        usdcAddress!,
        payTo,
        resource,
      );

      const settleResponse = await submitSettlement(
        settleUrl,
        paymentPayload,
        paymentRequirements,
        sdkId,
      );
      if (!settleResponse.settled || !settleResponse.receipt) {
        budget.record(amount);
        throw new GatewardsError(
          `Settlement rejected: ${settleResponse.error || "unknown"}`,
          ErrorCodes.SETTLEMENT_REJECTED,
        );
      }

      budget.record(amount);
      originalConfig.__paidRequest = true;
      originalConfig.headers.set(
        "Authorization",
        `Bearer ${settleResponse.receipt}`,
      );
      return client.request(originalConfig);
    },
  );

  return { client, signer, budget };
}

/**
 * @module @gatewards/agent-sdk
 * Type definitions for the Gatewards Agent SDK.
 */

// ─── Budget ─────────────────────────────────────────────────────

/** Budget enforcement policy for an agent. Values in USDC (human-readable). */
export interface BudgetPolicy {
  /** Maximum USDC per single request. e.g. "1.00" = 1 USDC */
  maxSpendPerCall?: string | number;
  /** Maximum USDC per calendar day. e.g. "10.00" = 10 USDC */
  dailyLimit?: string | number;
}

/** Current budget state — tracks daily spending. */
export interface BudgetState {
  /** Cumulative USDC spent today (smallest units). */
  dailySpent: string;
  /** Date string (YYYY-MM-DD) of the current tracking day. */
  lastDay: string;
}

/** Budget guard instance returned by createBudgetGuard. */
export interface BudgetGuard {
  /** Throws if amount would exceed per-call or daily limits. */
  check(amount: string | number): void;
  /** Records a spent amount against the daily budget. */
  record(amount: string | number): void;
  /** Returns current budget state. */
  getState(): BudgetState;
}

// ─── Client Options ─────────────────────────────────────────────

/**
 * Options for creating a payment client.
 *
 * Two modes:
 * - **x402 mode** (default): self-custody. Set `privateKey`, `rpcUrl`,
 *   `usdcAddress`. The agent signs payments locally — keys never leave
 *   the process. (Gateway-managed signing was removed in v0.2.0.)
 * - **Proxy mode**: Set `proxy: true` and `apiKey`. Routes requests through
 *   the gateway for caching/dedup — no payment flow, no signing.
 */
export interface PaymentClientOptions {
  /** Gatewards gateway URL (required). */
  gatewayUrl: string;

  /**
   * Agent API key. Obtained from dashboard.
   * Only valid with `proxy: true` — x402 signing is self-custody.
   */
  apiKey?: string;

  /**
   * Agent private key for x402 (self-custody) mode.
   * Must be 0x-prefixed 64-char hex string. Never sent anywhere.
   */
  privateKey?: string;

  /** Blockchain RPC URL. Required for x402 mode. */
  rpcUrl?: string;

  /** USDC contract address. Required for x402 mode. */
  usdcAddress?: string;

  /** Network identifier. Required. e.g. "base", "base-sepolia", "ethereum" */
  network: string;

  /** Override chain ID (auto-detected from network if omitted). */
  chainId?: number;

  /** Budget enforcement policy. */
  budgetPolicy?: BudgetPolicy;

  /** Custom Axios configuration (headers, timeout, etc). */
  axiosConfig?: Record<string, unknown>;

  /** Request timeout in milliseconds. Default: 30000 (30s). */
  timeoutMs?: number;

  /**
   * Route every request through the Gatewards gateway's `/api/v1/proxy`
   * endpoint — enables response caching + dedup without any x402 payment
   * flow. Requires `apiKey` (proxy auth is agent-based, not wallet-signed).
   * The agent's original `Authorization` header, if any, is forwarded
   * upstream via `X-Gatewards-Upstream-Auth`.
   */
  proxy?: boolean;
}

/** Return type of createPaymentClient. */
export interface PaymentClientResult {
  /** Axios instance with x402 payment interceptor. */
  client: import("axios").AxiosInstance;
  /** Ethers wallet (always set in x402 mode, absent in proxy mode). */
  signer?: import("ethers").Wallet;
  /** Budget guard for tracking spending. */
  budget: BudgetGuard;
}

// ─── Payment Types ──────────────────────────────────────────────

/** x402 PaymentRequired parsed from PAYMENT-REQUIRED header. */
export interface X402PaymentRequired {
  x402Version: string;
  resource: string;
  accepts: Array<{
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
    facilitatorUrl?: string;
    extra?: Record<string, unknown>;
  }>;
}

/** Response from gateway /x402/settle endpoint. */
export interface X402SettleResponse {
  settled: boolean;
  receipt: string;
  txHash?: string;
  error?: string;
}

// ─── Internal Types ─────────────────────────────────────────────

/** Parsed payment requirement from 402 response. */
export interface ParsedPaymentRequirement {
  amount: string;
  payTo: string;
  resource: string;
  facilitatorUrl?: string;
}

/** EIP-712 TransferWithAuthorization struct. */
export interface TransferAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
}

/** x402 payment payload sent to /settle. */
export interface X402PaymentPayload {
  x402Version: string;
  scheme: "exact";
  network: string;
  payload: {
    signature: string;
    authorization: TransferAuthorization;
  };
}

/** x402 payment requirements sent to /settle. */
export interface X402PaymentRequirements {
  scheme: "exact";
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

// ─── Error Types ────────────────────────────────────────────────

/** Custom error class for Gatewards SDK errors. */
export class GatewardsError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GatewardsError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** Error codes used by the SDK. */
export const ErrorCodes = {
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  SIGNING_FAILED: "SIGNING_FAILED",
  SETTLEMENT_FAILED: "SETTLEMENT_FAILED",
  SETTLEMENT_REJECTED: "SETTLEMENT_REJECTED",
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_PRIVATE_KEY: "INVALID_PRIVATE_KEY",
  INVALID_API_KEY: "INVALID_API_KEY",
  MISSING_PAYMENT_METADATA: "MISSING_PAYMENT_METADATA",
} as const;

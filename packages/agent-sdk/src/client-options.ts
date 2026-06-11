/**
 * @module @gatewards/agent-sdk
 * Option-shape validation for createPaymentClient.
 */

import { PaymentClientOptions, GatewardsError, ErrorCodes } from "./types";

/**
 * Every key of PaymentClientOptions. Kept in sync with the interface in
 * types.ts — the Record type below fails to compile if a key is added to
 * the interface without being added here.
 */
const KNOWN_OPTION_KEYS: Record<keyof PaymentClientOptions, true> = {
  gatewayUrl: true,
  apiKey: true,
  privateKey: true,
  rpcUrl: true,
  usdcAddress: true,
  network: true,
  chainId: true,
  budgetPolicy: true,
  axiosConfig: true,
  timeoutMs: true,
  proxy: true,
};

/** Case-insensitive "did you mean" lookup for common misspellings. */
function suggestKey(unknown: string): string | undefined {
  const lower = unknown.toLowerCase();
  return Object.keys(KNOWN_OPTION_KEYS).find(
    (known) =>
      lower.includes(known.toLowerCase()) ||
      known.toLowerCase().includes(lower),
  );
}

/**
 * Rejects unknown option keys instead of silently ignoring them.
 *
 * Without this, a typo like `proxyMode: true` (instead of `proxy: true`)
 * is swallowed, the client never routes through the gateway, and the
 * caller believes governance and dedup are active when every request is
 * actually going straight to the upstream. Failing fast is the only way
 * a JS caller (no excess-property check) ever finds out.
 */
export function rejectUnknownOptions(options: PaymentClientOptions): void {
  const unknown = Object.keys(options).filter(
    (key) => !(key in KNOWN_OPTION_KEYS),
  );
  if (unknown.length === 0) return;

  const hints = unknown
    .map((key) => {
      const suggestion = suggestKey(key);
      return suggestion
        ? `"${key}" (did you mean "${suggestion}"?)`
        : `"${key}"`;
    })
    .join(", ");
  throw new GatewardsError(
    `Unknown option${unknown.length > 1 ? "s" : ""}: ${hints}. ` +
      `Valid options are: ${Object.keys(KNOWN_OPTION_KEYS).join(", ")}`,
    ErrorCodes.INVALID_CONFIG,
  );
}

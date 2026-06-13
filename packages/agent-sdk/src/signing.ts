import axios from "axios";
import { ethers } from "ethers";
import type {
  X402PaymentPayload,
  X402PaymentRequirements,
  TransferAuthorization,
} from "./types";
import { GatewardsError, ErrorCodes } from "./types";
import { extractErrorMessage } from "./validation";
import {
  DEFAULT_TIMEOUT_MS,
  EIP712_TRANSFER_AUTH_TYPES,
  USDC_DOMAIN_NAMES,
  AUTH_GRACE_SECONDS,
  AUTH_EXPIRY_SECONDS,
} from "./constants";

export function buildPayload(
  network: string,
  signature: string,
  authorization: TransferAuthorization,
): X402PaymentPayload {
  return {
    x402Version: "1",
    scheme: "exact",
    network,
    payload: { signature, authorization },
  };
}

export function buildRequirements(
  network: string,
  amount: string,
  asset: string,
  payTo: string,
  resource: string,
): X402PaymentRequirements {
  return {
    scheme: "exact",
    network,
    amount,
    asset,
    payTo,
    maxTimeoutSeconds: AUTH_EXPIRY_SECONDS,
    extra: { resource },
  };
}

export async function signLocally(
  signer: ethers.Wallet,
  chainId: number,
  usdcAddress: string,
  payTo: string,
  amount: string,
): Promise<{
  signature: string;
  authorization: TransferAuthorization;
}> {
  const now = Math.floor(Date.now() / 1000);
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const authorization = {
    from: signer.address,
    to: payTo,
    value: BigInt(amount),
    validAfter: BigInt(now - AUTH_GRACE_SECONDS),
    validBefore: BigInt(now + AUTH_EXPIRY_SECONDS),
    nonce,
  };
  const domain = {
    name: USDC_DOMAIN_NAMES[chainId] || "USD Coin",
    version: "2",
    chainId,
    verifyingContract: usdcAddress,
  };
  let signature: string;
  try {
    signature = await signer.signTypedData(
      domain,
      EIP712_TRANSFER_AUTH_TYPES,
      authorization,
    );
  } catch (err: unknown) {
    throw new GatewardsError(
      `Signing failed: ${extractErrorMessage(err)}`,
      ErrorCodes.SIGNING_FAILED,
    );
  }
  return {
    signature,
    authorization: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value.toString(),
      validAfter: Number(authorization.validAfter),
      validBefore: Number(authorization.validBefore),
      nonce,
    },
  };
}

export async function submitSettlement(
  settleUrl: string,
  payload: X402PaymentPayload,
  requirements: X402PaymentRequirements,
  sdkHeader?: string,
): Promise<{ settled: boolean; receipt?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (sdkHeader) headers["X-Gatewards-SDK"] = sdkHeader;
    const resp = await axios.post(
      `${settleUrl}/x402/settle`,
      { paymentPayload: payload, paymentRequirements: requirements },
      { timeout: DEFAULT_TIMEOUT_MS, headers },
    );
    return resp.data;
  } catch (err: unknown) {
    throw new GatewardsError(
      `Settlement failed: ${extractErrorMessage(err)}`,
      ErrorCodes.SETTLEMENT_FAILED,
    );
  }
}

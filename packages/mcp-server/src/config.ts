export interface McpConfig {
  gatewayUrl: string;
  network: string;
  merchantBaseUrl?: string;
  apiKey?: string;
  privateKey?: string;
  rpcUrl?: string;
  usdcAddress?: string;
}

export function parseArgs(): McpConfig {
  const args = process.argv.slice(2);
  const config: McpConfig = {
    gatewayUrl: process.env.GATEWARDS_GATEWAY_URL || "http://localhost:3001",
    network: process.env.GATEWARDS_NETWORK || "base-sepolia",
    apiKey: process.env.GATEWARDS_API_KEY || undefined,
    privateKey: process.env.GATEWARDS_PRIVATE_KEY || undefined,
    rpcUrl: process.env.GATEWARDS_RPC_URL || undefined,
    usdcAddress: process.env.GATEWARDS_USDC_ADDRESS || undefined,
    merchantBaseUrl: process.env.GATEWARDS_MERCHANT_URL,
  };

  const valueOf = (a: string) => a.slice(a.indexOf("=") + 1);

  for (const arg of args) {
    if (arg.startsWith("--api-key=")) config.apiKey = valueOf(arg);
    else if (arg.startsWith("--gateway=")) config.gatewayUrl = valueOf(arg);
    else if (arg.startsWith("--network=")) config.network = valueOf(arg);
    else if (arg.startsWith("--merchant="))
      config.merchantBaseUrl = valueOf(arg);
    else if (arg.startsWith("--private-key=")) config.privateKey = valueOf(arg);
    else if (arg.startsWith("--rpc-url=")) config.rpcUrl = valueOf(arg);
    else if (arg.startsWith("--usdc-address="))
      config.usdcAddress = valueOf(arg);
  }

  if (!config.apiKey && !config.privateKey) {
    console.error("Error: --api-key or --private-key required");
    process.exit(1);
  }

  return config;
}

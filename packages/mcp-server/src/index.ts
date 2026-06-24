#!/usr/bin/env node

/**
 * @gatewards/mcp-server
 *
 * MCP server that gives any LLM (Claude, Cursor, VS Code, etc.)
 * the ability to discover and pay for APIs through Gatewards's x402 gateway.
 *
 * Usage:
 *   npx @gatewards/mcp-server --api-key=gw_agent_xxx --gateway=https://api.gatewards.com
 *
 * Or in Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "gatewards": {
 *         "command": "npx",
 *         "args": ["@gatewards/mcp-server", "--api-key=gw_agent_xxx", "--gateway=http://localhost:3001"]
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPaymentClient } from "@gatewards/agent-sdk";
import { parseArgs } from "./config";
import { registerTools } from "./tools";

async function main() {
  const config = parseArgs();

  const payment = config.apiKey
    ? createPaymentClient({
        gatewayUrl: config.gatewayUrl,
        apiKey: config.apiKey,
        proxy: true,
        network: config.network,
        axiosConfig: {
          headers: { "X-Gatewards-SDK": "mcp-server/0.2.0-beta.1" },
        },
      })
    : createPaymentClient({
        gatewayUrl: config.gatewayUrl,
        privateKey: config.privateKey!,
        rpcUrl: config.rpcUrl!,
        usdcAddress: config.usdcAddress!,
        network: config.network,
        axiosConfig: {
          headers: { "X-Gatewards-SDK": "mcp-server/0.2.0-beta.1" },
        },
      });

  const server = new McpServer({
    name: "gatewards",
    version: "0.2.0-beta.1",
  });

  registerTools(server, config, payment);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

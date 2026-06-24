# @gatewards/mcp-server

An [MCP](https://modelcontextprotocol.io) server that lets any agent (Claude Desktop, Cursor, VS Code, or your own MCP client) discover and call paid APIs through [Gatewards](https://gatewards.com) — with per-agent spend caps, cross-agent dedup, and non-custodial x402 settlement.

The agent keeps its own API key and wallet. Gatewards enforces the spend limit in the request path: a call over budget is refused before it fires, not logged after.

## Install

```bash
npx @gatewards/mcp-server --api-key=gw_agent_xxx --gateway=https://api.gatewards.com
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gatewards": {
      "command": "npx",
      "args": [
        "@gatewards/mcp-server",
        "--api-key=gw_agent_xxx",
        "--gateway=https://api.gatewards.com"
      ]
    }
  }
}
```

Get an agent key from your [Gatewards dashboard](https://gatewards.com).

## Two modes

| Mode                    | How                                                    | What you get                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proxy** (default)     | `--api-key=gw_agent_xxx`                               | Routes calls through the gateway. Per-agent budget enforcement, response caching, and cross-agent dedup. No wallet, no on-chain payment.                            |
| **x402** (self-custody) | `--private-key=0x... --rpc-url=... --usdc-address=...` | The agent signs USDC payments itself. When an API returns `402`, payment is settled on-chain and the request retries with a receipt. Keys never leave your machine. |

Pick proxy mode for governance and caching. Add x402 only when you actually need to pay per call on-chain.

## Tools

| Tool                          | What it does                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `gatewards_discover_services` | List paid API services on the marketplace (name, endpoint, price).              |
| `gatewards_call_api`          | Make a `GET`/`POST` call. Returns status, data, and cost if a payment was made. |
| `gatewards_check_budget`      | Current daily spend, remaining budget, and active subscriptions.                |
| `gatewards_get_plans`         | List prepaid credit plans for a service.                                        |
| `gatewards_subscribe`         | Buy a credit bundle for a service (proxy mode only).                            |

## Configuration

Flags or environment variables (flags win):

| Flag             | Env                      | Default                 | Notes                                                 |
| ---------------- | ------------------------ | ----------------------- | ----------------------------------------------------- |
| `--gateway`      | `GATEWARDS_GATEWAY_URL`  | `http://localhost:3001` | Gateway base URL.                                     |
| `--api-key`      | `GATEWARDS_API_KEY`      | —                       | Agent key. Enables proxy mode.                        |
| `--private-key`  | `GATEWARDS_PRIVATE_KEY`  | —                       | `0x`-prefixed key for x402 mode. Never sent anywhere. |
| `--rpc-url`      | `GATEWARDS_RPC_URL`      | —                       | Required for x402 mode.                               |
| `--usdc-address` | `GATEWARDS_USDC_ADDRESS` | —                       | Required for x402 mode.                               |
| `--network`      | `GATEWARDS_NETWORK`      | `base-sepolia`          | e.g. `base`, `base-sepolia`.                          |
| `--merchant`     | `GATEWARDS_MERCHANT_URL` | —                       | Restrict absolute URLs to this origin.                |

Either `--api-key` or `--private-key` is required.

## License

Apache-2.0

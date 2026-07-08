# fallanno-mcp

MCP server (stdio) exposing [fallanno-sdk](https://github.com/sjgant80-hub/fallanno-sdk) primitives as Claude Code / Claude Desktop tools.

MIT.

## Tools (9)

| Tool | Purpose |
|---|---|
| `fallanno_identity` | Generate Ed25519 worker identity |
| `fallanno_sign_annotation` | Sign an annotation with a worker private key |
| `fallanno_verify_annotation` | Verify a signed annotation |
| `fallanno_route_payout` | Multi-rail cascade → chosen rail + fees + clearing time |
| `fallanno_price_task` | Task pricing with 70/30 worker split |
| `fallanno_peer_score` | Peer review scoring + Pro-tier promotion eligibility |
| `fallanno_audit_append` | Append hash-linked entry to a named chain |
| `fallanno_audit_verify` | Verify integrity of a named chain |
| `fallanno_portfolio` | Build portable worker portfolio |

## Resources (4)

- `fallanno://comparison` — honest comparison vs DataAnnotation / Scale / Outlier
- `fallanno://rails` — payment rail registry
- `fallanno://tiers` — Free / Pro / Client / Enterprise tiers
- `fallanno://modules` — modules the platform assembles

## Install (Claude Code)

```bash
claude mcp add fallanno -- npx -y @ai-native-solutions/fallanno-mcp
```

Or clone + point Claude Code at the local server:

```bash
git clone https://github.com/sjgant80-hub/fallanno-mcp
cd fallanno-mcp && npm install
claude mcp add fallanno -- node /absolute/path/to/fallanno-mcp/src/index.js
```

## Claude Desktop config

```json
{
  "mcpServers": {
    "fallanno": {
      "command": "npx",
      "args": ["-y", "@ai-native-solutions/fallanno-mcp"]
    }
  }
}
```

## Companions

- [`fallanno-sdk`](https://github.com/sjgant80-hub/fallanno-sdk) — Node SDK
- [`fallanno-api`](https://github.com/sjgant80-hub/fallanno-api) — HTTP wrapper

## License

MIT. Built by [AI Native Solutions](https://ai-nativesolutions.com).

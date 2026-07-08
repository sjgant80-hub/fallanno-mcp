#!/usr/bin/env node
// @ai-native-solutions/fallanno-mcp
// MCP stdio server exposing fallanno-sdk primitives.
// MIT · AI Native Solutions

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  generateIdentity,
  signAnnotation,
  verifyAnnotation,
  createAuditChain,
  appendAudit,
  verifyAuditChain,
  routePayout,
  scorePeerReview,
  priceTask,
  buildPortfolio,
  compareToCompetitors,
  listRails,
  listModules,
  listTiers,
  version,
} from '@ai-native-solutions/fallanno-sdk';

// In-memory chain store keyed by label
const chains = new Map();

const server = new Server(
  { name: 'fallanno-mcp', version },
  { capabilities: { tools: {}, resources: {} } }
);

// ─── Tools ───────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'fallanno_identity',
    description: 'Generate a sovereign Ed25519 annotator identity (worker keypair + workerId).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'fallanno_sign_annotation',
    description: 'Sign an annotation payload with a worker private key. Returns signed envelope with digest + signature.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        workerId: { type: 'string' },
        privateKey: { type: 'string', description: 'Base64 DER PKCS#8 Ed25519 private key from fallanno_identity' },
        payload: { type: 'object' },
      },
      required: ['taskId', 'workerId', 'privateKey', 'payload'],
    },
  },
  {
    name: 'fallanno_verify_annotation',
    description: 'Verify a signed annotation against a worker public key.',
    inputSchema: {
      type: 'object',
      properties: {
        annotation: { type: 'object' },
        publicKey: { type: 'string' },
      },
      required: ['annotation', 'publicKey'],
    },
  },
  {
    name: 'fallanno_route_payout',
    description: 'Route a payout through the multi-rail cascade (wise > stripe > paypal > crypto > invoice). Returns chosen rail + full cascade.',
    inputSchema: {
      type: 'object',
      properties: {
        workerCountry: { type: 'string', description: 'ISO country code, e.g. US, BR, GB' },
        preferredRail: { type: 'string', enum: ['stripe','paypal','wise','crypto','invoice'] },
        blockedRails:  { type: 'array', items: { type: 'string' } },
        amountUsd: { type: 'number' },
      },
      required: ['amountUsd'],
    },
  },
  {
    name: 'fallanno_price_task',
    description: 'Price an annotation task. Returns gross + 70/30 worker/platform split.',
    inputSchema: {
      type: 'object',
      properties: {
        complexity: { type: 'string', enum: ['simple','standard','complex','expert'] },
        turnCount: { type: 'number' },
        tier: { type: 'string', enum: ['free','pro'] },
      },
    },
  },
  {
    name: 'fallanno_peer_score',
    description: 'Score peer reviews. Returns average rating + Pro-tier promotion eligibility.',
    inputSchema: {
      type: 'object',
      properties: {
        votes: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'number' },
              { type: 'object', properties: { stars: { type: 'number' } } },
            ],
          },
        },
      },
      required: ['votes'],
    },
  },
  {
    name: 'fallanno_audit_append',
    description: 'Append an entry to a named audit chain (creates it on first use). Every entry is prevHash-linked.',
    inputSchema: {
      type: 'object',
      properties: {
        chainLabel: { type: 'string' },
        kind: { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['chainLabel', 'kind'],
    },
  },
  {
    name: 'fallanno_audit_verify',
    description: 'Verify integrity of a named audit chain (walks every prevHash + hash).',
    inputSchema: {
      type: 'object',
      properties: { chainLabel: { type: 'string' } },
      required: ['chainLabel'],
    },
  },
  {
    name: 'fallanno_portfolio',
    description: 'Build a portable worker portfolio (totals, domain breakdown, peer score, tier).',
    inputSchema: {
      type: 'object',
      properties: {
        workerId: { type: 'string' },
        annotations: { type: 'array' },
        reviews: { type: 'array' },
      },
      required: ['workerId'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let out;
    switch (name) {
      case 'fallanno_identity':
        out = generateIdentity();
        break;
      case 'fallanno_sign_annotation':
        out = signAnnotation(args);
        break;
      case 'fallanno_verify_annotation':
        out = verifyAnnotation(args);
        break;
      case 'fallanno_route_payout':
        out = routePayout(args);
        break;
      case 'fallanno_price_task':
        out = priceTask(args);
        break;
      case 'fallanno_peer_score':
        out = scorePeerReview(args.votes);
        break;
      case 'fallanno_audit_append': {
        let chain = chains.get(args.chainLabel);
        if (!chain) { chain = createAuditChain(args.chainLabel); chains.set(args.chainLabel, chain); }
        const entry = appendAudit(chain, args.kind, args.payload || {});
        out = { entry, length: chain.entries.length };
        break;
      }
      case 'fallanno_audit_verify': {
        const chain = chains.get(args.chainLabel);
        if (!chain) { out = { valid: false, reason: 'no such chain' }; break; }
        out = verifyAuditChain(chain);
        break;
      }
      case 'fallanno_portfolio':
        out = buildPortfolio(args);
        break;
      default:
        return { isError: true, content: [{ type: 'text', text: 'unknown tool: ' + name }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
  } catch (e) {
    return { isError: true, content: [{ type: 'text', text: 'error: ' + e.message }] };
  }
});

// ─── Resources ───────────────────────────────────────────────────────
const RESOURCES = [
  { uri: 'fallanno://comparison', name: 'Comparison matrix', description: 'Honest comparison vs DataAnnotation / Scale / Outlier', mimeType: 'application/json' },
  { uri: 'fallanno://rails',      name: 'Payment rails',     description: 'Multi-rail payout registry',                mimeType: 'application/json' },
  { uri: 'fallanno://tiers',      name: 'Tier registry',     description: 'Free / Pro / Client / Enterprise',          mimeType: 'application/json' },
  { uri: 'fallanno://modules',    name: 'Estate modules',    description: 'Modules the platform assembles',            mimeType: 'application/json' },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RESOURCES }));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const { uri } = req.params;
  let payload;
  switch (uri) {
    case 'fallanno://comparison': payload = compareToCompetitors(); break;
    case 'fallanno://rails':      payload = listRails();            break;
    case 'fallanno://tiers':      payload = listTiers();            break;
    case 'fallanno://modules':    payload = listModules();          break;
    default: throw new Error('unknown resource: ' + uri);
  }
  return {
    contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) }],
  };
});

// ─── Boot ────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('fallanno-mcp v' + version + ' · ready · ' + TOOLS.length + ' tools · ' + RESOURCES.length + ' resources');

// Phase 2.1 — MCP server entry point
// TODO: Implement server with all tool registrations after Phases 1–6 are complete.
//
// Responsibilities:
//   - Instantiate Server({ name: 'nexus-internal', version: '0.1.0' })
//   - Open TypeDB session on start; close on shutdown
//   - Register all tools via their phase handlers
//   - Load Tool Access Registry into memory at startup (read from dlms/registry/tool-access-registry.md)

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  { name: 'nexus-internal', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

const transport = new StdioServerTransport();
await server.connect(transport);

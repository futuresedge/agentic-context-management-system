// Tier 15B — Agent Roster Tools
// Registers 4 tools: roster.get, roster.list, roster.write, roster.retire
//
// Access control: roster tools are NOT available to all agents.
// Permitted roles are enforced per tool by the MCP Gateway (checkToolAccess).
// See dlms/registry/tool-access-registry.md § Agent Creation & Lifecycle — Tier 15B.
//
// All write operations are atomic: business write + appendAuditEvent() share one
// TypeDB transaction. If either fails, both roll back (client.ts constraint).

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { handleRosterGet, ROSTER_GET_TOOL } from './get.js';
import { handleRosterList, ROSTER_LIST_TOOL } from './list.js';
import { handleRosterWrite, ROSTER_WRITE_TOOL } from './write.js';
import { handleRosterRetire, ROSTER_RETIRE_TOOL } from './retire.js';

export const ROSTER_TOOL_DEFINITIONS: Tool[] = [
  ROSTER_GET_TOOL,
  ROSTER_LIST_TOOL,
  ROSTER_WRITE_TOOL,
  ROSTER_RETIRE_TOOL,
];

const ROSTER_TOOL_NAMES = new Set([
  'roster.get',
  'roster.list',
  'roster.write',
  'roster.retire',
]);

/**
 * Register all roster tools on the MCP server.
 *
 * Call from server.ts after instantiating the Server. This function appends
 * roster tool definitions to the ListTools response and wires the CallTool
 * dispatcher for all roster.* tool names.
 *
 * Usage (server.ts):
 *   import { registerRosterTools } from './tools/roster/index.js';
 *   registerRosterTools(server);
 */
export function registerRosterTools(server: Server): void {
  // ListTools — append roster tool definitions to the capabilities advertised
  // by the server. If multiple modules register ListTools handlers, the last
  // one wins in current MCP SDK v1.x — server.ts must merge all definitions
  // into a single setRequestHandler call. This export pattern provides the
  // definitions array for that merge.
  //
  // TODO (server.ts integration): combine ROSTER_TOOL_DEFINITIONS with other
  // tool definition arrays from other modules in a single setRequestHandler.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ROSTER_TOOL_DEFINITIONS,
  }));

  // CallTool — dispatch to the correct handler for each roster.* tool name.
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!ROSTER_TOOL_NAMES.has(name)) {
      throw new Error(`roster/index: unknown tool "${name}"`);
    }

    switch (name) {
      case 'roster.get':    return handleRosterGet(args);
      case 'roster.list':   return handleRosterList(args);
      case 'roster.write':  return handleRosterWrite(args);
      case 'roster.retire': return handleRosterRetire(args);
      default:
        // Unreachable — ROSTER_TOOL_NAMES guard above catches unknown names.
        throw new Error(`roster/index: unhandled tool "${name}"`);
    }
  });
}

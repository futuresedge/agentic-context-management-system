// Phase 2.4 — MCP Gateway middleware
// TODO: Implement after Tool Access Registry (dlms/registry/tool-access-registry.md) is created.
//
// Responsibilities:
//   - Load Tool Access Registry into memory at server start
//   - Validate every tool call against the registry before the handler executes
//   - On denial: insert audit_event { event_type: tool_access_denied } then throw ToolAccessDeniedError
//   - On success: pass through to tool handler
//
// Note: Denial is audited even though the operation never executed.
//       The attempted call is a recorded fact.

export class ToolAccessDeniedError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly agentRole: string
  ) {
    super(`Tool access denied: ${agentRole} may not call ${toolName}`);
    this.name = 'ToolAccessDeniedError';
  }
}

// checkToolAccess(toolName: string, agentRole: string): void
// Throws ToolAccessDeniedError and appends audit event on denial.
export {};

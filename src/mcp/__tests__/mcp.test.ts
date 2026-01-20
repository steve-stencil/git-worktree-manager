import { describe, it, expect } from 'vitest';

describe('MCP Server', () => {
  it('should export startServer function', async () => {
    const mcp = await import('../index.js');
    expect(typeof mcp.startServer).toBe('function');
  });
});

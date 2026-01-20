import { describe, it, expect } from 'vitest';
import {
  calculatePorts,
  checkPortUsage,
  formatPortAllocation,
  COMMON_DEV_PORTS,
} from '../ports.js';
import { DEFAULT_CONFIG } from '../types.js';

describe('ports', () => {
  describe('calculatePorts', () => {
    it('should return base ports for offset 0', () => {
      const result = calculatePorts(DEFAULT_CONFIG, 0);

      expect(result.apiPort).toBe(4000);
      expect(result.webPort).toBe(5173);
      expect(result.offset).toBe(0);
    });

    it('should add offset to base ports', () => {
      const result = calculatePorts(DEFAULT_CONFIG, 2);

      expect(result.apiPort).toBe(4002);
      expect(result.webPort).toBe(5175);
      expect(result.offset).toBe(2);
    });

    it('should use custom config ports', () => {
      const config = { editorCmd: 'code', baseApiPort: 3000, baseWebPort: 8080 };
      const result = calculatePorts(config, 1);

      expect(result.apiPort).toBe(3001);
      expect(result.webPort).toBe(8081);
    });
  });

  describe('checkPortUsage', () => {
    it('should return inUse: false for unused port', () => {
      // Use a high port that's unlikely to be in use
      const result = checkPortUsage(59999);
      expect(result.inUse).toBe(false);
    });

    // Note: Can't reliably test in-use ports without starting a server
  });

  describe('formatPortAllocation', () => {
    it('should format main ports', () => {
      const result = formatPortAllocation(DEFAULT_CONFIG, 0);

      expect(result.length).toBe(1);
      expect(result[0]).toContain('main');
      expect(result[0]).toContain('4000');
      expect(result[0]).toContain('5173');
    });

    it('should format multiple worktree ports', () => {
      const result = formatPortAllocation(DEFAULT_CONFIG, 2);

      expect(result.length).toBe(3);
      expect(result[1]).toContain('worktree 1');
      expect(result[1]).toContain('4001');
      expect(result[2]).toContain('worktree 2');
      expect(result[2]).toContain('4002');
    });
  });

  describe('COMMON_DEV_PORTS', () => {
    it('should include common ports', () => {
      expect(COMMON_DEV_PORTS).toContain(3000);
      expect(COMMON_DEV_PORTS).toContain(4000);
      expect(COMMON_DEV_PORTS).toContain(5173);
      expect(COMMON_DEV_PORTS).toContain(8080);
    });
  });
});

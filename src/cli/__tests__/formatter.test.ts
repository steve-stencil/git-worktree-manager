import { describe, it, expect } from 'vitest';
import { formatRow } from '../formatter.js';

describe('formatter', () => {
  describe('formatRow', () => {
    it('should pad columns to specified widths', () => {
      const result = formatRow(['Name', 'Value'], [10, 15]);
      expect(result).toBe('Name       Value          ');
    });

    it('should truncate long columns', () => {
      const result = formatRow(['VeryLongName', 'Val'], [5, 5]);
      expect(result).toBe('VeryL Val  ');
    });

    it('should handle empty strings', () => {
      const result = formatRow(['', 'Value'], [5, 10]);
      expect(result).toBe('      Value     ');
    });
  });
});

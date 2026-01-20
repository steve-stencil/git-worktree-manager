import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  parseConfigFile,
  loadProjectConfig,
  loadConfig,
  mergeConfigs,
  GLOBAL_CONFIG_PATH,
  PROJECT_CONFIG_FILENAME,
} from '../config.js';
import { DEFAULT_CONFIG } from '../types.js';
import { ConfigParseError } from '../errors.js';

describe('config', () => {
  describe('parseConfigFile', () => {
    it('should parse simple key=value pairs', () => {
      const content = `EDITOR_CMD=code
BASE_API_PORT=3000
BASE_WEB_PORT=8080`;

      const result = parseConfigFile(content, 'test.config');

      expect(result.editorCmd).toBe('code');
      expect(result.baseApiPort).toBe(3000);
      expect(result.baseWebPort).toBe(8080);
    });

    it('should handle quoted values', () => {
      const content = `EDITOR_CMD="cursor --wait"
BASE_API_PORT='4000'`;

      const result = parseConfigFile(content, 'test.config');

      expect(result.editorCmd).toBe('cursor --wait');
      expect(result.baseApiPort).toBe(4000);
    });

    it('should skip comments and empty lines', () => {
      const content = `# This is a comment
EDITOR_CMD=code

# Another comment
BASE_API_PORT=3000
`;

      const result = parseConfigFile(content, 'test.config');

      expect(result.editorCmd).toBe('code');
      expect(result.baseApiPort).toBe(3000);
    });

    it('should ignore unknown keys', () => {
      const content = `EDITOR_CMD=code
UNKNOWN_KEY=value
ANOTHER_UNKNOWN=123`;

      const result = parseConfigFile(content, 'test.config');

      expect(result.editorCmd).toBe('code');
      expect(Object.keys(result)).toEqual(['editorCmd']);
    });

    it('should throw ConfigParseError for invalid port values', () => {
      const content = `BASE_API_PORT=not-a-number`;

      expect(() => parseConfigFile(content, 'test.config')).toThrow(ConfigParseError);
    });

    it('should throw ConfigParseError for port out of range', () => {
      const content = `BASE_API_PORT=99999`;

      expect(() => parseConfigFile(content, 'test.config')).toThrow(ConfigParseError);
    });

    it('should return empty object for empty content', () => {
      const result = parseConfigFile('', 'test.config');
      expect(result).toEqual({});
    });

    it('should handle shell-style content with only comments', () => {
      const content = `#!/bin/bash
# Configuration file
# No actual config here`;

      const result = parseConfigFile(content, 'test.config');
      expect(result).toEqual({});
    });
  });

  describe('mergeConfigs', () => {
    it('should return defaults when no configs provided', () => {
      const result = mergeConfigs();
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should merge single partial config with defaults', () => {
      const result = mergeConfigs({ editorCmd: 'vim' });

      expect(result.editorCmd).toBe('vim');
      expect(result.baseApiPort).toBe(DEFAULT_CONFIG.baseApiPort);
      expect(result.baseWebPort).toBe(DEFAULT_CONFIG.baseWebPort);
    });

    it('should let later configs override earlier ones', () => {
      const result = mergeConfigs({ editorCmd: 'vim', baseApiPort: 3000 }, { editorCmd: 'code' });

      expect(result.editorCmd).toBe('code');
      expect(result.baseApiPort).toBe(3000);
    });

    it('should handle undefined values in partial configs', () => {
      const result = mergeConfigs(
        { editorCmd: 'vim' },
        { baseApiPort: 4000 },
        { baseWebPort: 5000 }
      );

      expect(result.editorCmd).toBe('vim');
      expect(result.baseApiPort).toBe(4000);
      expect(result.baseWebPort).toBe(5000);
    });
  });

  describe('loadProjectConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'wt-config-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should return empty object when config file does not exist', async () => {
      const result = await loadProjectConfig(tempDir);
      expect(result).toEqual({});
    });

    it('should load config from .wtconfig file', async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(
        configPath,
        `EDITOR_CMD=code
BASE_API_PORT=3000`
      );

      const result = await loadProjectConfig(tempDir);

      expect(result.editorCmd).toBe('code');
      expect(result.baseApiPort).toBe(3000);
    });

    it('should throw ConfigParseError for invalid config', async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, `BASE_API_PORT=invalid`);

      await expect(loadProjectConfig(tempDir)).rejects.toThrow(ConfigParseError);
    });
  });

  describe('loadConfig', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'wt-config-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should return defaults when no config files exist', async () => {
      const result = await loadConfig(tempDir);
      expect(result).toEqual(DEFAULT_CONFIG);
    });

    it('should load and merge project config with defaults', async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, `EDITOR_CMD=code`);

      const result = await loadConfig(tempDir);

      expect(result.editorCmd).toBe('code');
      expect(result.baseApiPort).toBe(DEFAULT_CONFIG.baseApiPort);
    });
  });

  describe('GLOBAL_CONFIG_PATH', () => {
    it('should be in home directory', () => {
      expect(GLOBAL_CONFIG_PATH).toContain('.wtconfig');
    });
  });
});

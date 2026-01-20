import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  detectEnvStructure,
  substitutePortVars,
  copyEnvFile,
  setupEnvironment,
} from '../environment.js';
import { type PortAllocation } from '../types.js';

describe('environment', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wt-env-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('detectEnvStructure', () => {
    it('should return empty array when no env files exist', () => {
      const result = detectEnvStructure(tempDir);
      expect(result).toEqual([]);
    });

    it('should detect root .env file', async () => {
      await writeFile(join(tempDir, '.env'), 'KEY=value');

      const result = detectEnvStructure(tempDir);

      expect(result.length).toBe(1);
      expect(result[0]?.type).toBe('root');
      expect(result[0]?.relativePath).toBe('.env');
    });

    it('should detect monorepo env files', async () => {
      await mkdir(join(tempDir, 'apps/api'), { recursive: true });
      await mkdir(join(tempDir, 'apps/web'), { recursive: true });
      await writeFile(join(tempDir, 'apps/api/.env'), 'API=1');
      await writeFile(join(tempDir, 'apps/web/.env'), 'WEB=1');

      const result = detectEnvStructure(tempDir);

      expect(result.length).toBe(2);
      expect(result.find((f) => f.type === 'api')).toBeDefined();
      expect(result.find((f) => f.type === 'web')).toBeDefined();
    });
  });

  describe('substitutePortVars', () => {
    const ports: PortAllocation = { apiPort: 4001, webPort: 5174, offset: 1 };

    it('should substitute PORT in api env', () => {
      const content = 'PORT=4000\nOTHER=value';
      const result = substitutePortVars(content, 'api', ports);

      expect(result).toContain('PORT=4001');
      expect(result).toContain('OTHER=value');
    });

    it('should substitute APP_URL in api env', () => {
      const content = 'APP_URL=http://localhost:5173';
      const result = substitutePortVars(content, 'api', ports);

      expect(result).toContain('APP_URL=http://localhost:5174');
    });

    it('should substitute VITE_API_BASE in web env', () => {
      const content = 'VITE_API_BASE=http://localhost:4000/api';
      const result = substitutePortVars(content, 'web', ports);

      expect(result).toContain('VITE_API_BASE=http://localhost:4001/api');
    });

    it('should substitute VITE_PORT in web env', () => {
      const content = 'VITE_PORT=5173';
      const result = substitutePortVars(content, 'web', ports);

      expect(result).toContain('VITE_PORT=5174');
    });

    it('should handle root env with all substitutions', () => {
      const content = 'PORT=4000\nVITE_PORT=5173\nVITE_API_BASE=http://localhost:4000/api';
      const result = substitutePortVars(content, 'root', ports);

      expect(result).toContain('PORT=4001');
      expect(result).toContain('VITE_PORT=5174');
    });
  });

  describe('copyEnvFile', () => {
    const ports: PortAllocation = { apiPort: 4001, webPort: 5174, offset: 1 };

    it('should copy and substitute env file', async () => {
      const source = join(tempDir, 'source/.env');
      const target = join(tempDir, 'target/.env');

      await mkdir(join(tempDir, 'source'), { recursive: true });
      await writeFile(source, 'PORT=4000\nSECRET=abc');

      await copyEnvFile(source, target, 'api', ports);

      expect(existsSync(target)).toBe(true);
      const content = await readFile(target, 'utf-8');
      expect(content).toContain('PORT=4001');
      expect(content).toContain('SECRET=abc');
    });

    it('should create target directory if not exists', async () => {
      const source = join(tempDir, 'source/.env');
      const target = join(tempDir, 'deep/nested/target/.env');

      await mkdir(join(tempDir, 'source'), { recursive: true });
      await writeFile(source, 'KEY=value');

      await copyEnvFile(source, target, 'root', ports);

      expect(existsSync(target)).toBe(true);
    });
  });

  describe('setupEnvironment', () => {
    const ports: PortAllocation = { apiPort: 4001, webPort: 5174, offset: 1 };

    it('should return configured: false when no env files', async () => {
      const source = join(tempDir, 'source');
      const target = join(tempDir, 'target');
      await mkdir(source, { recursive: true });
      await mkdir(target, { recursive: true });

      const result = await setupEnvironment(source, target, ports);

      expect(result.configured).toBe(false);
      expect(result.files).toEqual([]);
    });

    it('should copy all detected env files', async () => {
      const source = join(tempDir, 'source');
      const target = join(tempDir, 'target');

      await mkdir(join(source, 'apps/api'), { recursive: true });
      await writeFile(join(source, '.env'), 'ROOT=1');
      await writeFile(join(source, 'apps/api/.env'), 'API=1');

      const result = await setupEnvironment(source, target, ports);

      expect(result.configured).toBe(true);
      expect(result.files).toContain('.env');
      expect(result.files).toContain('apps/api/.env');
      expect(existsSync(join(target, '.env'))).toBe(true);
      expect(existsSync(join(target, 'apps/api/.env'))).toBe(true);
    });
  });
});

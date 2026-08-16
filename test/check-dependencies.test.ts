import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDependencies } from '../scripts/check-dependencies';

const roots: string[] = [];

async function createProject(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'bkper-dependencies-'));
    roots.push(root);
    await writeFile(join(root, 'package-lock.json'), '{}\n');
    return root;
}

afterEach(async () => {
    await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('dependency preflight', () => {
    it('directs developers to install dependencies when node_modules is missing', async () => {
        const root = await createProject();

        const result = checkDependencies({ projectRoot: root });

        expect(result.ok).toBe(false);
        expect(result.message).toContain('npm install');
        expect(result.message).toContain('npm run dev');
    });

    it('rejects an invalid installed dependency tree', async () => {
        const root = await createProject();
        await mkdir(join(root, 'node_modules'));

        const result = checkDependencies({
            projectRoot: root,
            validateInstalledDependencies: () => false,
        });

        expect(result.ok).toBe(false);
    });

    it('accepts a valid installed dependency tree', async () => {
        const root = await createProject();
        await mkdir(join(root, 'node_modules'));

        const result = checkDependencies({
            projectRoot: root,
            validateInstalledDependencies: () => true,
        });

        expect(result).toEqual({ ok: true });
    });
});

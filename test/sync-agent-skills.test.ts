import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { syncAgentSkills } from '../scripts/sync-agent-skills';

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'bkper-agent-skills-'));
    tempRoots.push(root);
    return root;
}

async function writeFixtureFile(root: string, path: string, contents: string): Promise<void> {
    const filePath = join(root, path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
}

afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('syncAgentSkills', () => {
    it('copies both official Web Awesome skills and replaces stale generated copies', async () => {
        const projectRoot = await createTempRoot();
        const packageRoot = join(projectRoot, 'fixture-webawesome');
        const messages: string[] = [];

        await writeFixtureFile(
            packageRoot,
            'dist/skills/webawesome/SKILL.md',
            '# Web Awesome skill\n'
        );
        await writeFixtureFile(
            packageRoot,
            'dist/skills/webawesome-design/SKILL.md',
            '# Web Awesome design skill\n'
        );
        await writeFixtureFile(projectRoot, '.agents/skills/webawesome/stale.txt', 'remove me\n');

        await syncAgentSkills({
            projectRoot,
            packageRoot,
            logger: message => messages.push(message),
        });

        await expect(
            readFile(join(projectRoot, '.agents/skills/webawesome/SKILL.md'), 'utf8')
        ).resolves.toBe('# Web Awesome skill\n');
        await expect(
            readFile(join(projectRoot, '.agents/skills/webawesome-design/SKILL.md'), 'utf8')
        ).resolves.toBe('# Web Awesome design skill\n');
        await expect(
            readFile(join(projectRoot, '.agents/skills/webawesome/stale.txt'), 'utf8')
        ).rejects.toThrow();
        expect(messages.join('\n')).toContain('dist/skills/webawesome');
        expect(messages.join('\n')).toContain('.agents/skills/webawesome-design');
    });
});

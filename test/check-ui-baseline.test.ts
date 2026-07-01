import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkUiBaseline } from '../scripts/check-ui-baseline';

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'bkper-ui-baseline-'));
    tempRoots.push(root);
    return root;
}

async function writeFixtureFile(root: string, path: string, contents: string): Promise<void> {
    const filePath = join(root, path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
}

async function createValidProjectFixture(): Promise<string> {
    const root = await createTempRoot();

    await writeFixtureFile(
        root,
        'client/package.json',
        JSON.stringify({
            dependencies: {
                '@awesome.me/webawesome': 'latest',
                '@bkper/web-design': 'latest',
            },
        })
    );
    await writeFixtureFile(root, '.agents/skills/webawesome/SKILL.md', '# Web Awesome\n');
    await writeFixtureFile(
        root,
        '.agents/skills/webawesome-design/SKILL.md',
        '# Web Awesome design\n'
    );
    await writeFixtureFile(
        root,
        'client/src/styles.css',
        [
            "@import '@awesome.me/webawesome/dist/styles/themes/default.css';",
            "@import '@bkper/web-design';",
        ].join('\n')
    );
    await writeFixtureFile(
        root,
        'client/index.html',
        [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<script src="https://cdn.example/theme-init.global.js"></script>',
            '<script type="module" src="/src/index.ts"></script>',
            '</head>',
            '<body></body>',
            '</html>',
        ].join('\n')
    );
    await writeFixtureFile(
        root,
        'client/src/components/my-app.ts',
        "export const template = '<wa-button>Open</wa-button>';\n"
    );

    return root;
}

afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('checkUiBaseline', () => {
    it('passes a minimal valid app fixture', async () => {
        const root = await createValidProjectFixture();

        await expect(checkUiBaseline(root)).resolves.toEqual([]);
    });

    it('fails with useful guidance when synced skills are missing', async () => {
        const root = await createValidProjectFixture();
        await rm(join(root, '.agents/skills/webawesome-design/SKILL.md'));

        const failures = await checkUiBaseline(root);

        expect(failures.join('\n')).toContain('Missing .agents/skills/webawesome-design/SKILL.md');
        expect(failures.join('\n')).toContain('bun run agent:skills');
    });

    it('fails when the theme init script does not load before the app module', async () => {
        const root = await createValidProjectFixture();
        await writeFixtureFile(
            root,
            'client/index.html',
            [
                '<script type="module" src="/src/index.ts"></script>',
                '<script src="https://cdn.example/theme-init.global.js"></script>',
            ].join('\n')
        );

        const failures = await checkUiBaseline(root);

        expect(failures.join('\n')).toContain(
            'client/index.html must load theme-init.global.js before /src/index.ts'
        );
    });

    it('fails when Web Awesome theme CSS or design tokens are missing', async () => {
        const root = await createValidProjectFixture();
        await writeFixtureFile(root, 'client/src/styles.css', 'body { margin: 0; }\n');

        const failures = await checkUiBaseline(root);

        expect(failures.join('\n')).toContain(
            'client/src/styles.css must import Web Awesome theme CSS'
        );
        expect(failures.join('\n')).toContain(
            'client/src/styles.css must import @bkper/web-design'
        );
    });

    it('fails when client source has no Web Awesome component usage', async () => {
        const root = await createValidProjectFixture();
        await writeFixtureFile(
            root,
            'client/src/components/my-app.ts',
            'export const template = `<p></p>`;\n'
        );

        const failures = await checkUiBaseline(root);

        expect(failures.join('\n')).toContain(
            'client/src must contain at least one Web Awesome component usage (<wa-*)'
        );
    });
});

import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_CLIENT_DEPENDENCIES = ['@awesome.me/webawesome', '@bkper/web-design'] as const;
const REQUIRED_SKILL_FILES = [
    '.agents/skills/webawesome/SKILL.md',
    '.agents/skills/webawesome-design/SKILL.md',
] as const;

function pathFromRoot(value: string | URL | undefined): string {
    if (value instanceof URL) {
        return fileURLToPath(value);
    }

    if (value) {
        return resolve(value);
    }

    return fileURLToPath(new URL('..', import.meta.url));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readTextFile(
    projectRoot: string,
    relativePath: string
): Promise<string | undefined> {
    try {
        return await readFile(join(projectRoot, relativePath), 'utf8');
    } catch {
        return undefined;
    }
}

async function checkClientDependencies(projectRoot: string): Promise<string[]> {
    const packageJson = await readTextFile(projectRoot, 'client/package.json');
    if (!packageJson) {
        return ['Missing client/package.json'];
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(packageJson);
    } catch {
        return ['client/package.json must contain valid JSON'];
    }

    if (!isRecord(parsed)) {
        return ['client/package.json must contain a JSON object'];
    }

    const dependencies = isRecord(parsed.dependencies) ? parsed.dependencies : {};

    return REQUIRED_CLIENT_DEPENDENCIES.flatMap(dependency =>
        typeof dependencies[dependency] === 'string'
            ? []
            : [`Missing client/package.json dependency ${dependency}`]
    );
}

function missingSkillMessage(relativePath: string): string {
    return [
        `Missing ${relativePath}`,
        '',
        'Run:',
        '  bun run agent:skills',
        '',
        'Agents changing UI should load:',
        '  .agents/skills/webawesome/SKILL.md',
        '  .agents/skills/webawesome-design/SKILL.md',
    ].join('\n');
}

async function checkSyncedSkills(projectRoot: string): Promise<string[]> {
    const failures: string[] = [];

    for (const relativePath of REQUIRED_SKILL_FILES) {
        const contents = await readTextFile(projectRoot, relativePath);
        if (contents === undefined) {
            failures.push(missingSkillMessage(relativePath));
        }
    }

    return failures;
}

async function checkStyleImports(projectRoot: string): Promise<string[]> {
    const styles = await readTextFile(projectRoot, 'client/src/styles.css');
    if (styles === undefined) {
        return ['Missing client/src/styles.css'];
    }

    const failures: string[] = [];

    if (!styles.includes('@awesome.me/webawesome/dist/styles/themes/')) {
        failures.push('client/src/styles.css must import Web Awesome theme CSS');
    }

    if (!styles.includes('@bkper/web-design')) {
        failures.push('client/src/styles.css must import @bkper/web-design');
    }

    return failures;
}

function getScriptSources(html: string): string[] {
    const scriptTags = html.matchAll(/<script\b[^>]*>/gi);
    const sources: string[] = [];

    for (const match of scriptTags) {
        const tag = match[0];
        const sourceMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
        const source = sourceMatch?.[1] ?? sourceMatch?.[2] ?? sourceMatch?.[3];

        if (source) {
            sources.push(source);
        }
    }

    return sources;
}

async function checkThemeInitOrder(projectRoot: string): Promise<string[]> {
    const html = await readTextFile(projectRoot, 'client/index.html');
    if (html === undefined) {
        return ['Missing client/index.html'];
    }

    const scriptSources = getScriptSources(html);
    const themeInitIndex = scriptSources.findIndex(source =>
        source.includes('theme-init.global.js')
    );
    const appModuleIndex = scriptSources.findIndex(source => source === '/src/index.ts');

    if (themeInitIndex < 0 || appModuleIndex < 0 || themeInitIndex > appModuleIndex) {
        return ['client/index.html must load theme-init.global.js before /src/index.ts'];
    }

    return [];
}

async function containsWebAwesomeUsage(directory: string): Promise<boolean> {
    let entries: Dirent[];

    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch {
        return false;
    }

    for (const entry of entries) {
        const entryPath = join(directory, entry.name);

        if (entry.isDirectory()) {
            if (await containsWebAwesomeUsage(entryPath)) {
                return true;
            }
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const contents = await readFile(entryPath, 'utf8');
        if (/<wa-[a-z0-9-]+\b/i.test(contents)) {
            return true;
        }
    }

    return false;
}

async function checkWebAwesomeUsage(projectRoot: string): Promise<string[]> {
    const clientSrc = join(projectRoot, 'client/src');

    if (await containsWebAwesomeUsage(clientSrc)) {
        return [];
    }

    return ['client/src must contain at least one Web Awesome component usage (<wa-*)'];
}

export async function checkUiBaseline(projectRootInput?: string | URL): Promise<string[]> {
    const projectRoot = pathFromRoot(projectRootInput);
    const failures = await Promise.all([
        checkClientDependencies(projectRoot),
        checkSyncedSkills(projectRoot),
        checkStyleImports(projectRoot),
        checkThemeInitOrder(projectRoot),
        checkWebAwesomeUsage(projectRoot),
    ]);

    return failures.flat();
}

if (import.meta.main) {
    const failures = await checkUiBaseline();
    if (failures.length > 0) {
        console.error(failures.join('\n\n'));
        process.exit(1);
    }
}

import { access, cp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SyncAgentSkillsOptions {
    projectRoot?: string | URL;
    packageRoot?: string | URL;
    logger?: (message: string) => void;
}

const WEB_AWESOME_SKILLS = ['webawesome', 'webawesome-design'] as const;

function pathFromRoot(value: string | URL | undefined, fallback: URL): string {
    if (value instanceof URL) {
        return fileURLToPath(value);
    }

    if (value) {
        return resolve(value);
    }

    return fileURLToPath(fallback);
}

function formatMissingPackageMessage(clientPackagePath: string, cause: unknown): string {
    const details = cause instanceof Error ? `\n\n${cause.message}` : '';

    return [
        'Unable to resolve @awesome.me/webawesome from the client package context.',
        '',
        `Client package: ${clientPackagePath}`,
        '',
        'Run:',
        '  bun install',
        '',
        'If the package is still missing or stale, refresh it:',
        '  bun update @awesome.me/webawesome',
        details,
    ].join('\n');
}

function resolveWebAwesomePackageRoot(projectRoot: string): string {
    const clientPackagePath = join(projectRoot, 'client/package.json');
    const requireFromClient = createRequire(clientPackagePath);

    try {
        return dirname(requireFromClient.resolve('@awesome.me/webawesome/package.json'));
    } catch (error) {
        throw new Error(formatMissingPackageMessage(clientPackagePath, error));
    }
}

async function assertOfficialSkillsExist(packageRoot: string): Promise<void> {
    const missingSkills: string[] = [];

    for (const skillName of WEB_AWESOME_SKILLS) {
        const skillPath = join(packageRoot, 'dist/skills', skillName);
        const skillReadmePath = join(skillPath, 'SKILL.md');

        try {
            await access(skillReadmePath);
        } catch {
            missingSkills.push(skillPath);
        }
    }

    if (missingSkills.length > 0) {
        throw new Error(
            [
                'Missing official Web Awesome Agent Skill(s):',
                ...missingSkills.map(path => `  ${path}`),
                '',
                'Run:',
                '  bun install',
                '',
                'If the installed package is stale, refresh it:',
                '  bun update @awesome.me/webawesome',
                '',
                'Expected @awesome.me/webawesome to provide:',
                ...WEB_AWESOME_SKILLS.map(skillName => `  dist/skills/${skillName}/SKILL.md`),
            ].join('\n')
        );
    }
}

export async function syncAgentSkills(options: SyncAgentSkillsOptions = {}): Promise<void> {
    const projectRoot = pathFromRoot(options.projectRoot, new URL('..', import.meta.url));
    const packageRoot = pathFromRoot(options.packageRoot, new URL('.', import.meta.url));
    const resolvedPackageRoot = options.packageRoot
        ? packageRoot
        : resolveWebAwesomePackageRoot(projectRoot);
    const logger = options.logger ?? console.log;

    await assertOfficialSkillsExist(resolvedPackageRoot);

    for (const skillName of WEB_AWESOME_SKILLS) {
        const sourcePath = join(resolvedPackageRoot, 'dist/skills', skillName);
        const targetPath = join(projectRoot, '.agents/skills', skillName);

        await rm(targetPath, { recursive: true, force: true });
        await cp(sourcePath, targetPath, { recursive: true });

        logger(`Synced ${sourcePath} -> ${targetPath}`);
    }
}

if (import.meta.main) {
    await syncAgentSkills();
}

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export interface DependencyCheckOptions {
    projectRoot?: string | URL;
    validateInstalledDependencies?: (projectRoot: string) => boolean;
}

export interface DependencyCheckResult {
    ok: boolean;
    message?: string;
}

function pathFromRoot(value: string | URL | undefined): string {
    if (value instanceof URL) {
        return fileURLToPath(value);
    }

    return resolve(value ?? process.cwd());
}

function validateInstalledDependencies(projectRoot: string): boolean {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(npmCommand, ['ls', '--depth=0', '--silent'], {
        cwd: projectRoot,
        stdio: 'ignore',
    });

    return result.status === 0;
}

function setupRequired(): DependencyCheckResult {
    return {
        ok: false,
        message: [
            'Dependencies are missing or out of date.',
            '',
            'Run: npm install',
            'Then: npm run dev',
        ].join('\n'),
    };
}

export function checkDependencies(options: DependencyCheckOptions = {}): DependencyCheckResult {
    const projectRoot = pathFromRoot(options.projectRoot);
    if (!existsSync(resolve(projectRoot, 'node_modules'))) {
        return setupRequired();
    }

    const validate = options.validateInstalledDependencies ?? validateInstalledDependencies;
    return validate(projectRoot) ? { ok: true } : setupRequired();
}

if (import.meta.main) {
    const result = checkDependencies();
    if (!result.ok) {
        console.error(result.message);
        process.exit(1);
    }
}

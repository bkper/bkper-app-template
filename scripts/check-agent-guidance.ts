import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENT_GUIDANCE_MARKERS = [
    '<!-- APP_STANDARDS:START -->',
    '<!-- APP_STANDARDS:END -->',
    '<!-- APP_SPECIFICS:START -->',
    '<!-- APP_SPECIFICS:END -->',
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

export function validateAgentGuidance(contents: string): string[] {
    const lines = contents.split(/\r?\n/).map(line => line.trim());
    const failures: string[] = [];
    const malformedLines = lines.filter(
        line =>
            /<!--.*APP_(?:STANDARDS|SPECIFICS)/.test(line) &&
            !AGENT_GUIDANCE_MARKERS.some(marker => marker === line)
    );

    if (malformedLines.length > 0) {
        failures.push(`Malformed agent guidance marker: ${malformedLines.join(', ')}`);
    }

    const markerIndexes = AGENT_GUIDANCE_MARKERS.map(marker =>
        lines.flatMap((line, index) => (line === marker ? [index] : []))
    );

    for (let index = 0; index < AGENT_GUIDANCE_MARKERS.length; index += 1) {
        if (markerIndexes[index].length !== 1) {
            failures.push(`AGENTS.md must contain exactly one ${AGENT_GUIDANCE_MARKERS[index]}`);
        }
    }

    if (
        markerIndexes.every(indexes => indexes.length === 1) &&
        !markerIndexes.every(
            (indexes, index) => index === 0 || markerIndexes[index - 1][0] < indexes[0]
        )
    ) {
        failures.push(
            `AGENTS.md markers must appear in this order: ${AGENT_GUIDANCE_MARKERS.join(', ')}`
        );
    }

    return failures;
}

export async function checkAgentGuidance(projectRootInput?: string | URL): Promise<string[]> {
    const projectRoot = pathFromRoot(projectRootInput);

    let contents: string;
    try {
        contents = await readFile(resolve(projectRoot, 'AGENTS.md'), 'utf8');
    } catch {
        return ['Missing AGENTS.md'];
    }

    return validateAgentGuidance(contents);
}

if (import.meta.main) {
    const failures = await checkAgentGuidance();
    if (failures.length > 0) {
        console.error(failures.join('\n'));
        process.exit(1);
    }
}

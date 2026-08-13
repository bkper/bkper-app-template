import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkAgentGuidance, validateAgentGuidance } from '../scripts/check-agent-guidance';

const STANDARDS_START = '<!-- APP_STANDARDS:START -->';
const STANDARDS_END = '<!-- APP_STANDARDS:END -->';
const SPECIFICS_START = '<!-- APP_SPECIFICS:START -->';
const SPECIFICS_END = '<!-- APP_SPECIFICS:END -->';
const tempRoots: string[] = [];

function guidance(...markers: string[]): string {
    return markers.join('\n');
}

async function createProject(contents?: string): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'bkper-agent-guidance-'));
    tempRoots.push(root);
    if (contents !== undefined) {
        await writeFile(join(root, 'AGENTS.md'), contents);
    }
    return root;
}

afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('checkAgentGuidance', () => {
    it('accepts flexible section contents when each marker appears once in order', () => {
        const contents = guidance(
            STANDARDS_START,
            '# Team-edited standards',
            STANDARDS_END,
            SPECIFICS_START,
            '# App purpose and decisions',
            SPECIFICS_END
        );

        expect(validateAgentGuidance(contents)).toEqual([]);
    });

    for (const [name, contents] of [
        ['missing markers', guidance(STANDARDS_START, STANDARDS_END, SPECIFICS_START)],
        [
            'duplicate markers',
            guidance(STANDARDS_START, STANDARDS_END, SPECIFICS_START, SPECIFICS_END, SPECIFICS_END),
        ],
        [
            'malformed markers',
            guidance('<!-- APP_STANDARDS:BEGIN -->', STANDARDS_END, SPECIFICS_START, SPECIFICS_END),
        ],
        [
            'nested sections',
            guidance(STANDARDS_START, SPECIFICS_START, STANDARDS_END, SPECIFICS_END),
        ],
        [
            'incorrect section order',
            guidance(SPECIFICS_START, SPECIFICS_END, STANDARDS_START, STANDARDS_END),
        ],
    ] as const) {
        it(`rejects ${name}`, () => {
            expect(validateAgentGuidance(contents)).not.toEqual([]);
        });
    }

    it('reports a missing AGENTS.md as a blocking failure', async () => {
        const root = await createProject();

        await expect(checkAgentGuidance(root)).resolves.toEqual(['Missing AGENTS.md']);
    });

    it('validates the AGENTS.md file at the project root', async () => {
        const root = await createProject(
            guidance(STANDARDS_START, STANDARDS_END, SPECIFICS_START, SPECIFICS_END)
        );

        await expect(checkAgentGuidance(root)).resolves.toEqual([]);
    });
});

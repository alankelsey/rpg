import { parseStoryDraft, type Story } from '../engine';

const MAX_DRAFT_BYTES = 2_000_000;
const NEW_STORY_KEY = 'rpg-new-story-draft-v1';

function key(story: Story): string {
  return `rpg-story-draft-v1:${story.id}:${story.version}`;
}

function matchesSource(draft: Story, source: Story): boolean {
  return draft.id === source.id && draft.version === source.version && draft.schemaVersion === source.schemaVersion && draft.rulesVersion === source.rulesVersion;
}

export function loadStoryDraft(source: Story): { draft?: Story; notice?: string } {
  try {
    const raw = localStorage.getItem(key(source));
    if (!raw) return {};
    if (new TextEncoder().encode(raw).length > MAX_DRAFT_BYTES) throw new Error('Stored draft is too large');
    const draft = parseStoryDraft(JSON.parse(raw));
    if (!matchesSource(draft, source)) throw new Error('Stored draft belongs to another story or version');
    return { draft, notice: 'Saved local draft restored.' };
  } catch {
    return { notice: 'The saved local draft could not be read. The published story was loaded.' };
  }
}

export function saveStoryDraft(source: Story, draft: Story): string | undefined {
  try {
    if (!matchesSource(draft, source)) return 'Draft identity does not match this story version.';
    const raw = JSON.stringify(draft);
    if (new TextEncoder().encode(raw).length > MAX_DRAFT_BYTES) return 'Draft is too large for local saving.';
    localStorage.setItem(key(source), raw);
    return undefined;
  } catch {
    return 'This browser could not save the draft locally.';
  }
}

export async function readStoryDraftFile(file: File, source: Story): Promise<Story> {
  if (file.size > MAX_DRAFT_BYTES) throw new Error('Draft file exceeds the 2 MB limit.');
  let draft: Story;
  try {
    draft = parseStoryDraft(JSON.parse(await file.text()));
  } catch {
    throw new Error('Draft file is not valid story JSON.');
  }
  if (!matchesSource(draft, source)) throw new Error('Draft file is for another story or version.');
  return draft;
}

export function downloadStoryDraft(draft: Story): void {
  const blob = new Blob([`${JSON.stringify(draft, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${draft.id}-draft-v${draft.version}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function loadNewStoryDraft(): { draft?: Story; notice?: string } {
  try {
    const raw = localStorage.getItem(NEW_STORY_KEY);
    if (!raw) return {};
    if (new TextEncoder().encode(raw).length > MAX_DRAFT_BYTES) throw new Error('Stored draft is too large');
    return { draft: parseStoryDraft(JSON.parse(raw)), notice: 'Saved new story draft restored.' };
  } catch {
    return { notice: 'The saved new story draft could not be read. A fresh starter was loaded.' };
  }
}

export function saveNewStoryDraft(draft: Story): string | undefined {
  try {
    const raw = JSON.stringify(draft);
    if (new TextEncoder().encode(raw).length > MAX_DRAFT_BYTES) return 'Draft is too large for local saving.';
    localStorage.setItem(NEW_STORY_KEY, raw);
    return undefined;
  } catch {
    return 'This browser could not save the draft locally.';
  }
}

export async function readNewStoryDraftFile(file: File): Promise<Story> {
  if (file.size > MAX_DRAFT_BYTES) throw new Error('Draft file exceeds the 2 MB limit.');
  try {
    return parseStoryDraft(JSON.parse(await file.text()));
  } catch {
    throw new Error('Draft file is not valid story JSON.');
  }
}

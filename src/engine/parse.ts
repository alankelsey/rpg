import type { Condition, Story } from './types';
import { validateStory } from './validate';
import { ENGINE_LIMITS } from './limits';

export class StoryFormatError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid story data: ${problems.join('; ')}`);
    this.name = 'StoryFormatError';
  }
}

/** Structural boundary for an in-progress draft. Semantic errors remain visible in the editor. */
export function parseStoryDraft(value: unknown): Story {
  const problems: string[] = [];
  const problem = (path: string, message: string) => problems.push(`${path}: ${message}`);
  if (!isRecord(value)) throw new StoryFormatError(['story: must be an object']);

  requireNumber(value, 'schemaVersion', 'schemaVersion', problem);
  requireNumber(value, 'rulesVersion', 'rulesVersion', problem);
  requireString(value, 'id', 'id', problem);
  requireNumber(value, 'version', 'version', problem);
  requireString(value, 'title', 'title', problem);
  requireString(value, 'summary', 'summary', problem);
  requireString(value, 'start', 'start', problem);

  validateDefinitions(value.stats, 'stats', problem, (definition, path) => {
    requireString(definition, 'label', `${path}.label`, problem);
    requireNumber(definition, 'initial', `${path}.initial`, problem);
    optionalNumber(definition, 'min', `${path}.min`, problem);
    optionalNumber(definition, 'max', `${path}.max`, problem);
    optionalBoolean(definition, 'hidden', `${path}.hidden`, problem);
    if (definition.format !== undefined && definition.format !== 'money') problem(`${path}.format`, 'must be "money" when provided');
  });

  if (value.items !== undefined) {
    validateDefinitions(value.items, 'items', problem, (definition, path) => {
      requireString(definition, 'label', `${path}.label`, problem);
      optionalNumber(definition, 'initial', `${path}.initial`, problem);
      optionalNumber(definition, 'max', `${path}.max`, problem);
    });
  }
  if (value.flags !== undefined) validateValueRecord(value.flags, 'flags', problem, (entry, path) => {
    if (typeof entry !== 'boolean') problem(path, 'must be boolean');
  });

  if (!isRecord(value.scenes)) {
    problem('scenes', 'must be an object');
  } else {
    if (Object.keys(value.scenes).length > ENGINE_LIMITS.maxScenes) {
      problem('scenes', `cannot contain more than ${ENGINE_LIMITS.maxScenes} scenes`);
    }
    for (const [sceneId, sceneValue] of Object.entries(value.scenes)) {
      const path = `scenes.${sceneId}`;
      if (!isRecord(sceneValue)) {
        problem(path, 'must be an object');
        continue;
      }
      requireString(sceneValue, 'text', `${path}.text`, problem);
      optionalString(sceneValue, 'title', `${path}.title`, problem);
      if (sceneValue.ending !== undefined) validateEnding(sceneValue.ending, `${path}.ending`, problem);
      if (sceneValue.choices !== undefined) validateChoices(sceneValue.choices, `${path}.choices`, problem);
    }
  }

  if (problems.length > 0) throw new StoryFormatError(problems);
  return structuredClone(value) as unknown as Story;
}

/** Runtime boundary for authored/imported JSON. Returns only data safe for the engine. */
export function parseStory(value: unknown): Story {
  const story = parseStoryDraft(value);
  const semanticErrors = validateStory(story).filter((issue) => issue.level === 'error');
  if (semanticErrors.length > 0) {
    throw new StoryFormatError(semanticErrors.map((issue) => `${issue.at}: ${issue.message}`));
  }
  return story;
}

function validateEnding(value: unknown, path: string, problem: Problem) {
  if (!isRecord(value)) return problem(path, 'must be an object');
  requireString(value, 'id', `${path}.id`, problem);
  requireString(value, 'title', `${path}.title`, problem);
  requireString(value, 'tone', `${path}.tone`, problem);
}

function validateChoices(value: unknown, path: string, problem: Problem) {
  if (!Array.isArray(value)) return problem(path, 'must be an array');
  if (value.length > ENGINE_LIMITS.maxChoicesPerScene) {
    problem(path, `cannot contain more than ${ENGINE_LIMITS.maxChoicesPerScene} choices`);
  }
  value.forEach((choice, index) => {
    const at = `${path}[${index}]`;
    if (!isRecord(choice)) return problem(at, 'must be an object');
    requireString(choice, 'id', `${at}.id`, problem);
    requireString(choice, 'label', `${at}.label`, problem);
    requireString(choice, 'to', `${at}.to`, problem);
    optionalString(choice, 'lockedHint', `${at}.lockedHint`, problem);
    optionalBoolean(choice, 'hideWhenLocked', `${at}.hideWhenLocked`, problem);
    optionalBoolean(choice, 'intentionalLoop', `${at}.intentionalLoop`, problem);
    if (choice.requires !== undefined) {
      if (!Array.isArray(choice.requires)) problem(`${at}.requires`, 'must be an array');
      else choice.requires.forEach((condition, conditionIndex) => validateCondition(condition, `${at}.requires[${conditionIndex}]`, problem, 0));
    }
    if (choice.costs !== undefined) validateNumberRecord(choice.costs, `${at}.costs`, problem);
    if (choice.effects !== undefined) validateEffects(choice.effects, `${at}.effects`, problem);
  });
}

function validateCondition(value: unknown, path: string, problem: Problem, depth: number): value is Condition {
  if (depth > ENGINE_LIMITS.maxConditionDepth) {
    problem(path, `condition nesting exceeds ${ENGINE_LIMITS.maxConditionDepth} levels`);
    return false;
  }
  if (!isRecord(value)) {
    problem(path, 'must be an object');
    return false;
  }
  const kinds = ['stat', 'item', 'flag', 'all', 'any', 'not'].filter((key) => key in value);
  if (kinds.length !== 1) {
    problem(path, 'must contain exactly one of stat, item, flag, all, any, or not');
    return false;
  }
  const kind = kinds[0]!;
  if (kind === 'stat' || kind === 'item') {
    requireString(value, kind, `${path}.${kind}`, problem);
    optionalNumber(value, 'gte', `${path}.gte`, problem);
    optionalNumber(value, 'lte', `${path}.lte`, problem);
  } else if (kind === 'flag') {
    requireString(value, 'flag', `${path}.flag`, problem);
    if (typeof value.is !== 'boolean') problem(`${path}.is`, 'must be boolean');
  } else if (kind === 'not') {
    validateCondition(value.not, `${path}.not`, problem, depth + 1);
  } else {
    const children = value[kind];
    if (!Array.isArray(children)) problem(`${path}.${kind}`, 'must be an array');
    else children.forEach((child, index) => validateCondition(child, `${path}.${kind}[${index}]`, problem, depth + 1));
  }
  return true;
}

function validateEffects(value: unknown, path: string, problem: Problem) {
  if (!isRecord(value)) return problem(path, 'must be an object');
  if (value.stats !== undefined) validateNumberRecord(value.stats, `${path}.stats`, problem);
  if (value.inventory !== undefined) validateNumberRecord(value.inventory, `${path}.inventory`, problem);
  if (value.flags !== undefined) validateValueRecord(value.flags, `${path}.flags`, problem, (entry, at) => {
    if (typeof entry !== 'boolean') problem(at, 'must be boolean');
  });
}

type Problem = (path: string, message: string) => void;

function validateDefinitions(value: unknown, path: string, problem: Problem, validate: (definition: Record<string, unknown>, path: string) => void) {
  validateValueRecord(value, path, problem, (entry, at) => {
    if (!isRecord(entry)) problem(at, 'must be an object');
    else validate(entry, at);
  });
}

function validateNumberRecord(value: unknown, path: string, problem: Problem) {
  validateValueRecord(value, path, problem, (entry, at) => {
    if (typeof entry !== 'number') problem(at, 'must be a number');
  });
}

function validateValueRecord(value: unknown, path: string, problem: Problem, validate: (entry: unknown, path: string) => void) {
  if (!isRecord(value)) return problem(path, 'must be an object');
  for (const [key, entry] of Object.entries(value)) validate(entry, `${path}.${key}`);
}

function requireString(value: Record<string, unknown>, key: string, path: string, problem: Problem) {
  if (typeof value[key] !== 'string') problem(path, 'must be a string');
}

function optionalString(value: Record<string, unknown>, key: string, path: string, problem: Problem) {
  if (value[key] !== undefined && typeof value[key] !== 'string') problem(path, 'must be a string');
}

function requireNumber(value: Record<string, unknown>, key: string, path: string, problem: Problem) {
  if (typeof value[key] !== 'number') problem(path, 'must be a number');
}

function optionalNumber(value: Record<string, unknown>, key: string, path: string, problem: Problem) {
  if (value[key] !== undefined && typeof value[key] !== 'number') problem(path, 'must be a number');
}

function optionalBoolean(value: Record<string, unknown>, key: string, path: string, problem: Problem) {
  if (value[key] !== undefined && typeof value[key] !== 'boolean') problem(path, 'must be boolean');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

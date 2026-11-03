/** Contract limits keep authored content, replay, and future server verification bounded. */
export const ENGINE_LIMITS = {
  maxScenes: 1_000,
  maxChoicesPerScene: 100,
  maxSceneTextLength: 50_000,
  maxLabelLength: 500,
  maxHistoryLength: 10_000,
  maxConditionDepth: 20,
} as const;

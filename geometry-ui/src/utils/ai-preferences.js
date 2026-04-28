import { reactive } from 'vue';

const STORAGE_KEY = 'geometric-ai-preferences-v3';

const defaults = {
  preferAdvancedModel: true,
  advancedLabel: '高级模型优先',
  fallbackLabel: '源码模型优先'
};

function readStoredState() {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      preferAdvancedModel: parsed.preferAdvancedModel !== false
    };
  } catch {
    return { ...defaults };
  }
}

export const aiPreferences = reactive(readStoredState());

function persist() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ preferAdvancedModel: !!aiPreferences.preferAdvancedModel })
  );
}

export function setPreferAdvancedModel(value) {
  aiPreferences.preferAdvancedModel = !!value;
  persist();
}

export function togglePreferAdvancedModel() {
  setPreferAdvancedModel(!aiPreferences.preferAdvancedModel);
}

export function createAiPreferencePayload(extra = {}) {
  return {
    preferAdvancedModel: !!aiPreferences.preferAdvancedModel,
    ...extra
  };
}

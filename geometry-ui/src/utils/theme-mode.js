import { computed, reactive } from 'vue';

const STORAGE_KEY = 'geometry-ui-theme-mode-v1';
const DISMISS_KEY = 'geometry-ui-theme-suggestion-v1';

function inferModeByHour(date = new Date()) {
  const hour = date.getHours();
  return hour >= 19 || hour < 6 ? 'night' : 'day';
}

function reasonForMode(mode, hour) {
  if (mode === 'night') {
    if (hour >= 22 || hour < 5) return '现在已经比较晚了，夜晚模式会更护眼。';
    return '外部环境偏暗时，夜晚模式更适合长时间盯着函数图像。';
  }
  if (hour >= 6 && hour < 11) return '现在是白天，切回白天模式会更清爽。';
  if (hour >= 11 && hour < 18) return '白天模式更像纸面坐标系，适合做推导和比对。';
  return '当前时段更适合白天模式。';
}

function modeLabel(mode) {
  return mode === 'night' ? '夜晚模式' : '白天模式';
}

export const themeState = reactive({
  mode: 'night',
  ready: false,
  suggestionVisible: false,
  suggestedMode: 'night',
  suggestionReason: '',
  hour: 0
});

export const isNightMode = computed(() => themeState.mode === 'night');
export const themeLabel = computed(() => modeLabel(themeState.mode));
export const suggestedThemeLabel = computed(() => modeLabel(themeState.suggestedMode));

function syncDomTheme(mode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
  document.body?.setAttribute('data-theme', mode);
}

export function setThemeMode(mode) {
  const nextMode = mode === 'day' ? 'day' : 'night';
  themeState.mode = nextMode;
  syncDomTheme(nextMode);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  }
}

export function toggleThemeMode() {
  setThemeMode(themeState.mode === 'night' ? 'day' : 'night');
}

export function dismissThemeSuggestion() {
  themeState.suggestionVisible = false;
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  window.localStorage.setItem(DISMISS_KEY, `${today}:${themeState.suggestedMode}`);
}

export function acceptSuggestedTheme() {
  setThemeMode(themeState.suggestedMode);
  themeState.suggestionVisible = false;
}

export function refreshThemeSuggestion() {
  const now = new Date();
  const suggested = inferModeByHour(now);
  const hour = now.getHours();
  themeState.hour = hour;
  themeState.suggestedMode = suggested;
  themeState.suggestionReason = reasonForMode(suggested, hour);

  if (typeof window === 'undefined') {
    themeState.suggestionVisible = false;
    return;
  }

  const today = now.toISOString().slice(0, 10);
  const dismissed = window.localStorage.getItem(DISMISS_KEY);
  themeState.suggestionVisible = themeState.mode !== suggested && dismissed !== `${today}:${suggested}`;
}

export function initThemeMode() {
  const inferred = inferModeByHour();
  let initialMode = inferred;

  if (typeof window !== 'undefined') {
    initialMode = window.localStorage.getItem(STORAGE_KEY) || inferred;
  }

  setThemeMode(initialMode);
  themeState.ready = true;
  refreshThemeSuggestion();
}

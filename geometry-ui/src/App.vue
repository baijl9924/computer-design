<template>
  <div class="app-shell" :class="{ 'immersive-shell': isImmersiveRoute }" :style="appThemeStyle">
    <template v-if="!isImmersiveRoute">
      <div class="background-layer"></div>
      <div class="background-glow glow-a"></div>
      <div class="background-glow glow-b"></div>

      <header class="app-header">
        <div class="header-inner">
          <section class="brand-panel">
            <div class="brand-chip">
              <iconify-icon icon="mdi:function-variant" />
              <span>Geometry Lab</span>
              <small>v2.0</small>
            </div>
            <h1>智能函数实验与学习辅助平台</h1>
            <p class="brand-summary">
              函数实验台、函数星图与 AI 错题本现在拆分为独立页面；
              AI 学习状态检测作为全局侧边侧工具，可在任意页面随时使用。
            </p>
            <div class="feature-row">
              <span class="feature-pill">
                <iconify-icon icon="mdi:chart-line-variant" />
                独立页面导航
              </span>
              <span class="feature-pill">
                <iconify-icon icon="mdi:relation-many-to-many" />
                页面之间保持联动
              </span>
              <span class="feature-pill">
                <iconify-icon icon="mdi:camera-wireless-outline" />
                全局学习状态侧边栏
              </span>
            </div>
          </section>

          <section class="control-panel">
            <div class="account-card">
              <GlobalAccountDock />
            </div>

            <div class="control-card">
              <div class="control-header">
                <span class="control-label">主题模式</span>
                <span class="control-badge">{{ themeLabel }}</span>
              </div>
              <button class="switch-btn" type="button" @click="toggleThemeMode">
                <span class="switch-track" :class="{ active: themeState.mode === 'night' }">
                  <span class="switch-thumb" :class="{ active: themeState.mode === 'night' }">
                    <iconify-icon :icon="themeState.mode === 'night' ? 'mdi:weather-night' : 'mdi:white-balance-sunny'" />
                  </span>
                  <span class="switch-copy">
                    {{ themeState.mode === 'night' ? '切换到白天模式' : '切换到夜间模式' }}
                  </span>
                </span>
              </button>
            </div>

            <div class="control-card">
              <div class="control-header">
                <span class="control-label">AI 引擎</span>
                <span class="control-badge accent">
                  {{ aiPreferences.preferAdvancedModel ? '高级' : '标准' }}
                </span>
              </div>
              <button class="model-btn" type="button" @click="togglePreferAdvancedModel">
                <div class="model-icon">
                  <iconify-icon :icon="aiPreferences.preferAdvancedModel ? 'mdi:rocket-launch-outline' : 'mdi:shield-check-outline'" />
                </div>
                <div class="model-copy">
                  <strong>{{ aiPreferences.preferAdvancedModel ? aiPreferences.advancedLabel : aiPreferences.fallbackLabel }}</strong>
                  <span>{{ aiPreferences.preferAdvancedModel ? '更适合高质量分析' : '更均衡的速度与成本' }}</span>
                </div>
                <iconify-icon icon="mdi:swap-horizontal" class="model-arrow" />
              </button>
            </div>
          </section>
        </div>

        <div class="nav-wrap">
          <PageTabs
            :model-value="activePage"
            :tabs="tabs"
            @update:modelValue="handleTabChange"
          />
        </div>

        <transition name="banner-slide">
          <div v-if="themeState.suggestionVisible" class="suggestion-banner">
            <div class="banner-copy">
              <strong>{{ suggestedThemeLabel }}模式推荐</strong>
              <span>{{ themeState.suggestionReason }}</span>
            </div>
            <div class="banner-actions">
              <button type="button" class="banner-btn primary" @click="acceptSuggestedTheme">立即切换</button>
              <button type="button" class="banner-btn ghost" @click="dismissThemeSuggestion">稍后</button>
            </div>
          </div>
        </transition>
      </header>

      <main class="content-main">
        <RouterView v-slot="{ Component, route: currentRoute }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" :key="currentRoute.fullPath" />
          </transition>
        </RouterView>
      </main>

      <footer class="app-footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <iconify-icon icon="mdi:function-variant" />
            <span>Geometry Lab</span>
          </div>
          <p class="footer-copy">
            将函数实验、知识图谱和 AI 纠错拆成清晰页面，同时保留统一账号、主题和检测能力。
          </p>
        </div>
      </footer>

      <LearningStatusDock />
    </template>

    <main v-else class="content-main immersive-main">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" :key="currentRoute.fullPath" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import GlobalAccountDock from './components/GlobalAccountDock.vue';
import LearningStatusDock from './components/LearningStatusDock.vue';
import PageTabs from './components/PageTabs.vue';
import { aiPreferences, togglePreferAdvancedModel } from './utils/ai-preferences';
import {
  acceptSuggestedTheme,
  dismissThemeSuggestion,
  initThemeMode,
  suggestedThemeLabel,
  themeLabel,
  themeState,
  toggleThemeMode
} from './utils/theme-mode';
import { mediaLibrary } from './utils/media-library';

const router = useRouter();
const route = useRoute();

const tabs = [
  { key: 'workbench', label: '函数实验台', icon: 'mdi:chart-line-variant' },
  { key: 'starfield', label: '函数星图', icon: 'mdi:star-four-points-outline' },
  { key: 'error-book', label: 'AI 错题本', icon: 'mdi:book-education-outline' }
];

tabs.splice(1, 0, { key: 'workbench-3d', label: '3D 坐标', icon: 'mdi:cube-outline' });

const activePage = computed(() => {
  const name = typeof route.name === 'string' ? route.name : '';
  return tabs.some((item) => item.key === name) ? name : 'workbench';
});
const isImmersiveRoute = computed(() => activePage.value === 'starfield');

const appThemeStyle = computed(() => ({
  '--app-backdrop': `url(${themeState.mode === 'night' ? mediaLibrary.appBackdropNight : mediaLibrary.appBackdropDay})`,
  '--header-backdrop': `url(${themeState.mode === 'night' ? mediaLibrary.appHeaderNight : mediaLibrary.appHeaderDay})`
}));

async function enterBrowserFullscreen() {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement || !document.documentElement?.requestFullscreen) return;
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    // Ignore browsers that block fullscreen without an eligible gesture.
  }
}

async function exitBrowserFullscreen() {
  if (typeof document === 'undefined') return;
  if (!document.fullscreenElement || !document.exitFullscreen) return;
  try {
    await document.exitFullscreen();
  } catch {
    // Ignore fullscreen exit failures.
  }
}

function handleTabChange(key) {
  if (key === activePage.value) return;
  if (key === 'starfield') {
    enterBrowserFullscreen();
  } else if (activePage.value === 'starfield') {
    exitBrowserFullscreen();
  }
  router.push({ name: key });
}

onMounted(() => {
  initThemeMode();
});

watch(isImmersiveRoute, (value, previous) => {
  if (!value && previous) {
    exitBrowserFullscreen();
  }
});
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

:global(iconify-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:global(:root),
:global(html[data-theme='night']) {
  --bg-primary: #07101d;
  --bg-secondary: rgba(10, 18, 32, 0.88);
  --bg-card: rgba(11, 19, 34, 0.84);
  --bg-soft: rgba(255, 255, 255, 0.05);
  --bg-glass: rgba(255, 255, 255, 0.06);
  --text-primary: #eef2ff;
  --text-secondary: #9da9c7;
  --text-muted: #667391;
  --border-light: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  --accent-primary: #ff7a30;
  --accent-secondary: #24d2b0;
  --accent-soft: rgba(255, 122, 48, 0.14);
  --surface-2: rgba(255, 255, 255, 0.05);
  --surface-3: rgba(255, 255, 255, 0.04);
  --line: rgba(255, 255, 255, 0.08);
  --text: #eef2ff;
  --muted: #95a1bf;
  --bg: #07101d;
}

:global(html[data-theme='day']) {
  --bg-primary: #edf3f7;
  --bg-secondary: rgba(255, 255, 255, 0.88);
  --bg-card: rgba(255, 255, 255, 0.92);
  --bg-soft: rgba(12, 122, 101, 0.06);
  --bg-glass: rgba(255, 255, 255, 0.68);
  --text-primary: #172334;
  --text-secondary: #55637a;
  --text-muted: #8a97ab;
  --border-light: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(12, 122, 101, 0.18);
  --accent-primary: #0d8a73;
  --accent-secondary: #e5661a;
  --accent-soft: rgba(12, 122, 101, 0.12);
  --surface-2: rgba(255, 255, 255, 0.9);
  --surface-3: rgba(246, 248, 251, 0.96);
  --line: rgba(15, 23, 42, 0.08);
  --text: #172334;
  --muted: #64748b;
  --bg: #edf3f7;
}

.app-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.immersive-shell {
  background: #02050c;
}

.background-layer {
  position: fixed;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(7, 16, 29, 0.2), rgba(7, 16, 29, 0.72)),
    var(--app-backdrop) center / cover no-repeat;
  opacity: 0.18;
  pointer-events: none;
}

.background-glow {
  position: fixed;
  border-radius: 50%;
  filter: blur(72px);
  pointer-events: none;
  opacity: 0.5;
}

.glow-a {
  width: 360px;
  height: 360px;
  background: rgba(255, 122, 48, 0.16);
  top: -80px;
  left: -60px;
}

.glow-b {
  width: 320px;
  height: 320px;
  background: rgba(36, 210, 176, 0.14);
  right: -80px;
  bottom: 120px;
}

.app-header,
.content-main,
.app-footer {
  position: relative;
  z-index: 1;
}

.app-header {
  padding: 28px 28px 20px;
}

.header-inner {
  max-width: 1480px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 420px);
  gap: 24px;
  padding: 28px;
  border-radius: 32px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
    var(--header-backdrop) center / cover no-repeat;
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.18);
}

.brand-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand-chip {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--bg-glass);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  font-weight: 700;
}

.brand-chip small {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.brand-panel h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 52px);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.brand-summary {
  margin: 0;
  max-width: 760px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.feature-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.feature-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--bg-soft);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.account-card,
.control-card {
  padding: 16px;
  border-radius: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.14);
}

.control-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-size: 14px;
  font-weight: 700;
}

.control-badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.control-badge.accent {
  color: var(--accent-primary);
}

.switch-btn,
.model-btn,
.banner-btn {
  border: none;
  font: inherit;
  cursor: pointer;
}

.switch-btn,
.model-btn {
  width: 100%;
  background: transparent;
  padding: 0;
}

.switch-track,
.model-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--border-light);
  background: var(--bg-soft);
  transition: transform 0.24s ease, border-color 0.24s ease;
}

.switch-track.active,
.model-btn:hover,
.switch-btn:hover .switch-track {
  transform: translateY(-1px);
  border-color: var(--border-strong);
}

.switch-thumb,
.model-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--accent-primary), #ffb06d);
  color: #fff;
  font-size: 20px;
}

.switch-thumb.active {
  background: linear-gradient(135deg, #6f7cff, #9b8cff);
}

.switch-copy {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.model-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.model-copy strong {
  font-size: 14px;
  color: var(--text-primary);
}

.model-copy span {
  font-size: 12px;
  color: var(--text-secondary);
}

.model-arrow {
  color: var(--text-muted);
  font-size: 18px;
}

.nav-wrap {
  max-width: 1480px;
  margin: 18px auto 0;
}

.suggestion-banner {
  max-width: 1480px;
  margin: 12px auto 0;
  padding: 16px 18px;
  border-radius: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, var(--accent-primary), #ffb06d);
  color: #fff;
  box-shadow: 0 18px 32px rgba(255, 122, 48, 0.24);
}

.banner-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.banner-copy strong {
  font-size: 15px;
}

.banner-copy span {
  font-size: 13px;
  opacity: 0.92;
}

.banner-actions {
  display: flex;
  gap: 10px;
}

.banner-btn {
  padding: 10px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.banner-btn.primary {
  background: #fff;
  color: var(--accent-primary);
}

.banner-btn.ghost {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.content-main {
  max-width: 1480px;
  margin: 0 auto;
  padding: 8px 28px 32px;
}

.immersive-main {
  max-width: none;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}

.app-footer {
  padding: 8px 28px 28px;
}

.footer-inner {
  max-width: 1480px;
  margin: 0 auto;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  border-radius: 22px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  backdrop-filter: blur(14px);
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 800;
}

.footer-copy {
  margin: 0;
  max-width: 780px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.page-fade-enter-active,
.page-fade-leave-active,
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.28s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 1120px) {
  .header-inner {
    grid-template-columns: 1fr;
  }

  .control-panel {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .app-header,
  .content-main,
  .app-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .header-inner {
    padding: 18px;
  }

  .control-panel {
    display: flex;
  }

  .suggestion-banner,
  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .banner-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .banner-btn {
    flex: 1 1 0;
  }
}
</style>

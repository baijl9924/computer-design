<template>
  <div ref="dockRef" class="account-dock">
    <button
      type="button"
      class="account-trigger"
      :class="{ authenticated: isAuthenticated, open: panelOpen }"
      @click="togglePanel"
    >
      <span class="trigger-avatar">
        {{ avatarInitial }}
      </span>
      <span class="trigger-copy">
        <strong>{{ triggerTitle }}</strong>
        <span>{{ triggerDescription }}</span>
      </span>
      <span class="trigger-pill">{{ isAuthenticated ? '已登录' : '入口' }}</span>
      <iconify-icon class="trigger-chevron" :icon="panelOpen ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'" />
    </button>

    <transition name="popover-fade">
      <div v-if="panelOpen" class="account-popover">
        <div class="popover-header">
          <div class="popover-badge">
            <iconify-icon icon="solar:user-id-bold" />
            <span>账号入口</span>
          </div>
          <p>
            全部功能都可以直接使用。登录后，错题分析会自动归档到你的账号，不再压住下面的主题卡片。
          </p>
        </div>

        <div v-if="isAuthenticated" class="popover-profile">
          <div class="profile-line">
            <strong>{{ authState.user?.display_name || authState.user?.username }}</strong>
            <span>当前已登录</span>
          </div>
          <p>账号：{{ authState.user?.username }}</p>
          <p v-if="authState.user?.student_no">学号：{{ authState.user?.student_no }}</p>
        </div>

        <div class="popover-actions">
          <a v-if="!isAuthenticated" class="action-link primary" :href="loginHref">
            <span class="action-main">
              <iconify-icon icon="solar:login-2-bold" />
              <span>前往登录页</span>
            </span>
            <iconify-icon class="action-arrow" icon="solar:alt-arrow-right-linear" />
          </a>

          <a v-if="!isAuthenticated" class="action-link secondary" :href="registerHref">
            <span class="action-main">
              <iconify-icon icon="solar:user-plus-bold" />
              <span>前往注册页</span>
            </span>
            <iconify-icon class="action-arrow" icon="solar:alt-arrow-right-linear" />
          </a>

          <a v-if="isAuthenticated" class="action-link primary" :href="registerHref">
            <span class="action-main">
              <iconify-icon icon="solar:shield-user-bold" />
              <span>切换 / 新建账号</span>
            </span>
            <iconify-icon class="action-arrow" icon="solar:alt-arrow-right-linear" />
          </a>

          <button v-if="isAuthenticated" type="button" class="action-link danger" @click="handleLogout">
            <span class="action-main">
              <iconify-icon icon="solar:logout-2-bold" />
              <span>退出登录</span>
            </span>
            <iconify-icon class="action-arrow" icon="solar:alt-arrow-right-linear" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { authState, initializeAuth, isAuthenticated, logoutAccount } from '../utils/account-api';

const dockRef = ref(null);
const panelOpen = ref(false);

const avatarInitial = computed(() => {
  const source = authState.user?.display_name || authState.user?.username || '登';
  return source.slice(0, 1).toUpperCase();
});

const triggerTitle = computed(() => (
  isAuthenticated.value
    ? (authState.user?.display_name || authState.user?.username || '账号中心')
    : '登录 / 注册'
));

const triggerDescription = computed(() => (
  isAuthenticated.value
    ? '错题记录正在同步到当前账号'
    : '使用独立 login.html / register.html 页面'
));

const redirectTarget = computed(() => encodeURIComponent(window.location.pathname || '/'));
const loginHref = computed(() => `/login.html?redirect=${redirectTarget.value}`);
const registerHref = computed(() => `/register.html?redirect=${redirectTarget.value}`);

function togglePanel() {
  panelOpen.value = !panelOpen.value;
}

function handleLogout() {
  logoutAccount();
  panelOpen.value = false;
}

function handlePointerDown(event) {
  if (!panelOpen.value) return;
  if (dockRef.value?.contains(event.target)) return;
  panelOpen.value = false;
}

onMounted(() => {
  initializeAuth();
  document.addEventListener('pointerdown', handlePointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown);
});
</script>

<style scoped>
.account-dock {
  width: 100%;
  display: flex;
  flex-direction: column;
  --dock-panel-bg: var(--bg-card);
  --dock-panel-line: var(--border-light);
  --dock-soft-bg: var(--bg-tertiary);
  --dock-soft-line: var(--border-light);
  --dock-text: var(--text-primary);
  --dock-muted: var(--text-secondary);
  --dock-pill-bg: rgba(255, 255, 255, 0.08);
  --dock-accent-soft: var(--accent-secondary-dim);
  --dock-accent-text: var(--accent-secondary);
  --dock-danger-bg: rgba(255, 107, 107, 0.12);
  --dock-danger-text: #ffb6b6;
}

.account-trigger {
  width: 100%;
  border: 1px solid var(--dock-panel-line);
  border-radius: 22px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--dock-panel-bg) 94%, white 6%), color-mix(in srgb, var(--dock-panel-bg) 98%, transparent));
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--dock-text);
  cursor: pointer;
  text-align: left;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
  box-shadow: var(--shadow-md);
}

.account-trigger:hover,
.account-trigger.open {
  transform: translateY(-2px);
  border-color: rgba(255, 122, 48, 0.26);
  box-shadow: var(--shadow-lg);
}

.account-trigger.authenticated {
  border-color: rgba(36, 210, 176, 0.28);
}

.trigger-avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 122, 48, 0.2), rgba(36, 210, 176, 0.22));
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  flex-shrink: 0;
}

.trigger-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trigger-copy strong {
  font-size: 15px;
  font-weight: 700;
  color: var(--dock-text);
}

.trigger-copy span {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dock-muted);
  overflow-wrap: anywhere;
}

.trigger-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--dock-pill-bg);
  color: var(--dock-muted);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.account-trigger.authenticated .trigger-pill {
  background: rgba(36, 210, 176, 0.14);
  color: #82e8d4;
}

.trigger-chevron {
  width: 18px;
  height: 18px;
  color: var(--dock-muted);
  flex-shrink: 0;
}

.account-popover {
  width: 100%;
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 22px;
  background: color-mix(in srgb, var(--dock-panel-bg) 96%, transparent);
  border: 1px solid var(--dock-panel-line);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(18px);
}

.popover-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popover-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--dock-accent-soft);
  color: var(--dock-accent-text);
  font-size: 12px;
  font-weight: 700;
  width: fit-content;
}

.popover-header p,
.popover-profile p {
  margin: 0;
  color: var(--dock-muted);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.popover-profile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--dock-soft-bg) 86%, transparent);
  border: 1px solid var(--dock-soft-line);
}

.profile-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.profile-line strong {
  font-size: 15px;
  color: var(--dock-text);
}

.profile-line span {
  font-size: 12px;
  color: #7fe4cf;
  font-weight: 700;
}

.popover-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-link {
  width: 100%;
  border: none;
  border-radius: 16px;
  padding: 14px 16px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.24s ease, box-shadow 0.24s ease, opacity 0.24s ease;
  font-family: inherit;
  text-align: left;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
}

.action-link:hover {
  transform: translateY(-1px);
}

.action-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.action-main span:last-child {
  overflow-wrap: anywhere;
}

.action-arrow {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.8;
}

.action-link.primary {
  background: linear-gradient(135deg, #ff7a30, #ffb86b);
  color: #fff;
}

.action-link.secondary {
  background: color-mix(in srgb, var(--dock-soft-bg) 92%, transparent);
  color: var(--dock-text);
  border: 1px solid var(--dock-soft-line);
}

.action-link.danger {
  background: var(--dock-danger-bg);
  color: var(--dock-danger-text);
  border: 1px solid color-mix(in srgb, var(--dock-danger-text) 22%, transparent);
}

.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: all 0.24s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 640px) {
  .account-trigger {
    padding: 12px 14px;
    gap: 12px;
  }

  .trigger-pill {
    display: none;
  }

  .profile-line {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

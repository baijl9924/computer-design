<template>
  <section class="account-panel">
    <div class="panel-head">
      <div>
        <div class="panel-badge">
          <iconify-icon icon="solar:user-id-bold"></iconify-icon>
          <span>账号管理系统</span>
        </div>
        <h3>{{ isAuthenticated ? '当前登录同学' : '先登录，再把错题记到自己的账号里' }}</h3>
        <p>
          {{
            isAuthenticated
              ? '当前账号下的 AI 错题分析会自动归档，后续可随时回看。'
              : '支持注册学生账号，登录后每次 AI 错题分析都会自动保存到个人错题本。'
          }}
        </p>
      </div>
      <div class="service-chip">
        <span>账户服务</span>
        <code>{{ accountApiBase }}</code>
      </div>
    </div>

    <div v-if="isAuthenticated" class="profile-card">
      <div class="profile-main">
        <div class="avatar-circle">
          {{ userInitial }}
        </div>
        <div class="profile-text">
          <div class="profile-name-row">
            <strong>{{ authState.user?.display_name || authState.user?.username }}</strong>
            <span class="status-pill">已登录</span>
          </div>
          <p>账号：{{ authState.user?.username }}</p>
          <p v-if="authState.user?.student_no">学号：{{ authState.user.student_no }}</p>
          <p>注册时间：{{ formatDate(authState.user?.created_at) }}</p>
          <p>最近登录：{{ formatDate(authState.user?.last_login_at) }}</p>
        </div>
      </div>
      <div class="profile-actions">
        <button class="ghost-btn" type="button" @click="handleRefresh">
          <iconify-icon icon="solar:refresh-bold"></iconify-icon>
          <span>刷新资料</span>
        </button>
        <button class="danger-btn" type="button" @click="handleLogout">
          <iconify-icon icon="solar:logout-2-bold"></iconify-icon>
          <span>退出登录</span>
        </button>
      </div>
    </div>

    <div v-else class="auth-card">
      <div class="auth-tabs">
        <button type="button" :class="['tab-btn', { active: mode === 'login' }]" @click="mode = 'login'">登录</button>
        <button type="button" :class="['tab-btn', { active: mode === 'register' }]" @click="mode = 'register'">注册</button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-grid" :class="{ register: mode === 'register' }">
          <label class="field" v-if="mode === 'register'">
            <span>姓名</span>
            <input v-model.trim="form.displayName" type="text" maxlength="32" placeholder="例如：张小明" />
          </label>
          <label class="field" v-if="mode === 'register'">
            <span>学号（可选）</span>
            <input v-model.trim="form.studentNo" type="text" maxlength="32" placeholder="例如：20260001" />
          </label>
          <label class="field">
            <span>账号</span>
            <input v-model.trim="form.username" type="text" maxlength="32" placeholder="3-32 位，字母/数字/._-" />
          </label>
          <label class="field">
            <span>密码</span>
            <input v-model="form.password" type="password" maxlength="128" placeholder="至少 6 位密码" />
          </label>
          <label class="field" v-if="mode === 'register'">
            <span>确认密码</span>
            <input v-model="form.confirmPassword" type="password" maxlength="128" placeholder="再次输入密码" />
          </label>
        </div>

        <div class="form-hint">
          <iconify-icon icon="solar:shield-check-bold"></iconify-icon>
          <span>默认使用数据库持久化保存账号和错题，切换数据库时前端无需改动。</span>
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting || authState.loading">
          <iconify-icon :icon="submitting || authState.loading ? 'solar:refresh-circle-bold' : mode === 'login' ? 'solar:login-2-bold' : 'solar:user-plus-bold'"></iconify-icon>
          <span>{{ submitText }}</span>
        </button>
      </form>
    </div>

    <transition name="fade-slide">
      <div v-if="feedbackMessage" class="feedback success">{{ feedbackMessage }}</div>
    </transition>
    <transition name="fade-slide">
      <div v-if="authState.error" class="feedback error">{{ authState.error }}</div>
    </transition>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import {
  accountApiBase,
  authState,
  initializeAuth,
  isAuthenticated,
  loginAccount,
  logoutAccount,
  refreshProfile,
  registerAccount
} from '../utils/account-api';

const emit = defineEmits(['authenticated', 'logout']);

const mode = ref('login');
const submitting = ref(false);
const feedbackMessage = ref('');
const form = reactive({
  displayName: '',
  studentNo: '',
  username: '',
  password: '',
  confirmPassword: ''
});

const userInitial = computed(() => {
  const source = authState.user?.display_name || authState.user?.username || '同';
  return source.slice(0, 1).toUpperCase();
});

const submitText = computed(() => {
  if (submitting.value || authState.loading) {
    return mode.value === 'login' ? '正在登录...' : '正在注册...';
  }
  return mode.value === 'login' ? '登录账号' : '注册并登录';
});

function resetForm() {
  form.displayName = '';
  form.studentNo = '';
  form.username = '';
  form.password = '';
  form.confirmPassword = '';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { hour12: false });
}

async function handleSubmit() {
  feedbackMessage.value = '';
  authState.error = '';

  if (!form.username || !form.password) {
    authState.error = '请输入账号和密码。';
    return;
  }

  if (mode.value === 'register') {
    if (!form.displayName) {
      authState.error = '注册时请填写姓名。';
      return;
    }
    if (form.password !== form.confirmPassword) {
      authState.error = '两次输入的密码不一致。';
      return;
    }
  }

  submitting.value = true;
  try {
    if (mode.value === 'login') {
      await loginAccount({
        username: form.username,
        password: form.password
      });
      feedbackMessage.value = '登录成功，接下来分析的错题会自动保存到你的账号。';
    } else {
      await registerAccount({
        display_name: form.displayName,
        student_no: form.studentNo || null,
        username: form.username,
        password: form.password
      });
      feedbackMessage.value = '账号创建成功，已自动登录。';
    }

    resetForm();
    emit('authenticated', authState.user);
  } catch {
    // authState.error is already set in the store.
  } finally {
    submitting.value = false;
  }
}

async function handleRefresh() {
  feedbackMessage.value = '';
  authState.error = '';
  submitting.value = true;
  try {
    await refreshProfile();
    feedbackMessage.value = '账号信息已刷新。';
    emit('authenticated', authState.user);
  } catch (error) {
    authState.error = error.message;
  } finally {
    submitting.value = false;
  }
}

function handleLogout() {
  logoutAccount();
  feedbackMessage.value = '已退出当前账号。';
  emit('logout');
}

onMounted(() => {
  initializeAuth();
});
</script>

<style scoped>
.account-panel {
  background: rgba(13, 17, 32, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  padding: 24px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.24);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(36, 210, 176, 0.12);
  color: #7ee8d3;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.panel-badge iconify-icon {
  width: 16px;
  height: 16px;
}

.panel-head h3 {
  margin: 0 0 8px;
  font-size: 24px;
  color: var(--text-primary);
}

.panel-head p {
  margin: 0;
  max-width: 680px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.service-chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 240px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.service-chip span {
  font-size: 12px;
  color: var(--text-muted);
}

.service-chip code {
  font-size: 12px;
  color: #24d2b0;
  word-break: break-all;
}

.profile-card,
.auth-card {
  display: grid;
  gap: 18px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.profile-card {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 18px;
}

.avatar-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 122, 48, 0.22), rgba(36, 210, 176, 0.24));
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  box-shadow: 0 12px 28px rgba(255, 122, 48, 0.16);
}

.profile-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.profile-name-row strong {
  font-size: 22px;
  color: var(--text-primary);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.16);
  color: #68e48a;
  font-size: 12px;
  font-weight: 700;
}

.profile-text p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.profile-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.auth-tabs {
  display: inline-flex;
  padding: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  width: fit-content;
}

.tab-btn {
  min-width: 96px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.24s ease;
}

.tab-btn.active {
  background: linear-gradient(135deg, #ff7a30, #ffb86b);
  color: white;
  box-shadow: 0 8px 18px rgba(255, 122, 48, 0.24);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-grid.register .field:last-child {
  grid-column: span 2;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field input {
  height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(7, 10, 20, 0.78);
  color: var(--text-primary);
  padding: 0 14px;
  font-size: 14px;
  transition: border-color 0.24s ease, box-shadow 0.24s ease;
}

.field input:focus {
  outline: none;
  border-color: rgba(255, 122, 48, 0.55);
  box-shadow: 0 0 0 3px rgba(255, 122, 48, 0.12);
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(36, 210, 176, 0.08);
  border: 1px solid rgba(36, 210, 176, 0.18);
  color: #72dec9;
  font-size: 13px;
}

.form-hint iconify-icon {
  width: 18px;
  height: 18px;
}

.submit-btn,
.ghost-btn,
.danger-btn {
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.24s ease, box-shadow 0.24s ease, opacity 0.24s ease;
}

.submit-btn {
  background: linear-gradient(135deg, #ff7a30, #ffb86b);
  color: white;
  width: fit-content;
  min-width: 140px;
  box-shadow: 0 10px 20px rgba(255, 122, 48, 0.22);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.danger-btn {
  background: rgba(255, 122, 122, 0.15);
  color: #ffb0b0;
}

.submit-btn:hover,
.ghost-btn:hover,
.danger-btn:hover {
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.feedback {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
}

.feedback.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.22);
  color: #7be49a;
}

.feedback.error {
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.22);
  color: #ffb4b4;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.24s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 900px) {
  .profile-card {
    grid-template-columns: 1fr;
  }

  .profile-actions {
    justify-content: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid.register .field:last-child {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .account-panel {
    padding: 18px;
  }

  .panel-head h3 {
    font-size: 20px;
  }

  .profile-main {
    align-items: flex-start;
  }

  .profile-name-row strong {
    font-size: 18px;
  }
}
</style>

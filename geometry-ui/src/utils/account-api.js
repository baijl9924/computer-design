import { computed, reactive } from 'vue';

const STORAGE_KEY = 'geometry-lab-account-session-v1';
export const accountApiBase = (import.meta.env.VITE_ACCOUNT_API_BASE || '/account-service').replace(/\/$/, '');

function readStoredSession() {
  if (typeof window === 'undefined') {
    return { token: '', user: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { token: '', user: null };
    }
    const parsed = JSON.parse(raw);
    return {
      token: typeof parsed?.token === 'string' ? parsed.token : '',
      user: parsed?.user || null
    };
  } catch {
    return { token: '', user: null };
  }
}

function persistSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: authState.token,
      user: authState.user
    })
  );
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

const stored = readStoredSession();

export const authState = reactive({
  token: stored.token,
  user: stored.user,
  initialized: false,
  initializing: false,
  loading: false,
  error: '',
  lastMessage: ''
});

export const isAuthenticated = computed(() => !!authState.token && !!authState.user);

function applySession(data) {
  authState.token = data?.access_token || '';
  authState.user = data?.user || null;
  authState.error = '';
  persistSession();
}

function clearSession() {
  authState.token = '';
  authState.user = null;
  clearStoredSession();
}

function buildHeaders(extraHeaders = {}, auth = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  if (auth && authState.token) {
    headers.Authorization = `Bearer ${authState.token}`;
  }
  return headers;
}

async function request(path, options = {}, { auth = false } = {}) {
  const response = await fetch(`${accountApiBase}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}, auth)
  });

  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data === 'object' && data?.detail) ||
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'string' && data) ||
      `请求失败（HTTP ${response.status}）`;
    throw new Error(message);
  }

  return data;
}

export async function initializeAuth() {
  if (authState.initialized || authState.initializing) {
    return authState.user;
  }

  if (!authState.token) {
    authState.initialized = true;
    return null;
  }

  authState.initializing = true;
  try {
    const user = await request('/api/auth/me', {}, { auth: true });
    authState.user = user;
    authState.error = '';
    persistSession();
    return user;
  } catch (error) {
    clearSession();
    authState.error = error.message;
    return null;
  } finally {
    authState.initializing = false;
    authState.initialized = true;
  }
}

export async function refreshProfile() {
  const user = await request('/api/auth/me', {}, { auth: true });
  authState.user = user;
  authState.error = '';
  persistSession();
  return user;
}

export async function registerAccount(payload) {
  authState.loading = true;
  authState.error = '';
  try {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    applySession(data);
    authState.lastMessage = '注册成功，已自动登录。';
    return data.user;
  } catch (error) {
    authState.error = error.message;
    throw error;
  } finally {
    authState.loading = false;
  }
}

export async function loginAccount(payload) {
  authState.loading = true;
  authState.error = '';
  try {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    applySession(data);
    authState.lastMessage = '登录成功。';
    return data.user;
  } catch (error) {
    authState.error = error.message;
    throw error;
  } finally {
    authState.loading = false;
  }
}

export function logoutAccount() {
  clearSession();
  authState.error = '';
  authState.lastMessage = '已退出当前账号。';
}

export async function fetchErrorBookRecords({ limit = 20, offset = 0 } = {}) {
  return request(`/api/error-book/records?limit=${limit}&offset=${offset}`, {}, { auth: true });
}

export async function fetchErrorBookRecord(recordId) {
  return request(`/api/error-book/records/${recordId}`, {}, { auth: true });
}

export async function createErrorBookRecord(payload) {
  return request('/api/error-book/records', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export async function deleteErrorBookRecord(recordId) {
  return request(`/api/error-book/records/${recordId}`, {
    method: 'DELETE'
  }, { auth: true });
}

export async function fetchFunctionPlanets() {
  return request('/api/function-planets', {}, { auth: true });
}

export async function createFunctionPlanet(payload) {
  return request('/api/function-planets', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export async function updateFunctionPlanet(planetId, payload) {
  return request(`/api/function-planets/${planetId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }, { auth: true });
}

export async function deleteFunctionPlanet(planetId) {
  return request(`/api/function-planets/${planetId}`, {
    method: 'DELETE'
  }, { auth: true });
}

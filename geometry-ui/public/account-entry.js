(function () {
  const STORAGE_KEY = 'geometry-lab-account-session-v1';
  const ACCOUNT_API_BASE = '/account-service';

  function $(id) {
    return document.getElementById(id);
  }

  function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || '/';
    return redirect.startsWith('/') ? redirect : '/';
  }

  async function request(path, payload) {
    const response = await fetch(`${ACCOUNT_API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
        (typeof data === 'object' && data && (data.detail || data.message)) ||
        (typeof data === 'string' && data) ||
        `请求失败（HTTP ${response.status}）`;
      throw new Error(message);
    }

    return data;
  }

  function persistSession(data) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: data?.access_token || '',
        user: data?.user || null
      })
    );
  }

  function readSession() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function clearSession() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function setStatus(type, message) {
    const box = $('statusBox');
    if (!box) return;
    box.className = `status-box show ${type}`;
    box.textContent = message;
  }

  function clearStatus() {
    const box = $('statusBox');
    if (!box) return;
    box.className = 'status-box';
    box.textContent = '';
  }

  function updateRedirectNote() {
    const note = $('redirectNote');
    if (!note) return;
    note.textContent = `登录成功后将返回：${decodeURIComponent(getRedirectTarget())}`;
  }

  function updateCrossLinks() {
    const redirect = encodeURIComponent(getRedirectTarget());
    document.querySelectorAll('a[href="/login.html"]').forEach((link) => {
      link.href = `/login.html?redirect=${redirect}`;
    });
    document.querySelectorAll('a[href="/register.html"]').forEach((link) => {
      link.href = `/register.html?redirect=${redirect}`;
    });
  }

  function updateSessionCard() {
    const card = $('sessionCard');
    if (!card) return;

    const session = readSession();
    if (!session?.token || !session?.user) {
      card.className = 'session-card';
      return;
    }

    card.className = 'session-card show';
    $('sessionTitle').textContent = `${session.user.display_name || session.user.username} 已处于登录状态`;
    $('sessionText').textContent = '你可以直接返回主应用，也可以继续切换账号。';
  }

  function redirectBack(delay) {
    const target = getRedirectTarget();
    window.setTimeout(() => {
      window.location.href = target;
    }, delay);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    clearStatus();

    const submitButton = $('submitButton');
    submitButton.disabled = true;
    submitButton.textContent = '正在登录...';

    try {
      const data = await request('/api/auth/login', {
        username: $('username').value.trim(),
        password: $('password').value
      });
      persistSession(data);
      updateSessionCard();
      setStatus('success', '登录成功，正在返回主应用...');
      redirectBack(900);
    } catch (error) {
      setStatus('error', error.message);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = '登录账号';
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    clearStatus();

    const password = $('password').value;
    const confirmPassword = $('confirmPassword').value;
    if (password !== confirmPassword) {
      setStatus('error', '两次输入的密码不一致。');
      return;
    }

    const submitButton = $('submitButton');
    submitButton.disabled = true;
    submitButton.textContent = '正在注册...';

    try {
      const data = await request('/api/auth/register', {
        display_name: $('displayName').value.trim(),
        student_no: $('studentNo').value.trim() || null,
        username: $('username').value.trim(),
        password
      });
      persistSession(data);
      updateSessionCard();
      setStatus('success', '注册成功，已自动登录，正在返回主应用...');
      redirectBack(1100);
    } catch (error) {
      setStatus('error', error.message);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = '注册并登录';
    }
  }

  function bindCommonActions() {
    const logoutButton = $('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        clearSession();
        updateSessionCard();
        setStatus('success', '当前浏览器登录态已清除。');
      });
    }
  }

  function init() {
    updateRedirectNote();
    updateCrossLinks();
    updateSessionCard();
    bindCommonActions();

    const pageType = document.body.dataset.page;
    const form = $('accountForm');
    if (!form) return;

    if (pageType === 'login') {
      form.addEventListener('submit', handleLoginSubmit);
    }

    if (pageType === 'register') {
      form.addEventListener('submit', handleRegisterSubmit);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

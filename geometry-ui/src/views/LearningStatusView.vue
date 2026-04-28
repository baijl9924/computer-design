<template>
  <section class="page-shell">
    <!-- Hero 区域 - 更清晰简洁 -->
    <div class="hero-card" :style="{ '--hero-image': `url(${learningHero})` }">
      <div class="hero-left">
        <div class="hero-badge">
          <iconify-icon icon="solar:eye-bold"></iconify-icon>
          <span>AI 学习陪伴助手</span>
        </div>
        <h2>看懂你的学习状态</h2>
        <p>开启摄像头，AI 会识别你是专注、分心还是离开，并给出温和的学习建议。</p>
      </div>
      <div class="hero-right">
        <label class="toggle-switch">
          <input type="checkbox" v-model="enabled" />
          <span class="switch-slider"></span>
          <span class="switch-label">启用检测</span>
        </label>
        <div class="api-status">
          <span class="status-dot" :class="{ online: enabled }"></span>
          <span>{{ yoloApiBase }}</span>
        </div>
      </div>
    </div>

    <div class="dashboard">
      <!-- 左侧：输入区 -->
      <div class="card input-card">
        <div class="card-head">
          <div class="card-title">
            <iconify-icon icon="solar:video-frame-bold"></iconify-icon>
            <h3>画面输入</h3>
          </div>
          <span class="card-tag">实时 / 图片</span>
        </div>

        <div class="media-view">
          <video ref="videoRef" autoplay playsinline muted v-show="cameraActive"></video>
          <img v-if="!cameraActive && uploadedImage" :src="uploadedImage" alt="预览" />
          <div v-if="!cameraActive && !uploadedImage" class="media-placeholder">
            <img :src="learningPlaceholder" alt="" class="placeholder-bg" />
            <div class="placeholder-content">
              <iconify-icon icon="solar:camera-add-bold"></iconify-icon>
              <strong>等待画面输入</strong>
              <span>开启摄像头或上传图片</span>
            </div>
          </div>
        </div>

        <p class="media-status">{{ previewCaption }}</p>

        <div class="button-group">
          <button class="btn btn-primary" :disabled="!enabled" @click="toggleCamera">
            <iconify-icon :icon="cameraActive ? 'solar:camera-off-bold' : 'solar:camera-bold'"></iconify-icon>
            {{ cameraActive ? '关闭' : '开启摄像头' }}
          </button>
          <button class="btn btn-secondary" :disabled="!enabled || (!cameraActive && !uploadedImage) || detecting" @click="analyzeCurrentFrame">
            <iconify-icon :icon="detecting ? 'svg-spinners:180-ring' : 'solar:magic-stick-3-bold'"></iconify-icon>
            {{ detecting ? '分析中' : '分析状态' }}
          </button>
          <label class="btn btn-upload" :class="{ disabled: !enabled }">
            <iconify-icon icon="solar:gallery-bold"></iconify-icon>
            上传
            <input type="file" accept="image/*" :disabled="!enabled" @change="handleImageUpload" />
          </label>
          <button class="btn btn-icon" :disabled="!uploadedImage && !cameraActive" @click="resetSource">
            <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
          </button>
        </div>

        <div class="info-hint">
          <iconify-icon icon="solar:info-circle-bold"></iconify-icon>
          <span>建议使用 Chrome 或 Edge，在 HTTPS / localhost 下获得最佳体验</span>
        </div>
      </div>

      <!-- 右侧：结果区 -->
      <div class="card result-card">
        <div class="card-head">
          <div class="card-title">
            <iconify-icon icon="solar:graph-new-bold"></iconify-icon>
            <h3>分析结果</h3>
          </div>
          <span class="card-tag">YOLO + AI</span>
        </div>

        <!-- 状态卡片 -->
        <div class="state-card" :class="statusClass">
          <iconify-icon :icon="stateIcon" class="state-icon"></iconify-icon>
          <div class="state-info">
            <span class="state-label">当前状态</span>
            <strong class="state-value">{{ result.learningState || '等待检测' }}</strong>
          </div>
        </div>

        <!-- 指标 -->
        <div class="metrics">
          <div class="metric">
            <span class="metric-label">置信度</span>
            <strong class="metric-number">{{ confidenceText }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">判断依据</span>
            <strong class="metric-text">{{ evidenceText }}</strong>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="detecting" class="loading-area">
          <div class="loading-spinner"></div>
          <div class="loading-message">
            <p class="loading-quote">{{ currentLoadingQuote }}</p>
            <p class="loading-detail">{{ loadingDetail }}</p>
          </div>
        </div>

        <!-- 可视化预览 -->
        <div class="section" v-if="result.previewImage || result.sourcePreview">
          <div class="section-title">
            <iconify-icon icon="solar:gallery-view-bold"></iconify-icon>
            <h4>检测可视化</h4>
          </div>
          <div class="preview-container">
            <img :src="result.previewImage || result.sourcePreview" alt="检测结果" />
            <span class="preview-badge">YOLO 检测框</span>
          </div>
        </div>

        <!-- 识别目标 -->
        <div class="section" v-if="result.detectedObjects?.length">
          <div class="section-title">
            <iconify-icon icon="solar:tag-bold"></iconify-icon>
            <h4>识别到</h4>
          </div>
          <div class="tag-list">
            <span v-for="item in result.detectedObjects" :key="item" class="tag">{{ item }}</span>
          </div>
        </div>

        <!-- AI 解读 -->
        <div class="section">
          <div class="section-title">
            <iconify-icon icon="solar:chat-round-like-bold"></iconify-icon>
            <h4>AI 解读</h4>
            <span v-if="detecting" class="badge-stream">实时生成</span>
          </div>
          <div class="ai-content" v-html="cleanAnalysisHtml || defaultAiMessage"></div>
        </div>

        <!-- 检测明细 -->
        <div class="section" v-if="result.detections?.length">
          <div class="section-title">
            <iconify-icon icon="solar:list-bold"></iconify-icon>
            <h4>检测明细</h4>
          </div>
          <div class="detail-list">
            <div v-for="item in result.detections" :key="`${item.label}-${item.x1}`" class="detail-row">
              <span class="detail-name">{{ item.label }}</span>
              <span class="detail-conf">{{ formatPercent(item.confidence) }}</span>
              <span class="detail-pos">{{ formatBox(item) }}</span>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="error-message">
          <iconify-icon icon="solar:danger-triangle-bold"></iconify-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- 底部说明 -->
        <div class="footer-note">
          <iconify-icon icon="solar:info-circle-bold"></iconify-icon>
          <span>检测结果仅供参考，帮助了解学习状态</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { aiPreferences, createAiPreferencePayload } from '../utils/ai-preferences';
import { mediaLibrary } from '../utils/media-library';

const yoloApiBase = (import.meta.env.VITE_YOLO_API_BASE || '/yolo-service').replace(/\/$/, '');
const learningHero = mediaLibrary.learningHero;
const learningPlaceholder = mediaLibrary.learningPlaceholder;

// ========== 响应式状态 ==========
const enabled = ref(false);
const videoRef = ref(null);
const cameraActive = ref(false);
const mediaStream = ref(null);
const uploadedImage = ref('');
const detecting = ref(false);
const errorMessage = ref('');
const analysisHtml = ref('');
const loadingDetail = ref('准备连接检测服务');

const loadingQuotes = [
  '👀 先看清画面，再分析状态',
  '🎯 正在定位关键特征',
  '🤖 AI 正在组织语言',
  '📊 综合判断学习状态',
  '✨ 马上就有结果了'
];
const currentLoadingQuote = ref(loadingQuotes[0]);
let loadingQuoteTimer = null;

const result = ref({
  learningState: '',
  confidence: 0,
  evidence: '',
  detectedObjects: [],
  detections: [],
  previewImage: '',
  sourcePreview: '',
  usedModel: ''
});

// ========== 计算属性 ==========
const stateIcon = computed(() => {
  const s = result.value.learningState;
  if (s?.includes('专注')) return 'solar:smile-circle-bold';
  if (s?.includes('分心')) return 'solar:sleeping-circle-bold';
  if (s?.includes('离开')) return 'solar:user-block-bold';
  return 'solar:question-circle-bold';
});

const statusClass = computed(() => {
  const s = result.value.learningState;
  if (s?.includes('专注')) return 'status-focus';
  if (s?.includes('分心')) return 'status-distracted';
  if (s?.includes('离开')) return 'status-away';
  return 'status-neutral';
});

const confidenceText = computed(() => {
  if (!result.value.confidence) return '—';
  return `${Math.round(result.value.confidence * 100)}%`;
});

const evidenceText = computed(() => result.value.evidence || '—');

const cleanAnalysisHtml = computed(() => {
  return String(analysisHtml.value || '')
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
});

const defaultAiMessage = '<p class="placeholder-msg">点击「分析状态」，AI 会告诉你当前的学习状态和改善建议。</p>';

const previewCaption = computed(() => {
  if (cameraActive.value) return '📷 实时摄像头画面';
  if (uploadedImage.value) return '🖼️ 已上传图片';
  return '⏳ 等待输入画面';
});

// ========== 工具函数 ==========
function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatBox(item) {
  return `${Math.round(item.x1 || 0)}-${Math.round(item.x2 || 0)}px`;
}

function startLoadingQuotes() {
  stopLoadingQuotes();
  let idx = 0;
  currentLoadingQuote.value = loadingQuotes[idx];
  loadingQuoteTimer = setInterval(() => {
    idx = (idx + 1) % loadingQuotes.length;
    currentLoadingQuote.value = loadingQuotes[idx];
  }, 2200);
}

function stopLoadingQuotes() {
  if (loadingQuoteTimer) clearInterval(loadingQuoteTimer);
}

// ========== 摄像头控制 ==========
watch(enabled, (val) => {
  if (!val) stopCamera();
});

async function toggleCamera() {
  errorMessage.value = '';
  if (!enabled.value) return;

  if (cameraActive.value) {
    stopCamera();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    errorMessage.value = '当前浏览器不支持摄像头';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    mediaStream.value = stream;
    uploadedImage.value = '';
    if (videoRef.value) videoRef.value.srcObject = stream;
    cameraActive.value = true;
  } catch (err) {
    errorMessage.value = `无法打开摄像头：${err.message}`;
  }
}

function stopCamera() {
  mediaStream.value?.getTracks?.().forEach(t => t.stop());
  mediaStream.value = null;
  cameraActive.value = false;
  if (videoRef.value) videoRef.value.srcObject = null;
}

function resetSource() {
  stopCamera();
  uploadedImage.value = '';
  errorMessage.value = '';
  analysisHtml.value = '';
  result.value = {
    learningState: '',
    confidence: 0,
    evidence: '',
    detectedObjects: [],
    detections: [],
    previewImage: '',
    sourcePreview: '',
    usedModel: ''
  };
}

function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  stopCamera();
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImage.value = e.target?.result || '';
  };
  reader.readAsDataURL(file);
}

function captureFrame() {
  if (cameraActive.value && videoRef.value) {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.value.videoWidth || 960;
    canvas.height = videoRef.value.videoHeight || 540;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.value, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }
  return uploadedImage.value;
}

// ========== API 调用 ==========
function parseSSE(raw) {
  const event = { type: 'message', data: '' };
  raw.split('\n').forEach(line => {
    if (line.startsWith('event:')) event.type = line.slice(6).trim();
    if (line.startsWith('data:')) event.data += line.slice(5).trim();
  });
  return event;
}

function updateResult(data, imgBase64) {
  result.value = {
    learningState: data.learningState ?? result.value.learningState ?? '未识别',
    confidence: data.confidence ?? result.value.confidence ?? 0,
    evidence: data.evidence ?? result.value.evidence ?? '',
    detectedObjects: data.detectedObjects ?? result.value.detectedObjects ?? [],
    detections: data.detections ?? result.value.detections ?? [],
    previewImage: data.previewImage ?? result.value.previewImage ?? '',
    sourcePreview: data.sourcePreview ?? imgBase64 ?? result.value.sourcePreview ?? '',
    usedModel: data.usedModel ?? result.value.usedModel ?? ''
  };
}

async function analyzeCurrentFrame() {
  if (!enabled.value) return;

  const imgBase64 = captureFrame();
  if (!imgBase64) {
    errorMessage.value = '请先开启摄像头或上传图片';
    return;
  }

  detecting.value = true;
  errorMessage.value = '';
  analysisHtml.value = '';
  loadingDetail.value = '正在识别画面内容';
  startLoadingQuotes();

  try {
    const res = await fetch(`${yoloApiBase}/api/learning-state-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createAiPreferencePayload({ imageBase64: imgBase64 }))
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const ev = parseSSE(chunk);
        if (!ev.data) continue;
        if (ev.type === 'status') {
          loadingDetail.value = ev.data;
        } else if (ev.type === 'chunk') {
          analysisHtml.value += ev.data;
        } else if (ev.type === 'result' || ev.type === 'final') {
          const data = JSON.parse(ev.data);
          updateResult(data, imgBase64);
          if (data.analysisHtml) analysisHtml.value = data.analysisHtml;
        } else if (ev.type === 'error') {
          throw new Error(ev.data);
        }
      }
    }
  } catch (err) {
    // 降级到普通接口
    try {
      const fallback = await fetch(`${yoloApiBase}/api/learning-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createAiPreferencePayload({ imageBase64: imgBase64 }))
      });
      if (fallback.ok) {
        const data = await fallback.json();
        updateResult(data, imgBase64);
        analysisHtml.value = data.analysisHtml || '';
      } else {
        throw new Error(fallback.statusText);
      }
    } catch (fbErr) {
      errorMessage.value = `服务连接失败：${fbErr.message}`;
    }
  } finally {
    detecting.value = false;
    stopLoadingQuotes();
  }
}

onBeforeUnmount(() => {
  stopCamera();
  stopLoadingQuotes();
});
</script>

<style scoped>
/* ========== 全局样式 ========== */
.page-shell {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;
}

/* ========== Hero 卡片 ========== */
.hero-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 1.75rem;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}
.hero-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(13, 138, 115, 0.08) 0%, transparent 60%), var(--hero-image) center/cover;
  opacity: 0.25;
  pointer-events: none;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(13, 138, 115, 0.1);
  padding: 0.3rem 1rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0d8a73;
}
.hero-left h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0.75rem 0 0.5rem;
  color: #1a2a3a;
}
.hero-left p {
  font-size: 0.9rem;
  color: #5a6e8a;
  max-width: 500px;
}
.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  background: #f1f5f9;
  padding: 0.4rem 1rem 0.4rem 0.75rem;
  border-radius: 2.5rem;
}
.toggle-switch input {
  width: 44px;
  height: 22px;
  appearance: none;
  background: #cbd5e1;
  border-radius: 22px;
  position: relative;
  cursor: pointer;
  transition: 0.2s;
}
.toggle-switch input:checked {
  background: #0d8a73;
}
.toggle-switch input::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}
.toggle-switch input:checked::before {
  transform: translateX(22px);
}
.switch-label {
  font-weight: 600;
  font-size: 0.85rem;
}
.api-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #8a9ab8;
  background: rgba(0, 0, 0, 0.03);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
}
.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

/* ========== 两列布局 ========== */
.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* ========== 通用卡片 ========== */
.card {
  background: white;
  border-radius: 1.5rem;
  border: 1px solid #eef2f8;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}
.card-head {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f4f8;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.card-title iconify-icon {
  font-size: 1.2rem;
  color: #0d8a73;
}
.card-title h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #1e2a3a;
}
.card-tag {
  font-size: 0.7rem;
  color: #8a9ab8;
  background: #f0f4fa;
  padding: 0.2rem 0.7rem;
  border-radius: 1rem;
}

/* ========== 媒体区域 ========== */
.media-view {
  aspect-ratio: 16 / 9;
  background: #0f172a;
  position: relative;
  overflow: hidden;
}
.media-view video,
.media-view img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-placeholder {
  position: absolute;
  inset: 0;
}
.placeholder-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.6);
}
.placeholder-content {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  padding: 0.8rem 1rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white;
}
.placeholder-content iconify-icon {
  font-size: 1.5rem;
  color: #0d8a73;
}
.placeholder-content strong {
  font-size: 0.85rem;
}
.placeholder-content span {
  font-size: 0.7rem;
  color: #a0aec0;
}
.media-status {
  padding: 0.5rem 1rem;
  font-size: 0.7rem;
  color: #8a9ab8;
  margin: 0;
  background: #fafcff;
  border-bottom: 1px solid #f0f4f8;
}

/* ========== 按钮组 ========== */
.button-group {
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 1px solid #f0f4f8;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}
.btn-primary {
  background: linear-gradient(135deg, #0d8a73, #0fb99b);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(13, 138, 115, 0.3);
}
.btn-secondary {
  background: #f1f5f9;
  color: #2c3e50;
  border: 1px solid #e2e8f0;
}
.btn-secondary:hover:not(:disabled) {
  background: #e6edf5;
}
.btn-upload {
  background: #f1f5f9;
  color: #2c3e50;
  position: relative;
}
.btn-upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.btn-icon {
  background: #f1f5f9;
  padding: 0.5rem;
  border-radius: 2rem;
}
.btn-icon:hover:not(:disabled) {
  background: #fee2e2;
  color: #e85d10;
}
.btn:disabled,
.btn-upload.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ========== 状态卡片 ========== */
.state-card {
  margin: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.status-focus {
  background: rgba(16, 185, 129, 0.12);
}
.status-focus .state-icon {
  color: #10b981;
}
.status-distracted {
  background: rgba(245, 158, 11, 0.12);
}
.status-distracted .state-icon {
  color: #f59e0b;
}
.status-away {
  background: rgba(239, 68, 68, 0.12);
}
.status-away .state-icon {
  color: #ef4444;
}
.status-neutral {
  background: rgba(100, 116, 139, 0.12);
}
.status-neutral .state-icon {
  color: #64748b;
}
.state-icon {
  font-size: 1.8rem;
}
.state-info {
  display: flex;
  flex-direction: column;
}
.state-label {
  font-size: 0.65rem;
  color: #8a9ab8;
}
.state-value {
  font-size: 1rem;
  font-weight: 700;
}

/* ========== 指标 ========== */
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 0 1rem 1rem;
}
.metric {
  background: #f8fafc;
  border-radius: 0.75rem;
  padding: 0.6rem 0.8rem;
}
.metric-label {
  font-size: 0.65rem;
  color: #8a9ab8;
  display: block;
  margin-bottom: 0.25rem;
}
.metric-number {
  font-size: 1rem;
  font-weight: 700;
  color: #0d8a73;
}
.metric-text {
  font-size: 0.8rem;
  font-weight: 500;
  color: #1e2a3a;
}

/* ========== 加载区域 ========== */
.loading-area {
  margin: 0 1rem 1rem;
  padding: 1rem;
  background: rgba(13, 138, 115, 0.06);
  border-radius: 1rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(13, 138, 115, 0.2);
  border-top-color: #0d8a73;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loading-quote {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0d8a73;
  margin: 0 0 0.25rem;
}
.loading-detail {
  font-size: 0.7rem;
  color: #5a6e8a;
  margin: 0;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== 通用区块 ========== */
.section {
  padding: 0 1rem 1rem;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.section-title iconify-icon {
  font-size: 1rem;
  color: #0d8a73;
}
.section-title h4 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  color: #1e2a3a;
}
.badge-stream {
  margin-left: auto;
  font-size: 0.6rem;
  background: #fef3c7;
  color: #d97706;
  padding: 0.2rem 0.5rem;
  border-radius: 1rem;
}

/* 预览容器 */
.preview-container {
  position: relative;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid #eef2f8;
}
.preview-container img {
  width: 100%;
  display: block;
}
.preview-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.6rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.5rem;
}

/* 标签 */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  background: rgba(13, 138, 115, 0.1);
  color: #0d8a73;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.7rem;
  font-weight: 500;
}

/* AI 内容 */
.ai-content {
  background: #f8fafc;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #334155;
}
.ai-content :deep(p) {
  margin: 0 0 0.5rem;
}
.ai-content :deep(strong) {
  color: #0d8a73;
}
.placeholder-msg {
  color: #94a3b8;
  font-style: italic;
}

/* 明细列表 */
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  font-size: 0.7rem;
}
.detail-name {
  font-weight: 600;
  color: #1e2a3a;
  min-width: 70px;
}
.detail-conf {
  color: #0d8a73;
  font-weight: 600;
}
.detail-pos {
  color: #8a9ab8;
  margin-left: auto;
}

/* 错误 */
.error-message {
  margin: 0 1rem 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ef4444;
  font-size: 0.75rem;
}

/* 底部提示 */
.footer-note {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #8a9ab8;
  border-top: 1px solid #f0f4f8;
  background: #fafcff;
}
.info-hint {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #8a9ab8;
  background: #fafcff;
}

/* ========== 响应式 ========== */
@media (max-width: 900px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-right {
    align-items: flex-start;
  }
}

/* ========== 暗色模式 ========== */
html[data-theme='night'] .page-shell {
  background: linear-gradient(135deg, #0f172a 0%, #0a0f1a 100%);
}
html[data-theme='night'] .card {
  background: #1e293b;
  border-color: #334155;
}
html[data-theme='night'] .card-head {
  border-color: #334155;
}
html[data-theme='night'] .metric,
html[data-theme='night'] .ai-content,
html[data-theme='night'] .detail-row {
  background: #0f172a;
}
html[data-theme='night'] .hero-card {
  background: #1e293b;
}
html[data-theme='night'] .hero-left h2 {
  color: #f1f5f9;
}
html[data-theme='night'] .hero-left p {
  color: #94a3b8;
}
html[data-theme='night'] .btn-secondary,
html[data-theme='night'] .btn-upload,
html[data-theme='night'] .btn-icon {
  background: #334155;
  color: #e2e8f0;
}
</style>
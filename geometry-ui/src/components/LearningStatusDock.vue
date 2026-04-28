<template>
  <div class="learning-dock">
    <button
      v-if="!panelOpen"
      class="dock-trigger"
      type="button"
      @click="openPanel"
    >
      <iconify-icon icon="solar:camera-bold" />
      <span>AI 学习状态</span>
    </button>

    <transition name="dock-slide">
      <aside v-if="panelOpen" class="dock-panel">
        <header class="dock-header">
          <div>
            <p class="dock-eyebrow">Global AI Assistant</p>
            <h3>学习状态检测</h3>
            <span class="dock-subtitle">在函数实验台、函数星图、AI 错题本中随时调用</span>
          </div>
          <button class="close-btn" type="button" @click="panelOpen = false">
            <iconify-icon icon="solar:close-circle-bold" />
          </button>
        </header>

        <div class="dock-body">
          <section class="status-panel">
            <label class="enable-toggle">
              <input v-model="enabled" type="checkbox" />
              <span>{{ enabled ? '检测已启用' : '检测已停用' }}</span>
            </label>
            <div class="api-pill">
              <span class="dot" :class="{ online: enabled }"></span>
              <span>{{ yoloApiBase }}</span>
            </div>
          </section>

          <section class="media-card">
            <div class="media-frame">
              <video ref="videoRef" autoplay playsinline muted v-show="cameraActive"></video>
              <img v-if="!cameraActive && uploadedImage" :src="uploadedImage" alt="学习状态预览" />
              <div v-if="!cameraActive && !uploadedImage" class="media-empty">
                <img :src="learningPlaceholder" alt="" />
                <div class="media-empty-copy">
                  <iconify-icon icon="solar:camera-add-bold" />
                  <strong>等待输入画面</strong>
                  <span>开启摄像头或上传图片后即可分析</span>
                </div>
              </div>
            </div>
            <p class="media-caption">{{ previewCaption }}</p>

            <div class="action-grid">
              <button class="action-btn primary" type="button" :disabled="!enabled" @click="toggleCamera">
                <iconify-icon :icon="cameraActive ? 'solar:camera-off-bold' : 'solar:camera-bold'" />
                <span>{{ cameraActive ? '关闭摄像头' : '开启摄像头' }}</span>
              </button>
              <button
                class="action-btn secondary"
                type="button"
                :disabled="!enabled || (!cameraActive && !uploadedImage) || detecting"
                @click="analyzeCurrentFrame"
              >
                <iconify-icon :icon="detecting ? 'svg-spinners:180-ring' : 'solar:magic-stick-3-bold'" />
                <span>{{ detecting ? '分析中...' : '分析状态' }}</span>
              </button>
              <label class="action-btn upload" :class="{ disabled: !enabled }">
                <iconify-icon icon="solar:gallery-bold" />
                <span>上传图片</span>
                <input type="file" accept="image/*" :disabled="!enabled" @change="handleImageUpload" />
              </label>
              <button class="action-btn ghost" type="button" :disabled="!uploadedImage && !cameraActive" @click="resetSource">
                <iconify-icon icon="solar:trash-bin-trash-bold" />
                <span>重置</span>
              </button>
            </div>
          </section>

          <section class="result-card">
            <div class="state-card" :class="statusClass">
              <iconify-icon :icon="stateIcon" class="state-icon" />
              <div>
                <span class="state-label">当前状态</span>
                <strong class="state-value">{{ result.learningState || '等待检测' }}</strong>
              </div>
            </div>

            <div class="metric-grid">
              <div class="metric-item">
                <span>置信度</span>
                <strong>{{ confidenceText }}</strong>
              </div>
              <div class="metric-item">
                <span>判断依据</span>
                <strong>{{ evidenceText }}</strong>
              </div>
            </div>

            <div v-if="detecting" class="loading-card">
              <div class="loading-spinner"></div>
              <div>
                <p>{{ currentLoadingQuote }}</p>
                <span>{{ loadingDetail }}</span>
              </div>
            </div>

            <div v-if="result.previewImage || result.sourcePreview" class="preview-card">
              <img :src="result.previewImage || result.sourcePreview" alt="检测结果可视化" />
              <span class="preview-badge">YOLO 检测框</span>
            </div>

            <div v-if="result.detectedObjects?.length" class="tag-list">
              <span v-for="item in result.detectedObjects" :key="item" class="tag-chip">{{ item }}</span>
            </div>

            <div class="analysis-card" v-html="cleanAnalysisHtml || defaultAiMessage"></div>

            <div v-if="result.detections?.length" class="detail-list">
              <div v-for="item in result.detections" :key="`${item.label}-${item.x1}`" class="detail-row">
                <span>{{ item.label }}</span>
                <strong>{{ formatPercent(item.confidence) }}</strong>
                <small>{{ formatBox(item) }}</small>
              </div>
            </div>

            <div v-if="errorMessage" class="error-box">
              <iconify-icon icon="solar:danger-triangle-bold" />
              <span>{{ errorMessage }}</span>
            </div>
          </section>
        </div>
      </aside>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { createAiPreferencePayload } from '../utils/ai-preferences';
import { mediaLibrary } from '../utils/media-library';

const yoloApiBase = (import.meta.env.VITE_YOLO_API_BASE || '/yolo-service').replace(/\/$/, '');
const learningPlaceholder = mediaLibrary.learningPlaceholder;

const panelOpen = ref(false);
const enabled = ref(false);
const videoRef = ref(null);
const cameraActive = ref(false);
const mediaStream = ref(null);
const uploadedImage = ref('');
const detecting = ref(false);
const errorMessage = ref('');
const analysisHtml = ref('');
const loadingDetail = ref('准备连接检测服务');
const serviceChecking = ref(false);

const loadingQuotes = [
  '正在识别画面中的关键目标',
  '正在判断专注度与学习姿态',
  'AI 正在组织自然语言反馈',
  '即将给出学习状态与建议'
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

const stateIcon = computed(() => {
  const state = result.value.learningState || '';
  if (state.includes('专注')) return 'solar:smile-circle-bold';
  if (state.includes('分心')) return 'solar:sleeping-circle-bold';
  if (state.includes('离开')) return 'solar:user-block-bold';
  return 'solar:question-circle-bold';
});

const statusClass = computed(() => {
  const state = result.value.learningState || '';
  if (state.includes('专注')) return 'focus';
  if (state.includes('分心')) return 'distracted';
  if (state.includes('离开')) return 'away';
  return 'neutral';
});

const confidenceText = computed(() => {
  if (!result.value.confidence) return '--';
  return `${Math.round(result.value.confidence * 100)}%`;
});

const evidenceText = computed(() => result.value.evidence || '等待分析');

const cleanAnalysisHtml = computed(() =>
  String(analysisHtml.value || '')
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
);

const defaultAiMessage = '<p class="placeholder-msg">点击“分析状态”后，这里会展示学习状态解读与建议。</p>';

const previewCaption = computed(() => {
  if (cameraActive.value) return '正在使用实时摄像头画面';
  if (uploadedImage.value) return '正在使用已上传图片';
  return '尚未选择画面来源';
});

watch(enabled, (value) => {
  if (!value) stopCamera();
});

async function openPanel() {
  panelOpen.value = true;
  enabled.value = true;
  if (serviceChecking.value) return;

  serviceChecking.value = true;
  errorMessage.value = '';
  loadingDetail.value = '正在连接检测服务';
  try {
    const response = await fetch(`${yoloApiBase}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    loadingDetail.value = '检测服务已连接';
  } catch (error) {
    errorMessage.value = `检测服务连接失败：${error.message}`;
  } finally {
    serviceChecking.value = false;
  }
}

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatBox(item) {
  return `${Math.round(item.x1 || 0)}-${Math.round(item.x2 || 0)}px`;
}

function startLoadingQuotes() {
  stopLoadingQuotes();
  let index = 0;
  currentLoadingQuote.value = loadingQuotes[index];
  loadingQuoteTimer = window.setInterval(() => {
    index = (index + 1) % loadingQuotes.length;
    currentLoadingQuote.value = loadingQuotes[index];
  }, 2200);
}

function stopLoadingQuotes() {
  if (loadingQuoteTimer) {
    window.clearInterval(loadingQuoteTimer);
    loadingQuoteTimer = null;
  }
}

async function toggleCamera() {
  errorMessage.value = '';
  if (!enabled.value) return;

  if (cameraActive.value) {
    stopCamera();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    errorMessage.value = '当前浏览器不支持摄像头调用。';
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
  } catch (error) {
    errorMessage.value = `无法打开摄像头：${error.message}`;
  }
}

function stopCamera() {
  mediaStream.value?.getTracks?.().forEach((track) => track.stop());
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
  reader.onload = (loadEvent) => {
    uploadedImage.value = loadEvent.target?.result || '';
  };
  reader.readAsDataURL(file);
}

function captureFrame() {
  if (cameraActive.value && videoRef.value) {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.value.videoWidth || 960;
    canvas.height = videoRef.value.videoHeight || 540;
    const context = canvas.getContext('2d');
    context?.drawImage(videoRef.value, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }
  return uploadedImage.value;
}

function parseSSE(raw) {
  const event = { type: 'message', data: '' };
  raw.split('\n').forEach((line) => {
    if (line.startsWith('event:')) event.type = line.slice(6).trim();
    if (line.startsWith('data:')) event.data += line.slice(5).trim();
  });
  return event;
}

function updateResult(data, imageBase64) {
  result.value = {
    learningState: data.learningState ?? result.value.learningState ?? '未识别',
    confidence: data.confidence ?? result.value.confidence ?? 0,
    evidence: data.evidence ?? result.value.evidence ?? '',
    detectedObjects: data.detectedObjects ?? result.value.detectedObjects ?? [],
    detections: data.detections ?? result.value.detections ?? [],
    previewImage: data.previewImage ?? result.value.previewImage ?? '',
    sourcePreview: data.sourcePreview ?? imageBase64 ?? result.value.sourcePreview ?? '',
    usedModel: data.usedModel ?? result.value.usedModel ?? ''
  };
}

async function analyzeCurrentFrame() {
  if (!enabled.value) return;

  const imageBase64 = captureFrame();
  if (!imageBase64) {
    errorMessage.value = '请先开启摄像头或上传图片。';
    return;
  }

  detecting.value = true;
  errorMessage.value = '';
  analysisHtml.value = '';
  loadingDetail.value = '正在识别画面内容';
  startLoadingQuotes();

  try {
    const response = await fetch(`${yoloApiBase}/api/learning-state-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createAiPreferencePayload({ imageBase64 }))
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const event = parseSSE(chunk);
        if (!event.data) continue;
        if (event.type === 'status') {
          loadingDetail.value = event.data;
        } else if (event.type === 'chunk') {
          analysisHtml.value += event.data;
        } else if (event.type === 'result' || event.type === 'final') {
          const data = JSON.parse(event.data);
          updateResult(data, imageBase64);
          if (data.analysisHtml) analysisHtml.value = data.analysisHtml;
        } else if (event.type === 'error') {
          throw new Error(event.data);
        }
      }
    }
  } catch (error) {
    try {
      const fallback = await fetch(`${yoloApiBase}/api/learning-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createAiPreferencePayload({ imageBase64 }))
      });
      if (!fallback.ok) throw new Error(fallback.statusText);
      const data = await fallback.json();
      updateResult(data, imageBase64);
      analysisHtml.value = data.analysisHtml || '';
    } catch (fallbackError) {
      errorMessage.value = `服务连接失败：${fallbackError.message}`;
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
.learning-dock {
  position: fixed;
  right: 18px;
  top: 110px;
  bottom: 18px;
  z-index: 30;
  pointer-events: none;
}

.dock-trigger,
.dock-panel {
  pointer-events: auto;
}

.dock-trigger {
  position: absolute;
  right: 0;
  top: 20%;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--border-light);
  border-radius: 20px 0 0 20px;
  background: linear-gradient(135deg, var(--accent-primary), #ffb06d);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.18);
}

.dock-panel {
  width: min(420px, calc(100vw - 36px));
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 28px;
  backdrop-filter: blur(18px);
  box-shadow: 0 28px 52px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

.dock-header {
  padding: 18px 18px 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
}

.dock-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.dock-header h3 {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
}

.dock-subtitle {
  display: block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.close-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 22px;
  cursor: pointer;
}

.dock-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.status-panel,
.media-card,
.result-card {
  padding: 14px;
  border-radius: 22px;
  border: 1px solid var(--border-light);
  background: var(--bg-soft);
}

.status-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.enable-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.enable-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary);
}

.api-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  font-size: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.dot.online {
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.56);
}

.media-frame {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: #09111e;
  aspect-ratio: 16 / 9;
}

.media-frame video,
.media-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-empty {
  position: absolute;
  inset: 0;
}

.media-empty img {
  filter: brightness(0.5);
}

.media-empty-copy {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.56);
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.media-empty-copy strong,
.state-value,
.metric-item strong {
  color: var(--text-primary);
}

.media-empty-copy strong {
  color: #fff;
  display: block;
}

.media-empty-copy span {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.media-caption {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.action-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.action-btn {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--border-light);
  border-radius: 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--accent-primary), #ffb06d);
  color: #fff;
}

.action-btn.secondary,
.action-btn.upload,
.action-btn.ghost {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.action-btn.upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.action-btn:disabled,
.action-btn.upload.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.state-card {
  padding: 14px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.state-card.focus {
  background: rgba(34, 197, 94, 0.12);
}

.state-card.distracted {
  background: rgba(245, 158, 11, 0.12);
}

.state-card.away {
  background: rgba(239, 68, 68, 0.12);
}

.state-card.neutral {
  background: rgba(148, 163, 184, 0.12);
}

.state-icon {
  font-size: 28px;
}

.state-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.state-value {
  font-size: 18px;
}

.metric-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-item {
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
}

.metric-item span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.metric-item strong {
  display: block;
  font-size: 14px;
  line-height: 1.6;
}

.loading-card,
.error-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.loading-card {
  background: rgba(36, 210, 176, 0.08);
}

.loading-card p,
.loading-card span,
.error-box span {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.loading-card p {
  color: var(--text-primary);
  font-weight: 700;
}

.loading-card span {
  color: var(--text-secondary);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid rgba(36, 210, 176, 0.2);
  border-top-color: var(--accent-secondary);
  animation: spin 0.8s linear infinite;
}

.preview-card {
  position: relative;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid var(--border-light);
}

.preview-card img {
  width: 100%;
  display: block;
}

.preview-badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.tag-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
}

.analysis-card {
  margin-top: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  line-height: 1.8;
}

.analysis-card :deep(p) {
  margin: 0 0 10px;
}

.analysis-card :deep(strong) {
  color: var(--accent-primary);
}

.analysis-card :deep(.placeholder-msg) {
  margin: 0;
  color: var(--text-muted);
}

.detail-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 13px;
}

.detail-row small {
  color: var(--text-secondary);
}

.error-box {
  background: rgba(239, 68, 68, 0.12);
  color: #ffb9b9;
}

.dock-slide-enter-active,
.dock-slide-leave-active {
  transition: all 0.24s ease;
}

.dock-slide-enter-from,
.dock-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .learning-dock {
    top: auto;
    left: 12px;
    right: 12px;
    bottom: 12px;
  }

  .dock-trigger {
    top: auto;
    bottom: 0;
    border-radius: 18px;
  }

  .dock-panel {
    width: 100%;
    height: min(78vh, 720px);
    margin-left: auto;
  }
}
</style>

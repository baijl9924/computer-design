<template>
  <section class="error-book-shell">
    <!-- Hero 区域 - 增强版 -->
    <div class="hero-section" :style="{ '--hero-bg': `url(${errorHero})` }">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="section-badge">
            <div class="badge-glow"></div>
            <iconify-icon icon="solar:notebook-bookmark-bold"></iconify-icon>
            <span>AI 函数错题本</span>
          </div>
          <h2 class="hero-title">
            把<span class="highlight">"画错了哪里"</span><br />讲成一段能听懂的话
          </h2>
          <p class="hero-desc">
            输入目标函数、上传手绘图像，系统会自动生成标准图，并调用后端做流式对比分析。
          </p>
          <div class="hero-features">
            <span class="feature-item">
              <iconify-icon icon="solar:check-circle-bold" />
              实时流式分析
            </span>
            <span class="feature-item">
              <iconify-icon icon="solar:check-circle-bold" />
              智能错误定位
            </span>
          </div>
        </div>
        <div class="hero-right">
          <div class="info-panel">
            <div class="info-row">
              <span class="info-label">后端地址</span>
              <code class="info-value">{{ apiBase }}</code>
            </div>
            <div class="info-row">
              <span class="info-label">AI 模式</span>
              <span class="info-badge" :class="{ 'badge-advanced': aiPreferences.preferAdvancedModel }">
                {{ aiModeLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 - 重新设计 -->
    <div class="input-section">
      <div class="input-card">
        <div class="card-header">
          <div class="header-icon">
            <iconify-icon icon="solar:chart-square-bold"></iconify-icon>
          </div>
          <div class="header-text">
            <h3>目标函数表达式</h3>
            <span>表达式支持 sin/cos/tan/log/sqrt 等标准函数</span>
          </div>
        </div>
        <div class="input-group">
          <div class="input-wrapper">
            <iconify-icon class="input-icon" icon="solar:code-bold"></iconify-icon>
            <input
              v-model="expression"
              type="text"
              placeholder="例如：sin(x)、(x-2)^2、1/(x-1)"
              @keyup.enter="generateStandardImage"
              class="func-input"
            />
          </div>
          <button class="generate-btn" @click="generateStandardImage">
            <iconify-icon icon="solar:chart-square-bold"></iconify-icon>
            <span>生成标准图</span>
          </button>
        </div>
        <div class="input-hint">
          <iconify-icon icon="solar:info-circle-bold"></iconify-icon>
          也兼容输入 Math.sin(x) 这种写法，系统会自动识别并转换
        </div>
      </div>
    </div>

    <!-- 对比区域 - 双栏布局优化 -->
    <div class="comparison-grid">
      <!-- 标准图像卡片 -->
      <div class="canvas-card standard-card">
        <div class="card-decoration"></div>
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon standard">
              <iconify-icon icon="solar:chart-bold"></iconify-icon>
            </div>
            <div class="header-text">
              <h3>标准图像</h3>
              <span>系统自动生成</span>
            </div>
          </div>
          <div class="status-badge success">
            <span class="status-dot"></span>
            <span>就绪</span>
          </div>
        </div>
        <div class="canvas-wrapper">
          <canvas ref="standardCanvasRef" width="420" height="300"></canvas>
          <div class="canvas-overlay">
            <iconify-icon icon="solar:graph-new-bold"></iconify-icon>
          </div>
        </div>
      </div>

      <!-- 手绘图像卡片 -->
      <div class="canvas-card upload-card">
        <div class="card-decoration"></div>
        <div class="card-header">
          <div class="header-left">
            <div class="header-icon upload">
              <iconify-icon icon="solar:camera-bold"></iconify-icon>
            </div>
            <div class="header-text">
              <h3>手绘草图</h3>
              <span>拍照或本地上传</span>
            </div>
          </div>
          <div v-if="uploadedImage" class="status-badge success">
            <span class="status-dot"></span>
            <span>已上传</span>
          </div>
        </div>

        <!-- 上传区域 -->
        <div class="upload-zone" v-if="!uploadedImage">
          <label class="upload-label" :class="{ 'drag-over': isDragging }" 
                 @dragover.prevent="isDragging = true" 
                 @dragleave="isDragging = false"
                 @drop.prevent="handleDrop">
            <input type="file" accept="image/*" capture="environment" @change="handleImageUpload" />
            <div class="upload-bg" :style="{ backgroundImage: `url(${errorPlaceholder})` }"></div>
            <div class="upload-content">
              <div class="upload-icon">
                <iconify-icon icon="solar:camera-add-bold"></iconify-icon>
                <div class="icon-ring"></div>
              </div>
              <strong>点击上传 / 拍照上传</strong>
              <span>或拖拽图片到此区域</span>
              <div class="upload-tips">
                <iconify-icon icon="solar:lightbulb-minimalistic-bold"></iconify-icon>
                建议正对纸面拍摄，光线充足，便于 AI 识别曲线特征
              </div>
            </div>
          </label>
        </div>

        <!-- 预览区域 -->
        <div class="preview-zone" v-else>
          <img :src="uploadedImage" alt="手绘草图" class="preview-image" />
          <div class="preview-overlay">
            <button class="preview-action delete" @click="resetUpload">
              <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
              <span>删除</span>
            </button>
            <button class="preview-action reupload" @click="resetUpload">
              <iconify-icon icon="solar:refresh-bold"></iconify-icon>
              <span>重新上传</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分析按钮区域 -->
    <div class="action-section">
      <button class="analyze-button" 
              :class="{ 'btn-loading': loading, 'btn-ready': canAnalyze }"
              :disabled="!canAnalyze || loading" 
              @click="callAIAnalysis">
        <span class="btn-icon">
          <iconify-icon :icon="loading ? 'solar:refresh-circle-bold' : 'solar:magic-stick-3-bold'"></iconify-icon>
        </span>
        <span class="btn-text">{{ loading ? 'AI 正在分析中...' : '开始错题分析' }}</span>
        <span class="btn-glow"></span>
      </button>
      <div class="status-message" v-if="!loading">
        <iconify-icon :icon="canAnalyze ? 'solar:check-circle-bold' : 'solar:info-circle-bold'"></iconify-icon>
        <span>{{ statusText }}</span>
      </div>
      <div class="save-status" :class="{ 'is-warning': !isAuthenticated, 'is-error': saveStatusText.startsWith('保存失败') }">
        <iconify-icon :icon="saveStatusIcon"></iconify-icon>
        <span>{{ saveStatusText }}</span>
      </div>
    </div>

    <!-- 分析结果区域 - 增强版 -->
    <transition name="result-fade">
      <div class="result-section" v-if="loading || analysisHtml">
        <div class="result-card">
          <div class="result-header">
            <div class="header-left">
              <div class="header-icon">
                <iconify-icon icon="solar:document-text-bold"></iconify-icon>
              </div>
              <div class="header-text">
                <h3>分析结果</h3>
                <span>AI 流式输出 · 实时反馈</span>
              </div>
            </div>
            <div class="result-status" v-if="loading">
              <span class="typing-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </span>
              <span>思考中</span>
            </div>
          </div>

          <!-- 加载状态 -->
          <div class="loading-card" v-if="loading">
            <div class="quote-container">
              <iconify-icon class="quote-icon" icon="solar:quote-down-bold"></iconify-icon>
              <transition name="quote-slide" mode="out-in">
                <p class="quote-text" :key="currentLoadingQuote">{{ currentLoadingQuote }}</p>
              </transition>
            </div>
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <p class="loading-desc">
              AI 正在逐像素比对标准图和手绘草图，分析曲线形态、关键点位置等细节...
            </p>
          </div>

          <!-- 分析内容 -->
          <div class="result-content" v-if="analysisHtml">
            <div class="content-body" v-html="cleanAnalysisHtml"></div>
          </div>

          <!-- 流式提示 -->
          <div class="streaming-hint" v-if="loading">
            <iconify-icon icon="solar:refresh-bold" class="spin"></iconify-icon>
            <span>AI 还在继续输出中，请稍候...</span>
          </div>
        </div>
      </div>
    </transition>

    <section class="history-section">
      <div class="history-header">
        <div>
          <div class="history-badge">
            <iconify-icon icon="solar:notebook-minimalistic-bold"></iconify-icon>
            <span>个人 AI 错题本</span>
          </div>
          <h3>{{ currentStudentLabel }}的错题档案</h3>
          <p>
            登录后，系统会把每次成功分析的错题自动归档到账户下；支持随时回放、继续对比和整理。
          </p>
        </div>
        <div class="history-actions">
          <div class="history-count">
            <strong>{{ recordsTotal }}</strong>
            <span>条记录</span>
          </div>
          <button class="history-refresh" type="button" @click="loadErrorRecords" :disabled="recordsLoading || !isAuthenticated">
            <iconify-icon :icon="recordsLoading ? 'solar:refresh-circle-bold' : 'solar:refresh-bold'"></iconify-icon>
            <span>{{ recordsLoading ? '刷新中...' : '刷新列表' }}</span>
          </button>
        </div>
      </div>

      <div v-if="recordsError" class="history-feedback error">{{ recordsError }}</div>
      <div v-if="saveMessage && !saveMessage.startsWith('保存失败')" class="history-feedback success">{{ saveMessage }}</div>

      <div v-if="!isAuthenticated" class="history-empty">
        <iconify-icon icon="solar:login-2-bold"></iconify-icon>
        <strong>先登录学生账号</strong>
        <p>登录后，这里会按同学账号显示专属错题记录，并在每次分析成功后自动保存。</p>
      </div>
      <div v-else-if="recordsLoading" class="history-empty">
        <iconify-icon icon="solar:refresh-circle-bold"></iconify-icon>
        <strong>正在读取错题档案</strong>
        <p>系统正在同步当前账号下的历史记录，请稍候。</p>
      </div>
      <div v-else-if="!errorRecords.length" class="history-empty">
        <iconify-icon icon="solar:book-bookmark-bold"></iconify-icon>
        <strong>还没有保存的错题</strong>
        <p>现在做一次 AI 错题分析，成功后就会自动出现在这里。</p>
      </div>
      <div v-else class="record-grid">
        <article v-for="record in errorRecords" :key="record.id" class="record-card">
          <button class="record-toggle" type="button" @click="toggleRecord(record)">
            <div class="record-top">
              <div class="record-heading">
                <span class="record-mode" :class="{ advanced: record.ai_mode === 'advanced' }">
                  {{ record.ai_mode === 'advanced' ? '高级模型' : '标准模型' }}
                </span>
                <h4>{{ record.expression }}</h4>
                <p>{{ record.summary }}</p>
              </div>
              <div class="record-meta">
                <span class="record-date">{{ formatRecordDate(record.created_at) }}</span>
                <span class="record-expand" :class="{ expanded: isRecordExpanded(record.id) }">
                  <iconify-icon icon="solar:alt-arrow-down-bold"></iconify-icon>
                </span>
              </div>
            </div>
          </button>

          <transition name="record-expand">
            <div v-if="isRecordExpanded(record.id)" class="record-body">
              <div v-if="recordDetailLoadingId === record.id" class="record-loading">
                <iconify-icon icon="solar:refresh-circle-bold"></iconify-icon>
                <span>正在读取这条错题的完整档案...</span>
              </div>

              <template v-else>
                <p v-if="record.student_note || recordDetailMap[record.id]?.student_note" class="record-note">
                  备注：{{ recordDetailMap[record.id]?.student_note || record.student_note }}
                </p>

                <div
                  v-if="recordDetailMap[record.id]?.analysis_html"
                  class="record-analysis"
                  v-html="cleanStoredAnalysis(recordDetailMap[record.id]?.analysis_html)"
                ></div>

                <div
                  v-if="recordDetailMap[record.id]?.standard_image || recordDetailMap[record.id]?.user_image"
                  class="record-images"
                >
                  <figure v-if="recordDetailMap[record.id]?.standard_image" class="record-image-card">
                    <img :src="recordDetailMap[record.id]?.standard_image" alt="标准图像" />
                    <figcaption>标准图像</figcaption>
                  </figure>
                  <figure v-if="recordDetailMap[record.id]?.user_image" class="record-image-card">
                    <img :src="recordDetailMap[record.id]?.user_image" alt="上传草图" />
                    <figcaption>上传草图</figcaption>
                  </figure>
                </div>
              </template>

              <div class="record-actions">
                <button class="record-action primary" type="button" @click.stop="restoreRecord(record)">
                  <iconify-icon icon="solar:folder-open-bold"></iconify-icon>
                  <span>载入这道错题</span>
                </button>
                <button class="record-action danger" type="button" @click.stop="removeRecord(record.id)">
                  <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
                  <span>删除</span>
                </button>
              </div>
            </div>
          </transition>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { renderFunctionPreview } from '../utils/plot-renderer';
import { aiPreferences, createAiPreferencePayload } from '../utils/ai-preferences';
import {
  authState,
  createErrorBookRecord,
  deleteErrorBookRecord,
  fetchErrorBookRecord,
  fetchErrorBookRecords,
  initializeAuth,
  isAuthenticated
} from '../utils/account-api';
import { mediaLibrary } from '../utils/media-library';

const apiBase = (import.meta.env.VITE_API_BASE || '/api-service').replace(/\/$/, '');
const errorHero = mediaLibrary.errorHero;
const errorPlaceholder = mediaLibrary.errorPlaceholder;

const expression = ref('sin(x)');
const uploadedImage = ref('');
const loading = ref(false);
const analysisHtml = ref('');
const standardCanvasRef = ref(null);
const isDragging = ref(false);
const errorRecords = ref([]);
const recordsTotal = ref(0);
const recordsLoading = ref(false);
const recordsError = ref('');
const saveMessage = ref('');
const savingRecord = ref(false);
const expandedRecordIds = ref([]);
const recordDetailMap = ref({});
const recordDetailLoadingId = ref(null);

const loadingQuotes = [
  '每一次修正草图，都是把模糊的感觉变成清晰的理解。',
  '别急，真正会画图的人，都是先看懂再下笔。',
  '函数图像不会背叛认真观察它的人。',
  '你现在多对比一次，考试时就会少慌一次。',
  '耐心一点，峰谷、顶点和渐近线都在向你招手。'
];
const currentLoadingQuote = ref(loadingQuotes[0]);
let loadingQuoteTimer = null;

const canAnalyze = computed(() => expression.value.trim() && uploadedImage.value);
const aiModeLabel = computed(() => (aiPreferences.preferAdvancedModel ? '高级模型' : '标准模型'));
const currentStudentLabel = computed(() => authState.user?.display_name || authState.user?.username || '当前同学');
const cleanAnalysisHtml = computed(() =>
  String(analysisHtml.value || '')
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^"""|"""$/g, '')
    .replace(/^"+|"+$/g, '')
    .trim()
);
const statusText = computed(() => {
  if (!expression.value.trim()) return '请先输入目标函数表达式';
  if (!uploadedImage.value) return '请上传手绘草图';
  if (!isAuthenticated.value) return '可以先体验分析；登录后会自动保存到个人错题本';
  return '准备就绪，本次分析将自动保存到个人错题本';
});
const saveStatusIcon = computed(() => {
  if (savingRecord.value) return 'solar:refresh-circle-bold';
  if (saveStatusText.value.startsWith('保存失败')) return 'solar:danger-triangle-bold';
  return isAuthenticated.value ? 'solar:archive-check-bold' : 'solar:login-2-bold';
});
const saveStatusText = computed(() => {
  if (savingRecord.value) return '正在把本次分析保存到你的 AI 错题本...';
  if (saveMessage.value) return saveMessage.value;
  if (isAuthenticated.value) {
    return `已启用账号归档：${currentStudentLabel.value}的分析会自动保存`;
  }
  return '当前未登录：分析依旧可用，但不会写入个人错题本';
});

function generateStandardImage() {
  if (!standardCanvasRef.value || !expression.value.trim()) return;
  renderFunctionPreview(standardCanvasRef.value, expression.value, {});
}

function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImage.value = e.target?.result || '';
  };
  reader.readAsDataURL(file);
}

function handleDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result || '';
    };
    reader.readAsDataURL(file);
  }
}

function resetUpload() {
  uploadedImage.value = '';
  analysisHtml.value = '';
}

function startLoadingQuotes() {
  stopLoadingQuotes();
  let index = 0;
  currentLoadingQuote.value = loadingQuotes[index];
  loadingQuoteTimer = window.setInterval(() => {
    index = (index + 1) % loadingQuotes.length;
    currentLoadingQuote.value = loadingQuotes[index];
  }, 2500);
}

function stopLoadingQuotes() {
  if (loadingQuoteTimer) {
    clearInterval(loadingQuoteTimer);
    loadingQuoteTimer = null;
  }
}

function stripHtml(raw = '') {
  if (typeof window === 'undefined') {
    return String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = raw;
  return String(div.textContent || div.innerText || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildRecordSummary() {
  const plain = stripHtml(cleanAnalysisHtml.value);
  if (!plain) {
    return `函数 ${expression.value} 的错题分析记录`;
  }
  return plain.length > 110 ? `${plain.slice(0, 110)}...` : plain;
}

function formatRecordDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function cleanStoredAnalysis(value = '') {
  return String(value || '')
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^"""|"""$/g, '')
    .replace(/^"+|"+$/g, '')
    .trim();
}

function isRecordExpanded(recordId) {
  return expandedRecordIds.value.includes(recordId);
}

async function fetchRecordDetailCached(recordId) {
  if (recordDetailMap.value[recordId]) {
    return recordDetailMap.value[recordId];
  }

  recordDetailLoadingId.value = recordId;
  try {
    const detail = await fetchErrorBookRecord(recordId);
    recordDetailMap.value = {
      ...recordDetailMap.value,
      [recordId]: detail
    };
    return detail;
  } finally {
    if (recordDetailLoadingId.value === recordId) {
      recordDetailLoadingId.value = null;
    }
  }
}

async function toggleRecord(record) {
  if (isRecordExpanded(record.id)) {
    expandedRecordIds.value = expandedRecordIds.value.filter((id) => id !== record.id);
    return;
  }

  expandedRecordIds.value = [...expandedRecordIds.value, record.id];
  try {
    await fetchRecordDetailCached(record.id);
  } catch (error) {
    recordsError.value = `读取错题详情失败：${error.message}`;
  }
}

async function loadErrorRecords(options = {}) {
  const { focusRecordId = null } = options;
  if (!isAuthenticated.value) {
    errorRecords.value = [];
    recordsTotal.value = 0;
    recordsError.value = '';
    expandedRecordIds.value = [];
    recordDetailMap.value = {};
    return;
  }

  recordsLoading.value = true;
  recordsError.value = '';
  try {
    const data = await fetchErrorBookRecords({ limit: 12, offset: 0 });
    errorRecords.value = Array.isArray(data?.items) ? data.items : [];
    recordsTotal.value = Number(data?.total || 0);
    expandedRecordIds.value = expandedRecordIds.value.filter((id) => errorRecords.value.some((record) => record.id === id));

    if (focusRecordId && errorRecords.value.some((record) => record.id === focusRecordId)) {
      expandedRecordIds.value = expandedRecordIds.value.includes(focusRecordId)
        ? expandedRecordIds.value
        : [focusRecordId, ...expandedRecordIds.value];
      await fetchRecordDetailCached(focusRecordId);
    }
  } catch (error) {
    recordsError.value = `读取错题记录失败：${error.message}`;
  } finally {
    recordsLoading.value = false;
  }
}

async function saveAnalysisRecord() {
  if (!isAuthenticated.value || !cleanAnalysisHtml.value) return;

  savingRecord.value = true;
  saveMessage.value = '';
  try {
    const savedRecord = await createErrorBookRecord({
      expression: expression.value,
      analysis_html: cleanAnalysisHtml.value,
      standard_image: standardCanvasRef.value?.toDataURL('image/png') || '',
      user_image: uploadedImage.value,
      ai_mode: aiPreferences.preferAdvancedModel ? 'advanced' : 'standard',
      summary: buildRecordSummary()
    });
    saveMessage.value = `已自动保存到 ${currentStudentLabel.value} 的 AI 错题本。`;
    await loadErrorRecords({ focusRecordId: savedRecord?.id || null });
  } catch (error) {
    saveMessage.value = `保存失败：${error.message}`;
  } finally {
    savingRecord.value = false;
  }
}

async function callAIAnalysis() {
  if (!canAnalyze.value) return;
  await nextTick();
  generateStandardImage();
  await nextTick();

  loading.value = true;
  analysisHtml.value = '';
  saveMessage.value = '';
  startLoadingQuotes();

  let shouldPersist = false;

  try {
    const standardImage = standardCanvasRef.value.toDataURL('image/png');
    const response = await fetch(`${apiBase}/api/analyze-error-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createAiPreferencePayload({
        expression: expression.value,
        standardImage,
        userImage: uploadedImage.value
      }))
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

      chunks.forEach((chunk) => {
        chunk.split('\n').forEach((line) => {
          if (!line.startsWith('data:')) return;
          const content = line.slice(5).trim();
          if (!content) return;
          if (content.startsWith('[ERROR]')) {
            analysisHtml.value += `<p class="error-message">${content.slice(7)}</p>`;
          } else {
            analysisHtml.value += content
              .replace(/```html\s*/gi, '')
              .replace(/```\s*/g, '')
              .replace(/^"+|"+$/g, '');
          }
        });
      });
    }

    if (!analysisHtml.value) {
      analysisHtml.value = '<p class="warning-message">AI 未返回内容，请检查模型配置后重试。</p>';
    } else {
      shouldPersist = !analysisHtml.value.includes('error-message') && !analysisHtml.value.includes('warning-message');
    }
  } catch (error) {
    analysisHtml.value = `<p class="error-message">分析失败：${error.message}</p>`;
  } finally {
    loading.value = false;
    stopLoadingQuotes();
  }

  if (shouldPersist) {
    await saveAnalysisRecord();
  }
}

async function restoreRecord(record) {
  recordsError.value = '';
  try {
    const detail = await fetchRecordDetailCached(record.id);
    expression.value = detail.expression || '';
    uploadedImage.value = detail.user_image || '';
    analysisHtml.value = detail.analysis_html || '';
    saveMessage.value = `已载入 ${formatRecordDate(detail.created_at)} 的错题记录，可继续查看与补充。`;
    await nextTick();
    generateStandardImage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    recordsError.value = `载入错题失败：${error.message}`;
  }
}

async function removeRecord(recordId) {
  recordsError.value = '';
  saveMessage.value = '';
  try {
    await deleteErrorBookRecord(recordId);
    expandedRecordIds.value = expandedRecordIds.value.filter((id) => id !== recordId);
    if (recordDetailMap.value[recordId]) {
      const nextMap = { ...recordDetailMap.value };
      delete nextMap[recordId];
      recordDetailMap.value = nextMap;
    }
    saveMessage.value = '已删除该条错题记录。';
    await loadErrorRecords();
  } catch (error) {
    recordsError.value = `删除失败：${error.message}`;
  }
}

onMounted(async () => {
  generateStandardImage();
  await initializeAuth();
  if (isAuthenticated.value) {
    await loadErrorRecords();
  }
});

onBeforeUnmount(() => {
  stopLoadingQuotes();
});

watch(isAuthenticated, async (loggedIn, wasLoggedIn) => {
  if (loggedIn) {
    saveMessage.value = `欢迎回来，${currentStudentLabel.value}。后续分析会自动保存到你的账号。`;
    await loadErrorRecords();
    return;
  }

  if (wasLoggedIn) {
    errorRecords.value = [];
    recordsTotal.value = 0;
    recordsError.value = '';
    expandedRecordIds.value = [];
    recordDetailMap.value = {};
    saveMessage.value = '已退出当前账号，后续分析将不再自动归档。';
  }
});
</script>

<style scoped>
/* ============================================================
   变量定义
   ============================================================ */
:root {
  --card-bg: rgba(13, 17, 32, 0.9);
  --card-border: rgba(255, 255, 255, 0.08);
  --glass-bg: rgba(255, 255, 255, 0.04);
  --accent-primary: #ff7a30;
  --accent-secondary: #24d2b0;
  --text-primary: #eef2ff;
  --text-secondary: #8b96b8;
  --text-muted: #525d7a;
}

/* ============================================================
   主容器
   ============================================================ */
.error-book-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ============================================================
   Hero 区域
   ============================================================ */
.hero-section {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 24px;
  padding: 40px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(110deg, rgba(8, 10, 19, 0.85) 0%, rgba(8, 10, 19, 0.6) 50%, rgba(8, 10, 19, 0.9) 100%),
    var(--hero-bg) center/cover;
  opacity: 0.6;
  z-index: 0;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 40%, rgba(255, 122, 48, 0.08), transparent 60%);
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
}

.hero-left {
  flex: 1;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 122, 48, 0.15);
  border: 1px solid rgba(255, 122, 48, 0.3);
  border-radius: 100px;
  color: #ffd2b6;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.badge-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(90deg, transparent, rgba(255, 122, 48, 0.3), transparent);
  animation: shimmer 2s linear infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.section-badge iconify-icon {
  width: 18px;
  height: 18px;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(28px, 3.5vw, 42px);
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.highlight {
  background: linear-gradient(135deg, #ff7a30, #ffb86b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 560px;
}

.hero-features {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-secondary);
}

.feature-item iconify-icon {
  width: 18px;
  height: 18px;
}

.hero-right {
  flex-shrink: 0;
}

.info-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 20px;
  min-width: 280px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.info-row:not(:last-child) {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-label {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.info-value {
  font-size: 12px;
  font-family: 'Consolas', monospace;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--accent-secondary);
}

.info-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.info-badge.badge-advanced {
  background: linear-gradient(135deg, #ff7a30, #ffb86b);
  color: white;
}

/* ============================================================
   输入区域
   ============================================================ */
.input-section {
  margin: 0;
}

.input-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}

.header-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, rgba(255, 122, 48, 0.15), rgba(255, 122, 48, 0.08));
  border: 1px solid rgba(255, 122, 48, 0.25);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  font-size: 22px;
  flex-shrink: 0;
}

.header-text h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.header-text span {
  font-size: 13px;
  color: var(--text-secondary);
}

.input-group {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  pointer-events: none;
}

.func-input {
  width: 100%;
  height: 50px;
  padding: 0 16px 0 46px;
  background: rgba(7, 10, 20, 0.8);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 15px;
  font-family: 'Consolas', 'Monaco', monospace;
  transition: all 0.3s ease;
}

.func-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(255, 122, 48, 0.1);
}

.func-input::placeholder {
  color: rgba(151, 163, 191, 0.5);
}

.generate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  height: 50px;
  background: linear-gradient(135deg, var(--accent-primary), #ff9d6b);
  border: none;
  border-radius: 14px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.generate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 122, 48, 0.3);
}

.generate-btn iconify-icon {
  width: 18px;
  height: 18px;
}

.input-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(36, 210, 176, 0.08);
  border: 1px solid rgba(36, 210, 176, 0.2);
  border-radius: 10px;
  color: var(--accent-secondary);
  font-size: 13px;
}

.input-hint iconify-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ============================================================
   对比网格
   ============================================================ */
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.canvas-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-decoration {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 122, 48, 0.08), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.standard-card .card-decoration {
  background: radial-gradient(circle, rgba(36, 210, 176, 0.08), transparent 70%);
}

.canvas-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon.standard {
  background: linear-gradient(135deg, rgba(36, 210, 176, 0.15), rgba(36, 210, 176, 0.08));
  border-color: rgba(36, 210, 176, 0.25);
  color: var(--accent-secondary);
}

.header-icon.upload {
  background: linear-gradient(135deg, rgba(255, 122, 48, 0.15), rgba(255, 122, 48, 0.08));
  border-color: rgba(255, 122, 48, 0.25);
  color: var(--accent-primary);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
}

.status-badge.success {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Canvas 样式 */
.canvas-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: white;
  border: 1px solid var(--card-border);
}

.canvas-wrapper canvas {
  display: block;
  width: 100%;
  height: auto;
}

.canvas-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

/* 上传区域 */
.upload-zone {
  margin: 0;
}

.upload-label {
  display: block;
  position: relative;
  min-height: 320px;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  border: 2px dashed var(--card-border);
  transition: all 0.3s ease;
}

.upload-label:hover,
.upload-label.drag-over {
  border-color: var(--accent-primary);
  background: rgba(255, 122, 48, 0.05);
}

.upload-label input {
  display: none;
}

.upload-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.15;
  filter: blur(4px);
}

.upload-content {
  position: relative;
  height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: rgba(10, 13, 25, 0.6);
  backdrop-filter: blur(12px);
}

.upload-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, rgba(255, 122, 48, 0.2), rgba(255, 122, 48, 0.1));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  font-size: 32px;
  position: relative;
}

.icon-ring {
  position: absolute;
  inset: -4px;
  border: 2px dashed rgba(255, 122, 48, 0.3);
  border-radius: 50%;
  animation: rotate 8s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-content strong {
  font-size: 16px;
  color: var(--text-primary);
}

.upload-content > span {
  font-size: 13px;
  color: var(--text-secondary);
}

.upload-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 16px;
  background: rgba(36, 210, 176, 0.1);
  border: 1px solid rgba(36, 210, 176, 0.2);
  border-radius: 10px;
  color: var(--accent-secondary);
  font-size: 12px;
}

.upload-tips iconify-icon {
  width: 16px;
  height: 16px;
}

/* 预览区域 */
.preview-zone {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
}

.preview-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.5);
}

.preview-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent 50%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preview-zone:hover .preview-overlay {
  opacity: 1;
}

.preview-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  color: white;
}

.preview-action:hover {
  transform: translateY(-2px);
}

.preview-action.delete:hover {
  background: rgba(239, 68, 68, 0.8);
}

.preview-action.reupload:hover {
  background: rgba(59, 130, 246, 0.8);
}

/* ============================================================
   分析按钮
   ============================================================ */
.action-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.analyze-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--accent-primary), #ff9d6b);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(255, 122, 48, 0.3);
}

.analyze-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(255, 122, 48, 0.4);
}

.analyze-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading .btn-icon iconify-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s linear infinite;
  opacity: 0;
}

.analyze-button:hover:not(:disabled) .btn-glow {
  opacity: 1;
}

.btn-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.status-message iconify-icon {
  width: 18px;
  height: 18px;
}

/* ============================================================
   结果区域
   ============================================================ */
.result-section {
  margin-top: 8px;
}

.result-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.result-status {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator .dot {
  width: 6px;
  height: 6px;
  background: var(--accent-primary);
  border-radius: 50%;
  animation: bounce 1.4s infinite;
}

.typing-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}

/* 加载卡片 */
.loading-card {
  background: linear-gradient(135deg, rgba(255, 122, 48, 0.08), rgba(255, 122, 48, 0.12));
  border: 1px solid rgba(255, 122, 48, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.quote-container {
  position: relative;
  margin-bottom: 20px;
}

.quote-icon {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 32px;
  height: 32px;
  color: rgba(255, 122, 48, 0.3);
}

.quote-text {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.6;
  color: #ffd2b6;
  padding-left: 30px;
  margin: 0;
}

.progress-bar {
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), #ffb86b);
  border-radius: 4px;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

.loading-desc {
  font-size: 13px;
  color: rgba(255, 210, 182, 0.8);
  margin: 0;
}

/* 结果内容 */
.result-content {
  margin-top: 16px;
}

.content-body {
  color: var(--text-primary);
  line-height: 1.8;
}

.content-body :deep(h1),
.content-body :deep(h2),
.content-body :deep(h3),
.content-body :deep(h4) {
  color: var(--text-primary);
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 700;
}

.content-body :deep(p) {
  margin-bottom: 16px;
  color: var(--text-secondary);
}

.content-body :deep(ul),
.content-body :deep(ol) {
  padding-left: 24px;
  margin-bottom: 16px;
}

.content-body :deep(li) {
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.content-body :deep(strong) {
  color: var(--accent-primary);
  font-weight: 700;
}

.content-body :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Consolas', monospace;
  font-size: 0.9em;
  color: var(--accent-secondary);
}

.content-body :deep(.error-message) {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid #ef4444;
}

.content-body :deep(.warning-message) {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
}

.streaming-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px;
  background: rgba(36, 210, 176, 0.08);
  border: 1px solid rgba(36, 210, 176, 0.2);
  border-radius: 10px;
  color: var(--accent-secondary);
  font-size: 13px;
}

.streaming-hint iconify-icon.spin {
  animation: spin 1s linear infinite;
}

/* ============================================================
   动画
   ============================================================ */
.quote-slide-enter-active,
.quote-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.quote-slide-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.quote-slide-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

.result-fade-enter-active {
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 1024px) {
  .hero-content {
    flex-direction: column;
  }
  
  .info-panel {
    width: 100%;
  }
  
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  
  .input-group {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 24px;
  }
  
  .input-card,
  .canvas-card,
  .result-card {
    padding: 16px;
  }
  
  .hero-title {
    font-size: 24px;
  }
}

.account-section {
  margin: 0;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(36, 210, 176, 0.08);
  border: 1px solid rgba(36, 210, 176, 0.18);
  color: #7ce5d0;
  font-size: 13px;
}

.save-status.is-warning {
  background: rgba(255, 184, 107, 0.08);
  border-color: rgba(255, 184, 107, 0.18);
  color: #ffd39a;
}

.save-status.is-error {
  background: rgba(255, 107, 107, 0.08);
  border-color: rgba(255, 107, 107, 0.18);
  color: #ffb3b3;
}

.save-status iconify-icon {
  width: 18px;
  height: 18px;
}

.history-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 22px;
  padding: 28px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.24);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  flex-wrap: wrap;
}

.history-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 122, 48, 0.12);
  color: #ffd1b1;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.history-badge iconify-icon {
  width: 16px;
  height: 16px;
}

.history-header h3 {
  margin: 0 0 8px;
  font-size: 26px;
  color: var(--text-primary);
}

.history-header p {
  margin: 0;
  max-width: 720px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.history-count {
  min-width: 94px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.history-count strong {
  font-size: 24px;
  color: var(--text-primary);
}

.history-count span {
  font-size: 12px;
  color: var(--text-secondary);
}

.history-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  padding: 0 18px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(36, 210, 176, 0.18), rgba(36, 210, 176, 0.12));
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.history-refresh:hover:not(:disabled) {
  transform: translateY(-1px);
}

.history-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.history-feedback {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
}

.history-feedback.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.22);
  color: #81e9a0;
}

.history-feedback.error {
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.22);
  color: #ffb6b6;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
  border-radius: 18px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  text-align: center;
}

.history-empty iconify-icon {
  width: 36px;
  height: 36px;
  color: var(--accent-primary);
}

.history-empty strong {
  font-size: 18px;
  color: var(--text-primary);
}

.history-empty p {
  margin: 0;
  max-width: 560px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.record-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.record-toggle {
  width: 100%;
  border: none;
  background: transparent;
  padding: 20px;
  cursor: pointer;
  text-align: left;
  color: inherit;
}

.record-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.record-heading {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-mode {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(36, 210, 176, 0.12);
  color: #76e3cd;
  font-size: 12px;
  font-weight: 700;
}

.record-mode.advanced {
  background: rgba(255, 122, 48, 0.14);
  color: #ffcb9e;
}

.record-heading h4 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
  word-break: break-word;
}

.record-heading p,
.record-note {
  margin: 0;
  line-height: 1.7;
  color: var(--text-secondary);
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-date {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.record-expand {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: transform 0.24s ease, background 0.24s ease;
  flex-shrink: 0;
}

.record-expand.expanded {
  transform: rotate(180deg);
  background: rgba(255, 122, 48, 0.16);
  color: #ffd2b6;
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.record-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(36, 210, 176, 0.08);
  color: #87e5d3;
  font-size: 13px;
}

.record-loading iconify-icon {
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
}

.record-analysis {
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  line-height: 1.75;
}

.record-analysis :deep(h1),
.record-analysis :deep(h2),
.record-analysis :deep(h3),
.record-analysis :deep(h4) {
  margin: 0 0 12px;
  color: var(--text-primary);
}

.record-analysis :deep(p) {
  margin: 0 0 12px;
}

.record-analysis :deep(ul),
.record-analysis :deep(ol) {
  margin: 0 0 12px;
  padding-left: 20px;
}

.record-analysis :deep(li) {
  margin-bottom: 8px;
}

.record-images {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.record-image-card {
  margin: 0;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-image-card img {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 12px;
  background: rgba(7, 10, 20, 0.58);
}

.record-image-card figcaption {
  font-size: 12px;
  color: var(--text-secondary);
}

.record-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.record-action {
  border: none;
  border-radius: 14px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.record-action.primary {
  background: linear-gradient(135deg, rgba(255, 122, 48, 0.2), rgba(255, 184, 107, 0.16));
  color: #fff;
}

.record-action.danger {
  background: rgba(255, 107, 107, 0.14);
  color: #ffb6b6;
}

.record-action:hover {
  transform: translateY(-1px);
}

.record-expand-enter-active,
.record-expand-leave-active {
  transition: all 0.24s ease;
}

.record-expand-enter-from,
.record-expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 980px) {
  .record-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .history-section {
    padding: 22px 18px;
  }

  .history-header h3 {
    font-size: 22px;
  }

  .record-top {
    flex-direction: column;
  }

  .record-meta {
    width: 100%;
    justify-content: space-between;
  }

  .record-images {
    grid-template-columns: 1fr;
  }

  .record-date {
    white-space: normal;
  }
}

</style>

<!-- 日间模式适配 -->
<style>
html[data-theme='day'] .error-book-shell {
  --card-bg: rgba(255, 255, 255, 0.95);
  --card-border: rgba(0, 0, 0, 0.08);
  --glass-bg: rgba(0, 0, 0, 0.03);
  --accent-primary: #0d8a73;
  --accent-secondary: #e85d10;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
}

html[data-theme='day'] .hero-section::before {
  opacity: 0.25;
}

html[data-theme='day'] .section-badge {
  background: rgba(13, 138, 115, 0.12);
  border-color: rgba(13, 138, 115, 0.25);
  color: #0d8a73;
}

html[data-theme='day'] .func-input,
html[data-theme='day'] .upload-content {
  background: rgba(248, 250, 252, 0.9);
}

html[data-theme='day'] .generate-btn,
html[data-theme='day'] .analyze-button {
  background: linear-gradient(135deg, #0d8a73, #14b8a6);
}

html[data-theme='day'] .loading-card {
  background: linear-gradient(135deg, rgba(13, 138, 115, 0.08), rgba(13, 138, 115, 0.12));
  border-color: rgba(13, 138, 115, 0.2);
}

html[data-theme='day'] .quote-text {
  color: #0d8a73;
}
</style>

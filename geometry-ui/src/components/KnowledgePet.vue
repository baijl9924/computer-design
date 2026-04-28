<template>
  <div
    ref="wrapperRef"
    class="pet-wrapper"
    :class="wrapperClasses"
    :style="wrapperStyle"
  >
    <!-- 收起时的展开按钮 -->
    <button
      v-if="collapsed"
      class="expand-btn"
      data-no-drag
      title="展开函数大脑"
      @click.stop="collapsed = false"
    >
      <iconify-icon icon="mdi:brain"></iconify-icon>
      <span class="expand-tooltip">点我展开</span>
      <span class="expand-ring"></span>
      <span class="expand-badge">{{ validFunctions.length }}</span>
    </button>

    <!-- 展开状态 -->
    <template v-else>
      <button
        class="dock-close-btn"
        data-no-drag
        title="收起函数大脑"
        @click.stop="collapsed = true"
      >
        <iconify-icon icon="mdi:close-circle"></iconify-icon>
      </button>

      <div class="dock-row">
        <!-- 灯泡按钮组 -->
        <transition-group name="bulb-pop" tag="div" class="bulb-rail-horizontal" v-if="validFunctions.length">
          <button
            v-for="(func, index) in validFunctions"
            :key="func.id"
            class="bulb-btn-horizontal"
            data-no-drag
            :class="{
              active: func.id === selectedFunctionId,
              loading: aiEntryFor(func.id).loading
            }"
            :style="{ '--bulb-color': func.color || '#ff9d62' }"
            :title="`f${index + 1}: ${func.expr}`"
            @click="handleBulbClick(func.id)"
          >
            <span class="bulb-wire-h"></span>
            <span class="bulb-halo-h"></span>
            <span class="bulb-shell-h">
              <iconify-icon icon="mdi:lightbulb-on"></iconify-icon>
            </span>
            <span class="bulb-meta-h">
              <strong>f{{ index + 1 }}</strong>
              <small>{{ truncateExpression(func.expr) }}</small>
            </span>
          </button>
        </transition-group>

        <!-- 大脑图标 -->
        <button
          class="pet-avatar"
          :class="{ thinking: isThinking }"
          data-drag-handle
          :title="collapsed ? '展开面板' : '点击收起面板'"
          @pointerdown="startDrag"
          @click="handleAvatarClick"
        >
          <span class="avatar-clip">
            <span class="avatar-sheen"></span>
          </span>
          <span class="orbit orbit-a"></span>
          <span class="orbit orbit-b"></span>
          <span class="drag-tag">
            <iconify-icon icon="mdi:drag-horizontal-variant"></iconify-icon>
          </span>
          <span class="pet-status">
            <iconify-icon icon="mdi:lightbulb-on"></iconify-icon>
            {{ badgeText }}
          </span>
          <span class="pet-core">
            <iconify-icon icon="mdi:brain"></iconify-icon>
          </span>
          <span class="collapse-hint">点击收起</span>
        </button>
      </div>

      <transition name="pet-fade">
        <aside
          v-if="!collapsed"
          ref="panelRef"
          class="pet-panel"
          @pointerdown.self="startDrag"
        >
          <div class="pet-header" data-drag-handle @pointerdown="startDrag">
            <div>
              <div class="panel-kicker">
                <iconify-icon icon="mdi:brain"></iconify-icon>
                <span>函数大脑</span>
              </div>
              <h3>{{ selectedFunction ? '当前函数已接入函数大脑' : '等待写入函数' }}</h3>
              <p>{{ selectedFunction ? selectedFunction.expr : '先在画布里输入一个函数，灯泡会自动亮起。' }}</p>
            </div>
            <div class="header-hints">
              <span>
                <iconify-icon icon="mdi:dock-window"></iconify-icon>
                靠边吸附
              </span>
              <span>
                <iconify-icon icon="mdi:resize-bottom-right"></iconify-icon>
                可缩放
              </span>
              <span>
                <iconify-icon icon="mdi:close-circle"></iconify-icon>
                点击大脑收起
              </span>
            </div>
          </div>

          <div class="speech-bubble">
            <transition name="quote-fade" mode="out-in">
              <p :key="speechText">{{ speechText }}</p>
            </transition>
          </div>

          <div v-if="validFunctions.length" class="function-switcher">
            <button
              v-for="(func, index) in validFunctions"
              :key="func.id"
              class="function-chip"
              data-no-drag
              :class="{ active: func.id === selectedFunctionId }"
              :style="{ '--chip-color': func.color || '#24d2b0' }"
              @click="selectFunction(func.id)"
            >
              <span class="chip-leading">
                <iconify-icon icon="mdi:lightbulb-on"></iconify-icon>
                f{{ index + 1 }}
              </span>
              <small>{{ truncateExpression(func.expr) }}</small>
            </button>
          </div>

          <section class="knowledge-card ai-card" v-if="selectedFunction">
            <div class="ai-title-row">
              <div>
                <h4>向 AI 提问</h4>
                <p>基础函数知识卡会先显示在下方。你只需要输入问题，系统会把当前函数信息补全后一起提交给 AI，并在这里流式输出回答。</p>
              </div>
              <button class="ask-btn" data-no-drag :disabled="aiEntry.loading || !selectedFunction" @click="askAiQuestion(selectedFunction)">
                <iconify-icon :icon="aiEntry.loading ? 'mdi:loading' : 'mdi:send-circle-outline'"></iconify-icon>
                {{ aiEntry.loading ? '回答生成中' : '发送提问' }}
              </button>
            </div>

            <div class="question-box">
              <textarea
                v-model="aiEntry.question"
                class="question-input"
                data-no-drag
                rows="3"
                placeholder="例如：这个函数的考点是什么？这个函数最容易错在哪里？"
                @keydown.enter.exact.prevent="askAiQuestion(selectedFunction)"
              ></textarea>
              <div class="question-actions">
                <button class="question-suggestion" type="button" data-no-drag @click="applySuggestedQuestion('这个函数的考点是什么？')">
                  这个函数的考点是什么？
                </button>
                <button class="question-suggestion" type="button" data-no-drag @click="applySuggestedQuestion('这个函数最容易错在哪里？')">
                  这个函数最容易错在哪里？
                </button>
                <button class="question-suggestion" type="button" data-no-drag @click="applySuggestedQuestion('做这类题时应该先看什么？')">
                  做这类题时应该先看什么？
                </button>
              </div>
            </div>

            <div v-if="aiEntry.loading" class="ai-loading-box"> 
              <transition name="quote-fade" mode="out-in">
                <strong :key="loadingQuote">{{ loadingQuote }}</strong>
              </transition>
              <p>函数大脑正在把当前函数的表达式、知识卡和你的问题一起整理给 AI，回答会在这里实时流式展开。</p>
            </div>

            <div v-if="aiEntry.lastQuestion" class="answer-meta">当前问题：{{ aiEntry.lastQuestion }}</div>

            <div v-if="!aiEntry.loading && aiEntry.html" class="ai-html answer-box" data-no-drag v-html="aiEntry.html"></div>

            <div v-else-if="!aiEntry.loading && aiEntry.error" class="ai-error-box">{{ aiEntry.error }}</div>

            <div v-else-if="!aiEntry.loading" class="ai-hint-box">
              目前先显示本地知识卡。点击按钮后，会尝试调用 AI 生成更生动的比喻、误区提醒和例题方向。            </div>
          </section>

          <div class="tip-row" v-if="localKnowledge.tags?.length">
            <span class="tip-chip" v-for="tag in localKnowledge.tags" :key="tag">{{ tag }}</span>
          </div>

          <template v-if="selectedFunction">
            <section
              v-for="card in localKnowledge.cards"
              :key="card.title"
              class="knowledge-card"
              :style="{ '--card-color': card.color }"
            >
              <h4>{{ card.title }}</h4>
              <ul>
                <li v-for="item in card.items" :key="item">{{ item }}</li>
              </ul>
            </section>

            <section class="knowledge-card tips-card">
              <h4>学习建议</h4>
              <ul>
                <li v-for="tip in localKnowledge.tips" :key="tip">{{ tip }}</li>
              </ul>
            </section>
          </template>

          <div v-else class="empty-box">
            写入一个函数后，脑旁会亮一盏灯。点灯泡，就是点开这条函数自己的知识入口。          </div>

          <div class="panel-footer">
            <span>
              <iconify-icon icon="mdi:drag-variant"></iconify-icon>
              按住拖动
            </span>
            <span>
              <iconify-icon icon="mdi:dock-window"></iconify-icon>
              边缘自动吸附
            </span>
            <span>
              <iconify-icon icon="mdi:close-circle"></iconify-icon>
              点击大脑收起
            </span>
          </div>
        </aside>
      </transition>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { generateKnowledgePack } from '../utils/knowledge';
import { createAiPreferencePayload } from '../utils/ai-preferences';

const loadingQuotes = [
  '复杂的函数，也能被一层一层拆成好懂的样子。',
  '每一条曲线背后，其实都藏着可以说清楚的结构。',
  '灯泡亮起来的那一刻，往往就是理解开始长出来的时候。',
  '别着急，图像直觉正在和公式语言慢慢对齐。',
  '你愿意多看一会儿，函数就会多给你一点清晰。'
];

const STORAGE_KEY = 'geometric-brain-position-v7';
const SNAP_THRESHOLD = 20;
const EDGE_OFFSET = 16;

const props = defineProps({
  functions: {
    type: Array,
    default: () => []
  },
  activeFunctionId: {
    type: [String, Number],
    default: ''
  },
  apiBase: {
    type: String,
    default: ''
  }
});

const collapsed = ref(true);
const selectedFunctionId = ref(props.activeFunctionId);
const loadingQuote = ref(loadingQuotes[0]);
const aiCache = reactive({});
const wrapperRef = ref(null);
const panelRef = ref(null);
const position = reactive({ x: EDGE_OFFSET, y: EDGE_OFFSET });
const wrapperSize = reactive({ width: 70, height: 70 });
const dockState = reactive({ horizontal: 'right', vertical: 'top' });
const dragState = reactive({
  active: false,
  moved: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  initialX: 0,
  initialY: 0
});

let quoteTimer = null;
let resizeObserver = null;
let hasRestoredPosition = false;

const validFunctions = computed(() =>
  (props.functions || []).filter((item) => String(item?.expr || '').trim())
);

const selectedFunction = computed(() => {
  const list = validFunctions.value;
  return list.find((item) => item.id === selectedFunctionId.value) || list[0] || null;
});

const localKnowledge = computed(() => generateKnowledgePack(selectedFunction.value?.expr || ''));
const effectiveApiBase = computed(() => String(props.apiBase || import.meta.env.VITE_API_BASE || '/api-service').replace(/\/$/, ''));

const aiEntry = computed(() => {
  if (!selectedFunction.value) {
    return { loading: false, html: '', error: '' };
  }
  return aiEntryFor(selectedFunction.value.id);
});

const isThinking = computed(() => aiEntry.value?.loading || false);

const badgeText = computed(() => {
  const count = validFunctions.value.length;
  return count ? `${count}` : '0';
});

const speechText = computed(() => {
  if (!selectedFunction.value) {
    return '先在画布里写下一个函数，函数大脑旁边就会亮起一盏灯。点开它，我会把这条函数的定义、性质和题目灵感整理给你看。';
  }
  if (aiEntry.value.loading) {
    return loadingQuote.value;
  }
  return localKnowledge.value.speech;
});

const wrapperClasses = computed(() => ({
  collapsed: collapsed.value,
  dragging: dragState.active,
  'dock-right': dockState.horizontal === 'right',
  'dock-top': dockState.vertical === 'top'
}));

const wrapperStyle = computed(() => ({
  right: `${position.x}px`,
  top: `${position.y}px`,
  '--accent-color': selectedFunction.value?.color || '#ff7a30'
}));

watch(
  () => [validFunctions.value.map((item) => item.id).join('|'), props.activeFunctionId],
  () => {
    if (validFunctions.value.some((item) => item.id === props.activeFunctionId)) {
      selectedFunctionId.value = props.activeFunctionId;
    } else if (!validFunctions.value.some((item) => item.id === selectedFunctionId.value)) {
      selectedFunctionId.value = validFunctions.value[0]?.id || '';
    }
  },
  { immediate: true }
);

watch(
  selectedFunction,
  (func) => {
    if (!func) return;
    const entry = aiEntryFor(func.id);
    if (!entry.question) {
      entry.question = '这个函数的考点是什么？';
    }
  },
  { immediate: true }
);

watch(
  () => aiEntry.value.loading,
  (loading) => {
    if (loading) startQuoteLoop();
    else stopQuoteLoop();
  },
  { immediate: true }
);

watch(collapsed, async () => {
  await nextTick();
  measureWrapper();
  syncPositionToViewport();
  persistPosition();
  observeCurrentNodes();
});

function aiEntryFor(id) {
  if (!aiCache[id]) {
    aiCache[id] = reactive({
      loading: false,
      question: '',
      lastQuestion: '',
      html: '',
      error: '',
      source: 'local'
    });
  }
  return aiCache[id];
}

function truncateExpression(expression = '') {
  const raw = String(expression || '').trim();
  if (raw.length <= 15) return raw;
  return `${raw.slice(0, 15)}...`;
}

function selectFunction(functionId) {
  selectedFunctionId.value = functionId;
  collapsed.value = false;
}

function startQuoteLoop() {
  stopQuoteLoop();
  let index = 0;
  loadingQuote.value = loadingQuotes[index];
  quoteTimer = window.setInterval(() => {
    index = (index + 1) % loadingQuotes.length;
    loadingQuote.value = loadingQuotes[index];
  }, 2200);
}

function stopQuoteLoop() {
  if (quoteTimer) {
    window.clearInterval(quoteTimer);
    quoteTimer = null;
  }
}

function cleanHtml(rawHtml = '') {
  return String(rawHtml || '')
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '');
}

function buildQuestionPayload(functionItem) {
  const knowledge = generateKnowledgePack(functionItem?.expr || '');
  return {
    expression: functionItem?.expr || '',
    family: knowledge.family,
    title: knowledge.title,
    tags: knowledge.tags || [],
    tips: knowledge.tips || [],
    cards: (knowledge.cards || []).map((card) => ({
      title: card.title,
      items: card.items || []
    }))
  };
}

function applySuggestedQuestion(question) {
  if (!selectedFunction.value) return;
  aiEntry.value.question = question;
}

function parseSseEvent(raw) {
  return raw
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');
}

async function askAiQuestion(functionItem) {
  if (!functionItem?.expr?.trim()) return;

  const entry = aiEntryFor(functionItem.id);
  const question = String(entry.question || '').trim();
  if (!question || entry.loading) return;

  entry.loading = true;
  entry.error = '';
  entry.html = '';
  entry.lastQuestion = question;

  try {
    const response = await fetch(`${effectiveApiBase.value}/api/function-brain-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        createAiPreferencePayload({
          ...buildQuestionPayload(functionItem),
          question
        })
      )
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

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
        const text = cleanHtml(parseSseEvent(chunk));
        if (!text) continue;
        if (text.startsWith('[ERROR]')) {
          throw new Error(text.slice(7));
        }
        entry.html += text;
      }
    }

    const tail = cleanHtml(parseSseEvent(buffer));
    if (tail) {
      if (tail.startsWith('[ERROR]')) {
        throw new Error(tail.slice(7));
      }
      entry.html += tail;
    }
  } catch (error) {
    entry.error = `AI 回答失败：${error.message}`;
  } finally {
    entry.loading = false;
  }
}

function measureWrapper() {
  const rect = wrapperRef.value?.getBoundingClientRect();
  if (!rect) return;
  wrapperSize.width = Math.max(70, Math.round(rect.width));
  wrapperSize.height = Math.max(70, Math.round(rect.height));
}

function getViewportBounds() {
  if (typeof window === 'undefined') {
    return { maxX: 0, maxY: 0 };
  }
  return {
    maxX: Math.max(EDGE_OFFSET, window.innerWidth - wrapperSize.width - EDGE_OFFSET),
    maxY: Math.max(EDGE_OFFSET, window.innerHeight - wrapperSize.height - EDGE_OFFSET)
  };
}

function clampPosition(x, y) {
  const { maxX, maxY } = getViewportBounds();
  return {
    x: Math.min(maxX, Math.max(EDGE_OFFSET, x)),
    y: Math.min(maxY, Math.max(EDGE_OFFSET, y))
  };
}

function snapPosition(x, y) {
  const next = clampPosition(x, y);
  let horizontal = null;
  let vertical = null;

  const rightGap = Math.max(0, window.innerWidth - (next.x + wrapperSize.width));
  const bottomGap = Math.max(0, window.innerHeight - (next.y + wrapperSize.height));

  if (rightGap <= SNAP_THRESHOLD + EDGE_OFFSET) {
    next.x = Math.max(EDGE_OFFSET, window.innerWidth - wrapperSize.width - EDGE_OFFSET);
    horizontal = 'right';
  }

  if (next.y <= SNAP_THRESHOLD + EDGE_OFFSET) {
    next.y = EDGE_OFFSET;
    vertical = 'top';
  } else if (bottomGap <= SNAP_THRESHOLD + EDGE_OFFSET) {
    next.y = Math.max(EDGE_OFFSET, window.innerHeight - wrapperSize.height - EDGE_OFFSET);
    vertical = 'bottom';
  }

  return { ...next, horizontal, vertical };
}

function syncPositionToViewport() {
  if (typeof window === 'undefined') return;
  const snapped = snapPosition(position.x, position.y);
  position.x = snapped.x;
  position.y = snapped.y;
  dockState.horizontal = snapped.horizontal;
  dockState.vertical = snapped.vertical;
}

function defaultPosition() {
  if (typeof window === 'undefined') {
    return { x: EDGE_OFFSET, y: EDGE_OFFSET, horizontal: 'right', vertical: 'top' };
  }
  return {
    x: EDGE_OFFSET,
    y: EDGE_OFFSET,
    horizontal: 'right',
    vertical: 'top'
  };
}

function loadPosition() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      position.x = Math.max(EDGE_OFFSET, Math.min(window.innerWidth - wrapperSize.width - EDGE_OFFSET, parsed.x));
      position.y = Math.max(EDGE_OFFSET, Math.min(window.innerHeight - wrapperSize.height - EDGE_OFFSET, parsed.y));
      collapsed.value = parsed.collapsed !== undefined ? parsed.collapsed : true;
      dockState.horizontal = parsed.horizontal || 'right';
      dockState.vertical = parsed.vertical || 'top';
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function persistPosition() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      x: position.x,
      y: position.y,
      horizontal: dockState.horizontal,
      vertical: dockState.vertical,
      collapsed: collapsed.value
    })
  );
}

function shouldIgnoreDrag(target) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  if (element.closest('[data-drag-handle]')) return false;
  return Boolean(
    element.closest(
      '[data-no-drag], button, input, textarea, select, option, a, label, summary, [contenteditable="true"]'
    )
  );
}

function handleBulbClick(functionId) {
  if (dragState.moved) {
    dragState.moved = false;
    return;
  }
  selectFunction(functionId);
}

function startDrag(event) {
  if (event.button !== undefined && event.button !== 0) return;
  if (shouldIgnoreDrag(event.target)) return;

  measureWrapper();
  dragState.active = true;
  dragState.moved = false;
  dragState.pointerId = event.pointerId;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.initialX = position.x;
  dragState.initialY = position.y;

  window.addEventListener('pointermove', handleDragMove, { passive: false });
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  event.preventDefault();
}

function handleDragMove(event) {
  if (!dragState.active) return;

  const deltaX = dragState.initialX + (dragState.startX - event.clientX);
  const deltaY = dragState.initialY + (dragState.startY - event.clientY);
  
  if (Math.abs(event.clientX - dragState.startX) > 4 || Math.abs(event.clientY - dragState.startY) > 4) {
    dragState.moved = true;
  }

  const next = snapPosition(deltaX, deltaY);
  position.x = next.x;
  position.y = next.y;
  dockState.horizontal = next.horizontal;
  dockState.vertical = next.vertical;
  event.preventDefault();
}

function stopDrag() {
  if (!dragState.active) return;
  
  // 吸附回弹动画
  if (wrapperRef.value) {
    wrapperRef.value.style.transition = 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
    syncPositionToViewport();
    setTimeout(() => {
      if (wrapperRef.value) {
        wrapperRef.value.style.transition = '';
      }
    }, 250);
  } else {
    syncPositionToViewport();
  }
  
  dragState.active = false;
  window.removeEventListener('pointermove', handleDragMove);
  window.removeEventListener('pointerup', stopDrag);
  window.removeEventListener('pointercancel', stopDrag);
  persistPosition();
}

function handleAvatarClick() {
  if (dragState.moved) {
    dragState.moved = false;
    return;
  }
  collapsed.value = !collapsed.value;
  nextTick(() => {
    measureWrapper();
    syncPositionToViewport();
    persistPosition();
  });
}

function handleResize() {
  measureWrapper();
  syncPositionToViewport();
  persistPosition();
}

function observeCurrentNodes() {
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      measureWrapper();
      syncPositionToViewport();
      persistPosition();
    });
  }
  resizeObserver.disconnect();
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value);
  if (panelRef.value) resizeObserver.observe(panelRef.value);
}

onMounted(async () => {
  hasRestoredPosition = loadPosition();
  await nextTick();
  measureWrapper();
  if (!hasRestoredPosition) {
    const fallback = defaultPosition();
    position.x = fallback.x;
    position.y = fallback.y;
    dockState.horizontal = fallback.horizontal;
    dockState.vertical = fallback.vertical;
    collapsed.value = true;
  }
  syncPositionToViewport();
  observeCurrentNodes();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  stopQuoteLoop();
  stopDrag();
  resizeObserver?.disconnect?.();
  window.removeEventListener('resize', handleResize);
});
</script>

<style>
/* ==================== 设计 Token 系统 ==================== */
:root {
  --z-pet: 1000;
  --z-panel: 1010;
  --z-floating: 1020;
  
  --accent: #ff7a30;
  --accent-soft: rgba(255, 122, 48, 0.15);
  --accent-glow: rgba(255, 122, 48, 0.3);
  
  --bg-glass: linear-gradient(180deg, rgba(20, 24, 48, 0.85), rgba(10, 12, 28, 0.95));
  --bg-panel: linear-gradient(180deg, rgba(15, 19, 37, 0.97), rgba(10, 13, 25, 0.98));
  
  --border-soft: rgba(255, 255, 255, 0.08);
  --border-glow: rgba(255, 122, 48, 0.4);
  
  --text-main: #f6f7fb;
  --text-muted: #9aa3b2;
  --text-accent: #ffd2b6;
  
  --shadow-sm: 0 8px 20px rgba(0, 0, 0, 0.26);
  --shadow-md: 0 24px 48px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 20px rgba(255, 122, 48, 0.3);
  
  --transition-bounce: cubic-bezier(0.2, 0.9, 0.4, 1.1);
  --transition-smooth: cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* ==================== 基础容器 ==================== */
.pet-wrapper {
  position: fixed;
  z-index: var(--z-pet);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  max-width: calc(100vw - 32px);
  right: 16px;
  top: 120px;
  pointer-events: auto;
  isolation: isolate;
  transform: translateZ(0);
}

/* ==================== 统一层级 ==================== */
.pet-wrapper * {
  z-index: inherit;
  transform: translateZ(0);
}

.pet-panel {
  z-index: var(--z-panel);
}

.expand-btn,
.pet-avatar {
  z-index: var(--z-floating);
}

/* ==================== 呼吸感动画（唯一主动画） ==================== */
@keyframes soft-breathe {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--accent-glow);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 6px rgba(255, 122, 48, 0);
  }
}

@keyframes panel-pop {
  0% {
    opacity: 0;
    transform: scale(0.92) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* ==================== 收起按钮 ==================== */
.expand-btn {
  position: relative;
  width: 64px;
  height: 64px;
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  background: var(--bg-glass);
  backdrop-filter: blur(10px) saturate(140%);
  color: var(--text-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--transition-smooth);
  animation: soft-breathe 3s ease-in-out infinite;
}

.expand-btn:hover {
  transform: scale(1.03);
  border-color: var(--border-glow);
  box-shadow: var(--shadow-glow);
}

.expand-btn iconify-icon {
  width: 34px;
  height: 34px;
}

.expand-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: var(--accent);
  color: white;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  box-shadow: var(--shadow-sm);
}

.expand-tooltip {
  position: absolute;
  right: 72px;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  color: white;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  border: 1px solid var(--border-soft);
}

.expand-btn:hover .expand-tooltip {
  opacity: 1;
}

.expand-ring {
  position: absolute;
  inset: -4px;
  border-radius: 24px;
  border: 1px solid var(--accent-glow);
  opacity: 0;
  pointer-events: none;
}

/* ==================== 展开布局 ==================== */
.dock-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  background: transparent;
}

.bulb-rail-horizontal {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
}

/* ==================== 灯泡按钮（产品级） ==================== */
.bulb-btn-horizontal {
  position: relative;
  min-width: 64px;
  padding: 8px 10px;
  border-radius: 18px;
  border: 1px solid var(--border-soft);
  background: var(--bg-glass);
  backdrop-filter: blur(10px) saturate(140%);
  box-shadow: var(--shadow-sm);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s var(--transition-smooth);
}

/* 能量条效果 */
.bulb-btn-horizontal::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), #ffd36a);
  transition: width 0.3s var(--transition-smooth);
  border-radius: 0 0 18px 18px;
}

.bulb-btn-horizontal.active::after {
  width: 100%;
}

.bulb-btn-horizontal:hover {
  transform: translateY(-2px);
  border-color: var(--border-glow);
}

.bulb-wire-h {
  position: absolute;
  left: 50%;
  top: -14px;
  width: 2px;
  height: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
  transform: translateX(-50%);
}

.bulb-halo-h {
  position: absolute;
  inset: -8%;
  border-radius: inherit;
  background: radial-gradient(circle, var(--accent-glow), transparent 62%);
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.26s ease, transform 0.26s ease;
}

.bulb-shell-h,
.bulb-shell-h iconify-icon {
  width: 20px;
  height: 20px;
}

.bulb-shell-h {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.46);
  transition: color 0.24s ease, filter 0.24s ease;
}

.bulb-meta-h {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.bulb-meta-h strong {
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-main);
}

.bulb-meta-h small {
  max-width: 55px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-muted);
  font-size: 8px;
}

.bulb-btn-horizontal.active {
  border-color: var(--border-glow);
  background: linear-gradient(180deg, var(--accent-soft), rgba(10, 12, 28, 0.95));
  box-shadow: 0 0 0 1px rgba(255, 157, 98, 0.08), var(--shadow-sm);
}

.bulb-btn-horizontal.active .bulb-halo-h {
  opacity: 1;
  transform: scale(1.1);
}

.bulb-btn-horizontal.active .bulb-shell-h {
  color: #ffd36a;
  filter: drop-shadow(0 0 10px rgba(255, 211, 106, 0.65));
}

/* ==================== 大脑图标 ==================== */
.pet-avatar {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  background: var(--bg-glass);
  backdrop-filter: blur(10px) saturate(140%);
  cursor: grab;
  overflow: hidden;
  transition: all 0.2s var(--transition-smooth);
  animation: soft-breathe 3s ease-in-out infinite;
}

.pet-avatar.thinking {
  box-shadow: 0 0 24px var(--accent-glow);
  border-color: var(--accent);
}

.pet-avatar:hover {
  transform: translateY(-2px);
  border-color: var(--border-glow);
  box-shadow: var(--shadow-sm), var(--shadow-glow);
}

.pet-avatar:active {
  cursor: grabbing;
}

.collapse-hint {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 9px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.pet-avatar:hover .collapse-hint {
  opacity: 1;
}

.avatar-sheen {
  position: absolute;
  inset: -22% -28% auto;
  height: 56%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent 70%);
  pointer-events: none;
}

.orbit {
  position: absolute;
  inset: 12px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.orbit-a {
  animation: brain-pulse 2.8s ease-in-out infinite;
}

.orbit-b {
  inset: 6px;
  border-color: var(--accent-soft);
  animation: brain-pulse 3.4s ease-in-out infinite reverse;
}

.drag-tag {
  position: absolute;
  left: 6px;
  bottom: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
}

.drag-tag iconify-icon {
  width: 12px;
  height: 12px;
}

.pet-status {
  position: absolute;
  right: 6px;
  top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--text-accent);
  font-size: 9px;
  font-weight: 800;
}

.pet-status iconify-icon {
  width: 10px;
  height: 10px;
}

.pet-core,
.pet-core iconify-icon {
  width: 30px;
  height: 30px;
}

.pet-core {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  color: var(--text-accent);
  filter: drop-shadow(0 0 12px rgba(255, 177, 109, 0.2));
}

@keyframes brain-pulse {
  0%, 100% {
    transform: scale(0.96);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.8;
  }
}

/* ==================== 关闭按钮 ==================== */
.dock-close-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: calc(var(--z-floating) + 1);
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.86);
  border-radius: 50%;
  background: rgba(255, 98, 98, 0.96);
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.dock-close-btn:hover {
  transform: scale(1.1);
}

.dock-close-btn iconify-icon {
  width: 14px;
  height: 14px;
}

/* ==================== 面板 ==================== */
.pet-panel {
  width: min(400px, calc(100vw - 20px));
  min-width: min(280px, calc(100vw - 20px));
  max-width: min(460px, calc(100vw - 8px));
  min-height: 320px;
  max-height: min(70vh, 700px);
  resize: both;
  overflow: auto;
  border-radius: 22px;
  padding: 16px;
  background: var(--bg-panel);
  backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid var(--border-soft);
  box-shadow: var(--shadow-md);
  position: relative;
}

.pet-panel::-webkit-resizer {
  background: linear-gradient(135deg, transparent 0 50%, rgba(255, 122, 48, 0.44) 50% 100%);
}

/* 面板动画 */
.pet-fade-enter-active {
  animation: panel-pop 0.35s var(--transition-bounce);
}

.pet-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pet-fade-enter-from,
.pet-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

/* ==================== 面板头部 ==================== */
.pet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-kicker {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 5px 10px;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--text-accent);
  font-size: 11px;
  font-weight: 700;
}

.panel-kicker iconify-icon {
  width: 14px;
  height: 14px;
}

.pet-header h3 {
  margin: 10px 0 4px;
  font-size: clamp(20px, 3vw, 28px);
  color: var(--text-main);
}

.pet-header p {
  color: var(--text-muted);
  line-height: 1.5;
  font-size: 13px;
}

.header-hints {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-muted);
  font-size: 10px;
}

.header-hints span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.03);
}

.header-hints iconify-icon {
  width: 12px;
  height: 12px;
  color: var(--text-accent);
}

/* ==================== 语音气泡 ==================== */
.speech-bubble {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(36, 210, 176, 0.12), rgba(36, 210, 176, 0.04));
  border: 1px solid rgba(36, 210, 176, 0.14);
  color: #c7fff2;
  font-size: 13px;
}

.speech-bubble p {
  margin: 0;
}

/* ==================== 函数切换器 ==================== */
.function-switcher {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.function-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
  cursor: pointer;
  color: #d7deee;
  transition: all 0.18s var(--transition-smooth);
}

.function-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
}

.function-chip.active {
  border-color: color-mix(in srgb, var(--chip-color) 48%, white);
  background: color-mix(in srgb, var(--chip-color) 10%, rgba(255, 255, 255, 0.04));
}

.chip-leading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 12px;
}

.chip-leading iconify-icon {
  width: 14px;
  height: 14px;
  color: #ffd36a;
}

.function-chip small {
  color: var(--text-muted);
  font-size: 11px;
}

/* ==================== 知识卡片 ==================== */
.knowledge-card {
  margin-top: 12px;
  border-radius: 18px;
  padding: 12px 14px;
  border: 1px solid var(--border-soft);
  border-left: 4px solid var(--card-color, #24d2b0);
  background: rgba(255, 255, 255, 0.04);
}

.knowledge-card h4 {
  margin: 0 0 8px;
  color: var(--text-main);
  font-size: 14px;
}

.knowledge-card ul {
  margin: 0;
  padding-left: 18px;
}

.knowledge-card li {
  margin: 4px 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

.ai-card {
  --card-color: var(--accent);
  background: linear-gradient(180deg, var(--accent-soft), rgba(255, 255, 255, 0.02));
}

.ai-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.ai-title-row p {
  font-size: 11px;
}

.ask-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--accent-glow);
  border-radius: 12px;
  padding: 6px 12px;
  background: var(--accent-soft);
  color: var(--text-accent);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s var(--transition-smooth);
}

.ask-btn:hover:enabled {
  transform: translateY(-1px);
  background: rgba(255, 122, 48, 0.25);
}

.ask-btn iconify-icon {
  width: 14px;
  height: 14px;
}

.ask-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ==================== AI 加载骨架层 ==================== */
.question-box {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.question-input {
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
  font: inherit;
  line-height: 1.6;
  resize: vertical;
  min-height: 84px;
}

.question-input::placeholder {
  color: var(--text-muted);
}

.question-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-suggestion {
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-accent);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s var(--transition-smooth);
}

.question-suggestion:hover {
  transform: translateY(-1px);
  border-color: var(--accent-glow);
}

.ai-loading-box {
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 12px;
  background: var(--accent-soft);
  color: var(--text-accent);
  position: relative;
  overflow: hidden;
}

.ai-loading-box::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.08),
    transparent
  );
  animation: shimmer 1.5s infinite;
  transform: translateX(-100%);
}

.ai-error-box,
.ai-hint-box,
.empty-box {
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 12px;
}

.ai-error-box {
  background: rgba(255, 98, 98, 0.1);
  color: #ffc4c4;
}

.ai-hint-box,
.empty-box {
  background: rgba(255, 255, 255, 0.03);
}

.answer-meta {
  margin-top: 10px;
  color: var(--text-accent);
  font-size: 11px;
  font-weight: 700;
}

.answer-box {
  margin-top: 10px;
}

.tip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 4px;
}

.tip-chip {
  padding: 4px 8px;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--text-accent);
  font-size: 10px;
  font-weight: 600;
}

.tips-card {
  --card-color: #24d2b0;
}

/* ==================== 面板底部 ==================== */
.panel-footer {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-footer span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-soft);
  color: var(--text-muted);
  font-size: 10px;
}

.panel-footer iconify-icon {
  width: 12px;
  height: 12px;
  color: var(--text-accent);
}

/* ==================== AI 内容样式 ==================== */
.ai-html :deep(h1),
.ai-html :deep(h2),
.ai-html :deep(h3),
.ai-html :deep(h4),
.ai-html :deep(strong) {
  color: var(--text-main);
  font-size: 13px;
}

.ai-html :deep(p),
.ai-html :deep(li) {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 12px;
}

.ai-html :deep(ul) {
  padding-left: 18px;
}

/* ==================== 动画过渡 ==================== */
.quote-fade-enter-active,
.quote-fade-leave-active,
.bulb-pop-enter-active,
.bulb-pop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.quote-fade-enter-from,
.quote-fade-leave-to,
.bulb-pop-enter-from,
.bulb-pop-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .bulb-meta-h small {
    max-width: 45px;
  }
  
  .bulb-btn-horizontal {
    min-width: 55px;
    padding: 6px 8px;
  }
  
  .pet-avatar {
    width: 56px;
    height: 56px;
  }
  
  .pet-core iconify-icon {
    width: 26px;
    height: 26px;
  }
}

/* ==================== 修复补丁：可读性 / 拖拽 / 溢出 ==================== */
.pet-panel,
.pet-panel * {
  box-sizing: border-box;
}

.pet-panel {
  overscroll-behavior: contain;
}

.pet-header {
  cursor: grab;
}

.pet-header:active {
  cursor: grabbing;
}

.pet-header p,
.speech-bubble p,
.knowledge-card li,
.ai-html,
.answer-box {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.question-input {
  user-select: text;
}

.ai-html :where(h1, h2, h3, h4, strong) {
  color: var(--text-main);
}

.ai-html :where(p, li) {
  color: var(--text-muted);
}
</style>

<style>
/* ==================== 日间模式 ==================== */
html[data-theme='day'] {
  --accent: #0d8a73;
  --accent-soft: rgba(13, 138, 115, 0.1);
  --accent-glow: rgba(13, 138, 115, 0.3);
  
  --bg-glass: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.98));
  --bg-panel: #ffffff;
  
  --border-soft: rgba(0, 0, 0, 0.08);
  --border-glow: rgba(13, 138, 115, 0.4);
  
  --text-main: #1a2c3e;
  --text-muted: #5a6e7c;
  --text-accent: #0d8a73;
  
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-glow: 0 0 16px rgba(13, 138, 115, 0.15);
}

html[data-theme='day'] .bulb-btn-horizontal {
  background: linear-gradient(180deg, #ffffff, #f8f9fb);
  border-color: var(--border-soft);
  box-shadow: var(--shadow-sm);
}

html[data-theme='day'] .bulb-shell-h {
  color: rgba(31, 42, 48, 0.35);
}

html[data-theme='day'] .bulb-meta-h strong {
  color: var(--text-main);
}

html[data-theme='day'] .bulb-btn-horizontal.active {
  background: linear-gradient(180deg, var(--accent-soft), #ffffff);
  border-color: var(--border-glow);
}

html[data-theme='day'] .bulb-btn-horizontal.active .bulb-shell-h {
  color: var(--accent);
}

html[data-theme='day'] .pet-avatar {
  background: linear-gradient(180deg, #ffffff, #f5f7fa);
  border-color: var(--border-soft);
  box-shadow: var(--shadow-sm);
}

html[data-theme='day'] .pet-avatar:hover {
  border-color: var(--border-glow);
}

html[data-theme='day'] .pet-status,
html[data-theme='day'] .panel-kicker,
html[data-theme='day'] .tip-chip {
  background: var(--accent-soft);
  color: var(--accent);
}

html[data-theme='day'] .pet-core {
  color: var(--accent);
}

html[data-theme='day'] .ask-btn {
  background: linear-gradient(135deg, var(--accent), #0fb99b);
  color: white;
  border: none;
}

html[data-theme='day'] .pet-panel {
  background: #ffffff;
  backdrop-filter: none;
  border-color: var(--border-soft);
  box-shadow: var(--shadow-md);
}

html[data-theme='day'] .header-hints span,
html[data-theme='day'] .function-chip,
html[data-theme='day'] .knowledge-card,
html[data-theme='day'] .ai-hint-box,
html[data-theme='day'] .empty-box,
html[data-theme='day'] .panel-footer span {
  background: #ffffff;
  border-color: var(--border-soft);
}

html[data-theme='day'] .speech-bubble {
  background: linear-gradient(135deg, var(--accent-soft), rgba(13, 138, 115, 0.02));
  border-color: rgba(13, 138, 115, 0.12);
  color: var(--accent);
}

html[data-theme='day'] .expand-btn {
  background: linear-gradient(135deg, var(--accent-soft), #ffffff);
  border-color: var(--border-glow);
  color: var(--accent);
}

html[data-theme='day'] .expand-btn:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-glow);
}

html[data-theme='day'] .expand-badge {
  background: var(--accent);
}
</style>


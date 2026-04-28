<template>
  <section class="space-shell">
    <div class="space-bg" aria-hidden="true">
      <div class="bg-orb orb-a"></div>
      <div class="bg-orb orb-b"></div>
      <div class="bg-orb orb-c"></div>
      <div class="bg-grid"></div>
      <div class="bg-scan"></div>
      <div class="bg-noise"></div>
    </div>

    <div class="space-hero">
      <div class="hero-copy">
        <div class="space-badge">
          <span class="badge-dot"></span>
          独立 3D 页面
        </div>
        <h2>3D 坐标实验台</h2>
        <p>显式曲面 · 隐式曲面 · 平面 · 多对象同屏观察</p>
      </div>
      <div class="space-summary">
        <div class="summary-card primary">
          <span>当前焦点</span>
          <strong>{{ activeFunction?.expr || '未选择对象' }}</strong>
        </div>
        <div class="summary-card">
          <span>图像类型</span>
          <strong>{{ activeKindLabel }}</strong>
        </div>
      </div>
    </div>

    <div class="space-layout">
      <aside class="space-sidebar">
        <div class="card-head">
          <div>
            <span class="eyebrow">Object Stack</span>
            <strong>对象列表</strong>
          </div>
          <span class="count-pill">{{ functions.length }}</span>
        </div>
        <div class="object-list">
          <div
            v-for="item in functions"
            :key="item.id"
            class="object-row"
            :class="{ active: item.id === activeFunctionId }"
          >
            <div class="object-row-top">
              <label class="object-toggle">
                <input v-model="item.visible" type="checkbox" @change="requestRender(true)">
                <span class="switch-visual"></span>
                <span>显示</span>
              </label>
              <button class="focus-btn" @click="setActiveFunction(item.id)">
                {{ item.id === activeFunctionId ? '焦点对象' : '设为焦点' }}
              </button>
            </div>
            <div class="expr-line">
              <span class="color-dot" :style="{ background: item.color }"></span>
              <input
                v-model="item.expr"
                type="text"
                placeholder="例如 x^2 + y^2 + z^2 = 25"
                @focus="setActiveFunction(item.id)"
                @input="debounceRender"
                @keyup.enter="requestRender(true)"
              >
            </div>
            <button v-if="functions.length > 1" class="remove-btn" @click="removeFunction(item.id)">移除对象</button>
          </div>
        </div>
        <button class="add-btn" @click="addFunction">
          <span>+</span>
          添加对象
        </button>
      </aside>

      <section class="space-main">
        <div class="space-toolbar">
          <div class="toolbar-group">
            <label class="toolbar-field featured">
              <span>参数 k</span>
              <input v-model.number="currentK" type="number" @input="requestRender(false)">
            </label>
            <label class="toolbar-field">
              <span>起始</span>
              <input v-model.number="animConfig.kStart" type="number">
            </label>
            <label class="toolbar-field">
              <span>终止</span>
              <input v-model.number="animConfig.kEnd" type="number">
            </label>
            <label class="toolbar-field">
              <span>时长(s)</span>
              <input v-model.number="animConfig.duration" type="number" min="1">
            </label>
          </div>

          <div class="toolbar-group compact">
            <label class="toggle-item"><input v-model="showAxes" type="checkbox" @change="requestRender(false)"> 坐标轴</label>
            <label class="toggle-item"><input v-model="showGrid" type="checkbox" @change="requestRender(false)"> 网格</label>
            <button class="tool-btn" @click="togglePlay">{{ isPlaying ? '暂停动画' : '播放动画' }}</button>
            <button class="tool-btn secondary" @click="resetCamera">重置视角</button>
          </div>
        </div>

        <div class="canvas-card">
          <div class="canvas-head">
            <div>
              <span class="eyebrow">3D Viewport</span>
              <strong>{{ activeFunction?.expr || '等待输入函数对象' }}</strong>
            </div>
            <div class="viewport-status">
              <span :class="{ live: isPlaying }"></span>
              {{ isPlaying ? 'ANIMATING' : 'READY' }}
            </div>
          </div>
          <div ref="canvasRef" class="space-canvas"></div>
        </div>

        <div class="space-footer">
          <span>支持输入：<code>z = f(x, y)</code>、<code>x + y + z = a</code>、<code>x^2 + y^2 + z^2 = a^2</code></span>
          <span v-if="activeError" class="error-text">{{ activeError }}</span>
        </div>
      </section>
    </div>
  </section>
</template>


<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import { COLORS, collectFunctionData } from '../utils/plot-renderer';
import { normalizeExpression } from '../utils/expression-tools';
import { createFunctionPlot3D } from '../utils/plot-renderer-3d';

const canvasRef = ref(null);
const functions = ref([
  { id: 1, expr: 'x^2 + y^2 + z^2 = 25', color: COLORS[0], visible: true },
  { id: 2, expr: 'x + y + z = k', color: COLORS[1], visible: false }
]);
const activeFunctionId = ref(1);
const currentK = ref(1);
const showAxes = ref(true);
const showGrid = ref(true);
const isPlaying = ref(false);
const animConfig = reactive({
  kStart: -6,
  kEnd: 6,
  duration: 6
});

let plot3D = null;
let drawDebounceTimer = null;
let animationFrameId = null;
let animationStartTime = 0;
const activeGraphKind = ref('implicit-surface');
const activeError = ref('');

const activeFunction = computed(() => functions.value.find((item) => item.id === activeFunctionId.value) || functions.value[0] || null);
const activeKindLabel = computed(() => {
  if (activeGraphKind.value === 'surface') return '显式曲面';
  if (activeGraphKind.value === 'plane') return '平面';
  if (activeGraphKind.value === 'implicit-surface') return '隐式曲面';
  if (activeGraphKind.value === 'implicit') return '隐式对象';
  if (activeGraphKind.value === 'curve') return '空间曲线';
  return '自动识别';
});

function buildFunctionDataList() {
  const host = canvasRef.value;
  const width = Math.max(720, Math.floor(host?.clientWidth || 1100));
  const steps = Math.max(72, Math.min(180, Math.floor(width * 0.12)));
  return functions.value
    .filter((item) => item.visible && item.expr.trim())
    .map((item) => ({
      ...item,
      expr: normalizeExpression(item.expr),
      data: collectFunctionData({
        expression: item.expr,
        coordSystem: 'space',
        calcMin: -8,
        calcMax: 8,
        steps,
        kValue: currentK.value
      })
    }));
}

function renderScene(resetCamera = false) {
  const host = canvasRef.value;
  if (!host) return;
  if (!plot3D) {
    plot3D = createFunctionPlot3D(host);
    plot3D?.setWheelZoomEnabled?.(true);
  }

  const functionDataList = buildFunctionDataList();
  const activeFunctionData = functionDataList.find((item) => item.id === activeFunctionId.value)?.data || null;
  activeGraphKind.value = activeFunctionData?.kind || 'implicit';
  activeError.value = activeFunctionData?.error || '';

  plot3D?.render({
    coordSystem: 'space',
    functionDataList,
    activeFunctionId: activeFunctionId.value,
    visibleLayerDataList: [],
    activeLayerId: '',
    monotonicIntervals: [],
    pointTrace: [],
    featureSnapshot: null,
    showFeatures: false,
    wheelZoomEnabled: true,
    showAxes: showAxes.value,
    showGrid: showGrid.value,
    showGround: showGrid.value
  }, { resetCamera });
}

function requestRender(resetCamera = false) {
  renderScene(resetCamera);
}

function debounceRender() {
  if (drawDebounceTimer) window.clearTimeout(drawDebounceTimer);
  drawDebounceTimer = window.setTimeout(() => {
    drawDebounceTimer = null;
    renderScene(false);
  }, 100);
}

function setActiveFunction(functionId) {
  activeFunctionId.value = functionId;
  renderScene(false);
}

function addFunction() {
  const item = {
    id: Date.now(),
    expr: '',
    color: COLORS[functions.value.length % COLORS.length],
    visible: true
  };
  functions.value.push(item);
  activeFunctionId.value = item.id;
}

function removeFunction(functionId) {
  functions.value = functions.value.filter((item) => item.id !== functionId);
  if (!functions.value.some((item) => item.id === activeFunctionId.value)) {
    activeFunctionId.value = functions.value[0]?.id || 0;
  }
  renderScene(true);
}

function animationLoop(timestamp) {
  if (!isPlaying.value) return;
  const durationMs = Math.max(1000, animConfig.duration * 1000);
  const progress = Math.min(1, (timestamp - animationStartTime) / durationMs);
  currentK.value = animConfig.kStart + (animConfig.kEnd - animConfig.kStart) * progress;
  renderScene(false);
  if (progress < 1) {
    animationFrameId = requestAnimationFrame(animationLoop);
  } else {
    isPlaying.value = false;
  }
}

function togglePlay() {
  if (isPlaying.value) {
    isPlaying.value = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    return;
  }
  isPlaying.value = true;
  currentK.value = animConfig.kStart;
  animationStartTime = performance.now();
  animationFrameId = requestAnimationFrame(animationLoop);
}

function resetCamera() {
  renderScene(true);
}

onMounted(async () => {
  await nextTick();
  renderScene(true);
});

onUnmounted(() => {
  if (drawDebounceTimer) window.clearTimeout(drawDebounceTimer);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  plot3D?.dispose?.();
  plot3D = null;
});
</script>



<style scoped>
.space-shell {
  --page-bg: #f7fbff;
  --page-bg-2: #eef7ff;
  --panel: rgba(255, 255, 255, 0.78);
  --panel-strong: rgba(255, 255, 255, 0.92);
  --panel-soft: rgba(255, 255, 255, 0.58);
  --line: rgba(83, 128, 164, 0.16);
  --line-strong: rgba(21, 159, 143, 0.28);
  --text: #17334c;
  --muted: #5d7388;
  --faint: #8fa2b3;
  --accent: #0d8a73;
  --accent-2: #2f8fff;
  --accent-3: #23c6b7;
  --danger: #d94d5c;
  min-height: 100vh;
  padding: clamp(18px, 2vw, 32px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
  overflow: hidden;
  color: var(--text);
  background:
    radial-gradient(circle at 12% 10%, rgba(67, 154, 255, 0.16), transparent 28%),
    radial-gradient(circle at 86% 8%, rgba(35, 198, 183, 0.13), transparent 26%),
    radial-gradient(circle at 80% 88%, rgba(126, 163, 255, 0.16), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, var(--page-bg) 42%, var(--page-bg-2) 100%);
  isolation: isolate;
}

.space-bg,
.space-bg > * {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.space-bg {
  z-index: -1;
}

.bg-grid {
  background-image:
    linear-gradient(rgba(13, 138, 115, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(47, 143, 255, 0.045) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 52% 44%, black, transparent 76%);
  opacity: 0.9;
}

.bg-noise {
  opacity: 0.22;
  background-image:
    radial-gradient(circle at 18% 22%, rgba(13,138,115,0.18) 0 1px, transparent 1.5px),
    radial-gradient(circle at 65% 18%, rgba(47,143,255,0.17) 0 1px, transparent 1.5px),
    radial-gradient(circle at 80% 72%, rgba(15,23,42,0.11) 0 1px, transparent 1.5px);
  background-size: 120px 120px, 170px 170px, 230px 230px;
}

.bg-scan {
  background: linear-gradient(180deg, transparent, rgba(13, 138, 115, 0.055), transparent);
  height: 32%;
  animation: scanMove 8s ease-in-out infinite;
  opacity: 0.75;
}

.bg-orb {
  width: 44vw;
  height: 44vw;
  border-radius: 50%;
  filter: blur(52px);
  opacity: 0.48;
}

.orb-a {
  left: -18vw;
  top: 8%;
  background: rgba(77, 154, 255, 0.24);
}

.orb-b {
  right: -18vw;
  top: -16vw;
  background: rgba(35, 198, 183, 0.22);
}

.orb-c {
  right: 8%;
  bottom: -22vw;
  background: rgba(126, 163, 255, 0.22);
}

.space-hero,
.space-sidebar,
.space-main,
.canvas-card {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.76)),
    var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border-radius: 28px;
  box-shadow:
    0 24px 60px rgba(32, 78, 118, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 0 0 1px rgba(83, 128, 164, 0.08);
}

.space-hero {
  padding: clamp(18px, 2vw, 26px);
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.space-hero::after {
  content: '';
  position: absolute;
  inset: -1px;
  background:
    linear-gradient(110deg, rgba(13,138,115,0.08), transparent 38%, rgba(47,143,255,0.08)),
    radial-gradient(circle at 18% 0%, rgba(255,255,255,0.72), transparent 36%);
  pointer-events: none;
}

.hero-copy,
.space-summary {
  position: relative;
  z-index: 1;
}

.space-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(13, 138, 115, 0.09);
  border: 1px solid rgba(13, 138, 115, 0.18);
  color: #0d7564;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
  margin-bottom: 12px;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 18px rgba(13, 138, 115, 0.36);
}

.space-hero h2 {
  margin: 0;
  font-size: clamp(36px, 4.2vw, 62px);
  line-height: 0.96;
  letter-spacing: -0.055em;
  font-weight: 950;
  color: transparent;
  background: linear-gradient(110deg, #15324c 0%, #0d8a73 42%, #2f8fff 86%);
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: 0 12px 34px rgba(47, 143, 255, 0.08);
}

.space-hero p {
  margin: 10px 0 0;
  color: var(--muted);
  font-weight: 700;
}

.space-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
  min-width: min(520px, 48vw);
}

.summary-card {
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255,255,255,0.62);
  border: 1px solid rgba(83, 128, 164, 0.14);
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), 0 10px 22px rgba(37, 84, 123, 0.08);
}

.summary-card.primary {
  border-color: rgba(13,138,115,0.24);
  background: linear-gradient(135deg, rgba(13,138,115,0.10), rgba(255,255,255,0.72));
}

.summary-card span {
  color: var(--faint);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-card strong {
  color: var(--text);
  font-size: 15px;
  line-height: 1.45;
  word-break: break-word;
}

.space-layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 18px;
  min-height: 0;
}

.space-sidebar,
.space-main {
  padding: 18px;
}

.card-head,
.canvas-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.card-head strong,
.canvas-head strong {
  display: block;
  color: var(--text);
  font-size: 18px;
  font-weight: 900;
}

.eyebrow {
  display: block;
  color: var(--accent);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.count-pill,
.viewport-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(13,138,115,0.16);
  background: rgba(13, 138, 115, 0.08);
  color: #0d7564;
  font-weight: 900;
}

.viewport-status {
  gap: 8px;
  color: #466177;
  background: rgba(255,255,255,0.72);
  border-color: rgba(83, 128, 164, 0.13);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.viewport-status span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 16px rgba(13, 138, 115, 0.32);
}

.viewport-status span.live {
  background: #ff9f43;
  box-shadow: 0 0 18px rgba(255, 159, 67, 0.5);
}

.object-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.object-row {
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(83, 128, 164, 0.13);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.76), rgba(246,250,254,0.76));
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 26px rgba(37, 84, 123, 0.07), inset 0 1px 0 rgba(255,255,255,0.82);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.object-row::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, rgba(13,138,115,0.05), transparent 44%, rgba(47,143,255,0.05));
  opacity: 0;
  transition: opacity 0.22s ease;
  pointer-events: none;
}

.object-row:hover,
.object-row.active {
  transform: translateY(-2px);
  border-color: rgba(13, 138, 115, 0.34);
  box-shadow: 0 18px 36px rgba(13, 138, 115, 0.12), inset 0 1px 0 rgba(255,255,255,0.88);
}

.object-row.active::before {
  opacity: 1;
}

.object-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.object-toggle,
.toggle-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 800;
}

.object-toggle input,
.toggle-item input {
  accent-color: var(--accent);
}

.switch-visual {
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  border: 1px solid rgba(148, 163, 184, 0.26);
  position: relative;
}

.switch-visual::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  top: 2px;
  left: 2px;
  border-radius: 999px;
  background: white;
  box-shadow: 0 2px 7px rgba(15,23,42,0.15);
  transition: transform 0.2s ease, background 0.2s ease;
}

.object-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.object-toggle input:checked + .switch-visual {
  background: rgba(13, 138, 115, 0.16);
  border-color: rgba(13, 138, 115, 0.28);
}

.object-toggle input:checked + .switch-visual::after {
  transform: translateX(14px);
  background: var(--accent);
}

.focus-btn,
.remove-btn,
.add-btn,
.tool-btn {
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.focus-btn,
.add-btn,
.tool-btn {
  background: linear-gradient(135deg, #0d8a73, #23b5aa);
  color: white;
  box-shadow: 0 10px 22px rgba(13, 138, 115, 0.20);
}

.focus-btn,
.remove-btn {
  padding: 9px 13px;
}

.focus-btn:hover,
.add-btn:hover,
.tool-btn:hover,
.remove-btn:hover {
  transform: translateY(-1px);
}

.remove-btn {
  align-self: flex-start;
  background: rgba(217, 77, 92, 0.10);
  color: var(--danger);
  border: 1px solid rgba(217, 77, 92, 0.16);
}

.add-btn {
  width: 100%;
  padding: 13px 16px;
  margin-top: 14px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.add-btn span {
  font-size: 18px;
  line-height: 1;
}

.expr-line {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.color-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  flex: 0 0 auto;
  box-shadow: 0 0 16px currentColor;
}

.expr-line input,
.toolbar-field input {
  width: 100%;
  padding: 12px 13px;
  border-radius: 15px;
  border: 1px solid rgba(83, 128, 164, 0.18);
  background: rgba(255,255,255,0.82);
  color: var(--text);
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.expr-line input:focus,
.toolbar-field input:focus {
  border-color: rgba(13, 138, 115, 0.38);
  background: white;
  box-shadow: 0 0 0 4px rgba(13, 138, 115, 0.09), inset 0 1px 0 rgba(255,255,255,0.88);
}

.expr-line input::placeholder,
.toolbar-field input::placeholder {
  color: #9dafbf;
}

.space-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.space-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-radius: 22px;
  background: rgba(255,255,255,0.62);
  border: 1px solid rgba(83,128,164,0.12);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}

.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.toolbar-group.compact {
  justify-content: flex-end;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
}

.toolbar-field.featured span {
  color: var(--accent);
}

.toolbar-field input {
  min-width: 98px;
  max-width: 130px;
  padding: 10px 12px;
}

.tool-btn {
  padding: 12px 16px;
}

.tool-btn.secondary {
  background: rgba(13, 138, 115, 0.10);
  color: #0d7564;
  border: 1px solid rgba(13, 138, 115, 0.14);
  box-shadow: none;
}

.canvas-card {
  padding: 14px;
  position: relative;
  overflow: hidden;
}

.canvas-card::before {
  content: '';
  position: absolute;
  inset: 14px;
  border-radius: 22px;
  pointer-events: none;
  border: 1px solid rgba(47, 143, 255, 0.08);
}

.canvas-head {
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.space-canvas {
  min-height: 640px;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 24%, rgba(47,143,255,0.10), transparent 28%),
    radial-gradient(circle at 76% 78%, rgba(13,138,115,0.08), transparent 30%),
    linear-gradient(180deg, #ffffff, #f3f8fc 100%);
  border: 1px solid rgba(83, 128, 164, 0.15);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.9),
    0 18px 38px rgba(37, 84, 123, 0.11);
}

.space-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}

.space-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  padding: 0 4px;
}

.space-footer code {
  color: #0d7564;
  background: rgba(13, 138, 115, 0.08);
  border: 1px solid rgba(13, 138, 115, 0.12);
  padding: 2px 6px;
  border-radius: 7px;
}

.error-text {
  color: var(--danger);
  font-weight: 800;
}

@keyframes scanMove {
  0%, 100% { transform: translateY(-26%); opacity: 0.15; }
  45% { transform: translateY(180%); opacity: 0.45; }
}

@media (max-width: 1100px) {
  .space-layout {
    grid-template-columns: 1fr;
  }

  .space-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .space-summary {
    width: 100%;
    min-width: 0;
  }

  .space-footer {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .space-shell {
    padding: 14px;
  }

  .space-summary,
  .space-toolbar {
    grid-template-columns: 1fr;
  }

  .space-summary {
    display: flex;
    flex-direction: column;
  }

  .space-toolbar,
  .toolbar-group,
  .toolbar-group.compact {
    align-items: stretch;
  }

  .toolbar-field input {
    max-width: none;
  }

  .tool-btn,
  .focus-btn,
  .remove-btn {
    width: 100%;
  }

  .object-row-top {
    align-items: stretch;
    flex-direction: column;
  }

  .space-canvas {
    min-height: 480px;
  }
}
</style>

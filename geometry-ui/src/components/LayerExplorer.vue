<template>
  <section class="panel-card">
    <!-- Header -->
    <header class="panel-header">
      <div class="header-left">
        <div class="badge">
          <iconify-icon icon="mdi:layers-triple"></iconify-icon>
          <span>结构拆解</span>
        </div>
        <div class="title-group">
          <h2>函数结构解析</h2>
          <p class="en-subtitle">Function Structure Decomposition</p>
        </div>
      </div>

      <button class="btn ghost" @click="$emit('toggle-all')">
        <iconify-icon icon="mdi:tune-variant"></iconify-icon>
        全部切换
      </button>
    </header>

    <!-- 状态：解析错误 -->
    <div v-if="parseError" class="status error">
      <iconify-icon icon="mdi:alert-circle-outline" />
      <div class="status-text">
        <strong>解析失败</strong>
        <span>{{ parseError }}</span>
      </div>
    </div>

    <!-- 状态：等待输入 -->
    <div v-else-if="!layers.length" class="status empty">
      <div class="empty-icon">
        <iconify-icon icon="mdi:function-variant" />
      </div>
      <h3>等待函数输入</h3>
      <p class="en-hint">Enter a function to start analysis</p>
    </div>

    <!-- Layers 层级列表 -->
    <div v-else class="layer-list">
      <TransitionGroup name="list">
        <div
          v-for="layer in layers"
          :key="layer.id"
          class="layer"
          :class="{ active: activeLayerId === layer.id }"
          :style="{ '--c': layer.color || 'var(--accent-primary)' }"
        >
          <!-- 左侧树线 -->
          <div class="tree">
            <div
              v-for="(_, idx) in layer.depth"
              :key="idx"
              class="branch"
            >
              <span class="branch-line"></span>
              <span v-if="idx === layer.depth - 1" class="branch-dot"></span>
            </div>
          </div>

          <!-- 卡片 -->
          <div class="card" @click="$emit('select-layer', layer.id)">
            <div class="indicator"></div>

            <div class="content">
              <div class="top">
                <span class="title">
                  <iconify-icon icon="mdi:cube-outline" />
                  {{ layer.title }}
                </span>
                <span class="depth">L{{ layer.depth + 1 }}</span>
              </div>

              <div class="relation">
                <iconify-icon icon="mdi:arrow-right-bold" class="relation-icon" />
                <span class="relation-text">{{ layer.relation }}</span>
              </div>

              <pre class="expr">{{ layer.expr }}</pre>

              <div v-if="layer.derivativeLabel" class="derivative">
                <iconify-icon icon="mdi:math-integral-box" />
                <span class="derivative-text">{{ layer.derivativeLabel }}</span>
              </div>

              <div v-if="getLayerPreviewItems(layer).length" class="preview-strip">
                <div
                  v-for="preview in getLayerPreviewItems(layer)"
                  :key="`${layer.id}-${preview.id}`"
                  class="preview-item"
                >
                  <div class="preview-plot">
                    <canvas
                      :ref="(el) => setPreviewCanvas(layer.id, preview.id, el)"
                      class="preview-canvas"
                      width="320"
                      height="180"
                    ></canvas>
                  </div>
                  <div class="preview-meta">
                    <span v-if="preview.label" class="preview-label">{{ preview.label }}</span>
                    <code class="preview-expr">{{ preview.expr }}</code>
                  </div>
                </div>
              </div>
            </div>

            <!-- 眼睛按钮 -->
            <button
              class="eye"
              :class="{ visible: visibleLayerIds?.includes(layer.id) }"
              @click.stop="$emit('toggle-layer', layer.id)"
            >
              <iconify-icon :icon="visibleLayerIds?.includes(layer.id) ? 'mdi:eye' : 'mdi:eye-off'"></iconify-icon>
              <span class="eye-text">{{ visibleLayerIds?.includes(layer.id) ? '可见' : '隐藏' }}</span>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Footer -->
    <footer v-if="layers.length" class="footer">
      <div class="footer-stats">
        <span class="stat">
          <iconify-icon icon="mdi:layers-outline" />
          {{ layers.length }} Layers
        </span>
        <span class="stat">
          <iconify-icon icon="mdi:eye-check" />
          {{ visibleLayerIds?.length || 0 }} Visible
        </span>
        <span class="stat">
          <iconify-icon icon="mdi:cube-scan" />
          Depth {{ maxDepth }}
        </span>
      </div>
    </footer>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, watch } from 'vue';
import { renderFunctionPreview } from '../utils/plot-renderer';
import { themeState } from '../utils/theme-mode';

const props = defineProps({
  layers: {
    type: Array,
    default: () => []
  },
  activeLayerId: {
    type: String,
    default: null
  },
  visibleLayerIds: {
    type: Array,
    default: () => []
  },
  parseError: {
    type: String,
    default: null
  },
  kValue: {
    type: Number,
    default: 1
  },
  coordSystem: {
    type: String,
    default: 'cartesian'
  }
});

const emit = defineEmits(['select-layer', 'toggle-layer', 'toggle-all']);

const previewCanvasMap = new Map();

const maxDepth = computed(() => {
  if (!props.layers?.length) return 0;
  const maxDep = Math.max(0, ...props.layers.map(l => l.depth || 0));
  return maxDep + 1;
});

const previewSignature = computed(() => props.layers
  .map((layer) => {
    const sequence = getLayerPreviewItems(layer)
      .map((preview) => `${preview.id}:${preview.expr}`)
      .join('>');
    return `${layer.id}:${layer.color || ''}:${sequence}`;
  })
  .join('|'));

function getLayerPreviewItems(layer) {
  if (Array.isArray(layer?.previewSequence) && layer.previewSequence.length) {
    return layer.previewSequence;
  }
  if (!layer?.expr) {
    return [];
  }
  return [{ id: 'current', label: 'Current', expr: layer.expr }];
}

function setPreviewCanvas(layerId, previewId, element) {
  const key = `${layerId}:${previewId}`;
  if (!element) {
    previewCanvasMap.delete(key);
    return;
  }
  previewCanvasMap.set(key, element);
}

function renderPreviewCanvases() {
  props.layers.forEach((layer) => {
    const previewItems = getLayerPreviewItems(layer);
    previewItems.forEach((preview) => {
      const canvas = previewCanvasMap.get(`${layer.id}:${preview.id}`);
      if (!canvas || !preview.expr) {
        return;
      }
      renderFunctionPreview(canvas, preview.expr, {
        coordSystem: props.coordSystem,
        kValue: props.kValue,
        strokeStyle: layer.color
      });
    });
  });
}

watch(
  [previewSignature, () => props.kValue, () => props.coordSystem, () => themeState.mode],
  async () => {
    await nextTick();
    renderPreviewCanvases();
  },
  { immediate: true }
);

onMounted(async () => {
  await nextTick();
  renderPreviewCanvases();
});
</script>

<style scoped>
/* ========= 组件样式 ========= */
.panel-card {
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  
  font-family: var(--font-main);
  height: min(760px, calc(100vh - 2rem));
  min-height: 520px;
  padding: 28px;
  border-radius: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--border-medium);
}

/* Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
  flex-shrink: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 6px 14px;
  border-radius: 100px;
  background: var(--accent-soft);
  color: var(--accent-primary);
  width: fit-content;
}

.badge iconify-icon {
  width: 16px;
  height: 16px;
}

.title-group h2 {
  font-size: 28px;
  font-weight: 900;
  margin: 14px 0 6px 0;
  background: linear-gradient(90deg, var(--text-primary), var(--text-secondary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.3px;
}

.en-subtitle {
  font-family: 'Times New Roman', 'Georgia', serif;
  font-size: 15px;
  font-weight: 600;
  font-style: italic;
  color: var(--text-secondary);
  margin: 0;
  letter-spacing: 0.3px;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  border-radius: 40px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-light);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  backdrop-filter: blur(4px);
}

.btn:hover {
  transform: translateY(-2px);
  background: var(--accent-soft);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: var(--shadow-sm);
}

.btn iconify-icon {
  width: 20px;
  height: 20px;
}

/* 状态区域 */
.status {
  border-radius: 24px;
  padding: 36px 28px;
  text-align: center;
  flex: 1;
  min-height: 0;
}

.status.error {
  display: flex;
  align-items: center;
  gap: 18px;
  text-align: left;
  background: var(--danger-bg);
  border-left: 5px solid var(--danger);
  padding: 22px 24px;
}

.status.error iconify-icon {
  width: 32px;
  height: 32px;
  color: var(--danger);
  flex-shrink: 0;
}

.status-text strong {
  font-size: 16px;
  font-weight: 800;
  display: block;
  margin-bottom: 6px;
  color: var(--danger-text);
}

.status-text span {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.status.empty {
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-light);
  backdrop-filter: blur(4px);
}

.empty-icon {
  width: 85px;
  height: 85px;
  margin: 0 auto 20px;
  background: var(--bg-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon iconify-icon {
  width: 44px;
  height: 44px;
  color: var(--text-tertiary);
  opacity: 0.6;
}

.status.empty h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 10px;
  color: var(--text-secondary);
}

.en-hint {
  font-family: 'Times New Roman', 'Georgia', serif;
  font-size: 14px;
  font-weight: 600;
  font-style: italic;
  margin: 0;
  color: var(--text-tertiary);
}

/* 层级列表 */
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-right: 8px;
  scrollbar-gutter: stable;
}

.layer-list::-webkit-scrollbar {
  width: 8px;
}

.layer-list::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--bg-tertiary) 78%, transparent);
  border-radius: 999px;
}

.layer-list::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--accent-primary) 38%, transparent);
  border-radius: 999px;
}

.layer-list::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent-primary) 56%, transparent);
}

.layer {
  display: flex;
  transition: all 0.2s ease;
}

/* 树线系统 */
.tree {
  width: 36px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.branch {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  min-height: 48px;
}

.branch-line {
  position: absolute;
  left: 50%;
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, var(--c), transparent);
  opacity: 0.3;
  transform: translateX(-50%);
}

.branch-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  background: var(--c);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px var(--c);
  animation: pulseDot 2.2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 1;
  }
}

/* 卡片 */
.card {
  flex: 1;
  display: flex;
  position: relative;
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2)), var(--bg-secondary);
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.4);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 12px 28px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
  border-color: var(--border-medium);
}

/* 左侧动态能量条 */
.indicator {
  width: 6px;
  background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 40%, white));
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 50%, transparent);
  transition: all 0.3s ease;
}

.layer.active .indicator {
  width: 8px;
  box-shadow: 0 0 14px color-mix(in srgb, var(--c) 70%, transparent);
}

/* 内容区域 */
.content {
  flex: 1;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}

.title iconify-icon {
  width: 20px;
  height: 20px;
  color: var(--c);
}

.depth {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 4px 10px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.relation {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 6px 14px;
  border-radius: 24px;
  width: fit-content;
  backdrop-filter: blur(4px);
}

.relation-icon {
  width: 14px;
  height: 14px;
}

.relation-text {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
  letter-spacing: -0.2px;
}

/* expr 表达式 */
.expr {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--c);
  background: linear-gradient(135deg, rgba(0,0,0,0.02), transparent), var(--bg-card);
  padding: 14px 18px;
  border-radius: 16px;
  border: 1px solid var(--border-light);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
  letter-spacing: 0.3px;
  white-space: pre-wrap;
  word-break: break-word;
  transition: border-color 0.2s;
}

.card:hover .expr {
  border-color: color-mix(in srgb, var(--c) 40%, var(--border-light));
}

.derivative {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 8px 14px;
  border-radius: 12px;
  width: fit-content;
  backdrop-filter: blur(4px);
}

.derivative iconify-icon {
  width: 16px;
  height: 16px;
  color: var(--accent-secondary);
}

.derivative-text {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 500;
}

.preview-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.preview-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-plot {
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
}

.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.preview-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.2px;
}

.preview-expr {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 激活态 */
.layer.active .card {
  border-color: var(--c);
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 14%, var(--bg-tertiary)), var(--bg-secondary));
  box-shadow: 0 10px 30px -10px color-mix(in srgb, var(--c) 40%, transparent);
}

/* 眼睛按钮 */
.eye {
  position: absolute;
  right: 14px;
  top: 14px;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-secondary) 82%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: var(--text-tertiary);
  opacity: 0;
  transform: translateY(-8px);
  transition: all 0.25s ease;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.card:hover .eye {
  opacity: 1;
  transform: translateY(0);
}

.eye:hover {
  background: var(--bg-secondary);
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: scale(1.02);
}

.eye.visible {
  background: var(--success-bg);
  color: var(--success-text);
  border-color: var(--success-text);
  opacity: 1;
  transform: translateY(0);
}

.eye-text {
  font-size: 10px;
  font-weight: 700;
  display: none;
}

@media (min-width: 640px) {
  .eye {
    width: 72px;
    flex-direction: column;
    height: 60px;
    gap: 4px;
  }
  .eye-text {
    display: inline-block;
  }
}

/* Footer */
.footer {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
}

.footer-stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 8px 18px;
  border-radius: 32px;
  backdrop-filter: blur(4px);
}

.stat iconify-icon {
  width: 18px;
  height: 18px;
  color: var(--accent-primary);
}

/* 动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 响应式 */
@media (max-width: 640px) {
  .panel-card {
    height: min(680px, calc(100vh - 1.5rem));
    min-height: 460px;
    padding: 18px;
  }
  .panel-header {
    margin-bottom: 18px;
  }
  .layer-list {
    padding-right: 4px;
  }
  .tree {
    width: 24px;
  }
  .content {
    padding: 14px 16px;
  }
  .title {
    font-size: 15px;
  }
  .expr {
    font-size: 13px;
    padding: 10px 12px;
  }
  .eye {
    width: 44px;
    height: 44px;
    right: 8px;
    top: 8px;
  }
  .btn span {
    display: none;
  }
  .footer-stats {
    gap: 12px;
  }
  .stat {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>

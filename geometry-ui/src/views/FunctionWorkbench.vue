<template>
  <section class="page-shell">
    <div class="hero-card" :style="{ '--hero-image': `url(${functionHero})` }">
      <div class="hero-text">
        <div class="hero-badge">交互式数学实验台</div>
        <h2>函数可视化<span>实验台</span></h2>
        <p>二维直角 · 二维极坐标 · 三维空间曲面</p>
      </div>
      <div class="hero-stats">
        <div class="stat-chip">
          <span class="stat-label">当前主函数</span>
          <span class="stat-value">{{ activeFunction?.expr || '未选择' }}</span>
        </div>
        <div class="stat-chip k-value">
          <span class="stat-label">参数 k</span>
          <span class="stat-value">{{ formatNumber(currentK, 4) }}</span>
        </div>
      </div>
    </div>

    <div class="control-panel">
      <div class="control-bar">
        <div class="segments">
          <button :class="['seg', { active: coordSystem === 'cartesian' }]" @click="coordSystem = 'cartesian'; resetView()">
            直角坐标
          </button>
          <button :class="['seg', { active: coordSystem === 'polar' }]" @click="coordSystem = 'polar'; resetView()">
            极坐标
          </button>
          <button class="seg" @click="openWorkbench3D">
            3D 坐标
          </button>
        </div>
        <div class="toggles">
          <label v-if="coordSystem !== 'space'" class="toggle-switch"><input type="checkbox" v-model="showMonotonicity"> 单调区间</label>
          <label v-if="coordSystem !== 'space'" class="toggle-switch"><input type="checkbox" v-model="showFeatures"> 几何特征</label>
          <label class="toggle-switch"><input type="checkbox" v-model="showKnowledgePet"> 桌面宠物</label>
        </div>
        <div class="actions">
          <button class="btn-icon" @click="resetView" title="重置视图">⟳</button>
          <button class="btn-icon danger" @click="clearTraces" title="清除轨迹">⌫</button>
        </div>
      </div>
      <div v-if="modeNotice" class="mode-notice">{{ modeNotice }}</div>

      <div class="preset-strip" v-if="coordSystem === 'cartesian'">
        <span class="preset-label">快速预设</span>
        <div class="preset-group">
          <button v-for="p in presets" :key="p.key" @click="loadPreset(p.key)">{{ p.label }}</button>
        </div>
      </div>

      <div class="compact-grid">
        <div class="card-elegant">
          <div class="card-header-elegant">
            <span class="card-icon">函数</span>
            <span class="card-title">函数列表</span>
            <span class="card-badge">{{ visibleFunctions.length }}</span>
          </div>
          <div class="func-list">
            <div v-for="({ func, sourceIndex }, idx) in visibleFunctions" :key="func.id" class="func-row" :class="{ active: func.id === activeFunctionId }">
              <button class="badge-accent" @click="setActiveFunction(func.id)">
                {{ func.id === activeFunctionId ? '主分析' : '设为焦点' }}
              </button>
              <span class="color-dot" :style="{ background: func.color }"></span>
              <span class="func-prefix">{{ coordPrefix }}{{ idx + 1 }} =</span>
              <input v-model="func.expr" type="text" :placeholder="expressionPlaceholder" @focus="setActiveFunction(func.id)" @input="debounceDraw" @keyup.enter="scheduleDraw(true)">
              <button v-if="coordSystem !== 'space' && functions.length > 1" class="btn-ghost-icon" @click="removeFunction(sourceIndex)">✕</button>
            </div>
          </div>
          <button v-if="coordSystem !== 'space'" class="btn-add-elegant" @click="addFunction">+ 添加函数</button>
        </div>

        <div class="card-elegant" v-if="coordSystem === 'cartesian'">
          <div class="card-header-elegant">
            <span class="card-icon">动画</span>
            <span class="card-title">参数动画</span>
            <span class="card-badge">动态追踪</span>
          </div>
          <div class="anim-grid">
            <div class="param-group">
              <div class="param-item"><label>起始 k</label><input type="number" v-model.number="animConfig.kStart" class="input-mini" @input="debounceDraw"></div>
              <div class="param-item"><label>终止 k</label><input type="number" v-model.number="animConfig.kEnd" class="input-mini" @input="debounceDraw"></div>
              <div class="param-item"><label>时长(s)</label><input type="number" v-model.number="animConfig.duration" class="input-mini"></div>
              <div class="param-item"><label>追踪 x</label><input type="number" v-model.number="tracePointX" class="input-mini" @input="debounceDraw"></div>
            </div>
            <div class="anim-controls">
              <button class="btn-play" @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
              <button class="btn-reset" @click="resetAnimation">重置</button>
              <button class="btn-record-elegant" :class="{ recording: isRecording }" @click="toggleRecord">
                <span class="record-dot"></span> {{ isRecording ? '录制中' : '录制视频' }}
              </button>
            </div>
            <div class="progress-elegant" @click="seekAnimation">
              <div class="progress-track-bg"></div>
              <div class="progress-fill-glow" :style="{ width: `${animProgress * 100}%` }"></div>
              <div class="progress-handle-glass" :style="{ left: `${animProgress * 100}%` }"></div>
            </div>
            <div class="degeneration-tip-elegant">{{ degenerationHint }}</div>
          </div>
        </div>

        <div class="card-elegant">
          <div class="card-header-elegant">
            <span class="card-icon">视图</span>
            <span class="card-title">视图控制</span>
            <span class="card-badge">实时</span>
          </div>
          <div class="view-controls" v-if="coordSystem === 'cartesian'">
            <div class="view-axis"><span class="axis-label">X 轴</span><input type="number" v-model.number="manualXMin" @change="applyManualView" class="input-mini"><span class="sep">—</span><input type="number" v-model.number="manualXMax" @change="applyManualView" class="input-mini"></div>
            <div class="view-axis"><span class="axis-label">Y 轴</span><input type="number" v-model.number="manualYMin" @change="applyManualView" class="input-mini"><span class="sep">—</span><input type="number" v-model.number="manualYMax" @change="applyManualView" class="input-mini"></div>
          </div>
          <div class="view-controls" v-else-if="coordSystem === 'polar'">
            <div class="view-axis"><span class="axis-label">θ 范围</span><input type="number" v-model.number="polarAngleRange.min" @change="applyManualView" class="input-mini"><span class="sep">~</span><input type="number" v-model.number="polarAngleRange.max" @change="applyManualView" class="input-mini"><span class="unit">°</span></div>
          </div>
          <div v-else class="view-controls">
            <div class="view-axis"><span class="axis-label">三维画布</span><span class="shortcut-hint">输入一个空间图像后直接旋转观察</span></div>
          </div>
          <div class="view-shortcuts">
            <span class="shortcut-hint">{{ primaryShortcutHint }}</span>
            <span class="shortcut-hint">{{ secondaryShortcutHint }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="workspace">
      <div class="canvas-area">
        <div class="canvas-header-elegant">
          <div class="canvas-title">
            <span class="title-icon">画布</span>
            <h3>{{ canvasTitle }}</h3>
          </div>
          <div v-if="coordSystem === 'cartesian'" class="canvas-legend-elegant">
            <span class="legend-dot green"></span><span>递增</span>
            <span class="legend-dot orange"></span><span>递减</span>
            <span class="legend-dash"></span><span>子函数叠层</span>
          </div>
          <div class="canvas-tools-elegant">
            <label class="tool-switch"><input type="checkbox" v-model="wheelZoomEnabled"> 滚轮缩放</label>
            <button class="tool-icon" @click="nudgeView('left')">←</button>
            <button class="tool-icon" @click="nudgeView('right')">→</button>
            <button class="tool-icon" @click="zoomCanvas(0.88)">+</button>
            <button class="tool-icon" @click="zoomCanvas(1.14)">−</button>
          </div>
        </div>
        <div class="canvas-wrapper-glass">
          <div ref="canvasRef" class="canvas-3d-host"></div>
        </div>
        <div class="canvas-footer-elegant">
          <span v-for="chip in canvasFooterChips" :key="chip" class="footer-chip">{{ chip }}</span>
        </div>

        <div class="gallery-elegant">
          <div class="gallery-header-elegant">
            <span>数学画廊</span>
            <span>函数 · 导数 · 渐近线</span>
          </div>
          <div class="gallery-grid-elegant">
            <div v-for="item in functionIllustrations" :key="item.title" class="gallery-card">
              <img :src="item.image" :alt="item.title" class="gallery-img-fixed" @error="e => e.target.style.display = 'none'">
              <div class="gallery-info"><strong>{{ item.title }}</strong><span>{{ item.note }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="coordSystem !== 'space' && supportsDetailedAnalysis" class="info-card-glass">
          <div class="info-card-header"><span>当前层</span> 当前层影响 <span class="info-tag">{{ activeLayer?.relation || '最终结果' }}</span></div>
          <div v-if="activeLayer" class="info-card-body">
            <code class="expr-code">{{ activeLayer.expr }}</code>
            <p class="derivative-text">{{ activeLayer.derivativeLabel }}</p>
            <p class="hint-text">{{ activeLayer.hint }}</p>
            <p class="impact-text">{{ layerImpactText }}</p>
          </div>
          <div v-else class="empty-glass">选择一个层级查看解释</div>
        </div>

        <div v-if="coordSystem !== 'space' && supportsDetailedAnalysis" class="info-card-glass">
          <div class="info-card-header"><span>故事</span> 变换故事 <span class="info-tag">{{ layerAnalysis.story.length }}步</span></div>
          <ol class="story-list-glass" v-if="layerAnalysis.story.length">
            <li v-for="step in layerAnalysis.story" :key="step">{{ step }}</li>
          </ol>
          <div v-else class="empty-glass">输入复合函数后会自动生成变换过程</div>
        </div>

        <div v-if="coordSystem === 'cartesian' && activeGraphKind === 'curve'" class="info-card-glass">
          <div class="info-card-header"><span>区间</span> 单调区间 <span class="info-tag">{{ monotonicIntervals.length }}段</span></div>
          <div v-if="!monotonicIntervals.length" class="empty-glass">当前视图无稳定区间</div>
          <div v-else class="interval-list-glass">
            <div v-for="inv in monotonicIntervals" :key="inv.startX" :class="['interval-item-glass', inv.type]">
              <span>{{ inv.label }}</span><span class="interval-range">[{{ formatNumber(inv.startX) }}, {{ formatNumber(inv.endX) }}]</span>
            </div>
          </div>
        </div>

        <div v-if="coordSystem !== 'space'" class="info-card-glass">
          <div class="info-card-header"><span>特征</span> 几何特征 <span class="info-tag">{{ featureSummaryTagDisplay }}</span></div>
          <div class="feature-list-glass">
            <div v-for="note in featureNotesDisplay" :key="note" class="feature-item-glass">
              <span class="feature-marker">●</span><span>{{ note }}</span>
            </div>
          </div>
        </div>
      </div>

      <aside v-if="coordSystem !== 'space' && supportsDetailedAnalysis" class="info-sidebar-elegant">
        <LayerExplorer :layers="layerAnalysis.layers" :active-layer-id="activeLayerId" :visible-layer-ids="visibleLayerIds" :parse-error="layerAnalysis.parseError" :k-value="currentK" :coord-system="coordSystem" @select-layer="selectLayer" @toggle-layer="toggleLayerVisibility" @toggle-all="toggleAllVisibleLayers" />
      </aside>
    </div>

    <KnowledgePet v-if="showKnowledgePet" :functions="functions" :active-function-id="activeFunctionId" />
  </section>
</template>

<script setup>
// ========== 璇峰皢鎮ㄥ師鏈夌殑鎵€鏈?script 浠ｇ爜瀹屾暣绮樿创鍦ㄦ澶?==========
// 鍖呮嫭锛歩mport銆乧omputed銆乺ef銆乺eactive銆亀atch銆佹墍鏈夊嚱鏁般€佺敓鍛藉懆鏈熺瓑
// 浠ヤ笅鏄偍鍘熸湁浠ｇ爜鐨勫畬鏁翠繚鐣欙紙浠庢偍鎻愪緵鐨勫師濮嬩唬鐮佷腑澶嶅埗锛?
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import LayerExplorer from '../components/LayerExplorer.vue';
import KnowledgePet from '../components/KnowledgePet.vue';
import { analyzeExpressionLayers } from '../utils/expression-analysis';
import { consumePendingFunctionUnit, FUNCTION_WORKBENCH_PRESETS, getFunctionUnitById } from '../data/function-units';
import {
  COLORS, TRACE_COLOR, cloneViewState, collectFunctionData, computeAutoView,
  computeMonotonicIntervals, createFeatureTraceStore, defaultView, drawCoordinateSystem,
  drawFeatureOverlay, drawMonotonicBands, drawPolyline, getCanvasTheme,
  recordFeatureSnapshot, resolveFeatureSnapshot, toCanvasX, toCanvasY, toMathX, toMathY
} from '../utils/plot-renderer';
import { compactExpression, formatNumber, normalizeExpression } from '../utils/expression-tools';
import { mediaLibrary } from '../utils/media-library';
import { createFunctionPlot3D } from '../utils/plot-renderer-3d';
import { themeState } from '../utils/theme-mode';

const router = useRouter();
const functionHero = computed(() => themeState.mode === 'night' ? mediaLibrary.functionHeroNight : mediaLibrary.functionHeroDay);
const functionReference = computed(() => themeState.mode === 'night' ? mediaLibrary.functionReferenceNight : mediaLibrary.functionReferenceDay);
const functionIllustrations = computed(() => themeState.mode === 'night' ? mediaLibrary.functionIllustrationsNight : mediaLibrary.functionIllustrationsDay);

const canvasRef = ref(null);
const coordSystem = ref('cartesian');
const showMonotonicity = ref(true);
const showFeatures = ref(true);
const showKnowledgePet = ref(true);
const wheelZoomEnabled = ref(false);
const wheelHint = ref('');
const modeNotice = ref('');
const DEFAULT_CARTESIAN_VIEW = defaultView();

const functions = ref([
  { id: 1, expr: 'x^2', color: getFunctionUnitById('quadratic')?.color || COLORS[0] },
  { id: 2, expr: 'sin(x)', color: getFunctionUnitById('sine')?.color || COLORS[1] }
]);
const activeFunctionId = ref(1);

const viewState = reactive(defaultView());
const polarAngleRange = reactive({ min: 0, max: 720 });
const manualXMin = ref(DEFAULT_CARTESIAN_VIEW.minX);
const manualXMax = ref(DEFAULT_CARTESIAN_VIEW.maxX);
const manualYMin = ref(DEFAULT_CARTESIAN_VIEW.minY);
const manualYMax = ref(DEFAULT_CARTESIAN_VIEW.maxY);
const samplingWindow = reactive({ min: DEFAULT_CARTESIAN_VIEW.minX, max: DEFAULT_CARTESIAN_VIEW.maxX });

const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const viewStart = reactive({ minX: 0, maxX: 0, minY: 0, maxY: 0 });

const isPlaying = ref(false);
const animProgress = ref(0);
const currentK = ref(1);
const animConfig = reactive({
  kStart: 4,
  kEnd: 0.2,
  initialK: 1,
  duration: 6
});
const tracePointX = ref(1);
const pointTrace = ref([]);
const featureTraceStore = reactive(createFeatureTraceStore());
let animationFrameId = null;
let animationStartTime = 0;

const isRecording = ref(false);
let mediaRecorder = null;
let recordedChunks = [];
let wheelHintTimer = null;
let modeNoticeTimer = null;
let drawDebounceTimer = null;
let plot3D = null;
const activeGraphKind = ref('curve');

const visibleLayerIds = ref([]);
const activeLayerId = ref('');
const monotonicIntervals = ref([]);
const currentFeatureSnapshot = ref({ family: 'generic', points: {}, horizontalLines: [], verticalLines: [], notes: [] });

const activeFunction = computed(() => functions.value.find((item) => item.id === activeFunctionId.value) || functions.value[0] || null);
const normalizedActiveExpression = computed(() => normalizeExpression(activeFunction.value?.expr || ''));
const layerAnalysis = computed(() => analyzeExpressionLayers(activeFunction.value?.expr || ''));
const activeLayer = computed(() => layerAnalysis.value.layers.find((item) => item.id === activeLayerId.value) || layerAnalysis.value.layers[0] || null);
const isSpaceMode = computed(() => coordSystem.value === 'space');
const isPlanarMode = computed(() => coordSystem.value !== 'space');
const supportsDetailedAnalysis = computed(() => ['curve', 'polar-curve'].includes(activeGraphKind.value));

const visibleFunctions = computed(() => {
  if (!isSpaceMode.value) {
    return functions.value.map((func, sourceIndex) => ({ func, sourceIndex }));
  }

  const focusedIndex = functions.value.findIndex((item) => item.id === activeFunctionId.value);
  const fallbackIndex = functions.value.findIndex((item) => item.expr.trim());
  const hasFocusedExpression = focusedIndex >= 0 && functions.value[focusedIndex]?.expr?.trim();
  const sourceIndex = hasFocusedExpression ? focusedIndex : Math.max(0, fallbackIndex);
  const func = functions.value[sourceIndex] || functions.value[0] || null;
  return func ? [{ func, sourceIndex }] : [];
});

const coordPrefix = computed(() => {
  if (coordSystem.value === 'polar') return 'r';
  if (coordSystem.value === 'space') return 'S';
  return 'f';
});

const expressionPlaceholder = computed(() => {
  if (coordSystem.value === 'polar') return '例如 r = 2 * sin(theta)';
  if (coordSystem.value === 'space') return '例如 z = x^2 + y^2 或 x^2 + y^2 + z^2 = 25';
  return '例如 y = x^2 或 sin(x)';
});

const visibleLayerNames = computed(() => layerAnalysis.value.layers
  .filter((layer) => visibleLayerIds.value.includes(layer.id) && layer.id !== layerAnalysis.value.layers[0]?.id)
  .map((layer) => layer.expr));

const layerImpactText = computed(() => {
  if (!activeLayer.value) return '';
  const rootLayer = layerAnalysis.value.layers[0];
  if (activeLayer.value.id === rootLayer?.id) {
    return '这是最终结果层，所有内部子函数和运算都会在这里汇合。';
  }
  return `当前层会先生成 ${activeLayer.value.expr} 这条中间图像，再继续参与外层运算。`;
});

const featureSummaryTag = computed(() => {
  const family = currentFeatureSnapshot.value.family;
  if (family === 'quadratic') return '抛物线';
  if (family?.includes('reciprocal')) return '双曲线 / 渐近线';
  if (family === 'trigonometric') return '周期函数';
  if (family === 'implicit-line') return '二维隐式直线';
  if (family === 'surface') return '三维曲面';
  if (family === 'plane') return '隐式平面';
  if (family === 'implicit-surface') return '隐式曲面';
  if (family === 'implicit') return '隐式方程';
  return '自动识别';
});

const featureNotes = computed(() => {
  const notes = [...(currentFeatureSnapshot.value.notes || [])];
  const vertex = currentFeatureSnapshot.value.points?.vertex;
  const focus = currentFeatureSnapshot.value.points?.focus;
  if (vertex) notes.unshift(`顶点约为 (${formatNumber(vertex.x)}, ${formatNumber(vertex.y)})`);
  if (focus) notes.unshift(`焦点约为 (${formatNumber(focus.x)}, ${formatNumber(focus.y)})`);
  if (!notes.length) {
    notes.push('当前函数没有识别出可追踪的经典几何特征。');
  }
  return notes;
});

const featureSummaryTagDisplay = computed(() => {
  if (activeGraphKind.value === 'implicit-line') return '二维隐式直线';
  if (activeGraphKind.value === 'implicit-curve') return '二维隐式曲线';
  if (activeGraphKind.value === 'surface') return '三维曲面';
  if (activeGraphKind.value === 'plane') return '隐式平面';
  if (activeGraphKind.value === 'implicit-surface') return '隐式曲面';
  if (activeGraphKind.value === 'implicit') return '隐式方程';
  return featureSummaryTag.value;
});

const featureNotesDisplay = computed(() => {
  if (activeGraphKind.value === 'implicit-line') {
    return ['当前输入会按二维隐式直线渲染，例如 x + y = 1、2x - 3y = 6、x = 4。'];
  }
  if (activeGraphKind.value === 'implicit-curve') {
    return ['当前输入会按二维隐式曲线渲染，例如 x^2 + y^2 = 25、xy = 1、x^2 - y = 0。'];
  }
  if (activeGraphKind.value === 'surface') {
    return ['当前输入会按三维曲面渲染，坐标含义为 x-y-z。'];
  }
  if (activeGraphKind.value === 'plane') {
    return ['当前输入会按三维平面渲染，例如 x + y + z = 10。'];
  }
  if (activeGraphKind.value === 'implicit-surface') {
    return ['当前输入会按隐式曲面渲染，适合球面、圆柱面等空间图像。'];
  }
  if (activeGraphKind.value === 'implicit') {
    return ['当前采样范围内没有找到可见图像，请尝试调整表达式或范围。'];
  }
  return featureNotes.value;
});

const canvasTitle = computed(() => {
  if (coordSystem.value === 'polar') return '二维极坐标画布';
  if (coordSystem.value === 'space') return '三维空间图像画布';
  return '二维直角坐标画布';
});

const primaryShortcutHint = computed(() => {
  if (coordSystem.value === 'space') return '左键旋转 / 右键平移';
  return '左键拖拽平移画布';
});

const secondaryShortcutHint = computed(() => {
  if (coordSystem.value === 'space') return '滚轮缩放（可切换）';
  return '滚轮平移，按住 Ctrl 或开启开关可缩放';
});

const canvasFooterChips = computed(() => {
  if (coordSystem.value === 'space') {
    return [
      `空间模式`,
      `表达式: ${normalizedActiveExpression.value || '—'}`,
      `图像类型: ${featureSummaryTagDisplay.value}`
    ];
  }

  return [
    `当前层: ${activeLayer.value?.title || '—'}`,
    `表达式: ${normalizedActiveExpression.value || '—'}`,
    `子层: ${visibleLayerNames.value.join(', ') || '无'}`
  ];
});

const degenerationHint = computed(() => {
  if (coordSystem.value !== 'cartesian') {
    return '参数动画当前仅在直角坐标模式下启用。';
  }
  if (animConfig.kStart === animConfig.kEnd) {
    return '当前参数范围固定，播放时会保持同一条函数曲线。';
  }
  const direction = animConfig.kEnd > animConfig.kStart ? '增大' : '减小';
  return `参数 k 将从 ${formatNumber(animConfig.kStart, 2)} ${direction} 到 ${formatNumber(animConfig.kEnd, 2)}。`;
});
watch(layerAnalysis, (analysis) => {
  if (!analysis.layers.length) {
    activeLayerId.value = '';
    visibleLayerIds.value = [];
    return;
  }
  const rootId = analysis.layers[0].id;
  if (!analysis.layers.some((layer) => layer.id === activeLayerId.value)) {
    activeLayerId.value = rootId;
  }
  visibleLayerIds.value = visibleLayerIds.value.filter((id) => analysis.layers.some((layer) => layer.id === id));
  if (!visibleLayerIds.value.length) {
    visibleLayerIds.value = analysis.layers.slice(1, 3).map((layer) => layer.id);
  }
  draw(false);
}, { immediate: true });

watch(
  () => [coordSystem.value, currentK.value, showMonotonicity.value, showFeatures.value, activeFunctionId.value, functions.value.map((item) => item.expr).join('|')],
  () => draw(false)
);

watch(() => themeState.mode, () => draw(false));

watch(wheelZoomEnabled, (enabled) => {
  plot3D?.setWheelZoomEnabled?.(enabled);
});

watch(coordSystem, (mode) => {
  if (mode !== 'space') return;
  if (activeFunction.value?.expr?.trim()) return;
  const firstFilled = functions.value.find((item) => item.expr.trim());
  if (firstFilled) {
    activeFunctionId.value = firstFilled.id;
    return;
  }
  functions.value = [{ id: Date.now(), expr: 'z = x^2 + y^2', color: COLORS[0] }];
  activeFunctionId.value = functions.value[0].id;
});

function scheduleDraw(shouldAutoFit = false) {
  if (drawDebounceTimer) window.clearTimeout(drawDebounceTimer);
  drawDebounceTimer = null;
  draw(shouldAutoFit);
}

function debounceDraw() {
  if (drawDebounceTimer) window.clearTimeout(drawDebounceTimer);
  drawDebounceTimer = window.setTimeout(() => {
    drawDebounceTimer = null;
    draw(false);
  }, 80);
}

function syncManualInputs() {
  manualXMin.value = viewState.minX;
  manualXMax.value = viewState.maxX;
  manualYMin.value = viewState.minY;
  manualYMax.value = viewState.maxY;
}

function syncSamplingWindow(min = manualXMin.value, max = manualXMax.value) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return;
  samplingWindow.min = min;
  samplingWindow.max = max;
}

function setCartesianView(view, { isUserControlled = true } = {}) {
  viewState.minX = view.minX;
  viewState.maxX = view.maxX;
  viewState.minY = view.minY;
  viewState.maxY = view.maxY;
  viewState.isUserControlled = isUserControlled;
  syncSamplingWindow(view.minX, view.maxX);
  syncManualInputs();
}

function getModeFeatureNotes(kind) {
  if (kind === 'implicit-line') {
    return ['当前输入会按二维隐式直线渲染，例如 x + y = 1、2x - 3y = 6、x = 4。'];
  }
  if (kind === 'implicit-curve') {
    return ['当前输入会按二维隐式曲线渲染，例如 x^2 + y^2 = 25、xy = 1、x^2 - y = 0。'];
  }
  if (kind === 'surface') {
    return ['当前输入会按三维曲面渲染，坐标含义为 x-y-z。'];
  }
  if (kind === 'plane') {
    return ['当前输入会按三维平面渲染，例如 x + y + z = 10。'];
  }
  if (kind === 'implicit-surface') {
    return ['当前输入会按隐式曲面渲染，适合球面、圆柱面等空间图像。'];
  }
  if (kind === 'implicit') {
    return ['当前采样范围内没有找到可见图像，请尝试调整表达式或范围。'];
  }
  return ['当前模式仅保留图像显示。'];
}

function showModeNotice(message) {
  modeNotice.value = message;
  if (modeNoticeTimer) window.clearTimeout(modeNoticeTimer);
  modeNoticeTimer = window.setTimeout(() => {
    modeNotice.value = '';
  }, 2600);
}

function openWorkbench3D() {
  router.push({ name: 'workbench-3d' });
}

function getActivePlotCanvas() {
  return plot3D?.getCaptureCanvas?.() || null;
}

function setActiveFunction(functionId) {
  activeFunctionId.value = functionId;
}

function addFunction() {
  const nextColor = COLORS[functions.value.length % COLORS.length];
  const item = { id: Date.now(), expr: '', color: nextColor };
  functions.value.push(item);
  activeFunctionId.value = item.id;
}

function removeFunction(index) {
  const removed = functions.value[index];
  functions.value.splice(index, 1);
  if (removed?.id === activeFunctionId.value) {
    activeFunctionId.value = functions.value[0]?.id || 0;
  }
  draw(true);
}

function resetTraceStores() {
  pointTrace.value = [];
  const emptyStore = createFeatureTraceStore();
  featureTraceStore.vertex.splice(0, featureTraceStore.vertex.length, ...emptyStore.vertex);
  featureTraceStore.focus.splice(0, featureTraceStore.focus.length, ...emptyStore.focus);
  featureTraceStore.directrix.splice(0, featureTraceStore.directrix.length, ...emptyStore.directrix);
  featureTraceStore.verticalAsymptotes.splice(0, featureTraceStore.verticalAsymptotes.length, ...emptyStore.verticalAsymptotes);
  featureTraceStore.horizontalAsymptotes.splice(0, featureTraceStore.horizontalAsymptotes.length, ...emptyStore.horizontalAsymptotes);
}

function clearTraces() {
  resetTraceStores();
  draw(false);
}

function applyManualView() {
  if (coordSystem.value === 'cartesian') {
    if (manualXMin.value >= manualXMax.value || manualYMin.value >= manualYMax.value) return;
    setCartesianView({
      minX: manualXMin.value,
      maxX: manualXMax.value,
      minY: manualYMin.value,
      maxY: manualYMax.value
    });
  } else if (coordSystem.value === 'polar') {
    if (polarAngleRange.min >= polarAngleRange.max) return;
  } else {
    draw(true);
    return;
  }
  draw(false);
}

function resetView() {
  if (coordSystem.value === 'cartesian') {
    setCartesianView(DEFAULT_CARTESIAN_VIEW);
  } else if (coordSystem.value === 'polar') {
    viewState.isUserControlled = false;
    polarAngleRange.min = 0;
    polarAngleRange.max = 720;
  } else {
    viewState.isUserControlled = false;
    viewState.minX = -8;
    viewState.maxX = 8;
    viewState.minY = -8;
    viewState.maxY = 8;
  }
  resetAnimation();
  draw(false);
}

function selectLayer(layerId) {
  activeLayerId.value = layerId;
  draw(false);
}

function toggleLayerVisibility(layerId) {
  const set = new Set(visibleLayerIds.value);
  if (set.has(layerId)) set.delete(layerId);
  else set.add(layerId);
  visibleLayerIds.value = Array.from(set);
  draw(false);
}

function toggleAllVisibleLayers() {
  const childLayerIds = layerAnalysis.value.layers.slice(1).map((layer) => layer.id);
  if (visibleLayerIds.value.length >= childLayerIds.length) {
    visibleLayerIds.value = [];
  } else {
    visibleLayerIds.value = childLayerIds;
  }
  draw(false);
}

function applyPresetConfig(preset, color) {
  if (!preset) return false;
  const nextColor = color || COLORS[0];
  functions.value = [{ id: Date.now(), expr: preset.expression, color: nextColor }];
  animConfig.kStart = preset.kStart;
  animConfig.kEnd = preset.kEnd;
  animConfig.initialK = Number.isFinite(preset.initialK) ? preset.initialK : preset.kStart;
  animConfig.duration = preset.duration || 6;
  tracePointX.value = preset.tracePointX || 1;
  manualXMin.value = preset.view?.minX ?? DEFAULT_CARTESIAN_VIEW.minX;
  manualXMax.value = preset.view?.maxX ?? DEFAULT_CARTESIAN_VIEW.maxX;
  manualYMin.value = preset.view?.minY ?? DEFAULT_CARTESIAN_VIEW.minY;
  manualYMax.value = preset.view?.maxY ?? DEFAULT_CARTESIAN_VIEW.maxY;
  syncSamplingWindow(manualXMin.value, manualXMax.value);
  return true;
}

function applyFunctionUnitPreset(unitId) {
  const unit = getFunctionUnitById(unitId);
  if (!unit?.workbenchPreset) return false;
  return applyPresetConfig(unit.workbenchPreset, unit.color);
}

function applyCustomPendingUnit(unit) {
  const expression = normalizeExpression(unit?.workbenchExpression || unit?.expression || '');
  if (!expression) return false;
  viewState.isUserControlled = false;
  resetTraceStores();
  applyPresetConfig({
    expression,
    kStart: 1,
    kEnd: 1,
    initialK: 1,
    duration: 6,
    tracePointX: 1,
    view: unit?.workbenchPreset?.view || DEFAULT_CARTESIAN_VIEW
  }, unit?.color || COLORS[0]);
  activeFunctionId.value = functions.value[0].id;
  resetAnimation();
  draw(true);
  return true;
}

function loadPreset(type) {
  viewState.isUserControlled = false;
  resetTraceStores();

  const aliasMap = {
    parabola: 'quadratic',
    shiftedParabola: 'quadratic',
    hyperbola: 'reciprocal',
    shiftedHyperbola: 'logarithmic',
    sine: 'sine'
  };

  if (applyFunctionUnitPreset(aliasMap[type] || type)) {
    activeFunctionId.value = functions.value[0].id;
    resetAnimation();
    applyManualView();
    return;
  }

  if (type === 'composite') {
    applyPresetConfig({
      expression: 'sin(x^2) + cos(x)',
      kStart: 1,
      kEnd: 1,
      initialK: 1,
      duration: 4,
      tracePointX: 1,
      view: { minX: -4, maxX: 4, minY: -2.5, maxY: 2.5 }
    }, COLORS[0]);
  }

  activeFunctionId.value = functions.value[0].id;
  resetAnimation();
  applyManualView();
}

function updateKFromProgress() {
  currentK.value = animConfig.kStart + (animConfig.kEnd - animConfig.kStart) * animProgress.value;
}

function recordCurrentFrameState() {
  if (!activeFunction.value?.expr) return;
  try {
    const sampledData = collectFunctionData({
      expression: activeFunction.value.expr,
      coordSystem: coordSystem.value,
      calcMin: tracePointX.value,
      calcMax: tracePointX.value,
      steps: 1,
      kValue: currentK.value
    });
    activeGraphKind.value = sampledData.kind || activeGraphKind.value;
    if (sampledData.kind === 'curve') {
      const point = sampledData.points.find(Boolean);
      if (point) {
        pointTrace.value.push({ x: point.x, y: point.y, z: point.z });
      }
    }
  } catch (error) {}
  if (activeGraphKind.value !== 'curve') {
    const notes = getModeFeatureNotes(activeGraphKind.value);
    currentFeatureSnapshot.value = { family: activeGraphKind.value, points: {}, horizontalLines: [], verticalLines: [], notes };
    return;
  }
  if (coordSystem.value !== 'cartesian') {
    currentFeatureSnapshot.value = { family: activeGraphKind.value, points: {}, horizontalLines: [], verticalLines: [], notes: [] };
    return;
  }
  const snapshot = resolveFeatureSnapshot(activeFunction.value.expr, currentK.value);
  currentFeatureSnapshot.value = snapshot;
  recordFeatureSnapshot(featureTraceStore, snapshot);
}

function animationLoop(timestamp) {
  if (!isPlaying.value) return;
  const elapsed = (timestamp - animationStartTime) / 1000;
  animProgress.value = Math.min(1, elapsed / animConfig.duration);
  updateKFromProgress();
  recordCurrentFrameState();
  draw(false);
  if (animProgress.value < 1) {
    animationFrameId = requestAnimationFrame(animationLoop);
  } else {
    isPlaying.value = false;
    if (isRecording.value) stopRecording();
  }
}

function startAnimation() {
  isPlaying.value = true;
  if (animProgress.value >= 1) {
    animProgress.value = 0;
    resetTraceStores();
  }
  animationStartTime = performance.now() - animProgress.value * animConfig.duration * 1000;
  animationFrameId = requestAnimationFrame(animationLoop);
}

function pauseAnimation() {
  isPlaying.value = false;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

function togglePlay() {
  if (isPlaying.value) pauseAnimation();
  else startAnimation();
}

function resetAnimation() {
  pauseAnimation();
  animProgress.value = 0;
  currentK.value = Number.isFinite(animConfig.initialK) ? animConfig.initialK : animConfig.kStart;
  resetTraceStores();
  recordCurrentFrameState();
  draw(false);
}

function seekAnimation(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  animProgress.value = ratio;
  updateKFromProgress();
  draw(false);
}

function startRecording() {
  const canvas = plot3D?.getCaptureCanvas?.();
  if (!canvas || typeof MediaRecorder === 'undefined') return;
  recordedChunks = [];
  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  mediaRecorder = new MediaRecorder(stream, { mimeType });
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `function-animation-${Date.now()}.webm`;
    link.click();
    URL.revokeObjectURL(url);
  };
  mediaRecorder.start();
  isRecording.value = true;
  if (!isPlaying.value) {
    resetAnimation();
    startAnimation();
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording.value = false;
}

function toggleRecord() {
  if (isRecording.value) stopRecording();
  else startRecording();
}

function getComputationRange() {
  if (coordSystem.value === 'polar') {
    return { min: polarAngleRange.min, max: polarAngleRange.max };
  }
  if (coordSystem.value === 'space') {
    return { min: -8, max: 8 };
  }
  const baseMin = viewState.isUserControlled ? viewState.minX : samplingWindow.min;
  const baseMax = viewState.isUserControlled ? viewState.maxX : samplingWindow.max;
  const span = Math.max(1, baseMax - baseMin);
  const buffer = Math.max(0.6, span * 0.12);
  return {
    min: baseMin - buffer,
    max: baseMax + buffer
  };
}

function draw(shouldAutoFit = false) {
  const host = canvasRef.value;
  if (!host) return;
  if (!plot3D) {
    plot3D = createFunctionPlot3D(host);
    plot3D?.setWheelZoomEnabled?.(wheelZoomEnabled.value);
  }

  const width = Math.max(720, Math.floor(host.clientWidth || 1100));
  const currentCoordSystem = coordSystem.value;
  const isSpace = currentCoordSystem === 'space';
  const { min, max } = getComputationRange();
  const steps = isSpace
    ? Math.max(72, Math.min(180, Math.floor(width * 0.12)))
    : Math.max(720, Math.min(1400, Math.floor(width * 1.08)));

  const functionDataList = (isSpace ? visibleFunctions.value.map((item) => item.func) : functions.value)
    .filter((func) => func.expr.trim())
    .map((func) => ({
      ...func,
      data: collectFunctionData({
        expression: func.expr,
        coordSystem: currentCoordSystem,
        calcMin: min,
        calcMax: max,
        steps,
        kValue: currentK.value
      })
    }));

  if (currentCoordSystem === 'polar') {
    const redirectedItem = functionDataList.find((item) => item.data?.suggestedCoordSystem === 'cartesian');
    if (redirectedItem) {
      coordSystem.value = 'cartesian';
      showModeNotice('检测到非极坐标表达式，已自动切换到直角坐标显示。');
      resetView();
      return;
    }
  }

  const activeFunctionData = functionDataList.find((item) => item.id === activeFunctionId.value)?.data || null;
  activeGraphKind.value = activeFunctionData?.kind || 'curve';

  const shouldRefitCamera = shouldAutoFit || !viewState.isUserControlled;
  if (shouldRefitCamera && !isSpace) {
    const autoView = computeAutoView(functionDataList.map((item) => item.data), {
      coordSystem: currentCoordSystem,
      fallback: defaultView()
    });
    viewState.minX = autoView.minX;
    viewState.maxX = autoView.maxX;
    viewState.minY = autoView.minY;
    viewState.maxY = autoView.maxY;
    syncManualInputs();
  }

  const currentView = cloneViewState(viewState);
  const rootLayerId = layerAnalysis.value.layers[0]?.id;

  if (coordSystem.value === 'cartesian' && showMonotonicity.value && activeFunction.value?.expr && activeGraphKind.value === 'curve') {
    monotonicIntervals.value = computeMonotonicIntervals({
      expression: activeFunction.value.expr,
      view: currentView,
      kValue: currentK.value
    });
  } else {
    monotonicIntervals.value = [];
  }

  const visibleLayerDataList = currentCoordSystem === 'cartesian' && activeFunction.value?.expr && visibleLayerIds.value.length && activeGraphKind.value === 'curve'
    ? layerAnalysis.value.layers
      .filter((layer) => visibleLayerIds.value.includes(layer.id) && layer.id !== rootLayerId)
      .map((layer) => ({
        ...layer,
        data: collectFunctionData({
          expression: layer.expr,
          coordSystem: 'cartesian',
          calcMin: currentView.minX,
          calcMax: currentView.maxX,
          steps: Math.max(480, Math.min(960, Math.floor(width * 0.72))),
          kValue: currentK.value
        })
      }))
    : [];

  currentFeatureSnapshot.value = currentCoordSystem === 'cartesian' && activeGraphKind.value === 'curve'
    ? resolveFeatureSnapshot(activeFunction.value?.expr || '', currentK.value)
    : {
      family: activeGraphKind.value,
      points: {},
      horizontalLines: [],
      verticalLines: [],
      notes: getModeFeatureNotes(activeGraphKind.value)
    };

  plot3D?.render({
    view: currentView,
    coordSystem: currentCoordSystem,
    functionDataList,
    activeFunctionId: activeFunctionId.value,
    visibleLayerDataList,
    activeLayerId: activeLayerId.value,
    monotonicIntervals: monotonicIntervals.value,
    pointTrace: pointTrace.value,
    featureSnapshot: currentFeatureSnapshot.value,
    showFeatures: showFeatures.value,
    wheelZoomEnabled: wheelZoomEnabled.value
  }, { resetCamera: shouldRefitCamera });
}

function showWheelHint(message) {
  wheelHint.value = message;
  if (wheelHintTimer) window.clearTimeout(wheelHintTimer);
  wheelHintTimer = window.setTimeout(() => {
    wheelHint.value = '';
  }, 2200);
}

function zoomCanvas(factor) {
  if (coordSystem.value === 'space') {
    plot3D?.zoom?.(factor);
    return;
  }
  const centerX = (viewState.minX + viewState.maxX) / 2;
  const centerY = (viewState.minY + viewState.maxY) / 2;
  viewState.minX = centerX + (viewState.minX - centerX) * factor;
  viewState.maxX = centerX + (viewState.maxX - centerX) * factor;
  viewState.minY = centerY + (viewState.minY - centerY) * factor;
  viewState.maxY = centerY + (viewState.maxY - centerY) * factor;
  viewState.isUserControlled = true;
  syncManualInputs();
  draw(false);
}

function nudgeView(direction) {
  if (coordSystem.value === 'space') {
    plot3D?.pan?.(direction);
    return;
  }
  const step = Math.max(0.4, (viewState.maxX - viewState.minX) * 0.12);
  const delta = direction === 'left' ? -step : step;
  viewState.minX += delta;
  viewState.maxX += delta;
  viewState.isUserControlled = true;
  syncManualInputs();
  draw(false);
}

function panByWheel(deltaX, deltaY, canvas) {
  const width = canvas.clientWidth || canvas.width || 1;
  const height = canvas.clientHeight || canvas.height || 1;
  const mathRangeX = viewState.maxX - viewState.minX;
  const mathRangeY = viewState.maxY - viewState.minY;
  viewState.minX += (deltaX / width) * mathRangeX;
  viewState.maxX += (deltaX / width) * mathRangeX;
  viewState.minY -= (deltaY / height) * mathRangeY;
  viewState.maxY -= (deltaY / height) * mathRangeY;
  viewState.isUserControlled = true;
  syncManualInputs();
  draw(false);
}

function handleZoom(event) {
  if (!isPlanarMode.value) return;
  const canvas = getActivePlotCanvas();
  if (!canvas) return;
  event.preventDefault();
  const shouldZoom = wheelZoomEnabled.value || event.ctrlKey || event.metaKey;
  if (!shouldZoom) {
    panByWheel(event.deltaX, event.deltaY, canvas);
    if (Math.abs(event.deltaX) < 1 && Math.abs(event.deltaY) < 1) {
      showWheelHint('按住 Ctrl 再滚动，就能精准缩放');
    }
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const width = canvas.clientWidth || canvas.width || 1;
  const height = canvas.clientHeight || canvas.height || 1;
  const centerX = toMathX(mouseX, width, viewState);
  const centerY = toMathY(mouseY, height, viewState);
  const zoomFactor = event.deltaY > 0 ? 1.08 : 0.93;
  const newMinX = centerX + (viewState.minX - centerX) * zoomFactor;
  const newMaxX = centerX + (viewState.maxX - centerX) * zoomFactor;
  const newMinY = centerY + (viewState.minY - centerY) * zoomFactor;
  const newMaxY = centerY + (viewState.maxY - centerY) * zoomFactor;
  const rangeX = Math.abs(newMaxX - newMinX);
  const rangeY = Math.abs(newMaxY - newMinY);
  if (rangeX < 0.01 || rangeX > 10000 || rangeY < 0.01 || rangeY > 10000) return;
  viewState.minX = newMinX;
  viewState.maxX = newMaxX;
  viewState.minY = newMinY;
  viewState.maxY = newMaxY;
  viewState.isUserControlled = true;
  syncManualInputs();
  draw(false);
}

function handleMouseDown(event) {
  if (!isPlanarMode.value) return;
  if (event.button !== 0) return;
  const canvas = getActivePlotCanvas();
  if (!canvas) return;
  isDragging.value = true;
  const rect = canvas.getBoundingClientRect();
  dragStart.x = event.clientX - rect.left;
  dragStart.y = event.clientY - rect.top;
  viewStart.minX = viewState.minX;
  viewStart.maxX = viewState.maxX;
  viewStart.minY = viewState.minY;
  viewStart.maxY = viewState.maxY;
}

function handleMouseMove(event) {
  if (!isDragging.value) return;
  const canvas = getActivePlotCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = canvas.clientWidth || canvas.width || 1;
  const height = canvas.clientHeight || canvas.height || 1;
  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;
  const dx = dragStart.x - currentX;
  const dy = dragStart.y - currentY;
  const mathRangeX = viewStart.maxX - viewStart.minX;
  const mathRangeY = viewStart.maxY - viewStart.minY;
  viewState.minX = viewStart.minX + (dx / width) * mathRangeX;
  viewState.maxX = viewStart.maxX + (dx / width) * mathRangeX;
  viewState.minY = viewStart.minY + (dy / height) * mathRangeY;
  viewState.maxY = viewStart.maxY + (dy / height) * mathRangeY;
  viewState.isUserControlled = true;
  syncManualInputs();
  draw(false);
}

function handleMouseUp() {
  isDragging.value = false;
}

onMounted(async () => {
  await nextTick();
  if (canvasRef.value && !plot3D) {
    plot3D = createFunctionPlot3D(canvasRef.value);
    plot3D?.setWheelZoomEnabled?.(wheelZoomEnabled.value);
    canvasRef.value.addEventListener('wheel', handleZoom, { passive: false });
    canvasRef.value.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  const pendingUnit = consumePendingFunctionUnit();
  if (pendingUnit) {
    if (typeof pendingUnit === 'string') {
      loadPreset(pendingUnit);
      return;
    }
    if (pendingUnit.kind === 'builtin' && pendingUnit.id) {
      loadPreset(pendingUnit.id);
      return;
    }
    if (pendingUnit.kind === 'custom' && applyCustomPendingUnit(pendingUnit.unit)) {
      return;
    }
    if (pendingUnit.id) {
      loadPreset(pendingUnit.id);
      return;
    }
    return;
  }

  currentK.value = Number.isFinite(animConfig.initialK) ? animConfig.initialK : animConfig.kStart;
  setCartesianView(DEFAULT_CARTESIAN_VIEW);
  recordCurrentFrameState();
  draw(false);
});

onUnmounted(() => {
  pauseAnimation();
  if (wheelHintTimer) window.clearTimeout(wheelHintTimer);
  if (modeNoticeTimer) window.clearTimeout(modeNoticeTimer);
  if (drawDebounceTimer) window.clearTimeout(drawDebounceTimer);
  if (isRecording.value) stopRecording();
  canvasRef.value?.removeEventListener?.('wheel', handleZoom);
  canvasRef.value?.removeEventListener?.('mousedown', handleMouseDown);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  plot3D?.dispose?.();
  plot3D = null;
});

// 棰勮鍒楄〃
const presets = FUNCTION_WORKBENCH_PRESETS;
</script>

<style scoped>
/* ========== 绮捐嚧澶у瓧浣撶幇浠ｉ鏍?========== */
* {
  box-sizing: border-box;
}
/* 鑻辨枃瀛椾綋缁熶竴 */
.hero-badge,
.hero-text p,
.en-subtitle,
.shortcut-hint,
.legend-dot + span,
.footer-chip,
.info-tag,
.interval-range,
.type-text,
.degeneration-tip-elegant,
.stat-label,
.relation-text,
.derivative-text {
  font-family: 'Times New Roman', 'Georgia', serif;
}

/* 鑻辨枃鏂滀綋淇グ */
.hero-badge,
.en-subtitle,
.shortcut-hint {
  letter-spacing: 0.5px;
  font-style: italic;
}
.page-shell {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  background:
    radial-gradient(circle at 20% 10%, rgba(13,138,115,0.08), transparent 40%),
    radial-gradient(circle at 80% 90%, rgba(99,102,241,0.08), transparent 40%),
    linear-gradient(135deg, #eef2f7 0%, #e6ebf3 100%);

  min-height: 100vh;
}

/* Hero 鍖哄煙 - 澶у瓧浣?*/
.hero-card {
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(20px);

  border-radius: 2.2rem;
  padding: 2rem 2.8rem;

  border: 1px solid rgba(255,255,255,0.6);

  box-shadow:
    0 20px 60px rgba(0,0,0,0.08),
    inset 0 1px rgba(255,255,255,0.6);

  position: relative;
  overflow: hidden;
}
.hero-card::after {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(13,138,115,0.25), transparent 70%);
  top: -120px;
  right: -120px;
  filter: blur(40px);
}
.hero-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(13, 138, 115, 0.1) 0%, transparent 60%), var(--hero-image) center/cover;
  opacity: 0.35;
  pointer-events: none;
}
.hero-badge {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #0d8a73;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.hero-text h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #1a2a3a, #0d8a73);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
.hero-text p {
  font-size: 1rem;
  color: #5a6e8a;
  margin: 0.5rem 0 0;
}
.hero-stats {
  display: flex;
  gap: 1.2rem;
}
.stat-chip {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  padding: 0.6rem 1.5rem;
  border-radius: 2.5rem;
  border: 1px solid rgba(13, 138, 115, 0.2);
}
.stat-label {
  font-size: 0.75rem;
  color: #7a8aa8;
  display: block;
}
.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: #1e2a3a;
}
.k-value .stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #0d8a73;
}

/* 鎺у埗闈㈡澘 */
.control-panel {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 1.2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.control-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.mode-notice {
  padding: 0.7rem 1rem;
  border-radius: 1rem;
  background: rgba(13, 138, 115, 0.1);
  border: 1px solid rgba(13, 138, 115, 0.18);
  color: #0d8a73;
  font-size: 0.92rem;
  font-weight: 600;
}
.segments {
  display: flex;
  gap: 0.4rem;
  background: #eef2f8;
  padding: 0.3rem;
  border-radius: 3rem;
}
.seg {
  padding: 0.6rem 1.5rem;
  border-radius: 2.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.seg.active {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  color: #0d8a73;
}
.toggles {
  display: flex;
  gap: 1.5rem;
}
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  cursor: pointer;
  color: #3a4a6a;
  font-weight: 500;
}
.toggle-switch input {
  width: 18px;
  height: 18px;
  accent-color: #0d8a73;
}
.actions {
  display: flex;
  gap: 0.6rem;
}
.btn-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid #dce4ec;
  background: white;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
}
.btn-icon:hover {
  background: #f0f4fa;
  border-color: #0d8a73;
}

.preset-strip {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}
.preset-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #0d8a73;
}
.preset-group {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.preset-group button {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dce4ec;
  padding: 0.4rem 1rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}
.preset-group button:hover {
  background: #0d8a73;
  color: white;
  border-color: #0d8a73;
}

/* 涓夊垪缃戞牸鍗＄墖 - 澶у瓧浣?*/
.compact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.2rem;
}
.card-elegant {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(14px);

  border-radius: 1.6rem;

  border: 1px solid rgba(255,255,255,0.6);

  box-shadow:
    0 8px 24px rgba(0,0,0,0.06),
    inset 0 1px rgba(255,255,255,0.6);

  transition: all 0.25s ease;
}
.card-elegant:hover {
  transform: translateY(-4px);
  box-shadow:
    0 14px 40px rgba(0,0,0,0.08);
}
.card-header-elegant {
  padding: 1rem 1.2rem 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid #f0f4f8;
}
.card-icon {
  font-size: 1.3rem;
}
.card-title {
  font-weight: 700;
  font-size: 1rem;
  color: #1e2a3a;
}
.card-badge {
  margin-left: auto;
  font-size: 0.75rem;
  background: #eef2ff;
  padding: 0.25rem 0.6rem;
  border-radius: 1.2rem;
  color: #0d8a73;
  font-weight: 600;
}

/* 鍑芥暟鍒楄〃 */
.func-list {
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.func-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #fafcff;
  padding: 0.6rem 0.8rem;
  border-radius: 1rem;
  border: 1px solid #eef2f8;
}
.func-row.active {
  border-color: #0d8a73;
  background: #f0fdf9;
}
.badge-accent {
  background: #eef2ff;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 1.2rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  color: #0d8a73;
}
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px white, 0 0 0 3px rgba(0,0,0,0.05);
}
.func-prefix {
  font-family: monospace;
  font-size: 0.9rem;
  font-weight: 600;
  color: #5a6e8a;
}
.func-row input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  font-family: monospace;
  padding: 0.3rem;
  outline: none;
}
.btn-ghost-icon {
  background: transparent;
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-ghost-icon:hover {
  background: #fee2e2;
  color: #e85d10;
}
.btn-add-elegant {
  width: calc(100% - 1.6rem);
  margin: 0 0.8rem 1rem;
  background: #f0f4fa;
  border: 1px dashed #cbd5e1;
  padding: 0.6rem;
  border-radius: 2rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #0d8a73;
  transition: all 0.2s;
}
.btn-add-elegant:hover {
  background: #0d8a73;
  color: white;
}

/* 鍔ㄧ敾鍖哄煙 */
.anim-grid {
  padding: 0.8rem;
}
.param-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-bottom: 1rem;
}
.param-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #5a6e8a;
  font-weight: 500;
}
.input-mini {
  width: 70px;
  padding: 0.45rem 0.6rem;

  border-radius: 0.8rem;
  border: 1px solid #e2e8f0;

  background: rgba(255,255,255,0.9);

  transition: all 0.2s;
}
.input-mini:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
}
.anim-controls {
  display: flex;
  gap: 0.8rem;
  margin-bottom: 1rem;
}
.btn-play, .btn-reset, .btn-record-elegant {
  padding: 0.5rem 1.2rem;
  border-radius: 2rem;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-play {
  background: linear-gradient(135deg, #0d8a73, #0fb99b);
  color: white;
}
.btn-reset {
  background: #eef2f8;
  color: #3a4a6a;
}
.btn-record-elegant {
  background: #fee2e2;
  color: #e85d10;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.record-dot {
  width: 9px;
  height: 9px;
  background: #e85d10;
  border-radius: 50%;
}
.btn-record-elegant.recording .record-dot {
  animation: pulse-red 1s infinite;
}
.progress-elegant {
  position: relative;
  height: 5px;
  background: #eef2f8;
  border-radius: 3px;
  margin: 0.8rem 0;
  cursor: pointer;
}
.progress-fill-glow {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #0d8a73, #2dd4bf);
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(13, 138, 115, 0.5);
}
.progress-handle-glass {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: white;
  border: 2px solid #0d8a73;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.degeneration-tip-elegant {
  font-size: 0.75rem;
  background: #fef9e3;
  padding: 0.6rem;
  border-radius: 0.9rem;
  color: #b45309;
  line-height: 1.5;
}

/* 瑙嗗浘鎺у埗 */
.view-controls {
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.view-axis {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
}
.axis-label {
  width: 36px;
  font-weight: 700;
  color: #3a4a6a;
}
.view-shortcuts {
  padding: 0.6rem 0.8rem;
  border-top: 1px solid #f0f4f8;
  display: flex;
  gap: 1.2rem;
}
.shortcut-hint {
  font-size: 0.75rem;
  color: #8a9ab8;
  background: #f0f4fa;
  padding: 0.25rem 0.7rem;
  border-radius: 1.2rem;
}

/* 鐢诲竷鍖哄煙 */
.workspace {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.25rem;
  align-items: start;
}
.canvas-area {
  background: rgba(255,255,255,0.95);
  border-radius: 2rem;

  border: 1px solid rgba(255,255,255,0.7);

  box-shadow:
    0 20px 60px rgba(0,0,0,0.08);

  overflow: hidden;
}
.canvas-area:hover {
  transform: scale(1.002);
}
:root {
  --primary: #10b981;
  --secondary: #6366f1;
}
.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.canvas-header-elegant {
  padding: 1rem 1.5rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #f0f4f8;
}
.canvas-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.canvas-title h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}
.canvas-legend-elegant {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.legend-dot.green { background: #10b981; }
.legend-dot.orange { background: #f97316; }
.legend-dash {
  width: 20px;
  height: 2px;
  background: repeating-linear-gradient(90deg, #0d8a73, #0d8a73 5px, transparent 5px, transparent 10px);
}
.canvas-tools-elegant {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.tool-switch {
  font-size: 0.8rem;
  background: #f0f4fa;
  padding: 0.35rem 0.9rem;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}
.tool-icon {
  width: 34px;
  height: 34px;
  border-radius: 0.7rem;
  border: 1px solid #e2e8f0;
  background: white;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
}
.tool-icon:hover {
  background: #0d8a73;
  color: white;
}
.canvas-wrapper-glass {
  background: #fefefe;
  overflow: hidden;
}
.canvas-3d-host {
  width: 100%;
  height: 560px;
  display: block;
  cursor: grab;
}
.canvas-3d-host:active {
  cursor: grabbing;
}
.canvas-3d-host :deep(.function-plot-3d-canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
  outline: none;
}
.canvas-3d-host :deep(.function-plot-2d-canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
  outline: none;
}
.canvas-footer-elegant {
  padding: 0.8rem 1.2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  border-top: 1px solid #f0f4f8;
  background: #fafcff;
}
.footer-chip {
  font-size: 0.8rem;
  background: #f0f4fa;
  padding: 0.3rem 0.8rem;
  border-radius: 1.2rem;
  color: #4a5a7a;
}

/* 鐢诲粖 - 淇鍥剧墖鏄剧ず */
.gallery-elegant {
  padding: 1rem 1.2rem;
  border-top: 1px solid #f0f4f8;
}
.gallery-header-elegant {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
  color: #5a6e8a;
  margin-bottom: 1rem;
}
.gallery-grid-elegant {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
}
.gallery-card {
  background: #fafcff;
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid #eef2f8;
  transition: all 0.2s;
}
.gallery-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}
.gallery-img-fixed {
  width: 100%;
  height: 95px;
  object-fit: cover;
  display: block;
}
.gallery-info {
  padding: 0.5rem 0.7rem;
}
.gallery-info strong {
  font-size: 0.8rem;
  display: block;
  margin-bottom: 0.2rem;
}
.gallery-info span {
  font-size: 0.7rem;
  color: #8a9ab8;
}

/* 鍙充晶杈规爮 */
.info-sidebar-elegant {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-self: start;
  min-width: 0;
  min-height: 0;
}
.info-card-glass {
  background: white;
  border-radius: 1.5rem;
  border: 1px solid #eef2f8;
  overflow: hidden;
}
.info-card-header {
  padding: 1rem 1.2rem;
  background: #fafcff;
  border-bottom: 1px solid #f0f4f8;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.info-tag {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: normal;
  background: #eef2ff;
  padding: 0.25rem 0.6rem;
  border-radius: 1.2rem;
  color: #0d8a73;
}
.info-card-body {
  padding: 1rem;
}
.expr-code {
  background: #1e2a3a;
  color: #2dd4bf;
  padding: 0.4rem 0.7rem;
  border-radius: 0.7rem;
  font-size: 0.8rem;
  font-family: monospace;
  display: inline-block;
}
.derivative-text, .hint-text {
  font-size: 0.8rem;
  color: #5a6e8a;
  margin: 0.6rem 0;
  line-height: 1.5;
}
.impact-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0d8a73;
  margin-top: 0.6rem;
}
.empty-glass {
  padding: 1rem;
  text-align: center;
  font-size: 0.8rem;
  color: #a0aec0;
}
.story-list-glass {
  padding: 0.8rem 1rem 0.8rem 2rem;
  margin: 0;
  font-size: 0.85rem;
}
.story-list-glass li {
  margin-bottom: 0.4rem;
  color: #4a5a7a;
  line-height: 1.5;
}
.interval-list-glass {
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.interval-item-glass {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  padding: 0.5rem 0.8rem;
  background: #fafcff;
  border-radius: 0.8rem;
}
.interval-item-glass.increase { border-left: 4px solid #10b981; }
.interval-item-glass.decrease { border-left: 4px solid #f97316; }
.interval-range {
  color: #8a9ab8;
  font-family: monospace;
}
.feature-list-glass {
  padding: 0.8rem;
}
.feature-item-glass {
  display: flex;
  gap: 0.6rem;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  color: #4a5a7a;
  line-height: 1.5;
}
.feature-marker {
  color: #0d8a73;
  font-weight: bold;
}
.page-shell {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--bg-page, linear-gradient(135deg, #f0f4fa 0%, #e8edf5 100%));
  min-height: 100vh;
  color: var(--wb-text);
  color-scheme: light;
  --bg-page:
    radial-gradient(circle at 20% 10%, rgba(13, 138, 115, 0.08), transparent 38%),
    radial-gradient(circle at 82% 88%, rgba(99, 102, 241, 0.08), transparent 34%),
    linear-gradient(135deg, #f0f4fa 0%, #e8edf5 100%);
  --wb-text: #1e2a3a;
  --wb-muted: #5a6e8a;
  --wb-subtle: #8a9ab8;
  --wb-panel: rgba(255, 255, 255, 0.84);
  --wb-panel-strong: rgba(255, 255, 255, 0.94);
  --wb-surface: #fafcff;
  --wb-surface-strong: #f0f4fa;
  --wb-border: rgba(255, 255, 255, 0.68);
  --wb-border-soft: #eef2f8;
  --wb-border-strong: rgba(13, 138, 115, 0.22);
  --wb-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  --wb-shadow-soft: 0 8px 24px rgba(15, 23, 42, 0.06);
  --wb-code-bg: #1e2a3a;
  --wb-code-text: #2dd4bf;
  --wb-warning-bg: #fef9e3;
  --wb-warning-text: #b45309;
  --wb-danger-bg: #fee2e2;
  --wb-danger-text: #e85d10;
  --canvas-bg: #ffffff;
  --canvas-grid: #e2e8f0;
  --canvas-axis: #1f2937;
  --canvas-text: #1f2937;
  --canvas-meta: #334155;
  --bg-card: var(--wb-panel);
  --bg-secondary: var(--wb-panel-strong);
  --bg-tertiary: var(--wb-surface-strong);
  --text-primary: var(--wb-text);
  --text-secondary: var(--wb-muted);
  --text-tertiary: var(--wb-subtle);
  --border-light: rgba(15, 23, 42, 0.08);
  --border-medium: rgba(13, 138, 115, 0.18);
  --accent-primary: #0d8a73;
  --accent-secondary: #f97316;
  --accent-soft: rgba(13, 138, 115, 0.12);
  --danger: #dc2626;
  --danger-bg: rgba(220, 38, 38, 0.12);
  --danger-text: #b91c1c;
  --success-bg: rgba(13, 138, 115, 0.12);
  --success-text: #0d8a73;
  --shadow-sm: 0 6px 18px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 18px 42px rgba(15, 23, 42, 0.1);
  --shadow-lg: 0 26px 56px rgba(15, 23, 42, 0.14);
}

html[data-theme='night'] .page-shell {
  color-scheme: dark;
  --bg-page:
    radial-gradient(circle at 18% 16%, rgba(36, 210, 176, 0.16), transparent 32%),
    radial-gradient(circle at 82% 18%, rgba(96, 165, 250, 0.14), transparent 28%),
    radial-gradient(circle at 72% 82%, rgba(139, 92, 246, 0.12), transparent 28%),
    linear-gradient(145deg, #07111f 0%, #0b1424 42%, #060c17 100%);
  --wb-text: #eef2ff;
  --wb-muted: #a9b6d3;
  --wb-subtle: #7f8da9;
  --wb-panel: rgba(10, 17, 31, 0.88);
  --wb-panel-strong: rgba(15, 24, 41, 0.94);
  --wb-surface: rgba(255, 255, 255, 0.04);
  --wb-surface-strong: rgba(255, 255, 255, 0.06);
  --wb-border: rgba(255, 255, 255, 0.08);
  --wb-border-soft: rgba(255, 255, 255, 0.08);
  --wb-border-strong: rgba(36, 210, 176, 0.2);
  --wb-shadow: 0 26px 72px rgba(0, 0, 0, 0.34);
  --wb-shadow-soft: 0 12px 36px rgba(0, 0, 0, 0.26);
  --wb-code-bg: rgba(3, 10, 22, 0.96);
  --wb-code-text: #7df0d8;
  --wb-warning-bg: rgba(245, 158, 11, 0.14);
  --wb-warning-text: #ffd089;
  --wb-danger-bg: rgba(249, 115, 22, 0.14);
  --wb-danger-text: #ffb37a;
  --canvas-bg: #09101c;
  --canvas-grid: rgba(149, 161, 191, 0.14);
  --canvas-axis: #c7d2fe;
  --canvas-text: #e8eeff;
  --canvas-meta: #b6c3e1;
  --bg-card: var(--wb-panel);
  --bg-secondary: rgba(15, 24, 41, 0.96);
  --bg-tertiary: rgba(255, 255, 255, 0.06);
  --text-primary: var(--wb-text);
  --text-secondary: var(--wb-muted);
  --text-tertiary: var(--wb-subtle);
  --border-light: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(36, 210, 176, 0.2);
  --accent-primary: #24d2b0;
  --accent-secondary: #ff9b54;
  --accent-soft: rgba(36, 210, 176, 0.12);
  --danger: #fb7185;
  --danger-bg: rgba(251, 113, 133, 0.14);
  --danger-text: #fecdd3;
  --success-bg: rgba(36, 210, 176, 0.14);
  --success-text: #7df0d8;
  --shadow-sm: 0 10px 26px rgba(0, 0, 0, 0.24);
  --shadow-md: 0 22px 48px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 30px 70px rgba(0, 0, 0, 0.34);
}


:host {
  --text: #1e2a3a;
  --muted: #5a6e8a;
  --line: #e2e8f0;
}


.canvas-wrapper-glass {
  background: #fefefe;
  overflow: auto;
  max-width: 100%;
}
.canvas-3d-host {
  max-width: 100%;
}
.canvas-3d-host :deep(.function-plot-3d-canvas) {
  max-width: 100%;
  object-fit: contain;
}
.canvas-3d-host :deep(.function-plot-2d-canvas) {
  max-width: 100%;
  object-fit: contain;
}

.hero-card,
.control-panel,
.card-elegant,
.canvas-area,
.info-card-glass {
  background: var(--wb-panel);
  border-color: var(--wb-border);
  box-shadow: var(--wb-shadow-soft);
}

.hero-card {
  box-shadow: var(--wb-shadow);
}

.hero-card::before {
  opacity: 0.26;
}

.hero-badge,
.preset-label,
.impact-text,
.feature-marker,
.k-value .stat-value {
  color: var(--accent-primary);
}

.hero-text h2 {
  background: linear-gradient(135deg, var(--wb-text), var(--accent-primary));
  background-clip: text;
  -webkit-background-clip: text;
}

.hero-text p,
.stat-label,
.param-item,
.gallery-header-elegant,
.derivative-text,
.hint-text,
.interval-range,
.gallery-info span {
  color: var(--wb-muted);
}

.stat-chip,
.seg.active,
.btn-icon,
.preset-group button,
.input-mini,
.tool-icon,
.gallery-card,
.info-card-glass,
.interval-item-glass,
.func-row,
.canvas-wrapper-glass,
.footer-chip,
.shortcut-hint,
.tool-switch,
.btn-reset,
.btn-ghost-icon,
.progress-elegant {
  background: var(--wb-panel-strong);
}

.stat-chip,
.btn-icon,
.preset-group button,
.input-mini,
.tool-icon,
.gallery-card,
.info-card-glass,
.func-row,
.interval-item-glass {
  border-color: var(--wb-border-soft);
}

.stat-value,
.card-title,
.axis-label,
.canvas-title h3,
.gallery-info strong,
.info-card-header,
.feature-item-glass,
.story-list-glass li,
.seg,
.func-row input,
.btn-reset,
.tool-icon,
.btn-ghost-icon {
  color: var(--wb-text);
}

.control-panel,
.card-elegant,
.canvas-area,
.info-card-glass {
  backdrop-filter: blur(14px);
}

.segments,
.progress-elegant,
.view-shortcuts,
.canvas-footer-elegant,
.gallery-elegant,
.info-card-header,
.card-header-elegant,
.canvas-header-elegant {
  border-color: var(--wb-border-soft);
}

.segments,
.progress-elegant,
.view-shortcuts,
.canvas-footer-elegant,
.gallery-card,
.func-row,
.interval-item-glass,
.shortcut-hint,
.tool-switch,
.info-card-header {
  background: var(--wb-surface);
}

.toggle-switch,
.func-prefix,
.footer-chip,
.empty-glass,
.shortcut-hint,
.sep,
.unit {
  color: var(--wb-muted);
}

.btn-icon,
.tool-icon {
  color: var(--wb-text);
}

.btn-icon:hover,
.tool-icon:hover,
.preset-group button:hover,
.btn-add-elegant:hover {
  border-color: var(--accent-primary);
}

.btn-icon:hover,
.btn-reset:hover,
.tool-icon:hover {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.card-badge,
.badge-accent,
.info-tag {
  background: var(--accent-soft);
  color: var(--accent-primary);
}

.toggle-switch input {
  accent-color: var(--accent-primary);
}

.func-row.active {
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--wb-panel-strong));
  border-color: var(--wb-border-strong);
}

.color-dot {
  box-shadow: 0 0 0 2px var(--wb-panel-strong), 0 0 0 3px rgba(0, 0, 0, 0.08);
}

.btn-add-elegant {
  background: var(--wb-surface-strong);
  border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--wb-border-soft));
  color: var(--accent-primary);
}

.input-mini {
  color: var(--wb-text);
  border-color: var(--wb-border-soft);
}

.btn-reset {
  border: 1px solid var(--wb-border-soft);
}

.btn-ghost-icon {
  border: 1px solid transparent;
}

.btn-ghost-icon:hover {
  background: var(--danger-bg);
  color: var(--danger-text);
  border-color: color-mix(in srgb, var(--danger) 28%, transparent);
}

.btn-record-elegant {
  background: var(--wb-danger-bg);
  color: var(--wb-danger-text);
}

.record-dot {
  background: currentColor;
}

.progress-handle-glass {
  background: var(--wb-panel-strong);
  border-color: var(--accent-primary);
}

.degeneration-tip-elegant {
  background: var(--wb-warning-bg);
  color: var(--wb-warning-text);
}

.canvas-wrapper-glass {
  background: var(--canvas-bg);
  overflow: auto;
  max-width: 100%;
}

.canvas-footer-elegant {
  background: var(--wb-surface);
}

.footer-chip {
  color: var(--wb-muted);
}

.gallery-card:hover {
  box-shadow: var(--shadow-sm);
}

.info-card-header {
  background: var(--wb-surface);
}

.tool-switch input {
  accent-color: var(--accent-primary);
}

.expr-code {
  background: var(--wb-code-bg);
  color: var(--wb-code-text);
}

.empty-glass {
  color: var(--wb-subtle);
}

.story-list-glass li,
.feature-item-glass {
  color: var(--wb-muted);
}

html[data-theme='night'] .hero-card::after {
  background: radial-gradient(circle, rgba(36, 210, 176, 0.22), transparent 70%);
}

html[data-theme='night'] .seg.active {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}

html[data-theme='night'] .gallery-card,
html[data-theme='night'] .tool-icon,
html[data-theme='night'] .btn-icon,
html[data-theme='night'] .input-mini,
html[data-theme='night'] .stat-chip,
html[data-theme='night'] .btn-ghost-icon,
html[data-theme='night'] .progress-elegant,
html[data-theme='night'] .btn-reset {
  background: rgba(15, 24, 41, 0.98);
}

html[data-theme='night'] .control-panel,
html[data-theme='night'] .card-elegant,
html[data-theme='night'] .canvas-area,
html[data-theme='night'] .info-card-glass {
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.3);
}

html[data-theme='night'] .segments,
html[data-theme='night'] .progress-elegant,
html[data-theme='night'] .view-shortcuts,
html[data-theme='night'] .canvas-footer-elegant,
html[data-theme='night'] .gallery-elegant,
html[data-theme='night'] .info-card-header,
html[data-theme='night'] .card-header-elegant,
html[data-theme='night'] .canvas-header-elegant {
  border-color: rgba(255, 255, 255, 0.08);
}

html[data-theme='night'] .badge-accent,
html[data-theme='night'] .card-badge,
html[data-theme='night'] .info-tag {
  background: rgba(36, 210, 176, 0.14);
}

html[data-theme='night'] .btn-play {
  box-shadow: 0 12px 28px rgba(36, 210, 176, 0.16);
}

html[data-theme='night'] .func-row input::placeholder,
html[data-theme='night'] .input-mini::placeholder {
  color: var(--wb-subtle);
}


.preset-group button {
  transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
}


.pet-panel::-webkit-scrollbar,
.info-sidebar-elegant::-webkit-scrollbar {
  width: 6px;
}
.pet-panel::-webkit-scrollbar-track,
.info-sidebar-elegant::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}
.pet-panel::-webkit-scrollbar-thumb,
.info-sidebar-elegant::-webkit-scrollbar-thumb {
  background: rgba(13, 138, 115, 0.3);
  border-radius: 4px;
}
.pet-panel::-webkit-scrollbar-thumb:hover,
.info-sidebar-elegant::-webkit-scrollbar-thumb:hover {
  background: rgba(13, 138, 115, 0.5);
}
@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 1000px) {
  .compact-grid { grid-template-columns: 1fr; }
  .workspace { grid-template-columns: 1fr; }
  .info-sidebar-elegant {
    width: 100%;
  }
  .gallery-grid-elegant { grid-template-columns: repeat(2, 1fr); }
}
</style>



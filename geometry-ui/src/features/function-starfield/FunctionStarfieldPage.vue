<template>
  <section
    ref="pageRef"
    class="starfield-page"
    :style="pageStyle"
    @pointermove="updatePointer"
  >
    <div class="starfield-stage">
      <div class="stage-noise"></div>
      <div class="stage-grid"></div>
      <div class="stage-rings"></div>
      <div class="stage-scan-line"></div>
      <div class="stage-corner corner-top-left"></div>
      <div class="stage-corner corner-bottom-right"></div>
      <div class="stage-haze haze-left"></div>
      <div class="stage-haze haze-right"></div>
      <div class="stage-core-glow"></div>
      <div class="stage-beam beam-left"></div>
      <div class="stage-beam beam-right"></div>
      <div class="stage-vignette"></div>
      <div class="stage-pointer-glow"></div>
      <div class="stage-aurora aurora-one"></div>
      <div class="stage-aurora aurora-two"></div>
      <div class="stage-orbit-dust"></div>
      <div class="stage-meteor meteor-one"></div>
      <div class="stage-meteor meteor-two"></div>

      <ReferenceStarfieldCanvas
        :scene="scene"
        :selected-id="selectedId"
        :hovered-id="hoveredId"
        :focus-unit-id="activeUnitId"
        :zoom="zoom"
        :auto-rotate="false"
        :show-satellites="true"
        @update:hovered-id="hoveredId = $event"
        @update:zoom="zoom = clampZoom($event)"
        @select="handleSelect"
        @background-click="closeKnowledgeCard"
      />

      <header class="stage-header">
        <div class="brand-pill">
          <span class="brand-dot"></span>
          <iconify-icon icon="mdi:star-four-points-circle-outline" />
          <span>Geometry Lab · Function Starfield</span>
        </div>
        <h1>函数星图</h1>
        <p>{{ stageCopy }}</p>
      </header>

      <div class="stage-toolbar">
        <button class="toolbar-trigger" :class="{ active: controlsVisible }" @click="toggleControls">
          <iconify-icon :icon="controlsVisible ? 'mdi:close' : 'mdi:tune-vertical'" />
          <span>{{ controlsVisible ? '收起控制坞' : '打开控制坞' }}</span>
        </button>

        <button class="toolbar-trigger" :class="{ active: planetStudioVisible }" @click="togglePlanetStudio">
          <iconify-icon :icon="planetStudioVisible ? 'mdi:close' : 'mdi:orbit-variant'" />
          <span>{{ planetStudioVisible ? '收起我的星球' : '我的星球' }}</span>
        </button>

        <transition name="dock-pop">
          <aside v-if="controlsVisible" class="control-dock">
            <div class="dock-head">
              <div>
                <span class="dock-kicker">Control Dock</span>
                <strong>场景控制台</strong>
              </div>
              <button class="dock-close" @click="controlsVisible = false">
                <iconify-icon icon="mdi:close" />
              </button>
            </div>

            <div class="dock-grid">
              <article class="dock-stat">
                <span>当前聚焦</span>
                <strong>{{ activeUnit?.name || '未选择函数' }}</strong>
              </article>
              <article class="dock-stat">
                <span>视图倍率</span>
                <strong>{{ zoom.toFixed(2) }}x</strong>
              </article>
            </div>

            <div class="dock-slider">
              <div class="dock-row">
                <span>缩放视图</span>
                <small>滚轮也可缩放</small>
              </div>
              <input
                v-model.number="zoom"
                class="zoom-slider"
                type="range"
                min="0.28"
                max="1.02"
                step="0.01"
              >
              <div class="dock-scale">
                <span>0.28x</span>
                <span>1.02x</span>
              </div>
            </div>

            <div class="dock-legend">
              <span v-for="item in relationLegend" :key="item.key" class="legend-chip">
                <span class="legend-dot" :style="{ background: item.color }"></span>
                {{ item.label }}
              </span>
            </div>

            <div class="dock-actions">
              <button class="dock-btn primary" @click="toggleFullscreen">
                {{ fullscreenActive ? '退出全屏' : '进入全屏' }}
              </button>
              <button class="dock-btn" :disabled="!activeUnitId" @click="openWorkbench">
                载入实验台
              </button>
            </div>
          </aside>
        </transition>
      </div>

      <transition name="card-float">
        <aside v-if="planetStudioVisible" class="planet-studio">
          <div class="card-head">
            <div>
              <span class="card-kicker">Private Planets</span>
              <h2>我的星球</h2>
              <p>把你自己整理过的函数、简介和 5 类知识卡保存成私有星球，登录后可长期保留。</p>
            </div>
            <button class="card-close" @click="planetStudioVisible = false">
              <iconify-icon icon="mdi:close" />
            </button>
          </div>

          <section v-if="!isAuthenticated" class="studio-login">
            <p>当前未登录。登录后可以把自定义函数保存到数据库，并在同一张函数星图里长期查看。</p>
            <a class="card-btn primary" :href="loginHref">登录后保存我的星球</a>
          </section>

          <template v-else>
            <div v-if="planetError" class="studio-banner error">{{ planetError }}</div>
            <div v-else-if="planetNotice" class="studio-banner">{{ planetNotice }}</div>

            <section class="section-panel studio-form-panel">
              <div class="section-head">
                <span class="section-pill">{{ isEditingPlanet ? '编辑中' : '新建中' }}</span>
                <strong>{{ isEditingPlanet ? '修改私有星球' : '创建私有星球' }}</strong>
              </div>

              <div class="studio-fields">
                <label class="studio-field">
                  <span>星球标题</span>
                  <input v-model.trim="planetDraft.title" type="text" maxlength="80" placeholder="例如：我的抛物线变换" />
                </label>
                <label class="studio-field">
                  <span>函数表达式</span>
                  <input v-model.trim="planetDraft.expression" type="text" maxlength="255" placeholder="例如：y = x^2 + 2x + 1" />
                </label>
                <label class="studio-field full">
                  <span>函数简介</span>
                  <textarea v-model.trim="planetDraft.summary" rows="3" placeholder="用一小段话说明这个函数为什么值得保存。"></textarea>
                </label>
              </div>

              <div class="studio-card-grid">
                <article v-for="topic in planetTopicFields" :key="topic.key" class="studio-card-editor">
                  <div class="section-head compact">
                    <span class="section-pill">{{ topic.label }}</span>
                    <strong>{{ topic.label }}</strong>
                  </div>
                  <label class="studio-field full">
                    <span>说明</span>
                    <textarea
                      v-model.trim="planetDraft.cards[topic.key].description"
                      rows="2"
                      :placeholder="`补充 ${topic.label} 的整体说明`"
                    ></textarea>
                  </label>
                  <label class="studio-field full">
                    <span>知识点</span>
                    <textarea
                      v-model="planetDraft.cards[topic.key].itemsText"
                      rows="4"
                      placeholder="每行填写一条知识点"
                    ></textarea>
                  </label>
                </article>
              </div>

              <div class="card-actions">
                <button class="card-btn primary" :disabled="planetSaving" @click="savePlanet">
                  {{ planetSaving ? '保存中...' : isEditingPlanet ? '保存修改' : '保存为我的星球' }}
                </button>
                <button class="card-btn" :disabled="planetSaving" @click="resetPlanetDraft">清空表单</button>
              </div>
            </section>

            <section class="related-panel studio-saved-panel">
              <div class="related-head">
                <span>已保存星球</span>
                <strong>{{ privatePlanets.length }}</strong>
              </div>
              <div v-if="planetLoading" class="empty-panel">正在载入你的私有星球...</div>
              <div v-else-if="!privatePlanets.length" class="empty-panel">还没有保存过私有星球，先创建第一颗吧。</div>
              <div v-else class="studio-saved-list">
                <article
                  v-for="planet in privatePlanets"
                  :key="planet.id"
                  class="studio-saved-item"
                  :class="{ active: activeUnitId === `private:${planet.id}` }"
                >
                  <div class="studio-saved-copy">
                    <strong>{{ planet.title }}</strong>
                    <span>{{ planet.expression }}</span>
                  </div>
                  <div class="studio-saved-actions">
                    <button class="mini-btn" @click="focusPrivatePlanet(planet)">定位</button>
                    <button class="mini-btn" @click="editPrivatePlanet(planet)">编辑</button>
                    <button class="mini-btn" @click="openWorkbenchWithPlanet(planet)">实验台</button>
                    <button class="mini-btn danger" @click="deletePlanet(planet)">删除</button>
                  </div>
                </article>
              </div>
            </section>
          </template>
        </aside>
      </transition>

      <transition name="card-float">
        <aside v-if="isKnowledgeCardVisible" class="knowledge-card">
          <div class="card-head">
            <div>
              <span class="card-kicker">{{ currentNode?.type === 'topic' ? '知识卫星' : '函数母体' }}</span>
              <h2>{{ content.title }}</h2>
              <p>{{ activeUnit?.title || '点击函数星球或知识卫星查看知识卡' }}</p>
            </div>
            <button class="card-close" @click="closeKnowledgeCard">
              <iconify-icon icon="mdi:close" />
            </button>
          </div>

          <div class="card-overview">
            <div class="planet-identity">
              <div class="planet-core">
                <div class="planet-orb"></div>
              </div>
              <div>
                <strong>{{ activeUnit?.shortLabel || '·' }}</strong>
                <span>{{ activeUnit?.name || '未选择函数' }}</span>
              </div>
            </div>
            <div class="overview-grid">
              <article class="overview-item">
                <span>考频</span>
                <strong>{{ activeUnit?.examFrequency || content.examFrequency || '—' }}</strong>
              </article>
              <article class="overview-item">
                <span>关联节点</span>
                <strong>{{ relatedNodes.length }}</strong>
              </article>
              <article class="overview-item">
                <span>展开卫星</span>
                <strong>{{ activeUnit ? 5 : 0 }}</strong>
              </article>
              <article class="overview-item">
                <span>当前层级</span>
                <strong>{{ currentNode?.type === 'topic' ? '知识层' : '函数层' }}</strong>
              </article>
            </div>
          </div>

          <p class="card-summary">{{ cardSummary }}</p>

          <div v-if="cardTags.length" class="tag-row">
            <span v-for="tag in cardTags" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>

          <div v-if="sectionTabs.length" class="section-tabs">
            <button
              v-for="tab in sectionTabs"
              :key="tab.key"
              class="section-tab"
              :class="{ active: activeSectionKey === tab.key }"
              :style="{ '--tab-accent': tab.color }"
              @click="activateSection(tab.key)"
            >
              <span class="tab-dot"></span>
              {{ tab.label }}
            </button>
          </div>

          <section v-if="displaySection" class="section-panel">
            <div class="section-head">
              <span class="section-pill">{{ currentTopicMeta.label || '函数知识' }}</span>
              <strong>{{ displaySection.title }}</strong>
            </div>
            <p v-if="displaySection.description" class="section-desc">{{ displaySection.description }}</p>
            <ul class="section-list">
              <li v-for="item in displaySection.items" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section v-if="relatedNodes.length" class="related-panel">
            <div class="related-head">
              <span>关联跳转</span>
              <strong>{{ relatedNodes.length }}</strong>
            </div>
            <div class="related-list">
              <button
                v-for="item in relatedNodes"
                :key="`${item.source}-${item.target}`"
                class="related-item"
                @click="handleSelect(item.node.id)"
              >
                <span>{{ item.node.title }}</span>
                <small>{{ relationLabel(item.type) }}</small>
              </button>
            </div>
          </section>

          <div class="card-actions">
            <button class="card-btn primary" :disabled="!activeUnitId" @click="openWorkbench">
              载入到函数实验台
            </button>
            <button class="card-btn" @click="closeKnowledgeCard">收起知识卡</button>
          </div>
        </aside>
      </transition>

      <div class="stage-hud" aria-hidden="true">
        <div>SYS.STARFIELD v2.0</div>
        <div>NODES: {{ scene.nodes.length }} · ZOOM: {{ zoom.toFixed(2) }}</div>
        <div>STATUS: {{ selectedId ? 'FOCUSED' : 'SCANNING' }}</div>
      </div>

      <div v-if="!isKnowledgeCardVisible" class="canvas-tip">
        <iconify-icon icon="mdi:gesture-tap-button" />
        <span>{{ tipCopy }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  FUNCTION_TOPIC_META,
  FUNCTION_TOPIC_ORDER,
  getFunctionUnitById,
  listFunctionUnits,
  savePendingFunctionUnit
} from '../../data/function-units';
import {
  createFunctionPlanet,
  deleteFunctionPlanet,
  fetchFunctionPlanets,
  initializeAuth,
  isAuthenticated,
  updateFunctionPlanet
} from '../../utils/account-api';
import { hexToRgba } from './utils/scene-math';
import {
  createFunctionStarfieldScene,
  getNodeContent,
  getRelatedNodes
} from './services/graph-builder';
import {
  createEmptyPlanetDraft,
  createPlanetDraftFromRecord,
  createPlanetPayloadFromDraft,
  createPrivateFunctionUnit
} from './services/private-planet-adapter';

const emit = defineEmits(['open-workbench']);
const ZOOM_MIN = 0.32;
const ZOOM_MAX = 1.12;

const relationLegend = [
  { key: 'relation', label: '函数关系', color: '#cdd8ff' },
  { key: 'profile', label: '函数特征', color: FUNCTION_TOPIC_META.profile.accent },
  { key: 'geometry', label: '图像几何', color: FUNCTION_TOPIC_META.geometry.accent },
  { key: 'properties', label: '常用性质', color: FUNCTION_TOPIC_META.properties.accent },
  { key: 'exam', label: '高考关联', color: FUNCTION_TOPIC_META.exam.accent },
  { key: 'composite', label: '复合函数', color: FUNCTION_TOPIC_META.composite.accent }
];


const REFERENCE_LAYOUTS = [
  { id: 'linear', names: ['一次函数', '线性函数'], x: 0.50, y: 0.34 },
  { id: 'quadratic', names: ['二次函数'], x: 0.23, y: 0.26 },
  { id: 'trig', names: ['三角函数', '正弦函数'], x: 0.25, y: 0.38 },
  { id: 'exponential', names: ['指数函数'], x: 0.14, y: 0.58 },
  { id: 'root', names: ['根式函数', '根函数'], x: 0.34, y: 0.82 },
  { id: 'absolute', names: ['绝对值函数'], x: 0.56, y: 0.80 },
  { id: 'power', names: ['幂函数', '三次函数'], x: 0.67, y: 0.46 },
  { id: 'logarithmic', names: ['对数函数'], x: 0.60, y: 0.63 },
  { id: 'inverse', names: ['反比例函数', '反比例'], x: 0.57, y: 0.72 }
];

const ReferenceStarfieldCanvas = defineComponent({
  name: 'ReferenceStarfieldCanvas',
  props: {
    scene: { type: Object, required: true },
    selectedId: { type: String, default: '' },
    hoveredId: { type: String, default: '' },
    focusUnitId: { type: String, default: '' },
    zoom: { type: Number, default: 0.34 },
    autoRotate: { type: Boolean, default: false },
    showSatellites: { type: Boolean, default: true }
  },
  emits: ['update:hovered-id', 'update:zoom', 'select', 'background-click'],
  setup(props, { emit }) {
    const DPR_LIMIT = 1.5;
    const TARGET_FRAME_MS = 1000 / 36;
    const STAR_COUNT = 360;
    const canvasRef = ref(null);
    let animationFrame = 0;
    let resizeFrame = 0;
    let hoverFrame = 0;
    let pendingHoverPoint = null;
    let lastHoveredId = '';
    let lastDrawTimestamp = 0;
    let sceneCache = null;
    let stars = [];
    let ambientPlanets = [];
    let particles = [];
    let time = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function invalidateSceneCache() {
      sceneCache = null;
    }

    function safeUnitMap() {
      return props.scene?.meta?.unitMap || {};
    }

    function topicKeys() {
      return FUNCTION_TOPIC_ORDER && FUNCTION_TOPIC_ORDER.length ? FUNCTION_TOPIC_ORDER : ['profile', 'geometry', 'properties', 'exam', 'composite'];
    }

    function topicMeta(key) {
      return FUNCTION_TOPIC_META[key] || { label: '知识节点', accent: '#7eefff', icon: '◎' };
    }

    function allNodes() {
      return Array.isArray(props.scene?.nodes) ? props.scene.nodes : [];
    }

    function isTopicNode(node) {
      return node?.type === 'topic' || Boolean(node?.topicKey);
    }

    function mainNodes() {
      const nodes = allNodes().filter((node) => !isTopicNode(node));
      const seen = new Set();
      return nodes.filter((node) => {
        const id = node.unitId || node.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }

    function unitOf(nodeOrId) {
      const id = typeof nodeOrId === 'string' ? nodeOrId : (nodeOrId?.unitId || nodeOrId?.id);
      return safeUnitMap()[id] || safeUnitMap()[`private:${id}`] || {};
    }

    function nodeTitle(node) {
      const unit = unitOf(node);
      return node?.title || node?.name || unit.name || unit.title || node?.id || '函数星球';
    }

    function nodeExpr(node) {
      const unit = unitOf(node);
      return unit.expression || unit.expr || unit.formula || node?.expression || node?.subtitle || node?.label || unit.shortLabel || '';
    }

    function nodeColor(node) {
      const unit = unitOf(node);
      return node?.color || unit.color || '#7eefff';
    }

    function safeViewportBounds() {
      const cssW = width / Math.max(1, dpr);
      const cssH = height / Math.max(1, dpr);
      const isCompact = cssW < 920;
      return {
        left: isCompact ? 0.14 : 0.12,
        right: isCompact ? 0.80 : 0.82,
        top: Math.max(isCompact ? 0.18 : 0.16, Math.min(0.22, 150 / Math.max(1, cssH))),
        bottom: isCompact ? 0.84 : 0.86
      };
    }

    function fallbackOrbitPosition(index, total) {
      const bounds = safeViewportBounds();
      const count = Math.max(1, total);
      const slots = [
        { x: 0.50, y: 0.34 },
        { x: 0.23, y: 0.26 },
        { x: 0.25, y: 0.38 },
        { x: 0.14, y: 0.58 },
        { x: 0.34, y: 0.82 },
        { x: 0.56, y: 0.80 },
        { x: 0.67, y: 0.46 },
        { x: 0.60, y: 0.63 },
        { x: 0.57, y: 0.72 }
      ];
      if (index < slots.length) {
        return keepInViewport(slots[index], index, total, false);
      }
      const extraIndex = index - slots.length;
      const extraCount = Math.max(1, count - slots.length);
      const angle = -Math.PI / 2 + (Math.PI * 2 * extraIndex) / extraCount;
      const cx = (bounds.left + bounds.right) / 2;
      const cy = (bounds.top + bounds.bottom) / 2 + 0.03;
      const rx = Math.min(0.34, (bounds.right - bounds.left) * 0.42);
      const ry = Math.min(0.30, (bounds.bottom - bounds.top) * 0.40);
      return {
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry
      };
    }

    function keepInViewport(pos, index, total, allowSoftClamp = true) {
      const bounds = safeViewportBounds();
      const x = Number(pos?.x);
      const y = Number(pos?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return fallbackOrbitPosition(index, total);

      const isFarOutside = x < -0.08 || x > 1.08 || y < -0.08 || y > 1.08;
      const isUnderHeader = y < bounds.top && x < 0.46;
      const isTopEdge = y < bounds.top - 0.08;
      const isSideEdge = x < bounds.left - 0.08 || x > bounds.right + 0.08;
      if (isFarOutside || isUnderHeader || isTopEdge || isSideEdge) {
        return fallbackOrbitPosition(index, total);
      }

      if (!allowSoftClamp) return pos;
      return {
        x: Math.min(bounds.right, Math.max(bounds.left, x)),
        y: Math.min(bounds.bottom, Math.max(bounds.top, y))
      };
    }

    function matchReferenceLayout(node, index, total) {
      const unit = unitOf(node);
      const id = node?.unitId || node?.id || '';
      const name = nodeTitle(node);
      const matched = REFERENCE_LAYOUTS.find((item) => item.id === id || item.names.some((n) => name.includes(n)));
      if (matched) return keepInViewport({ x: matched.x, y: matched.y }, index, total);

      const rawX = node?.x ?? node?.cx ?? node?.position?.x ?? unit.x;
      const rawY = node?.y ?? node?.cy ?? node?.position?.y ?? unit.y;
      if (Number.isFinite(rawX) && Number.isFinite(rawY)) {
        let x = rawX;
        let y = rawY;
        if (Math.abs(x) > 1 || Math.abs(y) > 1) {
          x = x / 1000;
          y = y / 1000;
        }
        return keepInViewport({ x, y }, index, total);
      }

      return keepInViewport(fallbackOrbitPosition(index, total), index, total);
    }

    function relaxPositions(items) {
      const bounds = safeViewportBounds();
      const placed = [];
      const minGap = 0.105;
      const ringGap = 0.03;
      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.top + bounds.bottom) / 2 + 0.03;
      items.forEach((item, index) => {
        let x = item.x;
        let y = item.y;
        for (let pass = 0; pass < 30; pass += 1) {
          let moved = false;
          for (const prev of placed) {
            const dx = x - prev.x;
            const dy = y - prev.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            if (dist < minGap) {
              const push = (minGap - dist) / 2;
              const ux = dx / dist;
              const uy = dy / dist;
              x += ux * push;
              y += uy * push;
              prev.x -= ux * push;
              prev.y -= uy * push;
              moved = true;
            }
          }
          x = Math.min(bounds.right, Math.max(bounds.left, x));
          y = Math.min(bounds.bottom, Math.max(bounds.top, y));
          for (const prev of placed) {
            prev.x = Math.min(bounds.right, Math.max(bounds.left, prev.x));
            prev.y = Math.min(bounds.bottom, Math.max(bounds.top, prev.y));
          }
          if (!moved) break;
        }
        const distToCenter = Math.hypot(x - centerX, y - centerY);
        if (index > 0 && distToCenter < ringGap) {
          const ang = Math.atan2(y - centerY, x - centerX) || 0;
          x = centerX + Math.cos(ang) * ringGap;
          y = centerY + Math.sin(ang) * ringGap;
        }
        const placedItem = { ...item, x, y };
        placed.push(placedItem);
      });
      return placed;
    }

    function buildModelNodes() {
      const nodes = mainNodes();
      const rough = nodes.map((node, index) => {
        const pos = matchReferenceLayout(node, index, nodes.length);
        return {
          node,
          id: node.unitId || node.id,
          title: nodeTitle(node),
          expr: nodeExpr(node),
          color: nodeColor(node),
          x: pos.x,
          y: pos.y,
          unit: unitOf(node)
        };
      });
      return relaxPositions(rough);
    }

    function sceneSignature() {
      const nodePart = mainNodes()
        .map((node) => {
          const unit = unitOf(node);
          return [
            node.unitId || node.id,
            node.title || unit.title || '',
            unit.expression || unit.expr || unit.formula || '',
            node.color || unit.color || '',
            node.x ?? '',
            node.y ?? '',
            node.z ?? ''
          ].join(':');
        })
        .join('|');
      const linkPart = (Array.isArray(props.scene?.edges) ? props.scene.edges : (Array.isArray(props.scene?.links) ? props.scene.links : []))
        .map((edge) => `${edge.source || edge.from || edge.sourceId}>${edge.target || edge.to || edge.targetId}:${edge.type || ''}:${edge.weight || ''}`)
        .join('|');
      return `${Math.round(width)}x${Math.round(height)}@${dpr}:${nodePart}:${linkPart}`;
    }

    function resolveNodeId(value) {
      if (!value) return '';
      if (typeof value === 'object') return value.id || value.unitId || value.source || value.target || '';
      return String(value);
    }

    function buildLinkPairs(models) {
      const byId = new Map(models.map((item) => [item.id, item]));
      const edges = Array.isArray(props.scene?.edges) ? props.scene.edges : (Array.isArray(props.scene?.links) ? props.scene.links : []);
      const pairs = [];
      const drawn = new Set();

      function addPair(a, b, type = 'relation') {
        if (!a || !b || a.id === b.id) return;
        const key = [a.id, b.id].sort().join('::');
        if (drawn.has(key)) return;
        drawn.add(key);
        pairs.push({ a, b, type });
      }

      edges.forEach((edge) => {
        const sid = resolveNodeId(edge.source || edge.from || edge.sourceId);
        const tid = resolveNodeId(edge.target || edge.to || edge.targetId);
        if (!sid || !tid) return;
        const a = byId.get(String(sid).split(':')[0]) || byId.get(sid);
        const b = byId.get(String(tid).split(':')[0]) || byId.get(tid);
        addPair(a, b, edge.type || 'relation');
      });

      if (!pairs.length && models.length > 1) {
        const cx = 0.5;
        const cy = 0.52;
        const center = [...models].sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
        models.forEach((model) => {
          if (model.id !== center.id) addPair(center, model, 'relation');
        });
        models.forEach((model, index) => {
          const next = models[(index + 1) % models.length];
          if (next && next.id !== model.id) addPair(model, next, 'orbit');
        });
      }

      return pairs;
    }

    function getSceneCache() {
      const signature = sceneSignature();
      if (sceneCache?.signature === signature) return sceneCache;

      const models = buildModelNodes();
      const modelMap = new Map();
      models.forEach((model) => {
        modelMap.set(model.id, model);
        modelMap.set(model.node.id, model);
      });
      sceneCache = {
        signature,
        models,
        modelMap,
        linkPairs: buildLinkPairs(models)
      };
      return sceneCache;
    }

    function modelNodes() {
      return getSceneCache().models;
    }

    function findModel(id, cache = getSceneCache()) {
      if (!id) return null;
      return cache.modelMap.get(id) || cache.modelMap.get(String(id).split(':')[0]) || null;
    }

    function spawnParticles(cx, cy, color, count = 24) {
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = Math.random() * 3 + 1.5;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: Math.random() * 0.015 + 0.008,
          size: Math.random() * 3 + 1.5,
          color
        });
      }
    }

    function resize() {
      const canvas = canvasRef.value;
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
      const nextWidth = Math.max(1, Math.round(canvas.offsetWidth * dpr));
      const nextHeight = Math.max(1, Math.round(canvas.offsetHeight * dpr));
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      invalidateSceneCache();
    }

    function requestResize() {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        resize();
      });
    }

    function initStars() {
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2.2 + 0.3,
        brightness: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.03 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.85 ? Math.random() * 60 + 180 : 0
      }));
    }

    function initAmbientPlanets() {
      const palette = ['#7eefff', '#ffbd5c', '#95a7ff', '#66f0bd', '#ff7fb7', '#b68cff', '#7ad7ff'];
      const presets = [
        { x: 0.08, y: 0.23, r: 8.5 }, { x: 0.14, y: 0.48, r: 7.5 }, { x: 0.18, y: 0.72, r: 8.0 },
        { x: 0.25, y: 0.18, r: 7.0 }, { x: 0.30, y: 0.55, r: 6.8 }, { x: 0.34, y: 0.83, r: 7.5 },
        { x: 0.40, y: 0.26, r: 6.5 }, { x: 0.46, y: 0.68, r: 7.0 }, { x: 0.52, y: 0.20, r: 7.2 },
        { x: 0.58, y: 0.52, r: 6.5 }, { x: 0.62, y: 0.78, r: 7.8 }, { x: 0.68, y: 0.32, r: 6.8 },
        { x: 0.73, y: 0.61, r: 7.0 }, { x: 0.79, y: 0.20, r: 7.6 }, { x: 0.84, y: 0.44, r: 6.8 },
        { x: 0.89, y: 0.70, r: 7.4 }, { x: 0.93, y: 0.35, r: 6.4 }, { x: 0.10, y: 0.85, r: 6.8 },
        { x: 0.22, y: 0.36, r: 5.8 }, { x: 0.37, y: 0.43, r: 5.8 }, { x: 0.50, y: 0.87, r: 6.2 },
        { x: 0.67, y: 0.86, r: 6.0 }, { x: 0.77, y: 0.77, r: 5.8 }, { x: 0.91, y: 0.55, r: 6.0 }
      ];
      ambientPlanets = presets.map((item, index) => ({
        ...item,
        color: palette[index % palette.length],
        ring: index % 4 === 0,
        phase: Math.random() * Math.PI * 2,
        drift: 0.0016 + (index % 5) * 0.00045
      }));
    }

    function drawNebula(ctx) {
      [
        { cx: 0.2, cy: 0.18, r: 0.35, c: '83,122,255', a: 0.06 },
        { cx: 0.82, cy: 0.78, r: 0.3, c: '135,104,255', a: 0.05 },
        { cx: 0.5, cy: 0.5, r: 0.25, c: '126,239,255', a: 0.03 }
      ].forEach((nb) => {
        const g = ctx.createRadialGradient(width * nb.cx, height * nb.cy, 0, width * nb.cx, height * nb.cy, width * nb.r);
        g.addColorStop(0, `rgba(${nb.c},${nb.a})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      });
    }

    function drawStars(ctx) {
      stars.forEach((star) => {
        const flicker = Math.sin(time * star.twinkleSpeed * 60 + star.twinklePhase) * 0.5 + 0.5;
        const alpha = star.brightness * (0.4 + flicker * 0.6);
        ctx.fillStyle = star.hue ? `hsla(${star.hue},70%,80%,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size * dpr * 0.5, 0, Math.PI * 2);
        ctx.fill();
        if (star.size > 1.6 && flicker > 0.7) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(star.x * width - star.size * 3, star.y * height);
          ctx.lineTo(star.x * width + star.size * 3, star.y * height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(star.x * width, star.y * height - star.size * 3);
          ctx.lineTo(star.x * width, star.y * height + star.size * 3);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });
    }

    function drawAmbientPlanets(ctx, models) {
      if (!ambientPlanets.length) return;
      const occupied = models.map((model) => ({ x: model.x, y: model.y }));
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      ambientPlanets.forEach((planet, index) => {
        const px = (planet.x + Math.sin(time * planet.drift + planet.phase) * 0.006) * width;
        const py = (planet.y + Math.cos(time * planet.drift * 0.9 + planet.phase) * 0.005) * height;
        const nx = px / width;
        const ny = py / height;
        const tooClose = occupied.some((item) => Math.hypot(item.x - nx, item.y - ny) < 0.048);
        if (tooClose) return;

        const r = planet.r * dpr * 2;
        const aura = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2);
        aura.addColorStop(0, hexToRgba(planet.color, 0.24));
        aura.addColorStop(0.5, hexToRgba(planet.color, 0.07));
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        const body = ctx.createRadialGradient(px - r * 0.32, py - r * 0.35, r * 0.12, px, py, r * 1.08);
        body.addColorStop(0, 'rgba(255,255,255,0.95)');
        body.addColorStop(0.24, hexToRgba(planet.color, 0.92));
        body.addColorStop(0.74, hexToRgba(planet.color, 0.58));
        body.addColorStop(1, hexToRgba(planet.color, 0.12));
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.ellipse(px - r * 0.28, py - r * 0.30, r * 0.28, r * 0.18, -0.55, 0, Math.PI * 2);
        ctx.fill();

        if (planet.ring) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-0.42 + Math.sin(time * 0.16 + index) * 0.18);
          ctx.strokeStyle = hexToRgba(planet.color, 0.22);
          ctx.lineWidth = 0.85 * dpr;
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 1.7, r * 0.58, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      ctx.restore();
    }

    function drawLinks(ctx, pairs) {
      function rgbaFromHex(hex, alpha) {
        if (typeof hex === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hexToRgba(hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex, alpha);
        return `rgba(126,239,255,${alpha})`;
      }

      function quadraticPoint(x1, y1, cx, cy, x2, y2, t) {
        const mt = 1 - t;
        return {
          x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
          y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2
        };
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      pairs.forEach((pair, index) => {
        const { a, b } = pair;
        const x1 = a.x * width;
        const y1 = a.y * height;
        const x2 = b.x * width;
        const y2 = b.y * height;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const bendDirection = index % 2 === 0 ? 1 : -1;
        const bend = Math.min(96 * dpr, Math.max(34 * dpr, dist * 0.14)) * bendDirection;
        const pulse = Math.sin(time * 1.4 + index * 0.7) * 8 * dpr;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const cx = mx + nx * (bend + pulse);
        const cy = my + ny * (bend + pulse);
        const isFocused = a.id === props.focusUnitId || b.id === props.focusUnitId || a.id === props.selectedId || b.id === props.selectedId;
        const nearHover = a.id === props.hoveredId || b.id === props.hoveredId;
        const alphaBoost = isFocused ? 1 : nearHover ? 0.72 : 0.46;
        const lineA = rgbaFromHex(a.color, isFocused ? 0.68 : 0.38);
        const lineB = rgbaFromHex(b.color, isFocused ? 0.68 : 0.38);
        const glowA = rgbaFromHex(a.color, isFocused ? 0.26 : 0.12);
        const glowB = rgbaFromHex(b.color, isFocused ? 0.26 : 0.12);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, lineA);
        grad.addColorStop(0.5, `rgba(255,255,255,${isFocused ? 0.52 : 0.22})`);
        grad.addColorStop(1, lineB);
        const glowGrad = ctx.createLinearGradient(x1, y1, x2, y2);
        glowGrad.addColorStop(0, glowA);
        glowGrad.addColorStop(0.5, `rgba(126,239,255,${isFocused ? 0.28 : 0.12})`);
        glowGrad.addColorStop(1, glowB);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.shadowColor = isFocused ? 'rgba(126,239,255,0.85)' : 'rgba(126,239,255,0.38)';
        ctx.shadowBlur = (isFocused ? 24 : 13) * dpr;
        ctx.strokeStyle = glowGrad;
        ctx.lineWidth = (isFocused ? 7.5 : 4.2) * dpr;
        ctx.globalAlpha = alphaBoost;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();

        ctx.shadowBlur = (isFocused ? 12 : 5) * dpr;
        ctx.strokeStyle = grad;
        ctx.lineWidth = (isFocused ? 2.8 : 1.75) * dpr;
        ctx.globalAlpha = isFocused ? 0.98 : 0.72;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,255,255,${isFocused ? 0.34 : 0.16})`;
        ctx.lineWidth = (isFocused ? 0.95 : 0.55) * dpr;
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();

        const flowCount = isFocused ? 3 : 2;
        for (let f = 0; f < flowCount; f += 1) {
          const t = (time * (isFocused ? 0.34 : 0.22) + index * 0.17 + f / flowCount) % 1;
          const p = quadraticPoint(x1, y1, cx, cy, x2, y2, t);
          const prev = quadraticPoint(x1, y1, cx, cy, x2, y2, Math.max(0, t - 0.035));
          const ang = Math.atan2(p.y - prev.y, p.x - prev.x);
          const dotR = (isFocused ? 4.2 : 2.8) * dpr;
          const dotGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotR * 3.2);
          dotGrad.addColorStop(0, 'rgba(255,255,255,0.96)');
          dotGrad.addColorStop(0.36, `rgba(126,239,255,${isFocused ? 0.82 : 0.58})`);
          dotGrad.addColorStop(1, 'rgba(126,239,255,0)');
          ctx.globalAlpha = isFocused ? 0.98 : 0.72;
          ctx.fillStyle = dotGrad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR * 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.98)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR * 0.72, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = isFocused ? 0.38 : 0.22;
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = (isFocused ? 1.1 : 0.75) * dpr;
          ctx.beginPath();
          ctx.moveTo(p.x - Math.cos(ang) * dotR * 5, p.y - Math.sin(ang) * dotR * 5);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        if (isFocused) {
          const mid = quadraticPoint(x1, y1, cx, cy, x2, y2, 0.5);
          const ringR = (6 + Math.sin(time * 4 + index) * 1.4) * dpr;
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = 'rgba(126,239,255,0.55)';
          ctx.lineWidth = 1.2 * dpr;
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawSatellites(ctx, model, zf) {
      if (!model || !props.showSatellites) return;
      const cx = model.x * width;
      const cy = model.y * height;
      const orbitR = 92 * zf * dpr;
      ctx.strokeStyle = hexToRgba(model.color, 0.1);
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
      ctx.stroke();

      topicKeys().forEach((key, index) => {
        const meta = topicMeta(key);
        const angle = (Math.PI * 2 * index) / topicKeys().length + time * 0.18;
        const sx = cx + Math.cos(angle) * orbitR;
        const sy = cy + Math.sin(angle) * orbitR;
        for (let tr = 1; tr <= 5; tr += 1) {
          const ta = angle - tr * 0.08;
          ctx.fillStyle = hexToRgba(meta.accent, 0.1 - tr * 0.015);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ta) * orbitR, cy + Math.sin(ta) * orbitR, (4 - tr * 0.5) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22 * dpr);
        sg.addColorStop(0, hexToRgba(meta.accent, 0.8));
        sg.addColorStop(0.5, hexToRgba(meta.accent, 0.2));
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sx, sy, 22 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = meta.accent;
        ctx.beginPath();
        ctx.arc(sx, sy, 7 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = `bold ${15 * dpr}px "Noto Sans SC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meta.icon || '◎', sx, sy);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = `bold ${14 * dpr}px "Noto Sans SC", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.fillText(meta.label, sx, sy + 23 * dpr);
      });
    }

    function drawModel(ctx, model, zf) {
      const cx = model.x * width;
      const cy = model.y * height;
      const isSelected = model.id === props.focusUnitId || model.id === props.selectedId || props.selectedId?.startsWith(`${model.id}:`);
      const isHovered = model.id === props.hoveredId || props.hoveredId?.startsWith(`${model.id}:`);
      const pulseScale = 1 + Math.sin(time * 1.2 + model.x * 10) * 0.035;
      const baseR = (isSelected ? 12 : isHovered ? 10.5 : 9) * zf * dpr * pulseScale;

      if (isSelected) drawSatellites(ctx, model, zf);

      const haloR = baseR * 2.55;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      halo.addColorStop(0, hexToRgba(model.color, isSelected ? 0.2 : 0.08));
      halo.addColorStop(0.5, hexToRgba(model.color, 0.03));
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      const mg = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2);
      mg.addColorStop(0, hexToRgba(model.color, 0.5));
      mg.addColorStop(0.6, hexToRgba(model.color, 0.15));
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 2, 0, Math.PI * 2);
      ctx.fill();

      const cg = ctx.createRadialGradient(cx - baseR * 0.3, cy - baseR * 0.3, baseR * 0.1, cx, cy, baseR);
      cg.addColorStop(0, 'rgba(255,255,255,0.95)');
      cg.addColorStop(0.35, model.color);
      cg.addColorStop(0.8, hexToRgba(model.color, 0.7));
      cg.addColorStop(1, hexToRgba(model.color, 0.2));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(cx - baseR * 0.25, cy - baseR * 0.3, baseR * 0.35, baseR * 0.2, -0.4, 0, Math.PI * 2);
      ctx.fill();

      if (isHovered && !isSelected) {
        ctx.strokeStyle = hexToRgba(model.color, 0.4);
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + 6 * dpr, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `900 ${(isSelected ? 14 : 12.5) * dpr}px "Noto Sans SC", "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 8 * dpr;
      ctx.fillText(model.title, cx, cy + baseR + 16 * dpr);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.font = `700 ${9 * dpr}px "Orbitron", ui-monospace, monospace`;
      const expr = model.expr ? String(model.expr).slice(0, 22) : '';
      if (expr) ctx.fillText(expr, cx, cy + baseR + 45 * dpr);
    }

    function drawParticles(ctx) {
      particles = particles.filter((p) => {
        p.x += p.vx * dpr;
        p.y += p.vy * dpr;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * dpr * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });
    }

    function draw(timestamp = 0) {
      const canvas = canvasRef.value;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      if (timestamp && lastDrawTimestamp && timestamp - lastDrawTimestamp < TARGET_FRAME_MS) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }

      const delta = lastDrawTimestamp ? Math.min(0.05, Math.max(0.001, (timestamp - lastDrawTimestamp) / 1000)) : 0.016;
      lastDrawTimestamp = timestamp || performance.now();
      time += delta;
      ctx.clearRect(0, 0, width, height);
      drawNebula(ctx);
      drawStars(ctx);
      const cache = getSceneCache();
      const models = cache.models;
      const zf = props.zoom / 0.34;
      drawAmbientPlanets(ctx, models);
      drawLinks(ctx, cache.linkPairs);
      models.forEach((model) => drawModel(ctx, model, zf));
      drawParticles(ctx);
      animationFrame = requestAnimationFrame(draw);
    }

    function satelliteHit(mx, my) {
      const cache = getSceneCache();
      const activeModel = findModel(props.focusUnitId, cache) || findModel(String(props.selectedId || '').split(':')[0], cache);
      if (!activeModel || !props.showSatellites) return '';
      const zf = props.zoom / 0.34;
      const orbitR = 72 * zf;
      const cx = activeModel.x;
      const cy = activeModel.y;
      for (let index = 0; index < topicKeys().length; index += 1) {
        const key = topicKeys()[index];
        const angle = (Math.PI * 2 * index) / topicKeys().length + time * 0.18;
        const sx = cx + Math.cos(angle) * (orbitR / (canvasRef.value?.offsetWidth || 1));
        const sy = cy + Math.sin(angle) * (orbitR / (canvasRef.value?.offsetHeight || 1));
        if (Math.hypot(mx - sx, my - sy) < 0.035) return `${activeModel.id}:${key}`;
      }
      return '';
    }

    function hitAt(event) {
      const canvas = canvasRef.value;
      if (!canvas) return '';
      const rect = canvas.getBoundingClientRect();
      const mx = (event.clientX - rect.left) / rect.width;
      const my = (event.clientY - rect.top) / rect.height;
      const satellite = satelliteHit(mx, my);
      if (satellite) return satellite;
      let hit = '';
      let minDist = 0.045 * Math.max(1, props.zoom / 0.34);
      getSceneCache().models.forEach((model) => {
        const dist = Math.hypot(model.x - mx, model.y - my);
        if (dist < minDist) {
          minDist = dist;
          hit = model.id;
        }
      });
      return hit;
    }

    function handleClick(event) {
      const id = hitAt(event);
      if (!id) {
        emit('background-click');
        return;
      }
      const base = findModel(String(id).split(':')[0]);
      if (base) {
        const rect = canvasRef.value.getBoundingClientRect();
        spawnParticles(base.x * rect.width * dpr, base.y * rect.height * dpr, base.color);
      }
      emit('select', id);
    }

    function handleMove(event) {
      pendingHoverPoint = { clientX: event.clientX, clientY: event.clientY };
      if (hoverFrame) return;
      hoverFrame = window.requestAnimationFrame(() => {
        hoverFrame = 0;
        if (!pendingHoverPoint) return;
        const id = hitAt(pendingHoverPoint);
        if (id !== lastHoveredId) {
          lastHoveredId = id;
          emit('update:hovered-id', id);
        }
      });
    }

    function handleLeave() {
      lastHoveredId = '';
      emit('update:hovered-id', '');
    }

    function handleWheel(event) {
      event.preventDefault();
      const next = props.zoom + (event.deltaY > 0 ? -0.02 : 0.02);
      emit('update:zoom', next);
    }

    function startDrawing() {
      if (animationFrame) return;
      lastDrawTimestamp = 0;
      animationFrame = requestAnimationFrame(draw);
    }

    function stopDrawing() {
      if (!animationFrame) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopDrawing();
      } else {
        startDrawing();
      }
    }

    onMounted(() => {
      initStars();
      initAmbientPlanets();
      resize();
      window.addEventListener('resize', requestResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      startDrawing();
    });

    watch(() => props.scene, () => {
      invalidateSceneCache();
      resize();
    });

    onBeforeUnmount(() => {
      stopDrawing();
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
      }
      if (hoverFrame) {
        window.cancelAnimationFrame(hoverFrame);
        hoverFrame = 0;
      }
      window.removeEventListener('resize', requestResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    return () => h('canvas', {
      ref: canvasRef,
      class: 'reference-starfield-canvas',
      onClick: handleClick,
      onMousemove: handleMove,
      onMouseleave: handleLeave,
      onWheel: handleWheel
    });
  }
});

const selectedId = ref('');
const activeUnitId = ref('');
const hoveredId = ref('');
const pageRef = ref(null);
const controlsVisible = ref(false);
const planetStudioVisible = ref(false);
const fullscreenActive = ref(false);
const zoom = ref(0.66);
const activeSectionKey = ref(FUNCTION_TOPIC_ORDER[0]);
const privatePlanets = ref([]);
const planetDraft = ref(createEmptyPlanetDraft());
const planetLoading = ref(false);
const planetSaving = ref(false);
const planetError = ref('');
const planetNotice = ref('');

const planetTopicFields = FUNCTION_TOPIC_ORDER.map((topicKey) => ({
  key: topicKey,
  label: FUNCTION_TOPIC_META[topicKey].label
}));
const loginHref = computed(() => `/login.html?redirect=${encodeURIComponent('/#/starfield')}`);
const privateUnits = computed(() =>
  privatePlanets.value.map((planet, index) => createPrivateFunctionUnit(planet, index, privatePlanets.value.length))
);
const sceneUnits = computed(() => [...listFunctionUnits(), ...privateUnits.value]);
const privateUnitMap = computed(() => Object.fromEntries(privateUnits.value.map((unit) => [unit.id, unit])));
const isEditingPlanet = computed(() => Boolean(planetDraft.value.id));

const expandedUnitIds = computed(() => (activeUnitId.value ? [activeUnitId.value] : []));
const scene = computed(() =>
  createFunctionStarfieldScene({
    expandedUnitIds: expandedUnitIds.value,
    includeSatelliteModels: true,
    units: sceneUnits.value
  })
);
const currentNode = computed(() => scene.value.nodes.find((node) => node.id === selectedId.value) || null);
const content = computed(() => getNodeContent(currentNode.value, scene.value));
const activeUnit = computed(() => (
  scene.value.meta?.unitMap?.[activeUnitId.value]
  || privateUnitMap.value[activeUnitId.value]
  || getFunctionUnitById(activeUnitId.value)
  || content.value.unit
  || null
));
const currentTopicMeta = computed(() => FUNCTION_TOPIC_META[activeSectionKey.value] || { label: '函数知识', accent: '#7eefff' });
const currentAccent = computed(() => currentNode.value?.color || activeUnit.value?.color || currentTopicMeta.value.accent || '#7eefff');
const isKnowledgeCardVisible = computed(() => !controlsVisible.value && !planetStudioVisible.value && Boolean(selectedId.value && activeUnitId.value));
const sectionTabs = computed(() => {
  if (!activeUnit.value) return [];
  return FUNCTION_TOPIC_ORDER.map((topicKey) => ({
    key: topicKey,
    label: activeUnit.value.cards[topicKey].title,
    color: FUNCTION_TOPIC_META[topicKey].accent
  }));
});
const displaySection = computed(() => {
  if (!activeUnit.value) return null;
  return activeUnit.value.cards[activeSectionKey.value] || activeUnit.value.cards[FUNCTION_TOPIC_ORDER[0]];
});
const relatedNodes = computed(() => {
  const baseId = currentNode.value?.type === 'topic' ? activeUnitId.value : selectedId.value;
  if (!baseId) return [];
  return getRelatedNodes(scene.value, baseId, 8).filter((item) => item.node.id !== selectedId.value);
});
const cardSummary = computed(() => (
  currentNode.value?.type === 'topic'
    ? content.value.summary
    : activeUnit.value?.summary || content.value.summary
));
const cardTags = computed(() => {
  const tags = [];
  if (activeUnit.value?.shortLabel) tags.push(activeUnit.value.shortLabel);
  if (currentNode.value?.type === 'topic') tags.push(currentTopicMeta.value.label);
  (content.value.tags || []).forEach((tag) => {
    if (!tags.includes(tag)) tags.push(tag);
  });
  return tags.slice(0, 5);
});
const stageCopy = computed(() => {
  if (controlsVisible.value) {
    return activeUnit.value
      ? `当前聚焦 ${activeUnit.value.name}，你可以先在控制坞里调整视角，再继续点亮它周围的知识卫星。`
      : '拖动画布浏览星空，右上角控制坞可随时隐藏或展开，函数星球与知识卫星都支持直接点亮。';
  }
  if (planetStudioVisible.value) {
    return isAuthenticated.value
      ? '你可以创建、编辑并保存自己的私有函数星球，它们会作为另一层数据进入同一张函数星图。'
      : '登录后可把你手动整理的函数和 5 类知识卡保存成私有星球，并继续保留当前这套星图视觉效果。';
  }
  return activeUnit.value
    ? `当前已点亮 ${activeUnit.value.name} 的知识轨道，继续点击知识卫星可切换更细的知识卡。`
    : '拖动画布浏览星空，函数星球与知识卫星都能直接点亮并打开对应知识卡。';
});
const tipCopy = computed(() => {
  if (controlsVisible.value) {
    return '控制坞已展开，点击任意函数星球或知识卫星会自动切回知识卡。';
  }
  if (planetStudioVisible.value) {
    return isAuthenticated.value
      ? '右侧面板里填写标题、表达式、简介和 5 类知识卡，就能生成自己的私有星球。'
      : '先登录，再把自己的函数星球保存到数据库。';
  }
  return activeUnit.value
    ? '点击空白区域可回到全景，拖动画布可继续浏览整张函数星图。'
    : '拖动画布浏览星空，函数星球与知识卫星都支持直接点亮。';
});
const themeStyle = computed(() => ({
  '--accent': currentAccent.value,
  '--accent-soft': hexToRgba(currentAccent.value, 0.22),
  '--accent-faint': hexToRgba(currentAccent.value, 0.1),
  '--accent-glow': hexToRgba(currentAccent.value, 0.4)
}));

const pageStyle = computed(() => ({
  ...themeStyle.value
}));

let pointerFrame = 0;
let pendingPointer = null;

function clampZoom(value) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

function updatePointer(event) {
  pendingPointer = { x: event.clientX, y: event.clientY };
  if (pointerFrame) return;
  pointerFrame = window.requestAnimationFrame(() => {
    pointerFrame = 0;
    if (!pageRef.value || !pendingPointer) return;
    pageRef.value.style.setProperty('--pointer-x', `${pendingPointer.x}px`);
    pageRef.value.style.setProperty('--pointer-y', `${pendingPointer.y}px`);
  });
}

function relationLabel(type) {
  const map = {
    relation: '函数关系',
    profile: '函数特征',
    geometry: '图像几何',
    properties: '常用性质',
    exam: '高考关联',
    composite: '复合函数'
  };
  return map[type] || '知识连接';
}

function findNodeById(id) {
  return scene.value.nodes.find((node) => node.id === id) || null;
}

function handleSelect(id) {
  const node = findNodeById(id);
  if (!node) return;
  controlsVisible.value = false;
  activeUnitId.value = node.unitId || node.id;
  selectedId.value = node.id;
  hoveredId.value = node.id;
  activeSectionKey.value = node.topicKey || FUNCTION_TOPIC_ORDER[0];
}

function activateSection(topicKey) {
  if (!activeUnitId.value) return;
  const topicNodeId = `${activeUnitId.value}:${topicKey}`;
  const topicNode = findNodeById(topicNodeId);
  if (topicNode) {
    handleSelect(topicNodeId);
  } else {
    activeSectionKey.value = topicKey;
  }
}

function hideKnowledgeCard(preserveFocus = false) {
  selectedId.value = '';
  hoveredId.value = preserveFocus ? activeUnitId.value : '';
  if (!preserveFocus) {
    activeUnitId.value = '';
  }
  activeSectionKey.value = FUNCTION_TOPIC_ORDER[0];
}

function toggleControls() {
  if (controlsVisible.value) {
    controlsVisible.value = false;
    return;
  }
  planetStudioVisible.value = false;
  if (selectedId.value && activeUnitId.value) {
    hideKnowledgeCard(true);
  }
  controlsVisible.value = true;
}

function resetPlanetDraft(clearFeedback = true) {
  planetDraft.value = createEmptyPlanetDraft();
  if (clearFeedback) {
    planetError.value = '';
    planetNotice.value = '';
  }
}

async function loadPrivatePlanets() {
  if (!isAuthenticated.value) {
    privatePlanets.value = [];
    return;
  }
  planetLoading.value = true;
  planetError.value = '';
  try {
    privatePlanets.value = await fetchFunctionPlanets();
    if (activeUnitId.value.startsWith('private:')) {
      const exists = privatePlanets.value.some((planet) => `private:${planet.id}` === activeUnitId.value);
      if (!exists) {
        closeKnowledgeCard();
      }
    }
  } catch (error) {
    planetError.value = error.message || '私有星球加载失败';
  } finally {
    planetLoading.value = false;
  }
}

function togglePlanetStudio() {
  if (planetStudioVisible.value) {
    planetStudioVisible.value = false;
    return;
  }
  controlsVisible.value = false;
  if (selectedId.value && activeUnitId.value) {
    hideKnowledgeCard(true);
  }
  planetStudioVisible.value = true;
  if (isAuthenticated.value && !privatePlanets.value.length) {
    loadPrivatePlanets();
  }
}

function closeKnowledgeCard() {
  hideKnowledgeCard();
}

function openWorkbench() {
  if (!activeUnit.value) return;
  if (activeUnit.value.source === 'private') {
    savePendingFunctionUnit({ kind: 'custom', unit: activeUnit.value });
  } else {
    savePendingFunctionUnit(activeUnitId.value);
  }
  emit('open-workbench', activeUnitId.value);
}

async function savePlanet() {
  if (!isAuthenticated.value) {
    planetError.value = '请先登录后再保存私有星球';
    return;
  }

  planetSaving.value = true;
  planetError.value = '';
  planetNotice.value = '';
  try {
    const payload = createPlanetPayloadFromDraft(planetDraft.value);
    const saved = planetDraft.value.id
      ? await updateFunctionPlanet(planetDraft.value.id, payload)
      : await createFunctionPlanet(payload);
    const existingIndex = privatePlanets.value.findIndex((planet) => planet.id === saved.id);
    if (existingIndex >= 0) {
      privatePlanets.value.splice(existingIndex, 1, saved);
    } else {
      privatePlanets.value.unshift(saved);
    }
    const wasEditing = Boolean(planetDraft.value.id);
    resetPlanetDraft(false);
    planetNotice.value = wasEditing ? '私有星球已更新。' : '私有星球已保存。';
    handleSelect(`private:${saved.id}`);
  } catch (error) {
    planetError.value = error.message || '私有星球保存失败';
  } finally {
    planetSaving.value = false;
  }
}

function editPrivatePlanet(planet) {
  planetStudioVisible.value = true;
  controlsVisible.value = false;
  planetError.value = '';
  planetNotice.value = '';
  planetDraft.value = createPlanetDraftFromRecord(planet);
}

function focusPrivatePlanet(planet) {
  handleSelect(`private:${planet.id}`);
  planetStudioVisible.value = false;
}

function openWorkbenchWithPlanet(planet) {
  const unit = privateUnits.value.find((item) => item.id === `private:${planet.id}`) || createPrivateFunctionUnit(planet, 0, 1);
  savePendingFunctionUnit({ kind: 'custom', unit });
  emit('open-workbench', unit.id);
}

async function deletePlanet(planet) {
  if (typeof window !== 'undefined' && !window.confirm(`确定删除私有星球“${planet.title}”吗？`)) {
    return;
  }
  planetError.value = '';
  planetNotice.value = '';
  try {
    await deleteFunctionPlanet(planet.id);
    privatePlanets.value = privatePlanets.value.filter((item) => item.id !== planet.id);
    if (activeUnitId.value === `private:${planet.id}`) {
      closeKnowledgeCard();
    }
    if (planetDraft.value.id === planet.id) {
      resetPlanetDraft();
    }
    planetNotice.value = '私有星球已删除。';
  } catch (error) {
    planetError.value = error.message || '私有星球删除失败';
  }
}

function syncFullscreenState() {
  fullscreenActive.value = typeof document !== 'undefined' && Boolean(document.fullscreenElement);
}

async function toggleFullscreen() {
  if (typeof document === 'undefined') return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await document.documentElement?.requestFullscreen?.();
    }
  } catch {
    // Ignore browsers that deny fullscreen.
  }
}

onMounted(async () => {
  await initializeAuth();
  if (isAuthenticated.value) {
    await loadPrivatePlanets();
  }
  syncFullscreenState();
  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', syncFullscreenState);
  }
});

watch(isAuthenticated, (value) => {
  if (value) {
    loadPrivatePlanets();
  } else {
    privatePlanets.value = [];
    if (activeUnitId.value.startsWith('private:')) {
      closeKnowledgeCard();
    }
    resetPlanetDraft();
  }
});

onBeforeUnmount(() => {
  if (pointerFrame) {
    window.cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('fullscreenchange', syncFullscreenState);
  }
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
.starfield-page {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.starfield-stage {
  --accent: #7eefff;
  --accent-soft: rgba(126, 239, 255, 0.22);
  --accent-faint: rgba(126, 239, 255, 0.1);
  --accent-glow: rgba(126, 239, 255, 0.4);
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(circle at 50% 50%, rgba(126, 239, 255, 0.08), transparent 20%),
    radial-gradient(circle at 20% 18%, rgba(83, 122, 255, 0.28), transparent 28%),
    radial-gradient(circle at 84% 16%, rgba(255, 199, 122, 0.16), transparent 22%),
    radial-gradient(circle at 80% 82%, rgba(135, 104, 255, 0.2), transparent 28%),
    radial-gradient(circle at 18% 80%, rgba(77, 211, 255, 0.12), transparent 24%),
    linear-gradient(180deg, #02050c 0%, #040915 42%, #02040a 100%);
}

.stage-noise,
.stage-grid,
.stage-rings,
.stage-haze,
.stage-vignette,
.stage-core-glow,
.stage-beam,
.stage-scan-line,
.stage-corner {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stage-noise {
  opacity: 0.16;
  mix-blend-mode: screen;
  background-image:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px),
    radial-gradient(circle at 74% 66%, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px),
    linear-gradient(120deg, rgba(255, 255, 255, 0.02), transparent 24%, rgba(255, 255, 255, 0.02) 54%, transparent 76%);
  background-size: 28px 28px, 40px 40px, 100% 100%;
}

.stage-grid {
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(120deg, rgba(126, 239, 255, 0.03), transparent 28%),
    linear-gradient(300deg, rgba(255, 215, 119, 0.025), transparent 28%);
  background-size: 132px 132px, 132px 132px, 100% 100%, 100% 100%;
  mask-image: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.8) 16%, rgba(0, 0, 0, 0.8) 84%, transparent);
}

.stage-rings {
  opacity: 0.34;
  mix-blend-mode: screen;
  background:
    radial-gradient(circle at 52% 50%, rgba(255, 255, 255, 0.12) 0 1px, transparent 1px),
    repeating-radial-gradient(
      circle at 52% 50%,
      color-mix(in srgb, var(--accent) 24%, transparent) 0 2px,
      transparent 2px 54px
    ),
    radial-gradient(circle at 52% 50%, var(--accent-faint) 0, transparent 44%);
  mask-image: radial-gradient(circle at 52% 50%, rgba(0, 0, 0, 0.78) 0, rgba(0, 0, 0, 0.48) 24%, transparent 56%);
  animation: stagePulse 18s ease-in-out infinite;
}

.stage-haze {
  filter: blur(90px);
  opacity: 0.32;
}

.haze-left {
  inset: auto auto -120px -120px;
  width: 420px;
  height: 420px;
  background: rgba(97, 121, 255, 0.34);
}

.haze-right {
  inset: -120px -120px auto auto;
  width: 380px;
  height: 380px;
  background: var(--accent-soft);
}

.stage-core-glow {
  opacity: 0.36;
  mix-blend-mode: screen;
  background:
    radial-gradient(circle at 52% 50%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 24%),
    radial-gradient(circle at 52% 50%, rgba(255, 255, 255, 0.08), transparent 14%);
  filter: blur(26px);
  animation: stageFloat 14s ease-in-out infinite;
}

.stage-beam {
  inset: auto;
  top: 50%;
  width: min(42vw, 680px);
  height: 220px;
  opacity: 0.24;
  filter: blur(28px);
  mix-blend-mode: screen;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--accent) 26%, transparent) 22%,
    rgba(255, 255, 255, 0.06) 48%,
    transparent 78%
  );
  transform-origin: center;
  animation: beamSweep 18s ease-in-out infinite;
}

.beam-left {
  left: 14%;
  transform: translate(-12%, -50%) rotate(-14deg);
}

.beam-right {
  right: 10%;
  opacity: 0.18;
  transform: translate(12%, -50%) rotate(16deg);
  animation-delay: -9s;
}

.stage-vignette {
  background:
    radial-gradient(circle at center, rgba(0, 0, 0, 0) 48%, rgba(0, 0, 0, 0.42) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.28));
}

.stage-scan-line {
  z-index: 3;
  opacity: 0.56;
  background: linear-gradient(180deg, transparent 0%, transparent 44%, rgba(126, 239, 255, 0.035) 49%, rgba(255, 255, 255, 0.045) 50%, rgba(126, 239, 255, 0.03) 51%, transparent 58%, transparent 100%);
  transform: translateY(-100%);
  animation: scanLineDrift 8.4s linear infinite;
  mix-blend-mode: screen;
}

.stage-corner {
  z-index: 4;
  width: 118px;
  height: 118px;
  opacity: 0.24;
  border-color: color-mix(in srgb, var(--accent) 46%, rgba(255,255,255,0.2));
  filter: drop-shadow(0 0 12px var(--accent-faint));
}

.corner-top-left { top: 18px; left: 18px; border-top: 1px solid; border-left: 1px solid; }
.corner-bottom-right { right: 18px; bottom: 18px; border-right: 1px solid; border-bottom: 1px solid; }

.stage-header,
.stage-toolbar,
.canvas-tip {
  position: absolute;
  z-index: 4;
}

.knowledge-card,
.planet-studio {
  position: absolute;
}

.stage-header {
  top: 28px;
  left: 28px;
  max-width: 420px;
  animation: stageHeaderIn 0.82s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2), 0 0 26px rgba(126, 239, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
  animation: brandDotPulse 2.2s ease-in-out infinite;
}

.brand-pill iconify-icon {
  font-size: 16px;
  color: var(--accent);
  filter: drop-shadow(0 0 10px var(--accent-glow));
}

.stage-header h1 {
  margin: 16px 0 0;
  font-size: clamp(42px, 5vw, 64px);
  line-height: 0.98;
  letter-spacing: -0.04em;
  color: rgba(255, 255, 255, 0.98);
  font-family: 'Orbitron', "Trebuchet MS", "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
  text-shadow: 0 0 34px rgba(255, 255, 255, 0.08), 0 0 80px rgba(126, 239, 255, 0.08);
}

.stage-header p {
  margin: 14px 0 0;
  line-height: 1.8;
  color: rgba(233, 241, 255, 0.72);
  font-size: 14px;
}

.stage-toolbar {
  top: 28px;
  right: 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
}

.toolbar-trigger,
.dock-btn,
.card-btn,
.mini-btn,
.section-tab,
.related-item,
.dock-close,
.card-close {
  font: inherit;
  border: none;
  cursor: pointer;
}

.toolbar-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 12, 24, 0.66);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.96);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.toolbar-trigger.active,
.toolbar-trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(10, 16, 28, 0.82);
}

.control-dock,
.knowledge-card,
.planet-studio {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(180deg, rgba(6, 10, 20, 0.92), rgba(4, 8, 18, 0.8)),
    radial-gradient(circle at top left, var(--accent-faint), transparent 42%);
  backdrop-filter: blur(24px);
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.36),
    0 0 40px rgba(126, 239, 255, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.control-dock {
  width: min(320px, calc(100vw - 56px));
  padding: 18px;
  border-radius: 26px;
}

.dock-head,
.card-head,
.related-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.dock-kicker,
.card-kicker {
  display: block;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.48);
  font-family: 'Orbitron', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.dock-head strong,
.card-head h2 {
  display: block;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.98);
}

.dock-close,
.card-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.86);
}

.dock-grid,
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.dock-grid {
  margin-top: 16px;
}

.dock-stat,
.overview-item {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dock-stat span,
.overview-item span {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.48);
}

.dock-stat strong,
.overview-item strong {
  display: block;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.96);
}

.dock-slider,
.dock-legend {
  margin-top: 16px;
}

.dock-row,
.dock-scale {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dock-row {
  color: rgba(255, 255, 255, 0.84);
}

.dock-row small,
.dock-scale {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.zoom-slider {
  width: 100%;
  margin: 12px 0 8px;
  accent-color: var(--accent);
  height: 4px;
  border-radius: 999px;
  appearance: none;
  background: linear-gradient(90deg, var(--accent-soft), rgba(255,255,255,0.08));
  outline: none;
}

.zoom-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 14px var(--accent-glow), 0 0 0 4px var(--accent-faint);
}

.zoom-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 14px var(--accent-glow), 0 0 0 4px var(--accent-faint);
}

.dock-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legend-chip,
.tag-chip,
.section-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}

.legend-dot,
.tab-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dock-actions,
.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.dock-btn,
.card-btn {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.94);
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.dock-btn.primary,
.card-btn.primary {
  background: linear-gradient(135deg, var(--accent-soft), rgba(255, 255, 255, 0.1));
}

.dock-btn:hover,
.card-btn:hover,
.section-tab:hover,
.related-item:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.24);
}

.dock-btn:disabled,
.card-btn:disabled {
  opacity: 0.44;
  cursor: not-allowed;
}

.knowledge-card,
.planet-studio {
  top: 104px;
  right: 28px;
  z-index: 5;
  padding: 22px;
  border-radius: 30px;
  overflow: auto;
  transform: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.knowledge-card {
  width: min(430px, calc(100vw - 56px));
  max-height: min(72vh, 820px);
}

.planet-studio {
  width: min(520px, calc(100vw - 56px));
  max-height: min(78vh, 860px);
}

.knowledge-card::-webkit-scrollbar,
.planet-studio::-webkit-scrollbar {
  width: 8px;
}

.knowledge-card::-webkit-scrollbar-thumb,
.planet-studio::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.card-head h2 {
  margin: 10px 0 0;
  font-size: 30px;
  line-height: 1.04;
}

.card-head p,
.card-summary,
.section-desc,
.section-list li,
.related-item small,
.planet-identity span {
  color: rgba(232, 240, 255, 0.72);
}

.card-head p {
  margin: 10px 0 0;
  line-height: 1.6;
  font-size: 13px;
}

.card-overview {
  margin-top: 18px;
}

.planet-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--accent-soft), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.planet-core {
  width: 58px;
  height: 58px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
}

.planet-orb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 32%, rgba(255,255,255,0.98), var(--accent) 42%, rgba(0,0,0,0) 74%);
  box-shadow: 0 0 24px var(--accent-glow);
}

.planet-identity strong {
  display: block;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.98);
}

.overview-grid {
  margin-top: 12px;
}

.card-summary {
  margin: 18px 0 0;
  line-height: 1.8;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.tag-chip {
  background: var(--accent-faint);
}

.section-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.section-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.88);
}

.section-tab .tab-dot {
  background: var(--tab-accent);
  box-shadow: 0 0 16px var(--tab-accent);
}

.section-tab.active {
  background: color-mix(in srgb, var(--tab-accent) 18%, rgba(255, 255, 255, 0.08));
  border-color: color-mix(in srgb, var(--tab-accent) 52%, rgba(255, 255, 255, 0.14));
}

.section-panel,
.related-panel {
  margin-top: 18px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-head.compact {
  align-items: center;
}

.section-pill {
  background: var(--accent-faint);
}

.section-head strong,
.related-head strong {
  color: rgba(255, 255, 255, 0.98);
}

.section-desc {
  margin: 12px 0 0;
  line-height: 1.7;
  font-size: 13px;
}

.section-list {
  margin: 14px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
}

.section-list li {
  line-height: 1.7;
}

.related-head {
  color: rgba(255, 255, 255, 0.82);
}

.related-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.related-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.related-item span {
  display: block;
  color: rgba(255, 255, 255, 0.94);
  font-weight: 700;
}

.related-item small {
  display: block;
  margin-top: 6px;
}

.studio-login,
.studio-form-panel,
.studio-saved-panel {
  margin-top: 18px;
}

.studio-login p {
  margin: 0;
  color: rgba(232, 240, 255, 0.76);
  line-height: 1.7;
}

.studio-banner {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(126, 239, 255, 0.18);
  background: rgba(126, 239, 255, 0.08);
  color: rgba(234, 245, 255, 0.92);
}

.studio-banner.error {
  border-color: rgba(255, 138, 168, 0.22);
  background: rgba(255, 138, 168, 0.08);
}

.studio-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.studio-field {
  display: grid;
  gap: 8px;
}

.studio-field.full {
  grid-column: 1 / -1;
}

.studio-field span,
.studio-saved-copy span {
  color: rgba(232, 240, 255, 0.72);
  font-size: 12px;
}

.studio-field input,
.studio-field textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.94);
  padding: 12px 14px;
  resize: vertical;
  font: inherit;
}

.studio-field input::placeholder,
.studio-field textarea::placeholder {
  color: rgba(232, 240, 255, 0.38);
}

.studio-field input:focus,
.studio-field textarea:focus {
  outline: none;
  border-color: rgba(126, 239, 255, 0.28);
  box-shadow: 0 0 0 3px rgba(126, 239, 255, 0.08);
}

.studio-card-grid {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.studio-card-editor {
  padding: 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.studio-saved-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.studio-saved-item {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.studio-saved-item.active {
  border-color: rgba(126, 239, 255, 0.22);
  background: linear-gradient(135deg, rgba(126, 239, 255, 0.12), rgba(255, 255, 255, 0.05));
}

.studio-saved-copy strong {
  display: block;
  color: rgba(255, 255, 255, 0.96);
}

.studio-saved-copy span {
  display: block;
  margin-top: 6px;
}

.studio-saved-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.mini-btn {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.mini-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.22);
}

.mini-btn.danger {
  color: rgba(255, 176, 194, 0.94);
}

.empty-panel {
  margin-top: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.14);
  color: rgba(232, 240, 255, 0.68);
  text-align: center;
}

.canvas-tip {
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(7, 12, 24, 0.72), rgba(7, 12, 24, 0.52));
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24);
  color: rgba(255, 255, 255, 0.84);
}


.stage-hud {
  position: absolute;
  left: 28px;
  bottom: 80px;
  z-index: 4;
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 16px;
  color: color-mix(in srgb, var(--accent) 54%, rgba(255,255,255,0.22));
  font-family: 'Orbitron', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: linear-gradient(180deg, rgba(4, 10, 22, 0.22), rgba(4, 10, 22, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(10px);
  pointer-events: none;
  animation: stageHeaderIn 0.9s ease-out 0.55s both;
}

.stage-hud::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 10px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 14px var(--accent);
  transform: translateX(-16px);
}

@keyframes stageFloat {
  0%,
  100% {
    transform: scale(1) translate3d(0, 0, 0);
  }
  50% {
    transform: scale(1.04) translate3d(0, -8px, 0);
  }
}

@keyframes stagePulse {
  0%,
  100% {
    opacity: 0.22;
    transform: scale(0.98);
  }
  50% {
    opacity: 0.38;
    transform: scale(1.02);
  }
}

@keyframes beamSweep {
  0%,
  100% {
    opacity: 0.14;
    filter: blur(28px);
  }
  50% {
    opacity: 0.28;
    filter: blur(34px);
  }
}


@keyframes scanLineDrift {
  0% { transform: translateY(-115%); opacity: 0; }
  8% { opacity: 0.42; }
  72% { opacity: 0.36; }
  100% { transform: translateY(115%); opacity: 0; }
}

@keyframes stageHeaderIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes brandDotPulse {
  0%, 100% { box-shadow: 0 0 8px var(--accent); transform: scale(1); }
  50% { box-shadow: 0 0 22px var(--accent), 0 0 44px var(--accent-faint); transform: scale(1.12); }
}

.dock-pop-enter-active,
.dock-pop-leave-active,
.card-float-enter-active,
.card-float-leave-active {
  transition: all 0.24s ease;
}

.dock-pop-enter-from,
.dock-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.card-float-enter-from,
.card-float-leave-to {
  opacity: 0;
  transform: translate(12px, 22px) scale(0.97);
}



/* ===== Ultimate visual polish: dynamic spotlight, aurora, meteors, premium glass ===== */
.stage-pointer-glow,
.stage-aurora,
.stage-orbit-dust,
.stage-meteor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stage-pointer-glow {
  z-index: 3;
  opacity: 0.72;
  mix-blend-mode: screen;
  background:
    radial-gradient(
      440px circle at var(--pointer-x, 50%) var(--pointer-y, 50%),
      color-mix(in srgb, var(--accent) 22%, transparent),
      rgba(255, 255, 255, 0.035) 26%,
      transparent 68%
    );
  transition: opacity 0.24s ease;
}

.stage-aurora {
  z-index: 2;
  opacity: 0.34;
  filter: blur(48px);
  mix-blend-mode: screen;
  transform-origin: center;
}

.aurora-one {
  background:
    conic-gradient(
      from 160deg at 35% 48%,
      transparent 0deg,
      rgba(126, 239, 255, 0.2) 70deg,
      rgba(118, 104, 255, 0.22) 128deg,
      transparent 190deg,
      transparent 360deg
    );
  animation: auroraDrift 21s ease-in-out infinite;
}

.aurora-two {
  opacity: 0.28;
  background:
    conic-gradient(
      from 20deg at 72% 42%,
      transparent 0deg,
      rgba(255, 214, 132, 0.16) 64deg,
      color-mix(in srgb, var(--accent) 22%, transparent) 138deg,
      transparent 210deg,
      transparent 360deg
    );
  animation: auroraDriftReverse 25s ease-in-out infinite;
}

.stage-orbit-dust {
  z-index: 2;
  opacity: 0.34;
  mix-blend-mode: screen;
  background:
    repeating-conic-gradient(
      from 0deg at 52% 50%,
      transparent 0deg 9deg,
      rgba(255, 255, 255, 0.055) 9.5deg 10deg,
      transparent 10.5deg 23deg
    ),
    radial-gradient(circle at 52% 50%, transparent 0 30%, var(--accent-faint) 31%, transparent 58%);
  mask-image: radial-gradient(circle at 52% 50%, transparent 0 21%, rgba(0,0,0,0.72) 28%, rgba(0,0,0,0.42) 48%, transparent 66%);
  animation: orbitDustSpin 46s linear infinite;
}

.stage-meteor {
  z-index: 3;
  inset: auto;
  width: 190px;
  height: 1px;
  opacity: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.96), var(--accent), transparent);
  box-shadow: 0 0 18px rgba(255,255,255,0.45), 0 0 30px var(--accent-faint);
  transform: rotate(-24deg);
}

.meteor-one {
  top: 18%;
  left: 76%;
  animation: meteorFly 7.8s ease-in-out infinite;
}

.meteor-two {
  top: 38%;
  left: 88%;
  width: 140px;
  opacity: 0;
  animation: meteorFly 11.5s ease-in-out infinite 3.6s;
}

.brand-pill,
.toolbar-trigger,
.dock-btn,
.card-btn,
.mini-btn,
.section-tab,
.related-item,
.section-panel,
.related-panel,
.studio-card-editor,
.studio-saved-item,
.control-dock {
  position: relative;
}

.knowledge-card,
.planet-studio {
  position: absolute;
}

.brand-pill,
.toolbar-trigger,
.dock-btn,
.card-btn,
.mini-btn {
  overflow: hidden;
}

.brand-pill::after,
.dock-btn::after,
.card-btn::after,
.mini-btn::after,
.toolbar-trigger::after {
  content: "";
  position: absolute;
  top: -60%;
  bottom: -60%;
  left: -70%;
  width: 54%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
  transform: rotate(18deg);
  transition: left 0.55s ease;
  pointer-events: none;
}

.brand-pill::after {
  animation: pillSweep 5.8s ease-in-out infinite;
}

.dock-btn:hover::after,
.card-btn:hover::after,
.mini-btn:hover::after,
.toolbar-trigger:hover::after {
  left: 132%;
}

.control-dock::before,
.knowledge-card::before,
.planet-studio::before,
.section-panel::before,
.related-panel::before,
.studio-card-editor::before,
.studio-saved-item::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.control-dock::before,
.knowledge-card::before,
.planet-studio::before {
  padding: 1px;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,0.34),
      color-mix(in srgb, var(--accent) 52%, transparent),
      rgba(255,255,255,0.055),
      rgba(255, 214, 132, 0.2)
    );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.knowledge-card::after,
.planet-studio::after,
.control-dock::after {
  content: "";
  position: absolute;
  width: 230px;
  height: 230px;
  top: -130px;
  right: -130px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent-soft), transparent 68%);
  opacity: 0.58;
  pointer-events: none;
}

.section-panel::before,
.related-panel::before,
.studio-card-editor::before,
.studio-saved-item::before {
  background:
    linear-gradient(120deg, rgba(255,255,255,0.09), transparent 28%, transparent 72%, rgba(255,255,255,0.035));
  opacity: 0.68;
}

.stage-toolbar {
  padding: 8px;
  border-radius: 28px;
  background: rgba(4, 8, 18, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(18px);
  box-shadow:
    0 22px 48px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.toolbar-trigger {
  min-width: 158px;
  justify-content: flex-start;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035)),
    rgba(7, 12, 24, 0.72);
}

.toolbar-trigger.active {
  box-shadow:
    0 0 0 1px var(--accent-soft),
    0 0 28px var(--accent-faint),
    inset 0 1px 0 rgba(255,255,255,0.12);
}

.stage-header h1 {
  font-size: clamp(46px, 5.4vw, 76px);
  line-height: 0.92;
  letter-spacing: -0.065em;
  font-weight: 900;
  color: transparent;
  background:
    linear-gradient(
      120deg,
      rgba(255,255,255,0.98),
      color-mix(in srgb, var(--accent) 72%, white),
      rgba(255,255,255,0.86)
    );
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow:
    0 0 34px rgba(255, 255, 255, 0.1),
    0 0 90px var(--accent-faint);
  animation: titleBreath 5.6s ease-in-out infinite;
}

.overview-grid .overview-item:first-child {
  grid-column: 1 / -1;
  background:
    linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0.055));
  border-color: color-mix(in srgb, var(--accent) 28%, rgba(255,255,255,0.1));
}

.overview-grid .overview-item:first-child strong {
  font-size: 22px;
}

.section-list {
  padding-left: 0;
  list-style: none;
}

.section-list li {
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.035);
  border-left: 3px solid var(--accent-faint);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.section-list li:hover {
  transform: translateX(4px);
  background: rgba(255,255,255,0.065);
  border-left-color: var(--accent);
}

@keyframes auroraDrift {
  0%, 100% { transform: translate3d(-3%, 2%, 0) rotate(0deg) scale(1); }
  50% { transform: translate3d(4%, -3%, 0) rotate(8deg) scale(1.08); }
}

@keyframes auroraDriftReverse {
  0%, 100% { transform: translate3d(4%, -2%, 0) rotate(0deg) scale(1); }
  50% { transform: translate3d(-4%, 3%, 0) rotate(-10deg) scale(1.06); }
}

@keyframes orbitDustSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes meteorFly {
  0%, 74% { opacity: 0; transform: translate3d(0, 0, 0) rotate(-24deg); }
  79% { opacity: 0.88; }
  100% { opacity: 0; transform: translate3d(-560px, 230px, 0) rotate(-24deg); }
}

@keyframes pillSweep {
  0%, 62% { left: -70%; }
  100% { left: 132%; }
}

@keyframes titleBreath {
  0%, 100% { filter: drop-shadow(0 0 16px var(--accent-faint)); }
  50% { filter: drop-shadow(0 0 30px var(--accent-soft)); }
}

@media (prefers-reduced-motion: reduce) {
  .stage-rings,
  .stage-core-glow,
  .stage-beam,
  .stage-aurora,
  .stage-orbit-dust,
  .stage-meteor,
  .stage-scan-line,
  .brand-dot,
  .brand-pill::after,
  .stage-header h1 {
    animation: none !important;
  }
}

@media (max-width: 920px) {
  .stage-header {
    max-width: calc(100vw - 48px);
  }

  .knowledge-card,
  .planet-studio {
    top: 96px;
    right: 24px;
    width: min(500px, calc(100vw - 48px));
  }

  .knowledge-card {
    max-height: 58vh;
  }

  .planet-studio {
    max-height: 64vh;
  }

  .canvas-tip {
    bottom: 24px;
  }
}

@media (max-width: 720px) {
  .brand-pill span {
    display: none;
  }

  .stage-toolbar {
    padding: 6px;
    gap: 8px;
  }

  .toolbar-trigger {
    min-width: auto;
    width: 44px;
    height: 44px;
    padding: 0;
    justify-content: center;
  }

  .toolbar-trigger span {
    display: none;
  }


  .stage-header,
  .stage-toolbar {
    top: 18px;
  }

  .stage-header {
    left: 18px;
  }

  .stage-toolbar {
    right: 18px;
  }

  .stage-header h1 {
    font-size: 34px;
  }

  .stage-header p {
    max-width: 290px;
  }

  .control-dock,
  .knowledge-card,
  .planet-studio {
    width: calc(100vw - 36px);
  }

  .knowledge-card,
  .planet-studio {
    top: auto;
    right: 18px;
    left: 18px;
    bottom: 76px;
  }

  .knowledge-card {
    max-height: 50vh;
  }

  .planet-studio {
    max-height: 58vh;
  }

  .canvas-tip {
    left: 18px;
    right: 18px;
    bottom: 18px;
    transform: none;
    justify-content: center;
    text-align: center;
  }

  .stage-hud {
    display: none;
  }

  .dock-actions,
  .card-actions,
  .dock-grid,
  .overview-grid,
  .studio-fields {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .toolbar-trigger {
    padding: 10px 14px;
  }
}


/* ===== Reference matched polish overrides ===== */
.stage-header h1 {
  background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, var(--accent) 58%, rgba(255,255,255,0.68) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 34px rgba(255,255,255,0.08));
}

.stage-header p {
  max-width: 410px;
}

.brand-pill,
.toolbar-trigger,
.dock-kicker,
.card-kicker,
.section-pill,
.related-head span,
.related-head strong,
.dock-row,
.dock-scale,
.stage-hud,
.card-close,
.dock-close {
  font-family: 'Orbitron', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.dock-kicker,
.card-kicker,
.section-pill,
.related-head span {
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.dock-head strong,
.card-head h2,
.related-head strong {
  font-family: 'Orbitron', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  letter-spacing: 0.03em;
}

.dock-head strong,
.card-head h2 {
  font-size: 20px;
  color: rgba(255,255,255,0.98);
}

.toolbar-trigger {
  font-size: 13px;
  letter-spacing: 0.04em;
}

.toolbar-trigger iconify-icon,
.card-close iconify-icon,
.dock-close iconify-icon {
  filter: drop-shadow(0 0 10px var(--accent-faint));
}

.control-dock,
.knowledge-card,
.planet-studio {
  border-radius: 30px;
}

.dock-stat strong,
.identity-code,
.identity-title,
.overview-item strong,
.studio-saved-copy strong,
.related-item span {
  font-family: 'Orbitron', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.dock-stat strong,
.overview-item strong {
  letter-spacing: 0.03em;
}

.canvas-tip {
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.canvas-tip iconify-icon {
  color: var(--accent);
  filter: drop-shadow(0 0 12px var(--accent-glow));
}

.zoom-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255,255,255,0.08), color-mix(in srgb, var(--accent) 28%, rgba(255,255,255,0.12)), rgba(255,255,255,0.06));
}

.zoom-slider::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255,255,255,0.08), color-mix(in srgb, var(--accent) 28%, rgba(255,255,255,0.12)), rgba(255,255,255,0.06));
}

.stage-hud {
  min-width: 220px;
  box-shadow: 0 18px 36px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03);
}

.stage-hud > div + div {
  opacity: 0.9;
}

@media (max-width: 720px) {
  .dock-head strong,
  .card-head h2 {
    font-size: 18px;
  }

  .stage-hud {
    min-width: 0;
  }
}



/* ===== Enlarged readability overrides: make starfield, cards and controls visibly bigger ===== */
.stage-header {
  max-width: 560px;
}

.brand-pill {
  padding: 12px 18px;
  gap: 12px;
  font-size: 13px;
  letter-spacing: 0.095em;
}

.brand-dot {
  width: 9px;
  height: 9px;
}

.brand-pill iconify-icon {
  font-size: 18px;
}

.stage-header h1 {
  margin-top: 18px;
  font-size: clamp(64px, 7.4vw, 108px);
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.stage-header p {
  margin-top: 16px;
  max-width: 520px;
  font-size: 16px;
  line-height: 1.9;
}

.stage-toolbar {
  top: 26px;
  right: 30px;
  gap: 14px;
  padding: 10px;
  border-radius: 32px;
}

.toolbar-trigger {
  min-width: 190px;
  padding: 15px 20px;
  gap: 12px;
  font-size: 15px;
  border-radius: 999px;
}

.toolbar-trigger iconify-icon {
  font-size: 20px;
}

.control-dock {
  width: min(390px, calc(100vw - 56px));
  padding: 22px;
}

.dock-head strong {
  font-size: 22px;
}

.dock-kicker,
.card-kicker {
  font-size: 12px;
}

.dock-grid,
.overview-grid {
  gap: 12px;
}

.dock-stat,
.overview-item {
  padding: 17px;
  border-radius: 20px;
}

.dock-stat span,
.overview-item span {
  font-size: 13px;
}

.dock-stat strong,
.overview-item strong {
  margin-top: 9px;
  font-size: 17px;
}

.dock-row {
  font-size: 15px;
}

.dock-row small,
.dock-scale {
  font-size: 13px;
}

.zoom-slider {
  margin: 16px 0 10px;
}

.zoom-slider::-webkit-slider-thumb {
  width: 22px;
  height: 22px;
}

.zoom-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
}

.legend-chip,
.tag-chip,
.section-pill {
  padding: 8px 13px;
  font-size: 13px;
}

.dock-btn,
.card-btn {
  padding: 14px 16px;
  border-radius: 18px;
  font-size: 14px;
}

.knowledge-card,
.planet-studio {
  top: 98px;
  right: 30px;
  padding: 26px;
  border-radius: 34px;
}

.knowledge-card {
  width: min(540px, calc(100vw - 60px));
  max-height: min(78vh, 900px);
}

.planet-studio {
  width: min(680px, calc(100vw - 60px));
  max-height: min(82vh, 920px);
}

.card-head h2 {
  font-size: 34px;
  line-height: 1.02;
}

.card-head p,
.card-summary,
.section-desc,
.section-list li,
.related-item small,
.planet-identity span,
.studio-login p {
  font-size: 14px;
}

.planet-identity {
  padding: 16px 18px;
  border-radius: 24px;
}

.planet-core {
  width: 68px;
  height: 68px;
}

.planet-orb {
  width: 34px;
  height: 34px;
}

.planet-identity strong {
  font-size: 26px;
}

.section-tabs {
  gap: 12px;
}

.section-tab {
  padding: 12px 16px;
  font-size: 14px;
}

.section-panel,
.related-panel {
  padding: 18px;
  border-radius: 24px;
}

.section-head strong,
.related-head strong {
  font-size: 16px;
}

.section-list {
  gap: 12px;
}

.section-list li {
  line-height: 1.8;
}

.related-list {
  gap: 12px;
}

.related-item {
  padding: 15px 16px;
  border-radius: 18px;
}

.related-item span {
  font-size: 15px;
}

.studio-fields {
  gap: 14px;
}

.studio-field span,
.studio-saved-copy span {
  font-size: 13px;
}

.studio-field input,
.studio-field textarea {
  padding: 14px 16px;
  border-radius: 18px;
  font-size: 14px;
}

.studio-card-editor,
.studio-saved-item {
  padding: 16px;
  border-radius: 24px;
}

.mini-btn {
  padding: 9px 13px;
  font-size: 13px;
}

.canvas-tip {
  bottom: 30px;
  padding: 14px 22px;
  font-size: 15px;
}

.canvas-tip iconify-icon {
  font-size: 20px;
}

.stage-hud {
  left: 30px;
  bottom: 94px;
  min-width: 252px;
  padding: 12px 14px;
  border-radius: 18px;
  font-size: 12px;
  gap: 5px;
}

/* Slightly stronger background focus so the enlarged graph looks less empty */
.stage-rings {
  opacity: 0.43;
}

.stage-core-glow {
  opacity: 0.44;
}

.stage-orbit-dust {
  opacity: 0.38;
}

@media (max-width: 920px) {
  .stage-header h1 {
    font-size: clamp(46px, 9vw, 74px);
  }

  .stage-header p {
    font-size: 14px;
    max-width: 420px;
  }

  .knowledge-card,
  .planet-studio {
    top: 94px;
    right: 24px;
    width: min(560px, calc(100vw - 48px));
  }
}

@media (max-width: 720px) {
  .stage-header h1 {
    font-size: 46px !important;
  }

  .brand-pill {
    padding: 11px 13px;
  }

  .toolbar-trigger {
    width: 48px;
    height: 48px;
    min-width: 48px;
  }

  .control-dock,
  .knowledge-card,
  .planet-studio {
    padding: 20px;
  }

  .knowledge-card,
  .planet-studio {
    right: 18px;
    left: 18px;
    bottom: 78px;
  }

  .card-head h2 {
    font-size: 26px;
  }

  .stage-hud {
    display: none;
  }

  .canvas-tip {
    font-size: 13px;
  }
}



/* ===== Reference screenshot proportion overrides: large readable edition ===== */
.starfield-stage {
  background:
    radial-gradient(circle at 52% 54%, rgba(255, 255, 255, 0.045), transparent 16%),
    radial-gradient(circle at 18% 20%, rgba(35, 92, 190, 0.34), transparent 32%),
    radial-gradient(circle at 88% 13%, rgba(255, 87, 140, 0.13), transparent 28%),
    radial-gradient(circle at 88% 83%, rgba(103, 76, 255, 0.22), transparent 36%),
    radial-gradient(circle at 15% 82%, rgba(0, 220, 255, 0.14), transparent 34%),
    linear-gradient(180deg, #030815 0%, #050a16 42%, #03060d 100%);
}

.stage-header {
  top: 38px;
  left: 38px;
  max-width: min(760px, calc(100vw - 420px));
}

.brand-pill {
  gap: 14px;
  padding: 16px 24px;
  border-radius: 999px;
  border-color: rgba(255,255,255,0.18);
  background: linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045));
  box-shadow: 0 20px 48px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.12);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.brand-dot {
  width: 12px;
  height: 12px;
  background: #ff5aa0;
  box-shadow: 0 0 18px rgba(255, 90, 160, 0.9), 0 0 44px rgba(255, 90, 160, 0.26);
}

.brand-pill iconify-icon {
  display: none;
}

.stage-header h1 {
  margin-top: 24px;
  font-size: clamp(74px, 8.8vw, 134px);
  line-height: 0.86;
  letter-spacing: -0.08em;
  font-weight: 900;
  background: linear-gradient(110deg, #ffffff 0%, #f2fbff 20%, #aef5ff 48%, #ffc1e3 74%, #ff8fc8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 0 28px rgba(126,239,255,0.12)) drop-shadow(0 0 46px rgba(255,90,160,0.08));
}

.stage-header p {
  margin-top: 30px;
  max-width: 760px;
  color: rgba(226, 236, 255, 0.76);
  font-size: 23px;
  line-height: 1.75;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stage-toolbar {
  top: 42px;
  right: 42px;
  gap: 26px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.toolbar-trigger {
  min-width: 196px;
  min-height: 72px;
  justify-content: center;
  gap: 18px;
  padding: 18px 30px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: linear-gradient(180deg, rgba(8, 13, 30, 0.9), rgba(6, 10, 24, 0.74));
  box-shadow: 0 24px 58px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.96);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.toolbar-trigger iconify-icon {
  width: 30px;
  height: 30px;
  padding: 8px;
  border-radius: 50%;
  color: #ff70ad;
  background: rgba(255, 90, 160, 0.14);
  box-shadow: 0 0 24px rgba(255, 90, 160, 0.18);
}

.toolbar-trigger.active,
.toolbar-trigger:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 150, 204, 0.34);
  box-shadow: 0 28px 70px rgba(0,0,0,0.44), 0 0 34px rgba(255,90,160,0.12), inset 0 1px 0 rgba(255,255,255,0.12);
}

.control-dock {
  width: min(430px, calc(100vw - 84px));
  padding: 24px;
}

.knowledge-card {
  top: 126px;
  right: 42px;
  width: min(520px, calc(100vw - 84px));
  max-height: min(76vh, 900px);
  padding: 26px;
}

.planet-studio {
  top: 126px;
  right: 42px;
  width: min(620px, calc(100vw - 84px));
  max-height: min(80vh, 940px);
  padding: 26px;
}

.dock-head strong,
.card-head h2 {
  font-size: 28px;
}

.dock-kicker,
.card-kicker {
  font-size: 13px;
}

.card-head p,
.card-summary,
.section-desc,
.section-list li,
.related-item small,
.planet-identity span,
.studio-login p {
  font-size: 16px;
  line-height: 1.8;
}

.dock-stat,
.overview-item {
  padding: 18px;
  border-radius: 22px;
}

.dock-stat span,
.overview-item span,
.studio-field span,
.studio-saved-copy span {
  font-size: 14px;
}

.dock-stat strong,
.overview-item strong {
  font-size: 20px;
}

.planet-identity {
  padding: 18px 20px;
  border-radius: 28px;
}

.planet-core {
  width: 72px;
  height: 72px;
}

.planet-orb {
  width: 36px;
  height: 36px;
}

.planet-identity strong {
  font-size: 30px;
}

.tag-chip,
.legend-chip,
.section-pill,
.section-tab,
.mini-btn {
  font-size: 14px;
}

.section-tab {
  padding: 12px 16px;
}

.dock-btn,
.card-btn {
  min-height: 50px;
  padding: 14px 18px;
  border-radius: 18px;
  font-size: 15px;
  font-weight: 800;
}

.zoom-slider {
  height: 8px;
  margin: 18px 0 12px;
}

.zoom-slider::-webkit-slider-thumb {
  width: 24px;
  height: 24px;
}

.zoom-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
}

.stage-hud {
  left: 38px;
  bottom: 100px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  color: rgba(80, 210, 236, 0.45);
  font-size: 15px;
  line-height: 1.55;
  letter-spacing: 0.16em;
}

.stage-hud::before {
  display: none;
}

.canvas-tip {
  right: 48px;
  left: auto;
  bottom: 48px;
  transform: none;
  max-width: min(650px, calc(100vw - 96px));
  padding: 22px 32px;
  border-radius: 999px;
  border-color: rgba(255,255,255,0.16);
  background: linear-gradient(180deg, rgba(8, 13, 28, 0.88), rgba(5, 9, 22, 0.76));
  box-shadow: 0 28px 68px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08);
  font-size: 24px;
  font-weight: 900;
  line-height: 1.65;
}

.canvas-tip::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
  background: #ff5aa0;
  box-shadow: 0 0 22px rgba(255,90,160,0.86);
}

.canvas-tip iconify-icon {
  display: none;
}

.stage-corner {
  opacity: 0.08;
}

.stage-rings {
  opacity: 0.26;
  transform: scale(1.08);
}

@media (max-width: 920px) {
  .stage-header {
    max-width: calc(100vw - 260px);
  }

  .stage-header h1 {
    font-size: clamp(54px, 10vw, 92px);
  }

  .stage-header p {
    font-size: 18px;
  }

  .toolbar-trigger {
    min-width: 76px;
    width: 76px;
    height: 76px;
    padding: 0;
  }

  .toolbar-trigger span:not(:first-child) {
    display: none;
  }
}

@media (max-width: 720px) {
  .stage-header {
    top: 22px;
    left: 18px;
    max-width: calc(100vw - 36px);
  }

  .brand-pill {
    padding: 12px 16px;
    font-size: 12px;
  }

  .stage-header h1 {
    margin-top: 18px;
    font-size: clamp(46px, 15vw, 70px);
  }

  .stage-header p {
    margin-top: 18px;
    font-size: 14px;
    max-width: calc(100vw - 36px);
  }

  .stage-toolbar {
    top: 18px;
    right: 18px;
    gap: 10px;
  }

  .toolbar-trigger {
    width: 48px;
    height: 48px;
    min-width: 48px;
  }

  .toolbar-trigger iconify-icon {
    width: 22px;
    height: 22px;
    padding: 5px;
  }

  .knowledge-card,
  .planet-studio {
    right: 18px;
    left: 18px;
    bottom: 82px;
    top: auto;
    width: calc(100vw - 36px);
    padding: 20px;
  }

  .canvas-tip {
    left: 18px;
    right: 18px;
    bottom: 18px;
    max-width: none;
    padding: 14px 18px;
    font-size: 15px;
    transform: none;
  }

  .stage-hud {
    display: none;
  }
}



/* ===== Pixel-close reference version overrides ===== */
.starfield-page {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.starfield-stage {
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(circle at 18% 16%, rgba(52, 94, 193, 0.22), transparent 34%),
    radial-gradient(circle at 88% 10%, rgba(117, 54, 59, 0.20), transparent 34%),
    radial-gradient(circle at 22% 86%, rgba(29, 119, 159, 0.18), transparent 34%),
    radial-gradient(circle at 76% 88%, rgba(77, 52, 166, 0.18), transparent 30%),
    linear-gradient(180deg, #070b14 0%, #080d18 44%, #07101b 100%);
}

.reference-starfield-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.stage-header {
  top: 40px;
  left: 24px;
  max-width: 760px;
}

.brand-pill {
  gap: 14px;
  padding: 14px 24px;
  border-radius: 999px;
  font-family: 'Orbitron', 'Noto Sans SC', sans-serif;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.12em;
  background: rgba(17, 22, 38, 0.72);
  border: 1px solid rgba(255,255,255,0.16);
  box-shadow: 0 18px 44px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08);
}

.brand-dot {
  width: 13px;
  height: 13px;
  background: #ff5fa9;
  box-shadow: 0 0 18px rgba(255, 95, 169, 0.72), 0 0 34px rgba(255, 95, 169, 0.32);
}

.brand-pill iconify-icon { display: none; }

.stage-header h1 {
  margin: 22px 0 0;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(58px, 6.8vw, 92px);
  line-height: 0.95;
  font-weight: 900;
  letter-spacing: -0.08em;
  background: linear-gradient(100deg, #ffffff 0%, #f5fbff 18%, #ffabd6 68%, #ff8ec7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  filter: drop-shadow(0 0 26px rgba(255, 155, 211, 0.18));
  text-shadow: none;
}

.stage-header p {
  margin-top: 24px;
  max-width: 840px;
  color: rgba(226, 235, 252, 0.68);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.65;
  letter-spacing: -0.03em;
}

.stage-toolbar {
  top: 40px;
  right: 36px;
  gap: 22px;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
}

.toolbar-trigger {
  min-width: 180px;
  height: 72px;
  justify-content: center;
  gap: 16px;
  padding: 0 30px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.13);
  background: rgba(10, 13, 28, 0.83);
  color: rgba(255,255,255,0.96);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  box-shadow: 0 18px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05);
}

.toolbar-trigger iconify-icon {
  width: 30px;
  height: 30px;
  padding: 8px;
  border-radius: 999px;
  color: #ff69ad;
  background: rgba(255, 105, 173, 0.14);
  box-sizing: content-box;
  filter: drop-shadow(0 0 14px rgba(255, 105, 173, 0.42));
}

.toolbar-trigger.active,
.toolbar-trigger:hover {
  background: rgba(14, 18, 36, 0.92);
  border-color: rgba(255, 255, 255, 0.22);
  transform: translateY(-1px);
}

.stage-noise {
  opacity: 0.36;
  background-image:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.20) 0 1px, transparent 1px),
    radial-gradient(circle at 74% 66%, rgba(255, 255, 255, 0.12) 0 1px, transparent 1px),
    radial-gradient(circle at 42% 48%, rgba(126, 239, 255, 0.18) 0 1px, transparent 1px),
    radial-gradient(circle at 64% 28%, rgba(255, 209, 119, 0.16) 0 1px, transparent 1px);
  background-size: 34px 34px, 48px 48px, 72px 72px, 96px 96px;
}

.stage-grid { opacity: 0.05; }
.stage-beam { opacity: 0.16; }
.stage-rings { opacity: 0.20; }
.stage-vignette { z-index: 3; }
.stage-pointer-glow { opacity: 0.18; }

.stage-hud {
  left: 24px;
  bottom: 72px;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  color: rgba(90, 209, 232, 0.42);
  font-size: 17px;
  line-height: 1.45;
  letter-spacing: 0.12em;
  font-family: 'Orbitron', monospace;
  font-weight: 700;
}

.stage-hud::before { display: none; }

.stage-hud div + div { margin-top: 7px; }

.canvas-tip {
  left: auto;
  right: 34px;
  bottom: 24px;
  transform: none;
  max-width: 620px;
  min-height: 108px;
  padding: 24px 44px 24px 52px;
  border-radius: 999px;
  background: rgba(8, 12, 27, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06);
  color: rgba(255, 255, 255, 0.92);
  font-size: 26px;
  font-weight: 850;
  line-height: 1.45;
  letter-spacing: -0.04em;
}

.canvas-tip::before {
  content: '';
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #ff65ad;
  box-shadow: 0 0 18px rgba(255, 101, 173, 0.62);
}

.canvas-tip iconify-icon { display: none; }

.control-dock,
.knowledge-card,
.planet-studio {
  background: linear-gradient(180deg, rgba(9, 14, 27, 0.94), rgba(7, 11, 22, 0.86));
  border: 1px solid rgba(255,255,255,0.14);
}

.control-dock {
  width: min(390px, calc(100vw - 72px));
}

.knowledge-card {
  top: 100px;
  right: 36px;
  width: min(430px, calc(100vw - 72px));
  max-height: min(76vh, 820px);
}

.planet-studio {
  top: 100px;
  right: 36px;
  width: min(540px, calc(100vw - 72px));
  max-height: min(78vh, 860px);
}

.card-head h2,
.dock-head strong {
  font-size: 24px;
  font-weight: 900;
}

.card-head p,
.card-summary,
.section-desc,
.section-list li,
.planet-identity span,
.related-item small,
.studio-login p {
  font-size: 14px;
}

.card-btn,
.dock-btn {
  min-height: 48px;
  font-size: 15px;
  font-weight: 800;
}

@media (max-width: 920px) {
  .stage-header { max-width: calc(100vw - 48px); }
  .stage-header h1 { font-size: 56px; }
  .stage-header p { font-size: 17px; max-width: 460px; }
  .toolbar-trigger { min-width: 72px; width: 72px; padding: 0; }
  .toolbar-trigger span { display: none; }
  .toolbar-trigger iconify-icon { display: inline-flex; }
  .canvas-tip { left: 24px; right: 24px; bottom: 24px; max-width: none; font-size: 20px; min-height: 84px; }
}

@media (max-width: 720px) {
  .stage-header { top: 20px; left: 18px; }
  .stage-header h1 { font-size: 42px !important; }
  .stage-header p { font-size: 13px; max-width: 310px; }
  .brand-pill { padding: 10px 14px; font-size: 12px; }
  .brand-pill span:last-child { display: inline; }
  .stage-toolbar { top: 20px; right: 18px; gap: 10px; }
  .toolbar-trigger { width: 50px; height: 50px; min-width: 50px; }
  .toolbar-trigger iconify-icon { width: 20px; height: 20px; padding: 5px; }
  .stage-hud { display: none; }
  .canvas-tip { font-size: 15px; padding: 16px 20px; min-height: auto; border-radius: 28px; }
}



/* ===== Readability enlargement patch: canvas labels + right knowledge card ===== */
.knowledge-card {
  top: 108px !important;
  right: 36px !important;
  width: min(640px, calc(100vw - 72px)) !important;
  max-height: min(82vh, 980px) !important;
  padding: 34px !important;
  border-radius: 34px !important;
}

.planet-studio {
  top: 108px !important;
  right: 36px !important;
  width: min(700px, calc(100vw - 72px)) !important;
  max-height: min(84vh, 1000px) !important;
  padding: 34px !important;
  border-radius: 34px !important;
}

.control-dock {
  width: min(500px, calc(100vw - 72px)) !important;
  padding: 30px !important;
}

.card-kicker,
.dock-kicker {
  font-size: 15px !important;
  letter-spacing: 0.16em !important;
}

.card-head h2,
.dock-head strong {
  font-size: 36px !important;
  line-height: 1.1 !important;
  letter-spacing: -0.02em !important;
}

.card-head p,
.card-summary,
.section-desc,
.studio-login p,
.studio-banner {
  font-size: 19px !important;
  line-height: 1.85 !important;
}

.planet-identity {
  padding: 24px 26px !important;
  border-radius: 30px !important;
  gap: 20px !important;
}

.planet-core {
  width: 92px !important;
  height: 92px !important;
}

.planet-orb {
  width: 46px !important;
  height: 46px !important;
}

.planet-identity strong {
  font-size: 38px !important;
  line-height: 1.05 !important;
}

.planet-identity span {
  font-size: 18px !important;
  margin-top: 6px !important;
}

.overview-grid,
.dock-grid {
  gap: 16px !important;
}

.overview-item,
.dock-stat {
  padding: 24px !important;
  border-radius: 24px !important;
  min-height: 94px !important;
}

.overview-item span,
.dock-stat span,
.studio-field span,
.studio-saved-copy span {
  font-size: 17px !important;
  line-height: 1.45 !important;
}

.overview-item strong,
.dock-stat strong {
  font-size: 26px !important;
  line-height: 1.2 !important;
  margin-top: 12px !important;
}

.tag-row,
.section-tabs {
  gap: 14px !important;
}

.tag-chip,
.legend-chip,
.section-pill,
.section-tab,
.mini-btn {
  font-size: 17px !important;
  line-height: 1.35 !important;
}

.tag-chip,
.legend-chip,
.section-pill {
  padding: 10px 16px !important;
}

.section-tab {
  padding: 15px 20px !important;
  border-radius: 999px !important;
  font-weight: 800 !important;
}

.section-panel,
.related-panel,
.studio-card-editor,
.studio-saved-item {
  padding: 24px !important;
  border-radius: 28px !important;
}

.section-head strong,
.related-head strong {
  font-size: 22px !important;
}

.section-list {
  gap: 14px !important;
}

.section-list li {
  font-size: 18px !important;
  line-height: 1.85 !important;
  padding: 14px 18px !important;
}

.related-item {
  padding: 18px 20px !important;
  border-radius: 20px !important;
}

.related-item span {
  font-size: 20px !important;
}

.related-item small {
  font-size: 16px !important;
}

.card-btn,
.dock-btn {
  min-height: 60px !important;
  font-size: 18px !important;
  padding: 16px 22px !important;
  border-radius: 20px !important;
}

.card-close,
.dock-close {
  width: 48px !important;
  height: 48px !important;
  font-size: 22px !important;
}

.studio-field input,
.studio-field textarea {
  font-size: 18px !important;
  padding: 16px 18px !important;
  border-radius: 20px !important;
}

.stage-hud {
  font-size: 18px !important;
  line-height: 1.65 !important;
}

.canvas-tip {
  max-width: min(780px, calc(100vw - 96px)) !important;
  font-size: 28px !important;
  padding: 26px 38px !important;
}

@media (max-width: 920px) {
  .knowledge-card,
  .planet-studio {
    width: calc(100vw - 48px) !important;
    right: 24px !important;
    top: 104px !important;
    padding: 26px !important;
  }

  .card-head h2,
  .dock-head strong {
    font-size: 30px !important;
  }

  .canvas-tip {
    font-size: 22px !important;
  }
}

@media (max-width: 720px) {
  .knowledge-card,
  .planet-studio {
    left: 18px !important;
    right: 18px !important;
    bottom: 76px !important;
    top: auto !important;
    width: calc(100vw - 36px) !important;
    max-height: 58vh !important;
    padding: 22px !important;
  }

  .card-head h2,
  .dock-head strong {
    font-size: 26px !important;
  }

  .card-head p,
  .card-summary,
  .section-desc,
  .section-list li {
    font-size: 16px !important;
  }

  .overview-item strong,
  .dock-stat strong {
    font-size: 21px !important;
  }

  .canvas-tip {
    font-size: 18px !important;
    padding: 18px 22px !important;
  }
}



/* ===== Energy link UI support polish ===== */
.legend-dot {
  width: 12px;
  height: 12px;
  box-shadow: 0 0 10px currentColor, 0 0 20px rgba(126,239,255,0.25);
}
.legend-chip {
  border-color: rgba(255,255,255,0.18);
  background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
}
.control-dock {
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.48),
    0 0 42px rgba(126,239,255,0.08),
    inset 0 1px 0 rgba(255,255,255,0.08);
}
.dock-stat,
.overview-item {
  background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035));
}



/* ===== Final contrast fix: prevent washed-out white knowledge card ===== */
.knowledge-card,
.planet-studio,
.control-dock {
  background: linear-gradient(180deg, rgba(7, 12, 24, 0.96), rgba(5, 9, 20, 0.92)) !important;
  border: 1px solid rgba(160, 225, 255, 0.16) !important;
  box-shadow:
    0 28px 72px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(255,255,255,0.02) inset,
    inset 0 1px 0 rgba(255,255,255,0.06) !important;
  color: rgba(255, 255, 255, 0.96) !important;
}

.knowledge-card::after,
.planet-studio::after,
.control-dock::after {
  opacity: 0.18 !important;
  filter: blur(12px);
}

.card-head h2,
.dock-head strong,
.planet-identity strong,
.overview-item strong,
.dock-stat strong,
.related-item span,
.section-head strong,
.related-head strong {
  color: rgba(255, 255, 255, 0.98) !important;
}

.card-head p,
.card-summary,
.section-desc,
.section-list li,
.related-item small,
.planet-identity span,
.studio-login p,
.studio-banner,
.overview-item span,
.dock-stat span,
.studio-field span,
.studio-saved-copy span {
  color: rgba(225, 235, 248, 0.78) !important;
}

.card-overview,
.section-panel,
.related-panel,
.studio-card-editor,
.studio-saved-item,
.overview-item,
.dock-stat {
  background: linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.035)) !important;
  border: 1px solid rgba(255,255,255,0.10) !important;
}

</style>

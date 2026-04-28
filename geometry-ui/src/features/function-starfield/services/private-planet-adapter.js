import { FUNCTION_TOPIC_META, FUNCTION_TOPIC_ORDER } from '../../../data/function-units';
import { compactExpression, normalizeExpression } from '../../../utils/expression-tools';

const USER_PLANET_COLORS = ['#7eefff', '#ffb347', '#9b8cff', '#7ef0c3', '#ff8aa8', '#ffd777', '#9db6ff'];
const USER_PLANET_RING_RADIUS = 10.4;

function buildShortLabel(title, expression) {
  const compact = compactExpression(expression);
  if (compact) {
    return compact.length > 8 ? `${compact.slice(0, 7)}…` : compact;
  }
  const plain = String(title || '').trim();
  return plain.length > 6 ? `${plain.slice(0, 5)}…` : plain || '自定义';
}

function normalizePlanetCard(card = {}, topicKey) {
  const topicMeta = FUNCTION_TOPIC_META[topicKey];
  return {
    title: topicMeta.label,
    description: String(card?.description || '').trim(),
    items: Array.isArray(card?.items)
      ? card.items.map((item) => String(item || '').trim()).filter(Boolean)
      : []
  };
}

function buildPlanetLayout(index, total) {
  const safeTotal = Math.max(1, total);
  const angle = (-Math.PI / 2) + (index * Math.PI * 2) / safeTotal;
  return {
    x: Math.cos(angle) * USER_PLANET_RING_RADIUS,
    y: Math.sin(angle) * USER_PLANET_RING_RADIUS,
    z: Math.sin(angle * 1.5) * 1.15,
  };
}

export function createEmptyPlanetDraft() {
  return {
    id: null,
    title: '',
    expression: '',
    summary: '',
    cards: Object.fromEntries(
      FUNCTION_TOPIC_ORDER.map((topicKey) => [
        topicKey,
        {
          description: '',
          itemsText: ''
        }
      ])
    )
  };
}

export function createPlanetDraftFromRecord(record) {
  const draft = createEmptyPlanetDraft();
  draft.id = record?.id ?? null;
  draft.title = String(record?.title || '');
  draft.expression = String(record?.expression || '');
  draft.summary = String(record?.summary || '');
  FUNCTION_TOPIC_ORDER.forEach((topicKey) => {
    const card = record?.cards?.[topicKey];
    draft.cards[topicKey] = {
      description: String(card?.description || ''),
      itemsText: Array.isArray(card?.items) ? card.items.join('\n') : ''
    };
  });
  return draft;
}

export function createPlanetPayloadFromDraft(draft) {
  return {
    title: String(draft?.title || '').trim(),
    expression: normalizeExpression(draft?.expression || ''),
    summary: String(draft?.summary || '').trim(),
    cards: Object.fromEntries(
      FUNCTION_TOPIC_ORDER.map((topicKey) => {
        const card = draft?.cards?.[topicKey] || {};
        return [
          topicKey,
          {
            description: String(card.description || '').trim(),
            items: String(card.itemsText || '')
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean)
          }
        ];
      })
    )
  };
}

export function createPrivateFunctionUnit(record, index = 0, total = 1) {
  const normalizedExpression = normalizeExpression(record?.expression || '');
  const layout = buildPlanetLayout(index, total);
  const colorSeed = Number(record?.id || 0) + index;
  const color = USER_PLANET_COLORS[((colorSeed % USER_PLANET_COLORS.length) + USER_PLANET_COLORS.length) % USER_PLANET_COLORS.length];
  return {
    id: `private:${record.id}`,
    source: 'private',
    label: buildShortLabel(record?.title, normalizedExpression),
    shortLabel: buildShortLabel(record?.title, normalizedExpression),
    name: String(record?.title || '我的星球').trim() || '我的星球',
    title: `${String(record?.title || '我的星球').trim() || '我的星球'} · ${normalizedExpression || '未命名表达式'}`,
    expression: normalizedExpression,
    workbenchExpression: normalizedExpression,
    color,
    module: '我的星球',
    summary: String(record?.summary || '').trim(),
    tags: ['我的星球', '自定义函数'],
    examFrequency: '自定义',
    workbenchPreset: {
      expression: normalizedExpression,
      label: String(record?.title || '我的星球').trim() || '我的星球',
      kStart: 1,
      kEnd: 1,
      initialK: 1,
      duration: 6,
      tracePointX: 1,
      view: { minX: -8, maxX: 8, minY: -8, maxY: 8 }
    },
    related: [],
    cards: Object.fromEntries(
      FUNCTION_TOPIC_ORDER.map((topicKey) => [topicKey, normalizePlanetCard(record?.cards?.[topicKey], topicKey)])
    ),
    layout
  };
}

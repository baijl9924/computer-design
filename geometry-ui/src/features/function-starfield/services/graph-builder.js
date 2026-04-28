import {
  buildFunctionGraph,
  FUNCTION_TOPIC_ORDER,
  FUNCTION_TOPIC_META,
  FUNCTION_UNITS,
  getFunctionUnitById
} from '../../../data/function-units';

export function createFunctionStarfieldScene(options = {}) {
  return buildFunctionGraph(options);
}

export function getDisplayLabel(node) {
  if (!node) return '未选择';
  return node.type === 'function' ? node.title : node.title;
}

function getUnitMap(scene) {
  return scene?.meta?.unitMap || null;
}

export function getNodeContent(node, scene = null) {
  if (!node) {
    return {
      title: '未选择节点',
      summary: '请点击星图中的主函数或知识节点。',
      tags: [],
      sections: [],
      examFrequency: '—'
    };
  }

  const unitMap = getUnitMap(scene);
  const unit = node.unitId ? (unitMap?.[node.unitId] || getFunctionUnitById(node.unitId)) : null;
  const topicMeta = node.topicKey ? FUNCTION_TOPIC_META[node.topicKey] : null;
  const topic = node.topicKey && unit?.cards ? unit.cards[node.topicKey] : null;

  if (node.type === 'topic' && topic) {
    return {
      title: node.title,
      summary: topic.description,
      tags: [unit?.examFrequency, ...(unit?.tags?.slice(0, 2) || [])].filter(Boolean),
      module: node.module || unit?.name || '基础函数',
      accent: topicMeta?.accent || node.color,
      sections: [
        {
          title: topic.title,
          description: topic.description,
          items: topic.items
        }
      ],
      examFrequency: unit?.examFrequency || '—',
      unit,
      node
    };
  }

  if (unit) {
    return {
      title: node.title,
      summary: unit.summary,
      tags: unit.tags || [],
      module: node.module || unit?.name || '基础函数',
      accent: topicMeta?.accent || node.color,
      sections: FUNCTION_TOPIC_ORDER.map((topicKey) => ({
        title: unit.cards[topicKey].title,
        description: unit.cards[topicKey].description,
        items: unit.cards[topicKey].items
      })),
      examFrequency: unit.examFrequency || '—',
      unit,
      node
    };
  }

  return {
    title: node.title,
    summary: node.summary || '',
    tags: node.tags || [],
    module: node.module || unit?.name || '基础函数',
    accent: topicMeta?.accent || node.color,
    sections: node.sections || [],
    examFrequency: node.examFrequency || unit?.examFrequency || '—',
    unit,
    node
  };
}

export function getRelatedNodes(scene, activeId, limit = 8) {
  if (!scene || !activeId) return [];
  const links = scene.links.filter((link) => link.source === activeId || link.target === activeId);
  const byId = new Map(scene.nodes.map((node) => [node.id, node]));
  return links
    .sort((left, right) => right.weight - left.weight)
    .slice(0, limit)
    .map((link) => {
      const otherId = link.source === activeId ? link.target : link.source;
      return {
        ...link,
        node: byId.get(otherId)
      };
    })
    .filter((item) => item.node);
}

export function countCoreFunctions(scene) {
  return scene?.nodes?.filter((node) => node.category === 'core').length || FUNCTION_UNITS.length;
}

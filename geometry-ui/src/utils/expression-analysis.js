import {
  compileExpression,
  deriveExpression,
  getExpressionVariables,
  normalizeExpression,
  prettifyExpression,
  splitEquation
} from './expression-tools';

const OPERATION_NAME = {
  '+': '加法叠加',
  '-': '减法叠加',
  '*': '乘法耦合',
  '/': '商函数耦合',
  '^': '幂变换'
};

const OPERATION_EFFECT = {
  '+': '逐点相加会把两条子曲线在同一个 x 处的函数值叠加起来，因此整体形状会同时保留两部分的影响。',
  '-': '逐点相减会把右侧子函数从左侧子函数中扣掉，因此局部峰谷会发生上下位移。',
  '*': '逐点相乘会让一个子函数充当另一个子函数的振幅或缩放器，因此波形会被放大、翻折或压扁。',
  '/': '逐点相除通常会引入敏感区域和间断点，被除数接近 0 时，整体图像会突然拉高或拉低。',
  '^': '幂变换会放大较大的输入、压缩较小的输入，并明显改变对称性和开口形态。'
};

function describeNode(node) {
  if (node.type === 'OperatorNode') {
    const op = node.op;
    return {
      title: OPERATION_NAME[op] || `运算层 ${op}`,
      hint: OPERATION_EFFECT[op] || '这一层会通过代数运算改变上一层的输出。',
      color: op === '+' ? '#f39c12' : op === '-' ? '#e67e22' : op === '*' ? '#9b59b6' : op === '/' ? '#e74c3c' : '#34495e'
    };
  }
  if (node.type === 'FunctionNode') {
    const fnName = node.fn?.name || node.name || 'f';
    const effectMap = {
      sin: '把输入压缩到 [-1, 1] 的周期震荡里，因此会形成波动图像。',
      cos: '把输入映射成余弦波，相比 sin 会整体相位平移。',
      tan: '会形成周期重复且带渐近线的波形。',
      log: '会把乘法关系变成加法尺度，并把增长速度逐渐放缓。',
      exp: '会把输入中的细微变化迅速放大成指数增长或衰减。',
      sqrt: '会压缩较大的输入，并要求输入通常不小于 0。',
      abs: '会把负值翻折到 x 轴上方，形成折角。'
    };
    return {
      title: `${fnName}(·) 外层变换`,
      hint: effectMap[fnName] || `先计算内部输入，再把结果送入 ${fnName}(·) 进行二次映射。`,
      color: '#3498db'
    };
  }
  if (node.type === 'ParenthesisNode') {
    return {
      title: '括号层',
      hint: '括号决定了先算哪一层，是“剥洋葱”分析时最重要的层级分界。',
      color: '#1abc9c'
    };
  }
  if (node.type === 'SymbolNode') {
    return {
      title: `变量层 ${node.name}`,
      hint: '这是最内层的输入变量，所有变化都从这里开始。',
      color: '#2ecc71'
    };
  }
  if (node.type === 'ConstantNode') {
    return {
      title: `常数层 ${node.value}`,
      hint: '常数会充当平移量、缩放量或偏置。',
      color: '#95a5a6'
    };
  }
  return {
    title: node.type,
    hint: '这一层会参与最终图像的形成。',
    color: '#7f8c8d'
  };
}

function nodeExpression(node) {
  return prettifyExpression(node.toString({ parenthesis: 'auto' }));
}

function createLayerPreviewSequence(node, expr) {
  if (!expr) {
    return [];
  }

  if (node.type === 'FunctionNode') {
    const fnName = node.fn?.name || node.name || 'f';
    const args = Array.isArray(node.args) ? node.args.map((arg) => nodeExpression(arg)) : [];
    const placeholderVariable = args.length && getExpressionVariables(args[0]).includes('theta') ? 'theta' : 'x';
    if (args.length) {
      args[0] = placeholderVariable;
    } else {
      args.push(placeholderVariable);
    }

    const templateExpression = prettifyExpression(`${fnName}(${args.join(', ')})`);
    if (templateExpression && templateExpression !== expr) {
      return [
        { id: 'template', label: 'Base', expr: templateExpression },
        { id: 'current', label: 'Result', expr }
      ];
    }
  }

  return [{ id: 'current', label: 'Current', expr }];
}

function buildStorySteps(node, steps) {
  if (node.type === 'ParenthesisNode') {
    buildStorySteps(node.content, steps);
    return;
  }

  if (node.type === 'SymbolNode' || node.type === 'ConstantNode') {
    steps.push(`从 ${nodeExpression(node)} 出发。`);
    return;
  }

  if (node.type === 'FunctionNode') {
    const inner = node.args?.[0];
    if (inner) buildStorySteps(inner, steps);
    const fnName = node.fn?.name || node.name || 'f';
    steps.push(`把 ${nodeExpression(inner)} 送入 ${fnName}(·)，得到 ${nodeExpression(node)}。`);
    return;
  }

  if (node.type === 'OperatorNode') {
    node.args?.forEach((arg) => buildStorySteps(arg, steps));
    const op = node.op;
    const desc = OPERATION_NAME[op] || `运算 ${op}`;
    steps.push(`将各子层做 ${desc}，得到 ${nodeExpression(node)}。`);
    return;
  }

  steps.push(`形成 ${nodeExpression(node)}。`);
}

function createStructuredObjectAnalysis(normalizedExpression = '') {
  const equation = splitEquation(normalizedExpression);
  const variables = getExpressionVariables(normalizedExpression);
  const compactLeft = equation?.left?.replace(/\s+/g, '').toLowerCase() || '';

  if (!equation && variables.length <= 1) {
    return null;
  }
  if (compactLeft === 'y') {
    return null;
  }

  let title = '图像对象';
  let hint = '该输入会按对象方程处理，并隐藏不适用的导数与单调性分析。';
  let relation = '对象方程';
  const story = [`识别输入 ${prettifyExpression(normalizedExpression)}。`];

  if (compactLeft === 'r' || compactLeft === 'r^2' || variables.includes('theta')) {
    title = '极坐标对象';
    hint = '当前输入按极坐标表达式处理，重点观察回环、瓣数和对称性。';
    story.push('该表达式会在极坐标平面中生成图像。');
  } else if (compactLeft === 'z') {
    title = '显式曲面';
    hint = '当前输入按 z = f(x, y) 曲面处理，重点观察截面与整体形状。';
    relation = '曲面方程';
    story.push('该表达式会在三维坐标中生成显式曲面。');
  } else if (variables.includes('z')) {
    title = '隐式曲面';
    hint = '当前输入按隐式曲面或平面处理，重点观察截面与空间范围。';
    relation = '隐式方程';
    story.push('该表达式会在三维坐标中求取等值面。');
  } else if (variables.includes('y')) {
    title = '二维隐式曲线';
    hint = '当前输入按二维隐式曲线处理，重点观察交点、对称性和整体轮廓。';
    relation = '隐式方程';
    story.push('该表达式会在平面内求取 F(x, y) = 0 的曲线。');
  } else {
    return null;
  }

  return {
    normalized: prettifyExpression(normalizedExpression),
    layers: [{
      id: 'layer-0',
      parentId: null,
      depth: 0,
      relation,
      expr: prettifyExpression(normalizedExpression),
      derivative: '',
      derivativeLabel: '对象方程',
      derivativeVariable: '',
      nodeType: 'StructuredObject',
      title,
      hint,
      color: '#3498db',
      previewSequence: [{ id: 'current', label: 'Current', expr: prettifyExpression(normalizedExpression) }],
      children: []
    }],
    story,
    parseError: ''
  };
}

export function analyzeExpressionLayers(rawExpression = '') {
  const normalized = normalizeExpression(rawExpression);
  if (!normalized) {
    return {
      normalized: '',
      layers: [],
      story: [],
      parseError: '请先输入函数表达式。'
    };
  }

  const structuredAnalysis = createStructuredObjectAnalysis(normalized);
  if (structuredAnalysis) {
    return structuredAnalysis;
  }

  try {
    const { node } = compileExpression(normalized);
    const layers = [];
    let index = 0;

    function visit(currentNode, depth = 0, parentId = null, relation = '最终结果') {
      const currentId = `layer-${index++}`;
      const meta = describeNode(currentNode);
      const expr = nodeExpression(currentNode);
      const derivativeMeta = deriveExpression(expr);
      const layer = {
        id: currentId,
        parentId,
        depth,
        relation,
        expr,
        derivative: derivativeMeta.expression,
        derivativeLabel: derivativeMeta.label,
        derivativeVariable: derivativeMeta.variable,
        nodeType: currentNode.type,
        title: meta.title,
        hint: meta.hint,
        color: meta.color,
        previewSequence: createLayerPreviewSequence(currentNode, expr),
        children: []
      };
      layers.push(layer);

      const pushChild = (childNode, childRelation) => {
        const childId = visit(childNode, depth + 1, currentId, childRelation);
        layer.children.push(childId);
      };

      if (currentNode.type === 'ParenthesisNode') {
        pushChild(currentNode.content, '括号内先算');
      } else if (currentNode.type === 'FunctionNode') {
        currentNode.args?.forEach((arg, argIndex) => {
          pushChild(arg, argIndex === 0 ? '先计算内部输入' : '额外参数');
        });
      } else if (currentNode.type === 'OperatorNode') {
        currentNode.args?.forEach((arg, argIndex) => {
          const relationName = argIndex === 0 ? '左侧子函数' : argIndex === 1 ? '右侧子函数' : `第 ${argIndex + 1} 个输入`;
          pushChild(arg, relationName);
        });
      }

      return currentId;
    }

    visit(node);
    const story = [];
    buildStorySteps(node, story);
    const dedupedStory = story.filter((step, idx) => step && step !== story[idx - 1]);

    return {
      normalized: prettifyExpression(normalized),
      layers,
      story: dedupedStory,
      parseError: ''
    };
  } catch (error) {
    return {
      normalized,
      layers: [],
      story: [],
      parseError: `解析失败：${error.message}`
    };
  }
}

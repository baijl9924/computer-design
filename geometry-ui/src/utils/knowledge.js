import { compactExpression, inferFunctionFamily, prettifyExpression } from './expression-tools';

function createCard(title, items, color = '#3498db') {
  return { title, items, color };
}

function quadraticPack(expr) {
  return {
    speech: '我识别到这是二次函数家族，重点看开口、顶点、对称轴和参数如何改变焦点位置。',
    cards: [
      createCard('定义', [
        '标准形式常写作 y = ax² + bx + c，且 a ≠ 0。',
        '当 a 改变时，图像会变宽、变窄，甚至上下翻转。'
      ], '#b96f3e'),
      createCard('性质', [
        '图像是抛物线。',
        '对称轴为 x = -b / (2a)。',
        '顶点决定最大值或最小值位置。',
        'a > 0 时开口向上，a < 0 时开口向下。'
      ], '#00b894'),
      createCard('常用公式', [
        '顶点坐标：(-b / 2a, (4ac - b²) / 4a)',
        '判别式：Δ = b² - 4ac',
        '焦点参数：p = 1 / (4a)（先化到顶点式后更直观）'
      ], '#0984e3'),
      createCard('相关例题', [
        `已知 ${expr}，求顶点、对称轴并判断单调区间。`,
        '把函数化成顶点式，观察参数对图像平移和伸缩的影响。'
      ], '#fdcb6e')
    ]
  };
}

function trigPack(expr) {
  return {
    speech: '这是三角函数或复合三角函数，先抓振幅、周期、相位，再看内部子函数怎样“挤压”横轴。',
    cards: [
      createCard('定义', [
        '三角函数通过周期映射描述振动与旋转。',
        '复合三角函数会先计算内部输入，再送入 sin/cos/tan。'
      ], '#00cec9'),
      createCard('性质', [
        'sin 与 cos 有界且周期性明显。',
        'sin(kx) 中 |k| 越大，周期越短，波形越密。',
        '若内部是 x² 这类非线性输入，横向压缩将不再均匀。'
      ], '#55efc4'),
      createCard('常用公式', [
        'sin(kx) 的周期：T = 2π / |k|',
        'cos(kx) 的周期：T = 2π / |k|',
        'sin²x + cos²x = 1'
      ], '#74b9ff'),
      createCard('相关例题', [
        `讨论 ${expr} 的周期、值域与单调区间。`,
        '比较 sin(x) 与 sin(x²) 在横向节奏上的差异。'
      ], '#ffeaa7')
    ]
  };
}

function reciprocalPack(expr) {
  return {
    speech: '这是反比例/有理函数家族，最关键的是定义域、渐近线和靠近间断点时的爆发式变化。',
    cards: [
      createCard('定义', [
        '常见形式为 y = a / (x - h) + v。',
        '分母不能为 0，所以图像会在某些位置断开。'
      ], '#e17055'),
      createCard('性质', [
        'x = h 往往是竖直渐近线。',
        'y = v 往往是水平渐近线。',
        '靠近竖直渐近线时，函数值会急剧增大或减小。'
      ], '#d63031'),
      createCard('常用公式', [
        '定义域：x ≠ h',
        '渐近线：x = h, y = v',
        '图像中心常位于 (h, v)'
      ], '#fab1a0'),
      createCard('相关例题', [
        `判断 ${expr} 的定义域、值域与渐近线。`,
        '结合参数 k 观察双曲线分支如何平移或缩放。'
      ], '#fd79a8')
    ]
  };
}

function compositePack(expr) {
  return {
    speech: '这是复合函数，建议先拆内层，再看外层映射，最后回到整体图像。',
    cards: [
      createCard('定义', [
        '复合函数是把一个函数的输出作为另一个函数的输入。',
        '分析时最怕“一眼看整体”，最好按层拆开。'
      ], '#91512a'),
      createCard('性质', [
        '内层控制横向节奏，外层控制输出形状。',
        '如果外层有界，例如 sin(·)，整体值域也会受到限制。',
        '若内层不单调，复合后整体单调性会更加复杂。'
      ], '#b96f3e'),
      createCard('常用公式', [
        '设 y = f(g(x))，则先算 u = g(x)，再算 y = f(u)。',
        '链式法则：y\' = f\'(g(x)) · g\'(x)'
      ], '#b96f3e'),
      createCard('相关例题', [
        `把 ${expr} 按层拆分，并说明每一层怎样改变图像。`,
        '先画内层，再画外层，比较图像变化。'
      ], '#d7b08d')
    ]
  };
}

function genericPack(expr) {
  return {
    speech: '我已经生成一套通用学习卡片。你也可以点右侧层级分析，按“从里到外”继续拆。',
    cards: [
      createCard('定义', [
        `当前函数：${expr}`,
        '建议先判断定义域、对称性、零点和特殊点。'
      ], '#636e72'),
      createCard('性质', [
        '优先关注增减性、极值、凹凸性和间断点。',
        '复合函数常常需要先看内层。'
      ], '#2d3436'),
      createCard('常用公式', [
        '导数可以帮助判断单调区间。',
        '平移、伸缩、翻折通常都能从参数里读出来。'
      ], '#00b894'),
      createCard('相关例题', [
        `作出 ${expr} 的草图，并标出关键点与单调区间。`,
        '尝试把函数拆成基础函数的组合。'
      ], '#0984e3')
    ]
  };
}

export function generateKnowledgePack(rawExpression = '') {
  const expr = prettifyExpression(rawExpression || '');
  const compact = compactExpression(rawExpression);
  const family = inferFunctionFamily(rawExpression);

  let pack = genericPack(expr);
  if (family === 'quadratic') pack = quadraticPack(expr);
  if (family === 'trigonometric') pack = trigPack(expr);
  if (family === 'reciprocal') pack = reciprocalPack(expr);
  if (family === 'composite-trig') pack = compositePack(expr);

  const extraTags = [];
  if (/sin\(/.test(compact) || /cos\(/.test(compact) || /tan\(/.test(compact)) extraTags.push('三角');
  if (/x\^2|x\*x/.test(compact)) extraTags.push('二次');
  if (/\//.test(compact)) extraTags.push('有理');
  if ((compact.match(/[()+\-*/^]/g) || []).length >= 4) extraTags.push('复合');

  const tips = [
    '先看定义域，再看关键点。',
    '把复杂函数拆成基础函数的逐层变换。',
    '单调区间最好结合图像和导数一起理解。'
  ];

  if (extraTags.includes('复合') && family !== 'composite-trig') {
    pack.cards.unshift(createCard('复合提醒', [
      '你的表达式包含多层运算，建议开启“分层解析”。',
      '先剥出内层，再观察外层怎样重新映射内层结果。'
    ], '#91512a'));
  }

  return {
    family,
    title: expr || '未输入函数',
    speech: pack.speech,
    tags: extraTags,
    tips,
    cards: pack.cards
  };
}

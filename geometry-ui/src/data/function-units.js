export const FUNCTION_TOPIC_ORDER = ['profile', 'geometry', 'properties', 'exam', 'composite'];

export const FUNCTION_TOPIC_META = {
  profile: { label: '函数特征', accent: '#7eefff' },
  geometry: { label: '图像几何', accent: '#ffd777' },
  properties: { label: '常用性质', accent: '#c18dff' },
  exam: { label: '高考关联', accent: '#78ffd6' },
  composite: { label: '复合函数', accent: '#ff8aa8' }
};

function createCards(cards) {
  return cards;
}

function createStars(level) {
  return `${'★'.repeat(level)}${'☆'.repeat(Math.max(0, 5 - level))}`;
}

const CORE_LAYOUT = {
  quadratic: { x: 0, y: 0, z: 0 },
  cubic: { x: 0, y: -6.1, z: 0.82 },
  exponential: { x: 4.36, y: -4.36, z: 0.42 },
  radical: { x: 6.15, y: 0, z: -0.58 },
  logarithmic: { x: 4.36, y: 4.36, z: -0.36 },
  sine: { x: 0, y: 6.1, z: 0.72 },
  absolute: { x: -4.36, y: 4.36, z: 0.24 },
  reciprocal: { x: -6.15, y: 0, z: -0.66 },
  linear: { x: -4.36, y: -4.36, z: 0.48 }
};

export const FUNCTION_UNITS = [
  {
    id: 'linear',
    name: '一次函数',
    title: '一次函数 y = x',
    shortLabel: 'x',
    expression: 'y = x',
    workbenchExpression: 'k * x',
    color: '#74ddff',
    module: '主函数',
    summary: '线性变化的起点模型，最适合建立斜率、增量、对称性和数形结合意识。',
    tags: ['直线', '奇函数', '原点对称', '考频★★★★☆'],
    examFrequency: createStars(4),
    workbenchPreset: {
      expression: 'k * x',
      label: 'y = kx',
      kStart: -3,
      kEnd: 3,
      initialK: 1,
      duration: 6,
      tracePointX: 2,
      view: { minX: -6, maxX: 6, minY: -8, maxY: 8 }
    },
    related: ['quadratic', 'absolute', 'sine'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '把奇偶性、单调性、定义域和值域放在同一张卡里，便于整体记忆一次函数的基础性质。',
        items: [
          '类型：一次函数，解析式可推广为 y = kx + b。',
          '定义域和值域都是 R；对基函数 y = x 而言，零点在 x = 0。',
          '单调性：k = 1 时在 R 上单调递增，线性变化率恒定。',
          '奇偶性与对称：是奇函数，关于原点中心对称。',
          '周期性：无周期；对称轴、对称中心分别为“无”和原点。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '一次函数的图像信息集中在“直线、斜率、截距”这三个入口。',
        items: [
          '图像是一条过原点的直线，斜率为 1，与 x 轴夹角 45°。',
          '与 x 轴、y 轴交于同一点 (0, 0)。',
          '整条图像没有顶点、极值点和拐点。',
          '任意两点决定一条直线，因此读图与列式往往可以互相转化。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '这张卡强调最常在题目里直接用到的结论。',
        items: [
          '同号性：当 x > 0 时 y > 0，当 x < 0 时 y < 0。',
          '增量性质：x 增加多少，y 就同步增加多少。',
          '可与几何中的平移、旋转、最短路和一次不等式问题直接联动。',
          '若扩展为 y = kx + b，则“斜率 k + 截距 b”是最常见参数入口。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '一次函数本身常作基础层，但在综合题里几乎处处出现。',
        items: [
          `考频：${createStars(4)}`,
          '高考考点：斜率、截距、函数图像判断、一次不等式、数形结合。',
          '常见综合：与绝对值函数、二次函数联立求交点、范围和最值。',
          '真题切入：常借助“直线分区 + 点到直线距离 + 图像交点”构造选择题或压轴铺垫。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '把一次函数看成最常见的“内层平移/伸缩器”，很多复合函数都从它出发。',
        items: [
          '复合途径：先“一次”后“正弦”，得到 y = sin(2x + 1)，关联：一次函数 + 正弦函数。',
          '复合途径：先“一次”后“绝对值”，得到 y = |2x - 3|，关联：一次函数 + 绝对值函数。',
          '复合途径：先“一次”后“指数”，得到 y = 2^(x - 1)，关联：一次函数 + 指数函数。'
        ]
      }
    })
  },
  {
    id: 'quadratic',
    name: '二次函数',
    title: '二次函数 y = x²',
    shortLabel: 'x²',
    expression: 'y = x²',
    workbenchExpression: 'k * x^2',
    color: '#ffb347',
    module: '主函数',
    summary: '最经典的抛物线模型，是最值、对称轴、零点分布和参数讨论的核心母题。',
    tags: ['抛物线', '偶函数', '最值', '考频★★★★★'],
    examFrequency: createStars(5),
    workbenchPreset: {
      expression: 'k * x^2',
      label: 'y = kx²',
      kStart: -3,
      kEnd: 3,
      initialK: 1,
      duration: 6,
      tracePointX: 2,
      view: { minX: -6, maxX: 6, minY: -10, maxY: 18 }
    },
    related: ['linear', 'absolute', 'radical', 'sine', 'exponential'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '二次函数的基础性质最适合打包理解：定义域、值域、单调区间、奇偶性和对称轴。',
        items: [
          '类型：二次函数，基函数 y = x² 的定义域为 R，值域为 [0, +∞)。',
          '单调性：在 (-∞, 0] 上递减，在 [0, +∞) 上递增。',
          '奇偶性与对称：是偶函数，关于 y 轴对称。',
          '周期性：无周期；对称轴为 x = 0，对称中心不存在。',
          '最值：最小值为 0，在 x = 0 处取得。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '读二次函数图像，核心先找开口、顶点、对称轴，再看与坐标轴的交点。',
        items: [
          '图像是开口向上的抛物线，顶点在 (0, 0)。',
          '对称轴是 x = 0，图像左右完全对称。',
          '与两轴交点都落在原点；扩展到一般式后，交点与判别式强相关。',
          '离原点越远，函数值增长越快，曲线也会越来越“陡”。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '这部分对应高中题里最常直接套用的结论。',
        items: [
          '平方非负：x² ≥ 0，是求最值、解不等式的基本工具。',
          '常与配方法、判别式、韦达定理、导数结合讨论参数范围。',
          '图像问题常转化为“顶点位置 + 开口方向 + 交点个数”。',
          '它与根式函数互为“平方/开方”关系，与绝对值函数共享对称性入口。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '二次函数是高中函数板块最稳定的高频核心。',
        items: [
          `考频：${createStars(5)}`,
          '高考考点：最值、零点分布、恒成立、参数范围、导数结合、数形结合。',
          '常见综合：与直线、绝对值、不等式、圆锥曲线、导数压轴联动。',
          '真题切入：常把“顶点 + 对称轴 + 区间最值”作为选择、填空和解答题共同入口。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '二次函数很常作为“内层”，把对称与最值带进更复杂图像。',
        items: [
          '复合途径：先“二次”后“正弦”，得到 y = sin(x²)，关联：二次函数 + 正弦函数。',
          '复合途径：先“二次”后“绝对值”，得到 y = |x² - 4|，关联：二次函数 + 绝对值函数。',
          '复合途径：先“二次”后“指数”，得到 y = 2^(-x²)，关联：二次函数 + 指数函数。'
        ]
      }
    })
  },
  {
    id: 'cubic',
    name: '三次函数',
    title: '三次函数 y = x³',
    shortLabel: 'x³',
    expression: 'y = x^3',
    workbenchExpression: 'k * x^3',
    color: '#9b8cff',
    module: '主函数',
    summary: '典型 S 形曲线，适合理解原点对称、拐点、整体递增与增长速度变化。',
    tags: ['S 形', '奇函数', '拐点', '考频★★★☆☆'],
    examFrequency: createStars(3),
    workbenchPreset: {
      expression: 'k * x^3',
      label: 'y = kx³',
      kStart: -2,
      kEnd: 2,
      initialK: 1,
      duration: 6,
      tracePointX: 1.5,
      view: { minX: -4, maxX: 4, minY: -16, maxY: 16 }
    },
    related: ['linear', 'sine', 'logarithmic'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '三次函数兼具“整体递增”和“局部弯曲变化”，很适合和一次、二次对比。',
        items: [
          '类型：三次函数，定义域和值域都是 R。',
          '单调性：基函数 y = x³ 在 R 上单调递增。',
          '奇偶性与对称：是奇函数，关于原点中心对称。',
          '周期性：无周期；对称轴不存在，对称中心为原点。',
          '函数值远离原点时增长极快，但靠近原点时变化较平。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '图像识别重点是“S 形”和“拐点在原点”。',
        items: [
          '图像从左下走向右上，穿过原点。',
          '原点既是零点，也是曲率变化最明显的拐点。',
          '没有最大值和最小值，但有明显的凹凸性变化。',
          '与一次函数相比，它不是“匀速上升”，而是越来越陡。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '这部分强调题目里最容易直接调用的结论。',
        items: [
          '保号性：x 与 x³ 同号，可快速判断符号与区间。',
          '与导数结合时，常用 f\'(x) = 3x² 说明整体递增。',
          '奇函数性质让区间对称、面积对称、值域判断更简洁。',
          '它也是研究高次函数图像、切线和极值的入门样板。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '三次函数出现频率不如二次高，但在新高考压轴里很常见。',
        items: [
          `考频：${createStars(3)}`,
          '高考考点：单调性、导数、零点个数、切线问题、参数讨论。',
          '常见综合：与一次函数、正弦函数联动研究奇偶性和图像交点。',
          '真题切入：常把“原点对称 + 导数恒非负 + 拐点”作为综合判断入口。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '三次函数常作为更复杂函数的“内层放大器”，让波动或对数结构更陡。',
        items: [
          '复合途径：先“三次”后“正弦”，得到 y = sin(x³)，关联：三次函数 + 正弦函数。',
          '复合途径：先“三次”后“绝对值”，得到 y = |x³ - 2x|，关联：三次函数 + 绝对值函数。',
          '复合途径：先“三次”后“对数”，得到 y = log₂(x³ + 2)，关联：三次函数 + 对数函数。'
        ]
      }
    })
  },
  {
    id: 'reciprocal',
    name: '反比例函数',
    title: '反比例函数 y = 1/x',
    shortLabel: '1/x',
    expression: 'y = 1/x',
    workbenchExpression: 'k / x',
    color: '#7ef0c3',
    module: '主函数',
    summary: '双曲线模型的核心在于定义域受限、两条渐近线和“靠近 0 时剧烈变化”。',
    tags: ['双曲线', '渐近线', '奇函数', '考频★★★★☆'],
    examFrequency: createStars(4),
    workbenchPreset: {
      expression: 'k / x',
      label: 'y = k/x',
      kStart: -6,
      kEnd: 6,
      initialK: 1,
      duration: 6,
      tracePointX: 1,
      view: { minX: -8, maxX: 8, minY: -8, maxY: 8 }
    },
    related: ['logarithmic', 'exponential', 'sine', 'absolute'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '反比例函数最关键的是“分段定义域 + 每段单调 + 原点对称”。',
        items: [
          '定义域是 x ≠ 0，值域是 y ≠ 0。',
          '单调性：在 (-∞, 0) 和 (0, +∞) 上分别单调递减。',
          '奇偶性与对称：是奇函数，关于原点中心对称。',
          '周期性：无周期；对称轴不存在，对称中心为原点。',
          'x 越靠近 0，函数值绝对值越大。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '读图重点是“双分支 + 两条渐近线 + 不过坐标轴”。',
        items: [
          '图像由两支双曲线组成，永远不会经过原点。',
          'x 轴和 y 轴都是渐近线。',
          'y = 1/x 在第一、三象限；参数变号后可翻到第二、四象限。',
          '靠近坐标轴时图像越来越陡，远离坐标轴时逐渐变平。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '这些是解题时最常直接使用的“双曲线结论”。',
        items: [
          '乘积不变：xy = 1，可用于点坐标和面积关系判断。',
          '定义域断裂意味着许多“整体单调”结论不能直接套用。',
          '常与不等式、均值不等式、面积和最值问题联动。',
          '它与对数、指数函数经常通过“增长快慢”和“渐近线”进行比较。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '反比例函数是选择填空中很稳定的图像判断模型。',
        items: [
          `考频：${createStars(4)}`,
          '高考考点：定义域、渐近线、象限判断、单调区间、面积与最值。',
          '常见综合：与对数函数、绝对值函数、不等式、解析几何交叉出现。',
          '真题切入：常借助“图像不过轴 + 原点对称 + 两段单调”设置易错项。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '反比例函数作为内层时，常把“间断”和“爆发式变化”带入外层函数。',
        items: [
          '复合途径：先“反比例”后“正弦”，得到 y = sin(1/x)，关联：反比例函数 + 正弦函数。',
          '复合途径：先“反比例”后“指数”，得到 y = 2^(1/x)，关联：反比例函数 + 指数函数。',
          '复合途径：先“反比例”后“绝对值”，得到 y = |1/x|，关联：反比例函数 + 绝对值函数。'
        ]
      }
    })
  },
  {
    id: 'absolute',
    name: '绝对值函数',
    title: '绝对值函数 y = |x|',
    shortLabel: '|x|',
    expression: 'y = |x|',
    workbenchExpression: 'k * abs(x)',
    color: '#ff8aa8',
    module: '主函数',
    summary: 'V 形图像和分段思想的代表模型，是研究距离、对称和分类讨论的关键节点。',
    tags: ['V 形', '偶函数', '分段', '考频★★★★★'],
    examFrequency: createStars(5),
    workbenchPreset: {
      expression: 'k * abs(x)',
      label: 'y = k|x|',
      kStart: -3,
      kEnd: 3,
      initialK: 1,
      duration: 6,
      tracePointX: 2,
      view: { minX: -6, maxX: 6, minY: -8, maxY: 12 }
    },
    related: ['linear', 'quadratic', 'radical', 'sine'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '绝对值函数把“奇偶性、分段、最值、对称性”集中在一个很直观的模型里。',
        items: [
          '定义域是 R，值域是 [0, +∞)。',
          '单调性：在 (-∞, 0] 上递减，在 [0, +∞) 上递增。',
          '奇偶性与对称：是偶函数，关于 y 轴对称。',
          '周期性：无周期；对称轴为 x = 0，对称中心不存在。',
          '分段表达：x < 0 时 y = -x，x ≥ 0 时 y = x。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '图像辨识重点是“V 形 + 顶点 + 折角”。',
        items: [
          '图像是顶点在原点的 V 形。',
          '左右两支分别是斜率 -1 和 1 的直线。',
          '原点既是零点，也是最小值点。',
          '图像在原点处不光滑，这一点和抛物线明显不同。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '绝对值函数经常直接对应“距离”和“分类讨论”。',
        items: [
          '几何意义：|x - a| 表示点 x 到点 a 的距离。',
          '常用技巧：拆绝对值、分区间、数形结合、最小距离模型。',
          '与不等式结合时常出现“三角不等式”与区间覆盖。',
          '和一次、二次函数复合后，是最常见的“折线化”或“去负化”处理。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '绝对值函数在新高考题里非常高频，尤其擅长制造分类讨论。',
        items: [
          `考频：${createStars(5)}`,
          '高考考点：分段讨论、最值、解不等式、图像变换、距离模型。',
          '常见综合：与一次函数、二次函数、参数方程、向量或解析几何结合。',
          '真题切入：常用“去绝对值后的区间划分”制造多解、漏解和分类点。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '绝对值函数常作为外层，把内层函数统一“翻到” x 轴上方。',
        items: [
          '复合途径：先“二次”后“绝对值”，得到 y = |x² - 1|，关联：二次函数 + 绝对值函数。',
          '复合途径：先“正弦”后“绝对值”，得到 y = |sin x|，关联：正弦函数 + 绝对值函数。',
          '复合途径：先“根式”后“绝对值”，得到 y = √|x|，关联：绝对值函数 + 根式函数。'
        ]
      }
    })
  },
  {
    id: 'radical',
    name: '根式函数',
    title: '根式函数 y = √x',
    shortLabel: '√x',
    expression: 'y = √x',
    workbenchExpression: 'k * sqrt(x)',
    color: '#ffd777',
    module: '主函数',
    summary: '只在第一象限起步的半条曲线，是定义域限制、反函数意识和增速变慢的代表。',
    tags: ['半曲线', '定义域 x≥0', '增速变慢', '考频★★★☆☆'],
    examFrequency: createStars(3),
    workbenchPreset: {
      expression: 'k * sqrt(x)',
      label: 'y = k√x',
      kStart: -2,
      kEnd: 2,
      initialK: 1,
      duration: 6,
      tracePointX: 4,
      view: { minX: -1, maxX: 16, minY: -8, maxY: 8 }
    },
    related: ['quadratic', 'absolute', 'logarithmic', 'sine'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '根式函数最容易和二次函数对照理解：一个“平方放大”，一个“开方压缩”。',
        items: [
          '定义域是 [0, +∞)，值域是 [0, +∞)。',
          '单调性：在定义域内单调递增。',
          '奇偶性：既不是奇函数，也不是偶函数。',
          '周期性：无周期；对称轴、对称中心都不存在。',
          'x 越大，图像上升越慢，后段逐渐变平。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '图像识别重点在“从原点出发，只向右延展”。',
        items: [
          '图像从 (0, 0) 出发，只存在于第一象限和坐标轴上。',
          '靠近原点时较陡，随后越来越平缓。',
          '没有左半部分，这是定义域限制直接决定的。',
          '与抛物线 y = x²（x ≥ 0 部分）互为镜像关系。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '这张卡突出最常用的“非负性”和“平方还原”。',
        items: [
          '非负性：√x 总是非负，适合处理取值范围和最值。',
          '可利用 y = √x ⇔ x = y²（且 y ≥ 0）进行等价转化。',
          '常和定义域约束一起出现，是解题最容易丢分的位置。',
          '与绝对值、对数复合时，经常需要先判定被开方量是否非负。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '根式函数本身难度不大，但在综合题里常承担“定义域门槛”。',
        items: [
          `考频：${createStars(3)}`,
          '高考考点：定义域、值域、图像平移、反函数意识、复合函数约束。',
          '常见综合：与二次函数、绝对值函数、对数函数联动研究取值范围。',
          '真题切入：常通过“被开方量 ≥ 0”配合参数范围或不等式构造题目。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '根式函数通常作为外层，负责给图像加上“半域”和“压平”效果。',
        items: [
          '复合途径：先“二次”后“根式”，得到 y = √(x² + 1)，关联：二次函数 + 根式函数。',
          '复合途径：先“正弦”后“根式”，得到 y = √(sin x + 1)，关联：正弦函数 + 根式函数。',
          '复合途径：先“线性”后“根式”，得到 y = √(x + 4)，关联：一次函数 + 根式函数。'
        ]
      }
    })
  },
  {
    id: 'exponential',
    name: '指数函数',
    title: '指数函数 y = 2^x',
    shortLabel: '2^x',
    expression: 'y = 2^x',
    workbenchExpression: '2^(x - k)',
    color: '#8cffb8',
    module: '主函数',
    summary: '“越往后越快”的典型模型，适合把恒正性、水平渐近线与指数增长一起理解。',
    tags: ['指数增长', '恒正', '过点(0,1)', '考频★★★★☆'],
    examFrequency: createStars(4),
    workbenchPreset: {
      expression: '2^(x - k)',
      label: 'y = 2^(x-k)',
      kStart: -3,
      kEnd: 3,
      initialK: 0,
      duration: 6,
      tracePointX: 0,
      view: { minX: -6, maxX: 6, minY: -1, maxY: 18 }
    },
    related: ['logarithmic', 'reciprocal', 'sine', 'quadratic'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '指数函数的基础认知可以打包成“定义域全体实数、值域恒正、增长越来越快”。',
        items: [
          '定义域是 R，值域是 (0, +∞)。',
          '单调性：y = 2^x 在 R 上单调递增。',
          '奇偶性：既不是奇函数，也不是偶函数。',
          '周期性：无周期；对称轴、对称中心都不存在。',
          '无论 x 多小，函数值都大于 0，不会碰到 x 轴。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '指数函数的图像识别重点是“过 (0,1) 且向右急剧上升”。',
        items: [
          '图像经过点 (0, 1)。',
          'x 轴是水平渐近线，左端无限接近但不相交。',
          '右侧上升速度越来越快，增长具有“倍增效应”。',
          '整体位于 x 轴上方，没有零点。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '题目中最常直接用的，是指数函数的“恒正、反函数、比较大小”三个入口。',
        items: [
          '恒正性：2^x > 0，可快速排除不合理解。',
          '与对数函数互为反函数，图像关于 y = x 对称。',
          '比较大小时，常把指数式转化为同底或借助单调性处理。',
          '与实际问题中的增长、衰减、倍增模型联系非常紧密。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '指数函数是新高考函数综合里非常稳定的常客。',
        items: [
          `考频：${createStars(4)}`,
          '高考考点：单调性、图像平移、恒成立、与对数互反、函数方程。',
          '常见综合：与对数函数、反比例函数、数列、导数和模型应用联动。',
          '真题切入：常利用“指数恒正 + 增长快慢”设置比较大小与参数范围问题。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '指数函数作为外层时，能把内层的小变化迅速放大。',
        items: [
          '复合途径：先“二次”后“指数”，得到 y = 2^(x²)，关联：二次函数 + 指数函数。',
          '复合途径：先“正弦”后“指数”，得到 y = 2^(sin x)，关联：正弦函数 + 指数函数。',
          '复合途径：先“反比例”后“指数”，得到 y = 2^(1/x)，关联：反比例函数 + 指数函数。'
        ]
      }
    })
  },
  {
    id: 'logarithmic',
    name: '对数函数',
    title: '对数函数 y = log₂x',
    shortLabel: 'log₂x',
    expression: 'y = log₂x',
    workbenchExpression: 'log(x - k, 2)',
    color: '#a4b7ff',
    module: '主函数',
    summary: '指数函数的反函数，重在理解定义域 x > 0、竖直渐近线以及“增长越来越慢”。',
    tags: ['反函数', '定义域 x>0', '渐近线', '考频★★★★☆'],
    examFrequency: createStars(4),
    workbenchPreset: {
      expression: 'log(x - k, 2)',
      label: 'y = log₂(x-k)',
      kStart: -3,
      kEnd: 3,
      initialK: 0,
      duration: 6,
      tracePointX: 2,
      view: { minX: -2, maxX: 12, minY: -6, maxY: 6 }
    },
    related: ['exponential', 'reciprocal', 'radical', 'quadratic'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '对数函数最核心的性质就是“定义域右开、整体递增、增长放缓”。',
        items: [
          '定义域是 (0, +∞)，值域是 R。',
          '单调性：y = log₂x 在定义域内单调递增。',
          '奇偶性：既不是奇函数，也不是偶函数。',
          '周期性：无周期；对称轴、对称中心都不存在。',
          'x 越大，函数值增长越慢，但仍可无限增大。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '图像判断抓住“过 (1,0) + 贴近 y 轴 + 缓慢上升”就够了。',
        items: [
          '图像经过点 (1, 0)。',
          'y 轴是竖直渐近线，x 不能取 0。',
          '曲线只分布在 y 轴右侧，整体向右上方缓慢延展。',
          '它与指数函数图像关于直线 y = x 对称。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '对数函数常用来做“降幂”和“比较增长快慢”。',
        items: [
          '对数把乘法和幂次转成加法与系数，是化简和比较的重要工具。',
          '解题时要先守住定义域 x > 0，这往往是第一步。',
          '与指数函数互为反函数，经常借助互逆关系化简方程。',
          '对数增长很慢，常用来和多项式、指数做速度比较。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '对数函数在高考里常和定义域、参数范围、互反关系绑定出现。',
        items: [
          `考频：${createStars(4)}`,
          '高考考点：定义域、图像平移、互为反函数、比较大小、解方程与不等式。',
          '常见综合：与指数、根式、二次函数、导数和模型应用组合。',
          '真题切入：常把“先判定义域，再借助单调性”作为解题主线。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '对数函数作为外层时，会把内层的大范围变化压缩得更平缓。',
        items: [
          '复合途径：先“二次”后“对数”，得到 y = log₂(x² + 1)，关联：二次函数 + 对数函数。',
          '复合途径：先“根式”后“对数”，得到 y = log₂(√x + 1)，关联：根式函数 + 对数函数。',
          '复合途径：先“对数”后“绝对值”，得到 y = |log₂x|，关联：对数函数 + 绝对值函数。'
        ]
      }
    })
  },
  {
    id: 'sine',
    name: '正弦函数',
    title: '正弦函数 y = sin x',
    shortLabel: 'sinx',
    expression: 'y = sin(x)',
    workbenchExpression: 'sin(k * x)',
    color: '#7ee2ff',
    module: '主函数',
    summary: '最常见的周期函数，重点在振幅、周期、奇偶性、零点和波峰波谷的循环节奏。',
    tags: ['周期函数', '波动', '奇函数', '考频★★★★★'],
    examFrequency: createStars(5),
    workbenchPreset: {
      expression: 'sin(k * x)',
      label: 'y = sin(kx)',
      kStart: 0.25,
      kEnd: 3,
      initialK: 1,
      duration: 6,
      tracePointX: 1,
      view: { minX: -10, maxX: 10, minY: -1.6, maxY: 1.6 }
    },
    related: ['linear', 'quadratic', 'cubic', 'exponential', 'logarithmic', 'absolute', 'radical'],
    cards: createCards({
      profile: {
        title: '函数特征',
        description: '正弦函数非常适合把定义域、值域、奇偶性、周期和对称性一起记。',
        items: [
          '定义域是 R，值域是 [-1, 1]。',
          '单调性：不是整体单调，而是在不同区间内交替递增、递减。',
          '奇偶性与对称：是奇函数，关于原点中心对称。',
          '周期性：最小正周期为 2π。',
          '对称轴不唯一，对称中心包含 (kπ, 0) 这一类周期性中心点。'
        ]
      },
      geometry: {
        title: '图像几何',
        description: '图像辨识重点是“波形、零点、波峰、波谷、周期重复”。',
        items: [
          '图像是一条连续起伏的波浪线，经过原点。',
          '零点位于 x = kπ，波峰位于 x = π/2 + 2kπ，波谷位于 x = 3π/2 + 2kπ。',
          '最大值为 1，最小值为 -1。',
          '同一段波形每隔 2π 会完整重复一次。'
        ]
      },
      properties: {
        title: '常用性质',
        description: '正弦函数的题目往往围绕“周期 + 对称 + 特殊角”展开。',
        items: [
          '特殊角函数值是作图与求值的高频入口，如 sin0、sin(π/2)、sinπ。',
          '图像平移伸缩常写成 y = A sin(ωx + φ)，振幅和周期都能直接读。',
          '与三角恒等变换、导数、向量和物理波动模型联系紧密。',
          '它也是构造复合函数、研究最值和区间零点的常用外层函数。'
        ]
      },
      exam: {
        title: '高考关联',
        description: '正弦函数是高中周期函数板块最稳定的高频核心。',
        items: [
          `考频：${createStars(5)}`,
          '高考考点：周期、最值、图像变换、特殊角、零点分布、三角恒等变换。',
          '常见综合：与二次函数、导数、向量、解三角形和复合函数联动。',
          '真题切入：常通过“先定周期与对称，再找关键点”构造图像与最值问题。'
        ]
      },
      composite: {
        title: '复合函数',
        description: '正弦函数既能做外层制造波动，也能做内层参与周期化处理。',
        items: [
          '复合途径：先“二次”后“正弦”，得到 y = sin(x²)，关联：二次函数 + 正弦函数。',
          '复合途径：先“正弦”后“绝对值”，得到 y = |sin x|，关联：正弦函数 + 绝对值函数。',
          '复合途径：先“正弦”后“指数”，得到 y = 2^(sin x)，关联：正弦函数 + 指数函数。'
        ]
      }
    })
  }
];

export const FUNCTION_UNIT_MAP = Object.fromEntries(FUNCTION_UNITS.map((unit) => [unit.id, unit]));
export const FUNCTION_WORKBENCH_PRESETS = FUNCTION_UNITS.map((unit) => ({ key: unit.id, label: unit.shortLabel }));
export const DEFAULT_FUNCTION_UNIT_ID = 'quadratic';
const WORKBENCH_BRIDGE_KEY = 'geometry-lab.pending-function-unit';

export function getFunctionUnitById(id) {
  return FUNCTION_UNIT_MAP[id] || null;
}

export function listFunctionUnits() {
  return FUNCTION_UNITS.slice();
}

export function savePendingFunctionUnit(id) {
  if (typeof window === 'undefined' || !id) return;
  const payload = typeof id === 'string'
    ? { kind: 'builtin', id }
    : id;
  window.sessionStorage.setItem(WORKBENCH_BRIDGE_KEY, JSON.stringify(payload));
}

export function consumePendingFunctionUnit() {
  if (typeof window === 'undefined') return '';
  const raw = window.sessionStorage.getItem(WORKBENCH_BRIDGE_KEY) || '';
  if (raw) {
    window.sessionStorage.removeItem(WORKBENCH_BRIDGE_KEY);
  }
  if (!raw) return '';
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function buildCoreNode(unit, position) {
  return {
    id: unit.id,
    label: unit.shortLabel,
    title: unit.title,
    type: 'function',
    category: 'core',
    color: unit.color,
    size: 17,
    ...position,
    unitId: unit.id,
    module: unit.module,
    family: unit.name
  };
}

function buildTopicNode(unit, topicKey, topicIndex, position, detailRadius) {
  const topic = unit.cards[topicKey];
  const topicMeta = FUNCTION_TOPIC_META[topicKey];
  const angle = (-Math.PI / 2) + (topicIndex * Math.PI * 2) / FUNCTION_TOPIC_ORDER.length;
  const orbitX = detailRadius * 1.04;
  const orbitY = detailRadius * 0.98;
  const orbitZ = 0;

  return {
    id: `${unit.id}:${topicKey}`,
    label: topic.title,
    title: `${unit.title} · ${topic.title}`,
    type: 'topic',
    category: 'satellite',
    color: topicMeta.accent,
    size: 9.4,
    x: position.x + Math.cos(angle) * orbitX,
    y: position.y + Math.sin(angle) * orbitY,
    z: position.z + orbitZ,
    unitId: unit.id,
    topicKey,
    module: unit.name,
    family: topic.title
  };
}

export function buildFunctionGraph(options = {}) {
  const { expandedUnitIds = [], includeSatelliteModels = true, units = FUNCTION_UNITS } = options;
  const nodes = [];
  const links = [];
  const detailRadius = 2.02;
  const expandedUnitSet = new Set(expandedUnitIds);
  const unitMap = Object.fromEntries(units.map((unit) => [unit.id, unit]));

  units.forEach((unit) => {
    const position = unit.layout || CORE_LAYOUT[unit.id] || { x: 0, y: 0, z: 0 };

    nodes.push(buildCoreNode(unit, position));

    if (includeSatelliteModels) {
      FUNCTION_TOPIC_ORDER.forEach((topicKey, topicIndex) => {
        const topicNode = buildTopicNode(unit, topicKey, topicIndex, position, detailRadius);
        nodes.push(topicNode);
        if (expandedUnitSet.has(unit.id)) {
          links.push({ source: unit.id, target: topicNode.id, weight: 0.92, type: topicKey });
        }
      });
    }

    unit.related.forEach((relatedId) => {
      if (unit.id < relatedId) {
        links.push({ source: unit.id, target: relatedId, weight: 0.62, type: 'relation' });
      }
    });
  });

  return {
    meta: {
      title: '函数知识星图',
      defaultSelected: DEFAULT_FUNCTION_UNIT_ID,
      sourceLabel: '9 种中学基础函数知识关联图',
      unitMap
    },
    nodes,
    links
  };
}

function toDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n+/g, '').trim())}`;
}

function createBackdrop({ theme = 'night' } = {}) {
  const dark = theme === 'night';
  const bg = dark ? '#050812' : '#ffffff';
  const soft = dark ? '#091226' : '#f0f4f8';
  const line = dark ? 'rgba(157,190,225,0.09)' : 'rgba(0,0,0,0.06)';
  const accent = dark ? '#ff7a30' : '#e85d10';
  const accent2 = dark ? '#24d2b0' : '#0d8a73';
  const text = dark ? 'rgba(238,244,255,0.1)' : 'rgba(13,138,115,0.10)';
  return toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bg}"/>
          <stop offset="100%" stop-color="${soft}"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g)"/>
      <g stroke="${line}" stroke-width="1">
        ${Array.from({ length: 24 }, (_, i) => `<line x1="${i * 70}" y1="0" x2="${i * 70}" y2="900"/>`).join('')}
        ${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1600" y2="${i * 60}"/>`).join('')}
      </g>
      <path d="M0 620 C160 500 260 520 420 610 S740 720 900 590 1180 420 1600 520" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" opacity="0.72"/>
      <path d="M0 420 C180 360 300 500 450 470 590 440 650 320 780 330 940 340 980 560 1180 540 1320 525 1450 410 1600 380" fill="none" stroke="${accent2}" stroke-width="5" stroke-linecap="round" opacity="0.64"/>
      <circle cx="1180" cy="170" r="140" fill="${accent}" opacity="0.08"/>
      <circle cx="280" cy="700" r="120" fill="${accent2}" opacity="0.08"/>
      <text x="106" y="160" font-size="42" font-family="Segoe UI, Arial" fill="${text}">f(x)=sin(x²)+cos(x)</text>
      <text x="106" y="220" font-size="34" font-family="Segoe UI, Arial" fill="${text}">f′(x)=2x·cos(x²)-sin(x)</text>
      <text x="1010" y="760" font-size="36" font-family="Segoe UI, Arial" fill="${text}">∫ f(x) dx</text>
      <text x="1130" y="250" font-size="92" font-family="Segoe UI, Arial" fill="${text}">∂</text>
    </svg>
  `);
}

function createFunctionBoard({
  theme = 'night',
  title,
  formula,
  note,
  curve = 'sine'
}) {
  const dark = theme === 'night';
  const bg = dark ? '#09111f' : '#ffffff';
  const panel = dark ? '#101a31' : '#f5f7fa';
  const grid = dark ? 'rgba(176,204,235,0.1)' : 'rgba(0,0,0,0.07)';
  const axis = dark ? 'rgba(239,244,255,0.72)' : 'rgba(0,0,0,0.72)';
  const text = dark ? '#eaf2ff' : '#1a1d24';
  const muted = dark ? '#a7b6d8' : '#556270';
  const accent = dark ? '#ff7a30' : '#e85d10';
  const accent2 = dark ? '#24d2b0' : '#0d8a73';

  const path = curve === 'parabola'
    ? 'M120 270 Q320 90 520 270 T920 270'
    : curve === 'reciprocal'
      ? 'M120 340 C180 250 240 230 300 210 C340 198 375 175 400 120 M560 420 C590 260 650 230 740 225 C835 220 900 188 955 120'
      : 'M100 250 C170 160 240 160 310 250 C380 340 450 340 520 250 C590 160 660 160 730 250 C800 340 870 340 940 250';

  return toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 640">
      <rect width="1080" height="640" rx="34" fill="${bg}"/>
      <rect x="34" y="34" width="1012" height="572" rx="30" fill="${panel}"/>
      <g stroke="${grid}" stroke-width="1">
        ${Array.from({ length: 13 }, (_, i) => `<line x1="${100 + i * 70}" y1="90" x2="${100 + i * 70}" y2="540"/>`).join('')}
        ${Array.from({ length: 7 }, (_, i) => `<line x1="100" y1="${110 + i * 70}" x2="980" y2="${110 + i * 70}"/>`).join('')}
      </g>
      <line x1="100" y1="315" x2="980" y2="315" stroke="${axis}" stroke-width="3"/>
      <line x1="540" y1="90" x2="540" y2="540" stroke="${axis}" stroke-width="3"/>
      <path d="${path}" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
      <path d="M130 470 C240 430 320 420 450 398 C570 377 630 330 720 280 C840 214 880 205 950 190" fill="none" stroke="${accent2}" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round" opacity="0.82"/>
      <circle cx="540" cy="315" r="9" fill="${accent2}"/>
      <rect x="84" y="68" width="360" height="118" rx="24" fill="${dark ? 'rgba(5,11,22,0.6)' : 'rgba(255,255,255,0.82)'}"/>
      <text x="114" y="116" font-size="36" font-family="Segoe UI, Arial" fill="${text}" font-weight="700">${title}</text>
      <text x="114" y="154" font-size="26" font-family="Consolas, Segoe UI, Arial" fill="${accent2}">${formula}</text>
      <text x="114" y="190" font-size="22" font-family="Segoe UI, Arial" fill="${muted}">${note}</text>
    </svg>
  `);
}

const functionIllustrationsDay = [
  {
    title: '导数视角',
    note: '看斜率如何决定递增与递减。',
    image: createFunctionBoard({ theme: 'day', title: '导数视角', formula: `f′(x)=2x·cos(x²)-sin(x)`, note: '从函数到斜率，再到单调区间。', curve: 'sine' })
  },
  {
    title: '幂函数视角',
    note: '观察开口、顶点与焦点。',
    image: createFunctionBoard({ theme: 'day', title: '幂函数视角', formula: `y=(x-k)²`, note: '顶点平移比死记公式更直观。', curve: 'parabola' })
  },
  {
    title: '渐近线视角',
    note: '把靠近但永不相交画出来。',
    image: createFunctionBoard({ theme: 'day', title: '渐近线视角', formula: `y=1/(x-k)`, note: '竖直与水平渐近线一起看。', curve: 'reciprocal' })
  }
];

const functionIllustrationsNight = [
  {
    title: '导数视角',
    note: '看斜率如何决定递增与递减。',
    image: createFunctionBoard({ theme: 'night', title: '导数视角', formula: `f′(x)=2x·cos(x²)-sin(x)`, note: '从函数到斜率，再到单调区间。', curve: 'sine' })
  },
  {
    title: '幂函数视角',
    note: '观察开口、顶点与焦点。',
    image: createFunctionBoard({ theme: 'night', title: '幂函数视角', formula: `y=(x-k)²`, note: '顶点平移比死记公式更直观。', curve: 'parabola' })
  },
  {
    title: '渐近线视角',
    note: '把靠近但永不相交画出来。',
    image: createFunctionBoard({ theme: 'night', title: '渐近线视角', formula: `y=1/(x-k)`, note: '竖直与水平渐近线一起看。', curve: 'reciprocal' })
  }
];

export const mediaLibrary = {
  appBackdropDay: createBackdrop({ theme: 'day' }),
  appBackdropNight: createBackdrop({ theme: 'night' }),
  appHeaderDay: createFunctionBoard({ theme: 'day', title: '白天模式', formula: `f(x)=sin(x²)+cos(x)`, note: '更像纸面推导和课堂板书。', curve: 'sine' }),
  appHeaderNight: createFunctionBoard({ theme: 'night', title: '夜晚模式', formula: `f′(x)=2x·cos(x²)-sin(x)`, note: '暗色画布更适合久看。', curve: 'sine' }),
  functionHeroDay: createFunctionBoard({ theme: 'day', title: '函数可视化实验台', formula: `y=sin(x²)+cos(x)`, note: '把函数、导数和图像放到同一块板上。', curve: 'sine' }),
  functionHeroNight: createFunctionBoard({ theme: 'night', title: '函数可视化实验台', formula: `y=sin(x²)+cos(x)`, note: '暗色背景下，坐标条和层级会更明显。', curve: 'sine' }),
  functionReferenceDay: createFunctionBoard({ theme: 'day', title: '拖拽与缩放', formula: `Ctrl + 滚轮 = 缩放`, note: '拖拽平移，适配图像快速归位。', curve: 'parabola' }),
  functionReferenceNight: createFunctionBoard({ theme: 'night', title: '拖拽与缩放', formula: `Ctrl + 滚轮 = 缩放`, note: '拖拽平移，适配图像快速归位。', curve: 'parabola' }),
  functionIllustrationsDay,
  functionIllustrationsNight,
  errorHero: 'https://images.pexels.com/photos/5708861/pexels-photo-5708861.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-5708861.jpg&fm=jpg',
  errorPlaceholder: 'https://images.pexels.com/photos/5708861/pexels-photo-5708861.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-5708861.jpg&fm=jpg',
  learningHero: 'https://images.pexels.com/photos/7063755/pexels-photo-7063755.jpeg?cs=srgb&dl=pexels-dziana-hasanbekava-7063755.jpg&fm=jpg',
  learningPlaceholder: 'https://images.pexels.com/photos/6345310/pexels-photo-6345310.jpeg?cs=srgb&dl=pexels-karolina-grabowska-6345310.jpg&fm=jpg',
  neutralPlaceholder: 'https://picsum.photos/seed/geometry-workbench-night/1600/900?grayscale'
};

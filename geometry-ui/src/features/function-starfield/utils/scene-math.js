export function createRandom(seed = 2026) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function hexToRgba(hex, alpha = 1) {
  const raw = String(hex || '#ffffff').replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map((part) => `${part}${part}`).join('') : raw.padEnd(6, 'f').slice(0, 6);
  const num = Number.parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function projectNode(node, rotationX, rotationY, zoom, width, height, offsetX = 0, offsetY = 0) {
  const sinY = Math.sin(rotationY);
  const cosY = Math.cos(rotationY);
  const x1 = node.x * cosY - node.z * sinY;
  const z1 = node.x * sinY + node.z * cosY;

  const sinX = Math.sin(rotationX);
  const cosX = Math.cos(rotationX);
  const y2 = node.y * cosX - z1 * sinX;
  const z2 = node.y * sinX + z1 * cosX;

  const depth = 4 + z2 * 1.18;
  const scale = (540 * zoom) / depth;

  return {
    x: width / 2 + offsetX + x1 * scale,
    y: height / 2 + offsetY + y2 * scale,
    z: z2,
    scale,
    depth
  };
}

export function curveControl(a, b, strength = 1) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const bend = Math.min(180, (20 + length * 0.15) * strength);
  return {
    x: mx + nx * bend,
    y: my + ny * bend
  };
}

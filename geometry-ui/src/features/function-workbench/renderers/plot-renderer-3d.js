import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import {
  drawCoordinateSystem,
  drawFeatureOverlay,
  drawMonotonicBands,
  drawPolarCoordinateSystem,
  drawPolyline,
  getCanvasTheme,
  toCanvasX,
  toCanvasY
} from '../../../utils/plot-renderer';

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((item) => item?.dispose?.());
    return;
  }
  material.dispose?.();
}

function disposeObject3D(object) {
  if (!object) return;
  object.traverse((child) => {
    child.geometry?.dispose?.();
    disposeMaterial(child.material);
  });
}

function clearGroup(group) {
  if (!group) return;
  while (group.children.length) {
    const child = group.children[group.children.length - 1];
    group.remove(child);
    disposeObject3D(child);
  }
}

function applyLineResolution(root, width, height) {
  root?.traverse?.((child) => {
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material?.isLineMaterial && material.resolution) {
        material.resolution.set(width, height);
      }
    });
  });
}

function toThreeColor(value, fallback = '#0f172a') {
  try {
    return new THREE.Color(value || fallback);
  } catch (error) {
    return new THREE.Color(fallback);
  }
}

function mergeBounds(target, source) {
  if (!source) return;
  const values = [source.minX, source.maxX, source.minY, source.maxY, source.minZ, source.maxZ];
  if (values.some((value) => !Number.isFinite(value))) return;
  target.minX = Math.min(target.minX, source.minX);
  target.maxX = Math.max(target.maxX, source.maxX);
  target.minY = Math.min(target.minY, source.minY);
  target.maxY = Math.max(target.maxY, source.maxY);
  target.minZ = Math.min(target.minZ, source.minZ);
  target.maxZ = Math.max(target.maxZ, source.maxZ);
}

function hasFiniteBounds(bounds) {
  return bounds && [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, bounds.minZ, bounds.maxZ]
    .every((value) => Number.isFinite(value));
}

function createFallbackBounds() {
  return {
    minX: -8,
    maxX: 8,
    minY: -8,
    maxY: 8,
    minZ: -8,
    maxZ: 8
  };
}

function flattenVectors(points) {
  const positions = [];
  points.forEach((point) => {
    positions.push(point.x, point.y, point.z);
  });
  return positions;
}

function decimateVectors(points, maxPoints = 420) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points;
  const result = [points[0]];
  const interiorCount = points.length - 2;
  const step = interiorCount / Math.max(1, maxPoints - 2);
  for (let index = 0; index < maxPoints - 2; index += 1) {
    const sourceIndex = 1 + Math.round(index * step);
    result.push(points[Math.min(points.length - 2, sourceIndex)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

function splitContinuousSegments(rawPoints, bounds) {
  const segments = [];
  let current = [];
  const maxJump = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ,
    6
  ) * 0.35;

  const flush = () => {
    if (current.length >= 2) {
      segments.push(decimateVectors(current));
    }
    current = [];
  };

  rawPoints.forEach((point) => {
    if (!point || ![point.x, point.y, point.z].every((value) => Number.isFinite(value))) {
      flush();
      return;
    }
    const vector = new THREE.Vector3(point.x, point.y, point.z);
    const previous = current[current.length - 1];
    if (previous && previous.distanceTo(vector) > maxJump) {
      flush();
    }
    current.push(vector);
  });

  flush();
  return segments;
}

function createThinLine(points, { color, opacity = 1 } = {}) {
  if (!points?.length || points.length < 2) return null;
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: toThreeColor(color).getHex(),
    transparent: opacity < 1,
    opacity
  });
  return new THREE.Line(geometry, material);
}

function createDashedLine(points, { color, opacity = 1, dashSize = 0.45, gapSize = 0.24 } = {}) {
  if (!points?.length || points.length < 2) return null;
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: toThreeColor(color).getHex(),
    dashSize,
    gapSize,
    transparent: opacity < 1,
    opacity
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

function createThickLine(points, { color, opacity = 1, linewidth = 3 } = {}) {
  if (!points?.length || points.length < 2) return null;
  const geometry = new LineGeometry();
  geometry.setPositions(flattenVectors(points));
  const material = new LineMaterial({
    color: toThreeColor(color).getHex(),
    linewidth,
    transparent: opacity < 1,
    opacity,
    dashed: false,
    depthWrite: opacity >= 1
  });
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return line;
}

function createSphere(position, { color, radius = 0.16, opacity = 1 } = {}) {
  const geometry = new THREE.SphereGeometry(radius, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: toThreeColor(color).getHex(),
    transparent: opacity < 1,
    opacity,
    roughness: 0.3,
    metalness: 0.08,
    emissive: toThreeColor(color).multiplyScalar(0.08)
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  return mesh;
}

function createGroundPlane(bounds, color) {
  const width = Math.max(10, (bounds.maxX - bounds.minX) * 1.12);
  const height = Math.max(10, (bounds.maxY - bounds.minY) * 1.12);
  const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: toThreeColor(color).getHex(),
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, 0);
  return mesh;
}

function createGrid(bounds, theme) {
  const size = Math.max(
    12,
    Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 1.2
  );
  const divisions = Math.max(10, Math.round(size));
  const grid = new THREE.GridHelper(
    size,
    divisions,
    toThreeColor(theme.axis).getHex(),
    toThreeColor(theme.grid).getHex()
  );
  grid.position.set((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2, 0.01);
  const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
  materials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.48;
  });
  return grid;
}

function createAxes(bounds, theme) {
  const group = new THREE.Group();
  const xPadding = Math.max(1, (bounds.maxX - bounds.minX) * 0.06);
  const yPadding = Math.max(1, (bounds.maxY - bounds.minY) * 0.06);
  const zPadding = Math.max(1, (bounds.maxZ - bounds.minZ) * 0.08);

  const xAxis = createThinLine([
    new THREE.Vector3(bounds.minX - xPadding, 0, 0),
    new THREE.Vector3(bounds.maxX + xPadding, 0, 0)
  ], { color: theme.axis, opacity: 0.95 });
  const yAxis = createThinLine([
    new THREE.Vector3(0, bounds.minY - yPadding, 0),
    new THREE.Vector3(0, bounds.maxY + yPadding, 0)
  ], { color: '#5b8dee', opacity: 0.9 });
  const zAxis = createThinLine([
    new THREE.Vector3(0, 0, bounds.minZ - zPadding),
    new THREE.Vector3(0, 0, bounds.maxZ + zPadding)
  ], { color: '#f2b64a', opacity: 0.95 });

  if (xAxis) group.add(xAxis);
  if (yAxis) group.add(yAxis);
  if (zAxis) group.add(zAxis);
  return group;
}

function addSegmentsToGroup(group, segments, builder) {
  segments.forEach((segment) => {
    const mesh = builder(segment);
    if (mesh) group.add(mesh);
  });
}

function createRibbon(points, { color, opacity = 0.18 } = {}) {
  if (!points?.length || points.length < 2) return null;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];

  points.forEach((point, index) => {
    positions.push(point.x, point.y, 0);
    positions.push(point.x, point.y, point.z);
    if (index < points.length - 1) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: toThreeColor(color).getHex(),
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    roughness: 0.55,
    metalness: 0,
    depthWrite: false
  });

  return new THREE.Mesh(geometry, material);
}

function createProjectionLine(points, { color, opacity = 0.3 } = {}) {
  if (!points?.length || points.length < 2) return null;
  const projected = points.map((point) => new THREE.Vector3(point.x, point.y, 0));
  return createThinLine(projected, { color, opacity });
}

function createSurfaceMesh(grid, { color, opacity = 0.38 } = {}) {
  if (!grid?.points?.length || grid.rows < 2 || grid.cols < 2) return null;

  const positions = [];
  const indices = [];
  const pointIndexMap = new Array(grid.points.length).fill(-1);

  grid.points.forEach((point, index) => {
    if (!point || ![point.x, point.y, point.z].every((value) => Number.isFinite(value))) {
      return;
    }
    pointIndexMap[index] = positions.length / 3;
    positions.push(point.x, point.y, point.z);
  });

  for (let row = 0; row < grid.rows - 1; row += 1) {
    for (let col = 0; col < grid.cols - 1; col += 1) {
      const topLeft = row * grid.cols + col;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + grid.cols;
      const bottomRight = bottomLeft + 1;

      const a = pointIndexMap[topLeft];
      const b = pointIndexMap[topRight];
      const c = pointIndexMap[bottomLeft];
      const d = pointIndexMap[bottomRight];

      if (a >= 0 && b >= 0 && c >= 0) {
        indices.push(a, b, c);
      }
      if (b >= 0 && d >= 0 && c >= 0) {
        indices.push(b, d, c);
      }
    }
  }

  if (!indices.length) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: toThreeColor(color).getHex(),
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    roughness: 0.42,
    metalness: 0.05
  });

  return new THREE.Mesh(geometry, material);
}

function createSurfaceWireframe(grid, { color, opacity = 0.38, stride = 3 } = {}) {
  if (!grid?.points?.length || grid.rows < 2 || grid.cols < 2) return null;
  const group = new THREE.Group();

  const buildLine = (points) => {
    const filtered = points.filter((point) => point && [point.x, point.y, point.z].every((value) => Number.isFinite(value)));
    if (filtered.length >= 2) {
      const line = createThinLine(
        filtered.map((point) => new THREE.Vector3(point.x, point.y, point.z)),
        { color, opacity }
      );
      if (line) group.add(line);
    }
  };

  for (let row = 0; row < grid.rows; row += stride) {
    const rowPoints = [];
    for (let col = 0; col < grid.cols; col += 1) {
      rowPoints.push(grid.points[row * grid.cols + col]);
    }
    buildLine(rowPoints);
  }

  for (let col = 0; col < grid.cols; col += stride) {
    const colPoints = [];
    for (let row = 0; row < grid.rows; row += 1) {
      colPoints.push(grid.points[row * grid.cols + col]);
    }
    buildLine(colPoints);
  }

  return group.children.length ? group : null;
}

function createImplicitSurfaceGroup(fieldData, { color, opacity = 0.46 } = {}) {
  if (!fieldData?.values?.length || !fieldData?.bounds || !fieldData?.resolution) return null;

  const {
    bounds,
    isoLevel = 0,
    maxValue = Infinity,
    minValue = -Infinity,
    resolution,
    values
  } = fieldData;

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || isoLevel < minValue || isoLevel > maxValue) {
    return null;
  }

  const maxPolyCount = Math.max(20000, resolution * resolution * 16);
  const mesh = new MarchingCubes(
    resolution,
    new THREE.MeshStandardMaterial({
      color: toThreeColor(color).getHex(),
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      roughness: 0.34,
      metalness: 0.06
    }),
    false,
    false,
    maxPolyCount
  );

  mesh.isolation = isoLevel;
  mesh.reset();

  const safeInvalidValue = maxValue >= isoLevel
    ? maxValue + Math.max(1, Math.abs(maxValue - minValue) * 0.25)
    : minValue - Math.max(1, Math.abs(maxValue - minValue) * 0.25);

  for (let z = 0; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const index = z * resolution * resolution + y * resolution + x;
        const value = values[index];
        mesh.setCell(x, y, z, Number.isFinite(value) ? value : safeInvalidValue);
      }
    }
  }

  mesh.update();
  if (!mesh.count) {
    disposeObject3D(mesh);
    return null;
  }

  const center = new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2
  );
  const halfSpan = new THREE.Vector3(
    Math.max(0.35, (bounds.maxX - bounds.minX) / 2),
    Math.max(0.35, (bounds.maxY - bounds.minY) / 2),
    Math.max(0.35, (bounds.maxZ - bounds.minZ) / 2)
  );

  mesh.position.copy(center);
  mesh.scale.copy(halfSpan);
  mesh.frustumCulled = false;

  const group = new THREE.Group();
  group.add(mesh);

  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({
      color: toThreeColor(color).offsetHSL(0, 0, -0.18).getHex(),
      transparent: true,
      opacity: Math.min(0.26, opacity * 0.6)
    })
  );
  wireframe.position.copy(center);
  wireframe.scale.copy(halfSpan);
  group.add(wireframe);

  return group;
}

function createMonotonicBand(interval, bounds, { color } = {}) {
  const width = Math.max(0.16, interval.endX - interval.startX);
  const height = Math.max(4, bounds.maxY - bounds.minY) * 1.08;
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({
    color: toThreeColor(color).getHex(),
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((interval.startX + interval.endX) / 2, (bounds.minY + bounds.maxY) / 2, 0.02);
  return mesh;
}

function createHorizontalGuide(z, bounds, color, dashed = true) {
  const points = [
    new THREE.Vector3(bounds.minX, 0, z),
    new THREE.Vector3(bounds.maxX, 0, z)
  ];
  return dashed
    ? createDashedLine(points, { color, opacity: 0.84, dashSize: 0.42, gapSize: 0.24 })
    : createThinLine(points, { color, opacity: 0.88 });
}

function createVerticalGuide(x, bounds, color, dashed = true) {
  const points = [
    new THREE.Vector3(x, 0, bounds.minZ),
    new THREE.Vector3(x, 0, bounds.maxZ)
  ];
  return dashed
    ? createDashedLine(points, { color, opacity: 0.82, dashSize: 0.42, gapSize: 0.24 })
    : createThinLine(points, { color, opacity: 0.88 });
}

function projectCurveToPlanar(points, coordSystem) {
  if (!Array.isArray(points)) return [];
  return points.map((point) => {
    if (!point) return null;
    if (coordSystem === 'polar') {
      return { x: point.x, y: point.y };
    }
    return { x: point.x, y: point.z };
  });
}

function drawPlanarMarker(ctx, width, height, view, point, color) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(
    toCanvasX(point.x, width, view),
    toCanvasY(point.y, height, view),
    5,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawPlanarEmptyState(ctx, width, height, message) {
  if (!message) return;
  const theme = getCanvasTheme();
  ctx.save();
  ctx.fillStyle = theme.meta;
  ctx.font = '14px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(message, width / 2, height / 2);
  ctx.restore();
}

function renderPlanarCanvas(ctx, width, height, payload, theme) {
  const view = payload.view || {
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10
  };
  const coordSystem = payload.coordSystem || 'cartesian';
  const functionDataList = payload.functionDataList || [];
  const visibleLayers = payload.visibleLayerDataList || [];
  const monotonicIntervals = payload.monotonicIntervals || [];
  const featureSnapshot = payload.featureSnapshot || null;
  const pointTrace = payload.pointTrace || [];
  const showFeatures = payload.showFeatures !== false;
  const activeFunctionId = payload.activeFunctionId;
  const activeLayerId = payload.activeLayerId;

  if (coordSystem === 'polar') {
    drawPolarCoordinateSystem(ctx, width, height, view);
  } else {
    drawCoordinateSystem(ctx, width, height, view);
  }

  if (coordSystem === 'cartesian' && monotonicIntervals.length) {
    drawMonotonicBands(ctx, width, height, view, monotonicIntervals);
  }

  const transformX = (value) => toCanvasX(value, width, view);
  const transformY = (value) => toCanvasY(value, height, view);

  visibleLayers.forEach((item) => {
    const planarPoints = projectCurveToPlanar(item?.data?.points, coordSystem);
    drawPolyline(ctx, planarPoints, transformX, transformY, {
      strokeStyle: item.color,
      lineWidth: item.id === activeLayerId ? 2.3 : 1.7,
      lineDash: [8, 5],
      alpha: item.id === activeLayerId ? 0.92 : 0.55
    });
  });

  functionDataList.forEach((item) => {
    const planarPoints = projectCurveToPlanar(item?.data?.points, coordSystem);
    drawPolyline(ctx, planarPoints, transformX, transformY, {
      strokeStyle: item.color,
      lineWidth: item.id === activeFunctionId ? 3.2 : 2.2,
      alpha: item.id === activeFunctionId ? 1 : 0.76
    });
  });

  const planarTrace = projectCurveToPlanar(pointTrace, coordSystem);
  if (planarTrace.length >= 2) {
    drawPolyline(ctx, planarTrace, transformX, transformY, {
      strokeStyle: '#b96f3e',
      lineWidth: 2.4,
      alpha: 0.9
    });
  }

  const lastTracePoint = planarTrace.filter(Boolean).at(-1);
  if (lastTracePoint) {
    drawPlanarMarker(ctx, width, height, view, lastTracePoint, '#b96f3e');
  }

  if (coordSystem === 'cartesian' && showFeatures && featureSnapshot) {
    drawFeatureOverlay(ctx, width, height, view, featureSnapshot, {
      vertex: [],
      focus: [],
      directrix: [],
      verticalAsymptotes: [],
      horizontalAsymptotes: []
    }, { showHistory: false });
  }

  const activeError = functionDataList.find((item) => item.id === activeFunctionId)?.data?.error;
  if (!functionDataList.some((item) => (item?.data?.points || []).some(Boolean)) && activeError) {
    drawPlanarEmptyState(ctx, width, height, activeError);
    return;
  }

  if (!functionDataList.length) {
    drawPlanarEmptyState(ctx, width, height, coordSystem === 'polar' ? '输入 r = f(theta) 开始绘制极坐标图像' : '输入 y = f(x) 开始绘制二维图像');
  }
}

export function createFunctionPlot3D(container) {
  if (!container) return null;

  const planarCanvas = document.createElement('canvas');
  planarCanvas.className = 'function-plot-2d-canvas';
  planarCanvas.style.width = '100%';
  planarCanvas.style.height = '100%';
  planarCanvas.style.display = 'none';

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'function-plot-3d-canvas';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  container.innerHTML = '';
  container.appendChild(planarCanvas);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 5000);
  camera.up.set(0, 0, 1);
  camera.position.set(16, -18, 11);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.rotateSpeed = 0.78;
  controls.zoomSpeed = 0.92;
  controls.screenSpacePanning = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.88);
  keyLight.position.set(10, -12, 18);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.26);
  fillLight.position.set(-10, 8, 7);
  scene.add(ambientLight, keyLight, fillLight);

  const dynamicRoot = new THREE.Group();
  scene.add(dynamicRoot);

  let resizeObserver = null;
  let disposed = false;
  let hasFittedCamera = false;
  let lastBounds = createFallbackBounds();
  let currentMode = 'space';

  const updateSize = () => {
    if (disposed) return;
    const width = Math.max(320, Math.floor(container.clientWidth || 1100));
    const height = Math.max(420, Math.floor(container.clientHeight || 560));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    planarCanvas.width = Math.max(1, Math.floor(width * pixelRatio));
    planarCanvas.height = Math.max(1, Math.floor(height * pixelRatio));
    planarCanvas.style.width = `${width}px`;
    planarCanvas.style.height = `${height}px`;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyLineResolution(dynamicRoot, width, height);
  };

  const fitCameraToBounds = (bounds = lastBounds) => {
    lastBounds = hasFiniteBounds(bounds) ? { ...bounds } : createFallbackBounds();
    const activeBounds = hasFiniteBounds(bounds) ? bounds : lastBounds;
    const center = new THREE.Vector3(
      (activeBounds.minX + activeBounds.maxX) / 2,
      (activeBounds.minY + activeBounds.maxY) / 2,
      (activeBounds.minZ + activeBounds.maxZ) / 2
    );

    const spanX = Math.max(4, activeBounds.maxX - activeBounds.minX);
    const spanY = Math.max(4, activeBounds.maxY - activeBounds.minY);
    const spanZ = Math.max(4, activeBounds.maxZ - activeBounds.minZ);
    const span = Math.max(spanX, spanY, spanZ, 10);

    camera.position.set(
      center.x + span * 1.05,
      center.y - span * 1.18,
      center.z + span * 0.76
    );
    controls.target.copy(center);
    controls.minDistance = span * 0.18;
    controls.maxDistance = span * 8;
    controls.update();
    hasFittedCamera = true;
  };

  const render = (payload = {}, options = {}) => {
    if (disposed) return;
    const theme = getCanvasTheme();
    const coordSystem = payload.coordSystem || 'space';
    currentMode = coordSystem;

    if (coordSystem !== 'space') {
      planarCanvas.style.display = 'block';
      renderer.domElement.style.display = 'none';
      updateSize();
      const ctx = planarCanvas.getContext('2d');
      if (ctx) {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(320, Math.floor(container.clientWidth || 1100));
        const height = Math.max(420, Math.floor(container.clientHeight || 560));
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        renderPlanarCanvas(ctx, width, height, payload, theme);
      }
      return;
    }

    planarCanvas.style.display = 'none';
    renderer.domElement.style.display = 'block';
    scene.background = toThreeColor(theme.background, '#ffffff');
    renderer.setClearColor(scene.background, 1);

    clearGroup(dynamicRoot);

    const functionDataList = payload.functionDataList || [];
    const visibleLayers = payload.visibleLayerDataList || [];
    const monotonicIntervals = payload.monotonicIntervals || [];
    const featureSnapshot = payload.featureSnapshot || null;
    const pointTrace = payload.pointTrace || [];
    const showFeatures = payload.showFeatures !== false;
    const showAxes = payload.showAxes !== false;
    const showGrid = payload.showGrid !== false;
    const showGround = payload.showGround !== false && showGrid;
    const activeFunctionId = payload.activeFunctionId;
    const activeLayerId = payload.activeLayerId;

    const worldBounds = createFallbackBounds();
    let hasDataBounds = false;
    [...functionDataList, ...visibleLayers].forEach((item) => {
      if (item?.data?.spaceBounds && hasFiniteBounds(item.data.spaceBounds)) {
        if (!hasDataBounds) {
          Object.assign(worldBounds, item.data.spaceBounds);
          hasDataBounds = true;
        } else {
          mergeBounds(worldBounds, item.data.spaceBounds);
        }
      }
    });

    if (featureSnapshot?.horizontalLines?.length || featureSnapshot?.verticalLines?.length) {
      const featureBounds = hasDataBounds ? worldBounds : createFallbackBounds();
      featureSnapshot.horizontalLines?.forEach((line) => {
        if (!Number.isFinite(line.y)) return;
        featureBounds.minZ = Math.min(featureBounds.minZ, line.y);
        featureBounds.maxZ = Math.max(featureBounds.maxZ, line.y);
      });
      featureSnapshot.verticalLines?.forEach((line) => {
        if (!Number.isFinite(line.x)) return;
        featureBounds.minX = Math.min(featureBounds.minX, line.x);
        featureBounds.maxX = Math.max(featureBounds.maxX, line.x);
      });
      Object.assign(worldBounds, featureBounds);
      hasDataBounds = true;
    }

    if (pointTrace.length) {
      const traceBounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity
      };
      pointTrace.forEach((point) => {
        if (!point || ![point.x, point.y, point.z].every((value) => Number.isFinite(value))) return;
        if (!hasFiniteBounds(traceBounds)) {
          traceBounds.minX = point.x;
          traceBounds.maxX = point.x;
          traceBounds.minY = point.y;
          traceBounds.maxY = point.y;
          traceBounds.minZ = point.z;
          traceBounds.maxZ = point.z;
        } else {
          mergeBounds(traceBounds, {
            minX: point.x,
            maxX: point.x,
            minY: point.y,
            maxY: point.y,
            minZ: point.z,
            maxZ: point.z
          });
        }
      });
      if (hasFiniteBounds(traceBounds)) {
        if (!hasDataBounds) {
          Object.assign(worldBounds, traceBounds);
          hasDataBounds = true;
        } else {
          mergeBounds(worldBounds, traceBounds);
        }
      }
    }

    const activeBounds = hasDataBounds ? worldBounds : createFallbackBounds();
    const paddedBounds = {
      minX: activeBounds.minX - Math.max(1, (activeBounds.maxX - activeBounds.minX) * 0.08),
      maxX: activeBounds.maxX + Math.max(1, (activeBounds.maxX - activeBounds.minX) * 0.08),
      minY: activeBounds.minY - Math.max(1, (activeBounds.maxY - activeBounds.minY) * 0.08),
      maxY: activeBounds.maxY + Math.max(1, (activeBounds.maxY - activeBounds.minY) * 0.08),
      minZ: activeBounds.minZ - Math.max(1, (activeBounds.maxZ - activeBounds.minZ) * 0.08),
      maxZ: activeBounds.maxZ + Math.max(1, (activeBounds.maxZ - activeBounds.minZ) * 0.08)
    };
    lastBounds = paddedBounds;

    controls.enableZoom = payload.wheelZoomEnabled !== false;

    if (showGround) {
      dynamicRoot.add(createGroundPlane(paddedBounds, theme.background));
    }
    if (showGrid) {
      dynamicRoot.add(createGrid(paddedBounds, theme));
    }
    if (showAxes) {
      dynamicRoot.add(createAxes(paddedBounds, theme));
    }

    monotonicIntervals.forEach((interval) => {
      const color = interval.type === 'increase' ? '#10b981' : '#f97316';
      dynamicRoot.add(createMonotonicBand(interval, paddedBounds, { color }));
    });

    functionDataList.forEach((item) => {
      const data = item.data || {};
      if (data.kind === 'curve' || data.kind === 'polar-curve' || data.kind === 'implicit-line') {
        const segments = splitContinuousSegments(data.points || [], paddedBounds);
        const group = new THREE.Group();
        addSegmentsToGroup(group, segments, (segment) => createThickLine(segment, {
          color: item.color,
          opacity: item.id === activeFunctionId ? 1 : 0.82,
          linewidth: item.id === activeFunctionId ? 4.6 : 3
        }));
        dynamicRoot.add(group);

        if (item.id === activeFunctionId && data.kind === 'curve') {
          const ribbonGroup = new THREE.Group();
          addSegmentsToGroup(ribbonGroup, segments, (segment) => createRibbon(segment, {
            color: item.color,
            opacity: 0.18
          }));
          addSegmentsToGroup(ribbonGroup, segments, (segment) => createProjectionLine(segment, {
            color: item.color,
            opacity: 0.32
          }));
          dynamicRoot.add(ribbonGroup);
        }
        return;
      }

      if (data.kind === 'surface' || data.kind === 'plane') {
        const opacity = item.id === activeFunctionId ? 0.5 : 0.28;
        const surface = createSurfaceMesh(data.grid, {
          color: item.color,
          opacity
        });
        if (surface) dynamicRoot.add(surface);

        const wireframe = createSurfaceWireframe(data.grid, {
          color: item.color,
          opacity: item.id === activeFunctionId ? 0.35 : 0.24,
          stride: data.kind === 'plane' ? 4 : 3
        });
        if (wireframe) dynamicRoot.add(wireframe);
        return;
      }

      if (data.kind === 'implicit-surface') {
        const implicitSurface = createImplicitSurfaceGroup(data.implicitField, {
          color: item.color,
          opacity: item.id === activeFunctionId ? 0.52 : 0.3
        });
        if (implicitSurface) dynamicRoot.add(implicitSurface);
      }
    });

    visibleLayers.forEach((item) => {
      const data = item.data || {};
      if (data.kind !== 'curve') return;
      const segments = splitContinuousSegments(data.points || [], paddedBounds);
      const group = new THREE.Group();
      addSegmentsToGroup(group, segments, (segment) => createDashedLine(segment, {
        color: item.color,
        opacity: item.id === activeLayerId ? 0.92 : 0.64,
        dashSize: item.id === activeLayerId ? 0.42 : 0.3,
        gapSize: 0.18
      }));
      dynamicRoot.add(group);
    });

    if (pointTrace.length >= 2) {
      const segments = splitContinuousSegments(pointTrace, paddedBounds);
      addSegmentsToGroup(dynamicRoot, segments, (segment) => createThickLine(segment, {
        color: '#b96f3e',
        opacity: 0.95,
        linewidth: 3.3
      }));

      const lastPoint = pointTrace[pointTrace.length - 1];
      if (lastPoint && [lastPoint.x, lastPoint.y, lastPoint.z].every((value) => Number.isFinite(value))) {
        dynamicRoot.add(createSphere(new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z), {
          color: '#b96f3e',
          radius: 0.17
        }));
      }
    }

    if (showFeatures && featureSnapshot) {
      featureSnapshot.horizontalLines?.forEach((line) => {
        if (!Number.isFinite(line.y)) return;
        const guide = createHorizontalGuide(
          line.y,
          paddedBounds,
          line.kind === 'directrix' ? '#f59e0b' : '#8e44ad',
          true
        );
        if (guide) dynamicRoot.add(guide);
      });

      featureSnapshot.verticalLines?.forEach((line) => {
        if (!Number.isFinite(line.x)) return;
        const guide = createVerticalGuide(line.x, paddedBounds, '#8e44ad', true);
        if (guide) dynamicRoot.add(guide);
      });

      const vertex = featureSnapshot.points?.vertex;
      if (vertex && Number.isFinite(vertex.x) && Number.isFinite(vertex.y)) {
        dynamicRoot.add(createSphere(new THREE.Vector3(vertex.x, 0, vertex.y), {
          color: '#3498db',
          radius: 0.17
        }));
      }

      const focus = featureSnapshot.points?.focus;
      if (focus && Number.isFinite(focus.x) && Number.isFinite(focus.y)) {
        dynamicRoot.add(createSphere(new THREE.Vector3(focus.x, 0, focus.y), {
          color: '#e74c3c',
          radius: 0.17
        }));
      }

      featureSnapshot.markers?.forEach((marker) => {
        if (!Number.isFinite(marker?.x) || !Number.isFinite(marker?.y)) return;
        dynamicRoot.add(createSphere(new THREE.Vector3(marker.x, marker.depth ?? 0, marker.y), {
          color: marker.color || '#60a5fa',
          radius: marker.radius || 0.15,
          opacity: marker.opacity ?? 1
        }));
      });
    }

    updateSize();
    if (options.resetCamera || !hasFittedCamera) {
      fitCameraToBounds(paddedBounds);
    }
  };

  const zoom = (factor = 1) => {
    if (disposed || !Number.isFinite(factor) || factor <= 0) return;
    const direction = new THREE.Vector3().subVectors(camera.position, controls.target);
    const next = direction.multiplyScalar(factor);
    const nextDistance = next.length();
    if (nextDistance < controls.minDistance || nextDistance > controls.maxDistance) return;
    camera.position.copy(controls.target).add(next);
    controls.update();
  };

  const pan = (direction = 'right') => {
    if (disposed) return;
    const step = Math.max(0.4, (lastBounds.maxX - lastBounds.minX) * 0.12);
    const delta = direction === 'left' ? -step : step;
    camera.position.x += delta;
    controls.target.x += delta;
    controls.update();
  };

  const setWheelZoomEnabled = (enabled) => {
    controls.enableZoom = !!enabled;
  };

  const getCaptureCanvas = () => (currentMode === 'space' ? renderer.domElement : planarCanvas);

  const dispose = () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver?.disconnect?.();
    window.removeEventListener('resize', updateSize);
    clearGroup(dynamicRoot);
    controls.dispose();
    renderer.dispose();
    if (planarCanvas?.parentNode === container) {
      container.removeChild(planarCanvas);
    }
    if (renderer.domElement?.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  updateSize();
  resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(container);
  window.addEventListener('resize', updateSize);
  renderer.setAnimationLoop(() => {
    if (disposed) return;
    if (currentMode !== 'space') return;
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    render,
    zoom,
    pan,
    setWheelZoomEnabled,
    fitCameraToView: fitCameraToBounds,
    getCaptureCanvas,
    dispose
  };
}

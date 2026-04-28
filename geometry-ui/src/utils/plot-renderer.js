import {
  analyzeLinearEquation,
  buildImplicitExpression,
  classifyPolarExpression,
  compactExpression,
  compileExpression,
  estimateQuadraticCoefficients,
  formatNumber,
  getExpressionVariables,
  inferFunctionFamily,
  normalizeExpression,
  safeEvaluate,
  splitEquation
} from './expression-tools';

export const COLORS = ['#b2523b', '#176b5c', '#2f855a', '#b96f3e', '#7a6a4f', '#2c7a6b', '#c9893b', '#34434a'];
export const TRACE_COLOR = '#b96f3e';
export const INCREASE_COLOR = 'rgba(46, 204, 113, 0.16)';
export const DECREASE_COLOR = 'rgba(231, 76, 60, 0.16)';

export const defaultView = () => ({
  minX: -10,
  maxX: 10,
  minY: -10,
  maxY: 10,
  isUserControlled: false
});

export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function toCanvasX(x, width, state) {
  return ((x - state.minX) / (state.maxX - state.minX)) * width;
}

export function toCanvasY(y, height, state) {
  return height - ((y - state.minY) / (state.maxY - state.minY)) * height;
}

export function toMathX(px, width, state) {
  return state.minX + (px / width) * (state.maxX - state.minX);
}

export function toMathY(py, height, state) {
  return state.maxY - (py / height) * (state.maxY - state.minY);
}

export function cloneViewState(view) {
  return {
    minX: view.minX,
    maxX: view.maxX,
    minY: view.minY,
    maxY: view.maxY,
    isUserControlled: !!view.isUserControlled
  };
}

function createEmptySpaceBounds() {
  return {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity
  };
}

function updateSpaceBounds(bounds, x, y, z) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxY = Math.max(bounds.maxY, y);
  bounds.minZ = Math.min(bounds.minZ, z);
  bounds.maxZ = Math.max(bounds.maxZ, z);
}

function projectBoundsForView(spaceBounds, mode = 'xz') {
  if (mode === 'xy') {
    return {
      minX: spaceBounds.minX,
      maxX: spaceBounds.maxX,
      minY: spaceBounds.minY,
      maxY: spaceBounds.maxY
    };
  }
  return {
    minX: spaceBounds.minX,
    maxX: spaceBounds.maxX,
    minY: spaceBounds.minZ,
    maxY: spaceBounds.maxZ
  };
}

function createGraphResult({
  kind,
  normalized,
  error = '',
  points = [],
  grid = null,
  implicitField = null,
  spaceBounds,
  viewMode = 'xz',
  suggestedCoordSystem = null
}) {
  const hasFiniteBounds = spaceBounds
    && [spaceBounds.minX, spaceBounds.maxX, spaceBounds.minY, spaceBounds.maxY, spaceBounds.minZ, spaceBounds.maxZ]
      .every((value) => Number.isFinite(value));

  return {
    kind,
    points,
    grid,
    implicitField,
    bounds: hasFiniteBounds
      ? projectBoundsForView(spaceBounds, viewMode)
      : { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    spaceBounds: hasFiniteBounds ? spaceBounds : createEmptySpaceBounds(),
    normalized,
    error,
    suggestedCoordSystem
  };
}

function createParameterScope(kValue = 1, extraScope = {}) {
  return {
    a: kValue,
    k: kValue,
    ...extraScope
  };
}

function sampleCartesianCurve(expression, { calcMin, calcMax, steps, kValue }) {
  const points = [];
  let compiled;
  try {
    compiled = compileExpression(expression);
  } catch (error) {
    return createGraphResult({
      kind: 'curve',
      normalized: normalizeExpression(expression),
      error: error.message,
      points,
      spaceBounds: createEmptySpaceBounds()
    });
  }

  const spaceBounds = createEmptySpaceBounds();
  const range = calcMax - calcMin;
  const scopeBase = createParameterScope(kValue);

  for (let index = 0; index <= steps; index += 1) {
    const x = calcMin + (index / steps) * range;
    const z = safeEvaluate(compiled, { ...scopeBase, x });
    if (!Number.isFinite(x) || z === null || !Number.isFinite(z)) {
      points.push(null);
      continue;
    }
    const point = { x, y: 0, z };
    points.push(point);
    updateSpaceBounds(spaceBounds, point.x, point.y, point.z);
  }

  return createGraphResult({
    kind: 'curve',
    normalized: compiled.normalized,
    points,
    spaceBounds
  });
}

function samplePolarCurve(expression, { calcMin, calcMax, steps, kValue }) {
  const points = [];
  let compiled;
  try {
    compiled = compileExpression(expression);
  } catch (error) {
    return createGraphResult({
      kind: 'polar-curve',
      normalized: normalizeExpression(expression),
      error: error.message,
      points,
      spaceBounds: createEmptySpaceBounds(),
      viewMode: 'xy'
    });
  }

  const spaceBounds = createEmptySpaceBounds();
  const range = calcMax - calcMin;
  const scopeBase = createParameterScope(kValue);

  for (let index = 0; index <= steps; index += 1) {
    const angleDegrees = calcMin + (index / steps) * range;
    const theta = toRadians(angleDegrees);
    const radius = safeEvaluate(compiled, { ...scopeBase, theta });
    if (radius === null) {
      points.push(null);
      continue;
    }
    const point = {
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
      z: 0
    };
    if (![point.x, point.y].every((value) => Number.isFinite(value))) {
      points.push(null);
      continue;
    }
    points.push(point);
    updateSpaceBounds(spaceBounds, point.x, point.y, point.z);
  }

  return createGraphResult({
    kind: 'polar-curve',
    normalized: compiled.normalized,
    points,
    spaceBounds,
    viewMode: 'xy'
  });
}

function samplePolarSquaredCurve(expression, { calcMin, calcMax, steps, kValue }) {
  let compiled;
  try {
    compiled = compileExpression(expression);
  } catch (error) {
    return createGraphResult({
      kind: 'polar-curve',
      normalized: normalizeExpression(expression),
      error: error.message,
      points: [],
      spaceBounds: createEmptySpaceBounds(),
      viewMode: 'xy'
    });
  }

  const spaceBounds = createEmptySpaceBounds();
  const range = calcMax - calcMin;
  const scopeBase = createParameterScope(kValue);
  const positiveBranch = [];
  const negativeBranch = [];

  const sampleBranchPoint = (radiusSquared, theta, sign) => {
    if (!Number.isFinite(radiusSquared) || radiusSquared < 0) return null;
    const radius = Math.sqrt(radiusSquared) * sign;
    const point = {
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
      z: 0
    };
    if (![point.x, point.y].every((value) => Number.isFinite(value))) return null;
    updateSpaceBounds(spaceBounds, point.x, point.y, point.z);
    return point;
  };

  for (let index = 0; index <= steps; index += 1) {
    const angleDegrees = calcMin + (index / steps) * range;
    const theta = toRadians(angleDegrees);
    const radiusSquared = safeEvaluate(compiled, { ...scopeBase, theta });

    positiveBranch.push(sampleBranchPoint(radiusSquared, theta, 1));
    negativeBranch.push(sampleBranchPoint(radiusSquared, theta, -1));
  }

  return createGraphResult({
    kind: 'polar-curve',
    normalized: `r^2 = ${compiled.normalized}`,
    points: [...positiveBranch, null, ...negativeBranch],
    spaceBounds,
    viewMode: 'xy'
  });
}

function sampleImplicitLine(expression, { calcMin, calcMax, kValue }) {
  const linearEquation = analyzeLinearEquation(expression, createParameterScope(kValue));
  if (!linearEquation) return null;

  const { x: coefficientX, y: coefficientY, z: coefficientZ } = linearEquation.coefficients;
  const epsilon = 1e-8;
  if (Math.abs(coefficientZ) > epsilon) return null;
  if (Math.abs(coefficientX) < epsilon && Math.abs(coefficientY) < epsilon) return null;

  const xIntercept = Math.abs(coefficientX) > epsilon ? linearEquation.constant / coefficientX : null;
  const yIntercept = Math.abs(coefficientY) > epsilon ? linearEquation.constant / coefficientY : null;
  const halfSpan = Math.max(
    Math.abs(calcMin),
    Math.abs(calcMax),
    Number.isFinite(xIntercept) ? Math.abs(xIntercept) * 1.15 : 0,
    Number.isFinite(yIntercept) ? Math.abs(yIntercept) * 1.15 : 0,
    6
  );
  const clipBox = {
    minX: -halfSpan,
    maxX: halfSpan,
    minY: -halfSpan,
    maxY: halfSpan
  };
  const intersections = [];

  const addIntersection = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < clipBox.minX - 1e-6 || x > clipBox.maxX + 1e-6) return;
    if (y < clipBox.minY - 1e-6 || y > clipBox.maxY + 1e-6) return;

    const point = {
      x: Math.max(clipBox.minX, Math.min(clipBox.maxX, x)),
      y: Math.max(clipBox.minY, Math.min(clipBox.maxY, y))
    };
    const duplicate = intersections.some((candidate) => (
      Math.hypot(candidate.x - point.x, candidate.y - point.y) <= 1e-6
    ));
    if (!duplicate) {
      intersections.push(point);
    }
  };

  if (Math.abs(coefficientY) > epsilon) {
    addIntersection(clipBox.minX, (linearEquation.constant - coefficientX * clipBox.minX) / coefficientY);
    addIntersection(clipBox.maxX, (linearEquation.constant - coefficientX * clipBox.maxX) / coefficientY);
  }

  if (Math.abs(coefficientX) > epsilon) {
    addIntersection((linearEquation.constant - coefficientY * clipBox.minY) / coefficientX, clipBox.minY);
    addIntersection((linearEquation.constant - coefficientY * clipBox.maxY) / coefficientX, clipBox.maxY);
  }

  if (intersections.length < 2) {
    if (Math.abs(coefficientY) < epsilon && Math.abs(coefficientX) > epsilon) {
      const x = linearEquation.constant / coefficientX;
      addIntersection(x, clipBox.minY);
      addIntersection(x, clipBox.maxY);
    } else if (Math.abs(coefficientX) < epsilon && Math.abs(coefficientY) > epsilon) {
      const y = linearEquation.constant / coefficientY;
      addIntersection(clipBox.minX, y);
      addIntersection(clipBox.maxX, y);
    }
  }

  if (intersections.length < 2) return null;

  const primaryAxis = Math.abs(coefficientX) > Math.abs(coefficientY) ? 'y' : 'x';
  const secondaryAxis = primaryAxis === 'x' ? 'y' : 'x';
  const sortedPoints = [...intersections].sort((left, right) => (
    left[primaryAxis] - right[primaryAxis]
    || left[secondaryAxis] - right[secondaryAxis]
  ));
  const segment = [sortedPoints[0], sortedPoints[sortedPoints.length - 1]];
  const points = segment.map((point) => ({ x: point.x, y: 0, z: point.y }));
  const spaceBounds = createEmptySpaceBounds();
  points.forEach((point) => updateSpaceBounds(spaceBounds, point.x, point.y, point.z));

  return createGraphResult({
    kind: 'implicit-line',
    normalized: linearEquation.normalized,
    points,
    spaceBounds
  });
}

function sampleImplicitCurve(expression, { calcMin, calcMax, steps, kValue }) {
  let compiled;
  try {
    compiled = compileExpression(buildImplicitExpression(expression));
  } catch (error) {
    return createGraphResult({
      kind: 'implicit-curve',
      normalized: normalizeExpression(expression),
      error: error.message,
      points: [],
      spaceBounds: createEmptySpaceBounds()
    });
  }

  const resolution = Math.max(36, Math.min(140, Math.round(Math.sqrt(Math.max(steps, 400)) * 2.4)));
  const cellCount = Math.max(2, resolution - 1);
  const span = calcMax - calcMin;
  const scopeBase = createParameterScope(kValue);
  const values = Array.from({ length: resolution }, () => new Array(resolution).fill(Number.NaN));
  const points = [];
  const spaceBounds = createEmptySpaceBounds();
  const zeroTolerance = 1e-5;

  for (let row = 0; row < resolution; row += 1) {
    const y = calcMin + (row / cellCount) * span;
    for (let col = 0; col < resolution; col += 1) {
      const x = calcMin + (col / cellCount) * span;
      const value = safeEvaluate(compiled, { ...scopeBase, x, y });
      values[row][col] = Number.isFinite(value) ? value : Number.NaN;
    }
  }

  const interpolatePoint = (pointA, pointB, valueA, valueB) => {
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) return null;
    if (Math.abs(valueA) <= zeroTolerance && Math.abs(valueB) <= zeroTolerance) {
      return {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2
      };
    }
    if (Math.abs(valueA) <= zeroTolerance) return pointA;
    if (Math.abs(valueB) <= zeroTolerance) return pointB;
    if ((valueA < 0 && valueB < 0) || (valueA > 0 && valueB > 0)) return null;
    const ratio = valueA / (valueA - valueB);
    if (!Number.isFinite(ratio)) return null;
    return {
      x: pointA.x + (pointB.x - pointA.x) * ratio,
      y: pointA.y + (pointB.y - pointA.y) * ratio
    };
  };

  const pushSegment = (pointA, pointB) => {
    if (!pointA || !pointB) return;
    if (![pointA.x, pointA.y, pointB.x, pointB.y].every((value) => Number.isFinite(value))) return;
    const segmentStart = { x: pointA.x, y: 0, z: pointA.y };
    const segmentEnd = { x: pointB.x, y: 0, z: pointB.y };
    points.push(segmentStart, segmentEnd, null);
    updateSpaceBounds(spaceBounds, segmentStart.x, segmentStart.y, segmentStart.z);
    updateSpaceBounds(spaceBounds, segmentEnd.x, segmentEnd.y, segmentEnd.z);
  };

  for (let row = 0; row < cellCount; row += 1) {
    const y0 = calcMin + (row / cellCount) * span;
    const y1 = calcMin + ((row + 1) / cellCount) * span;
    for (let col = 0; col < cellCount; col += 1) {
      const x0 = calcMin + (col / cellCount) * span;
      const x1 = calcMin + ((col + 1) / cellCount) * span;

      const topLeft = { x: x0, y: y0 };
      const topRight = { x: x1, y: y0 };
      const bottomRight = { x: x1, y: y1 };
      const bottomLeft = { x: x0, y: y1 };

      const vTopLeft = values[row][col];
      const vTopRight = values[row][col + 1];
      const vBottomRight = values[row + 1][col + 1];
      const vBottomLeft = values[row + 1][col];

      const intersections = [
        interpolatePoint(topLeft, topRight, vTopLeft, vTopRight),
        interpolatePoint(topRight, bottomRight, vTopRight, vBottomRight),
        interpolatePoint(bottomRight, bottomLeft, vBottomRight, vBottomLeft),
        interpolatePoint(bottomLeft, topLeft, vBottomLeft, vTopLeft)
      ].filter(Boolean);

      if (intersections.length < 2) continue;
      if (intersections.length === 2) {
        pushSegment(intersections[0], intersections[1]);
        continue;
      }

      if (intersections.length >= 4) {
        pushSegment(intersections[0], intersections[1]);
        pushSegment(intersections[2], intersections[3]);
      }
    }
  }

  return createGraphResult({
    kind: 'implicit-curve',
    normalized: normalizeExpression(expression),
    points,
    spaceBounds
  });
}

function sampleExplicitSurface(expression, { calcMin, calcMax, steps, kValue }) {
  let compiled;
  try {
    compiled = compileExpression(expression);
  } catch (error) {
    return createGraphResult({
      kind: 'surface',
      normalized: normalizeExpression(expression),
      error: error.message,
      grid: { rows: 0, cols: 0, points: [] },
      spaceBounds: createEmptySpaceBounds()
    });
  }

  const gridSteps = Math.max(20, Math.min(72, Math.round(Math.sqrt(Math.max(steps, 64)) * 1.7)));
  const cols = gridSteps + 1;
  const rows = gridSteps + 1;
  const points = [];
  const range = calcMax - calcMin;
  const scopeBase = createParameterScope(kValue);
  const spaceBounds = createEmptySpaceBounds();

  for (let row = 0; row < rows; row += 1) {
    const y = calcMin + (row / gridSteps) * range;
    for (let col = 0; col < cols; col += 1) {
      const x = calcMin + (col / gridSteps) * range;
      const z = safeEvaluate(compiled, { ...scopeBase, x, y });
      if (z === null || !Number.isFinite(z)) {
        points.push(null);
        continue;
      }
      const point = { x, y, z };
      points.push(point);
      updateSpaceBounds(spaceBounds, point.x, point.y, point.z);
    }
  }

  return createGraphResult({
    kind: 'surface',
    normalized: compiled.normalized,
    grid: { rows, cols, points },
    spaceBounds
  });
}

function createFiniteSpaceBounds(bounds, fallback) {
  const hasFiniteBounds = bounds
    && [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, bounds.minZ, bounds.maxZ]
      .every((value) => Number.isFinite(value));

  if (hasFiniteBounds) {
    return bounds;
  }

  return { ...fallback };
}

function expandSpaceBounds(bounds, padding) {
  return {
    minX: bounds.minX - padding,
    maxX: bounds.maxX + padding,
    minY: bounds.minY - padding,
    maxY: bounds.maxY + padding,
    minZ: bounds.minZ - padding,
    maxZ: bounds.maxZ + padding
  };
}

function sampleImplicitSurface(expression, { calcMin, calcMax, steps, kValue }) {
  let compiled;
  try {
    compiled = compileExpression(buildImplicitExpression(expression));
  } catch (error) {
    return createGraphResult({
      kind: 'implicit',
      normalized: normalizeExpression(expression),
      error: error.message,
      implicitField: null,
      spaceBounds: createEmptySpaceBounds()
    });
  }

  const resolution = Math.max(18, Math.min(34, Math.round(Math.sqrt(Math.max(steps, 400)))));
  const sampleBounds = {
    minX: calcMin,
    maxX: calcMax,
    minY: calcMin,
    maxY: calcMax,
    minZ: calcMin,
    maxZ: calcMax
  };
  const span = calcMax - calcMin;
  const divisor = Math.max(1, resolution - 1);
  const step = span / divisor;
  const values = new Array(resolution * resolution * resolution).fill(Number.NaN);
  const scopeBase = createParameterScope(kValue);

  let minValue = Infinity;
  let maxValue = -Infinity;
  let finiteCount = 0;

  for (let zIndex = 0; zIndex < resolution; zIndex += 1) {
    const z = sampleBounds.minZ + (zIndex / divisor) * span;
    for (let yIndex = 0; yIndex < resolution; yIndex += 1) {
      const y = sampleBounds.minY + (yIndex / divisor) * span;
      for (let xIndex = 0; xIndex < resolution; xIndex += 1) {
        const x = sampleBounds.minX + (xIndex / divisor) * span;
        const value = safeEvaluate(compiled, { ...scopeBase, x, y, z });
        const linearIndex = zIndex * resolution * resolution + yIndex * resolution + xIndex;
        if (!Number.isFinite(value)) continue;
        values[linearIndex] = value;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
        finiteCount += 1;
      }
    }
  }

  if (!finiteCount) {
    return createGraphResult({
      kind: 'implicit',
      normalized: normalizeExpression(expression),
      error: '隐式方程在当前采样范围内没有得到有效数值',
      implicitField: null,
      spaceBounds: createEmptySpaceBounds()
    });
  }

  const surfaceBounds = createEmptySpaceBounds();
  const hasIsoSurface = minValue <= 0 && maxValue >= 0;
  const zeroThreshold = Math.max(1e-4, (maxValue - minValue) * 0.015);
  const indexOf = (xIndex, yIndex, zIndex) => zIndex * resolution * resolution + yIndex * resolution + xIndex;
  const coordinateOf = (xIndex, yIndex, zIndex) => ({
    x: sampleBounds.minX + (xIndex / divisor) * span,
    y: sampleBounds.minY + (yIndex / divisor) * span,
    z: sampleBounds.minZ + (zIndex / divisor) * span
  });
  const touchesIso = (valueA, valueB) => {
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) return false;
    if (Math.abs(valueA) <= zeroThreshold || Math.abs(valueB) <= zeroThreshold) return true;
    return (valueA < 0 && valueB > 0) || (valueA > 0 && valueB < 0);
  };

  if (hasIsoSurface) {
    for (let zIndex = 0; zIndex < resolution - 1; zIndex += 1) {
      for (let yIndex = 0; yIndex < resolution - 1; yIndex += 1) {
        for (let xIndex = 0; xIndex < resolution - 1; xIndex += 1) {
          const current = values[indexOf(xIndex, yIndex, zIndex)];
          if (!Number.isFinite(current)) continue;

          const xNeighbor = values[indexOf(xIndex + 1, yIndex, zIndex)];
          const yNeighbor = values[indexOf(xIndex, yIndex + 1, zIndex)];
          const zNeighbor = values[indexOf(xIndex, yIndex, zIndex + 1)];

          if (!touchesIso(current, xNeighbor) && !touchesIso(current, yNeighbor) && !touchesIso(current, zNeighbor)) {
            continue;
          }

          const a = coordinateOf(xIndex, yIndex, zIndex);
          const b = coordinateOf(xIndex + 1, yIndex + 1, zIndex + 1);
          updateSpaceBounds(surfaceBounds, a.x, a.y, a.z);
          updateSpaceBounds(surfaceBounds, b.x, b.y, b.z);
        }
      }
    }
  }

  const effectiveBounds = createFiniteSpaceBounds(
    Number.isFinite(surfaceBounds.minX)
      ? expandSpaceBounds(surfaceBounds, Math.max(step * 1.5, 0.45))
      : null,
    sampleBounds
  );

  return createGraphResult({
    kind: hasIsoSurface ? 'implicit-surface' : 'implicit',
    normalized: normalizeExpression(expression),
    error: hasIsoSurface ? '' : '当前采样范围内没有找到等值面，请尝试放大范围或调整表达式',
    implicitField: {
      resolution,
      values,
      isoLevel: 0,
      minValue,
      maxValue,
      bounds: sampleBounds
    },
    spaceBounds: effectiveBounds
  });
}

function buildPlanePatch(linearEquation, span, steps = 28) {
  const normal = linearEquation.coefficients;
  const normalLength = Math.hypot(normal.x, normal.y, normal.z);
  if (normalLength < 1e-8) return null;

  const unitNormal = {
    x: normal.x / normalLength,
    y: normal.y / normalLength,
    z: normal.z / normalLength
  };
  const centerScale = linearEquation.constant / (normalLength * normalLength);
  const center = {
    x: unitNormal.x * centerScale * normalLength,
    y: unitNormal.y * centerScale * normalLength,
    z: unitNormal.z * centerScale * normalLength
  };

  const reference = Math.abs(unitNormal.z) < 0.92
    ? { x: 0, y: 0, z: 1 }
    : { x: 0, y: 1, z: 0 };

  const tangentU = {
    x: unitNormal.y * reference.z - unitNormal.z * reference.y,
    y: unitNormal.z * reference.x - unitNormal.x * reference.z,
    z: unitNormal.x * reference.y - unitNormal.y * reference.x
  };
  const tangentULength = Math.hypot(tangentU.x, tangentU.y, tangentU.z);
  if (tangentULength < 1e-8) return null;
  tangentU.x /= tangentULength;
  tangentU.y /= tangentULength;
  tangentU.z /= tangentULength;

  const tangentV = {
    x: unitNormal.y * tangentU.z - unitNormal.z * tangentU.y,
    y: unitNormal.z * tangentU.x - unitNormal.x * tangentU.z,
    z: unitNormal.x * tangentU.y - unitNormal.y * tangentU.x
  };

  const cols = steps + 1;
  const rows = steps + 1;
  const points = [];
  const spaceBounds = createEmptySpaceBounds();

  for (let row = 0; row < rows; row += 1) {
    const v = ((row / steps) - 0.5) * 2 * span;
    for (let col = 0; col < cols; col += 1) {
      const u = ((col / steps) - 0.5) * 2 * span;
      const point = {
        x: center.x + tangentU.x * u + tangentV.x * v,
        y: center.y + tangentU.y * u + tangentV.y * v,
        z: center.z + tangentU.z * u + tangentV.z * v
      };
      points.push(point);
      updateSpaceBounds(spaceBounds, point.x, point.y, point.z);
    }
  }

  return {
    rows,
    cols,
    points,
    spaceBounds
  };
}

function sampleImplicitPlane(expression, { calcMin, calcMax, steps, kValue }) {
  const linearEquation = analyzeLinearEquation(expression, createParameterScope(kValue));
  if (!linearEquation) {
    return createGraphResult({
      kind: 'implicit',
      normalized: normalizeExpression(expression),
      error: '当前仅支持线性隐式方程，例如 x+y=a 或 x+y+z=10',
      grid: { rows: 0, cols: 0, points: [] },
      spaceBounds: createEmptySpaceBounds()
    });
  }

  const intercepts = Object.values(linearEquation.coefficients)
    .map((coefficient) => Math.abs(coefficient) > 1e-8 ? Math.abs(linearEquation.constant / coefficient) : 0)
    .filter((value) => Number.isFinite(value) && value > 0);
  const baseSpan = Math.max(
    Math.abs(calcMax - calcMin) * 0.7,
    intercepts.length ? Math.max(...intercepts) * 0.75 : 0,
    8
  );
  const patch = buildPlanePatch(linearEquation, baseSpan, Math.max(16, Math.min(36, Math.round(Math.sqrt(steps) * 0.8))));
  if (!patch) {
    return createGraphResult({
      kind: 'implicit',
      normalized: linearEquation.normalized,
      error: '隐式平面生成失败',
      grid: { rows: 0, cols: 0, points: [] },
      spaceBounds: createEmptySpaceBounds()
    });
  }

  return createGraphResult({
    kind: 'plane',
    normalized: linearEquation.normalized,
    grid: { rows: patch.rows, cols: patch.cols, points: patch.points },
    spaceBounds: patch.spaceBounds
  });
}

function createUnsupportedModeResult(expression, message, suggestedCoordSystem = null) {
  return createGraphResult({
    kind: 'curve',
    normalized: normalizeExpression(expression),
    error: message,
    points: [],
    spaceBounds: createEmptySpaceBounds(),
    suggestedCoordSystem
  });
}

function samplePlanarCartesian(expression, options) {
  {
    const parsedEquation = splitEquation(expression);
    if (parsedEquation) {
      const leftCompact = parsedEquation.left.replace(/\s+/g, '').toLowerCase();
      if (leftCompact !== 'y') {
        const implicitLine = sampleImplicitLine(expression, options);
        if (implicitLine) {
          return implicitLine;
        }
        return sampleImplicitCurve(expression, options);
      }
      return sampleCartesianCurve(parsedEquation.right, options);
    }

    const planarVariables = getExpressionVariables(expression).filter((item) => !['x', 'a', 'k'].includes(item));
    if (planarVariables.length) {
      return createUnsupportedModeResult(expression, '二维直角坐标模式目前只支持关于 x 的单变量函数。');
    }

    return sampleCartesianCurve(expression, options);
  }

  const equation = splitEquation(expression);
  if (equation) {
    const leftCompact = equation.left.replace(/\s+/g, '').toLowerCase();
    if (leftCompact !== 'y') {
      const implicitLine = sampleImplicitLine(expression, options);
      if (implicitLine) {
        return implicitLine;
      }
      return createUnsupportedModeResult(expression, '二维直角坐标仅支持 y = f(x) 或线性隐式方程');
    }
    return sampleCartesianCurve(equation.right, options);
  }

  const variables = getExpressionVariables(expression).filter((item) => !['x', 'a', 'k'].includes(item));
  if (variables.length) {
    return createUnsupportedModeResult(expression, '二维直角坐标仅支持关于 x 的函数');
  }

  return sampleCartesianCurve(expression, options);
}

function samplePlanarPolar(expression, options) {
  {
    const polarExpression = classifyPolarExpression(expression);
    if (polarExpression.kind === 'radius') {
      return samplePolarCurve(polarExpression.expression, options);
    }
    if (polarExpression.kind === 'radius-squared') {
      return samplePolarSquaredCurve(polarExpression.expression, options);
    }
    if (polarExpression.kind === 'expression') {
      return samplePolarCurve(polarExpression.expression, options);
    }
    return createUnsupportedModeResult(
      expression,
      '极坐标模式仅支持 r = f(theta) 或 r^2 = f(theta)，该表达式将切换到直角坐标显示。',
      polarExpression.suggestedCoordSystem || 'cartesian'
    );
  }

  const equation = splitEquation(expression);
  if (equation) {
    const leftCompact = equation.left.replace(/\s+/g, '').toLowerCase();
    if (leftCompact !== 'r') {
      return createUnsupportedModeResult(expression, '二维极坐标仅支持 r = f(theta) 形式');
    }
    return samplePolarCurve(equation.right, options);
  }

  const variables = getExpressionVariables(expression).filter((item) => !['theta', 'a', 'k'].includes(item));
  if (variables.length) {
    return createUnsupportedModeResult(expression, '二维极坐标仅支持关于 theta 的函数');
  }

  return samplePolarCurve(expression, options);
}

export function collectFunctionData({
  expression,
  coordSystem = 'cartesian',
  isPolar = false,
  calcMin,
  calcMax,
  steps,
  kValue = 1
}) {
  const resolvedCoordSystem = coordSystem || (isPolar ? 'polar' : 'cartesian');
  if (resolvedCoordSystem === 'polar') {
    return samplePlanarPolar(expression, { calcMin, calcMax, steps, kValue });
  }

  if (resolvedCoordSystem !== 'space') {
    return samplePlanarCartesian(expression, { calcMin, calcMax, steps, kValue });
  }

  const equation = splitEquation(expression);
  if (equation) {
    const leftCompact = equation.left.replace(/\s+/g, '').toLowerCase();
    if (leftCompact === 'y') {
      return sampleCartesianCurve(equation.right, { calcMin, calcMax, steps, kValue });
    }
    if (leftCompact === 'z') {
      return sampleExplicitSurface(equation.right, { calcMin, calcMax, steps, kValue });
    }
    const plane = sampleImplicitPlane(expression, { calcMin, calcMax, steps, kValue });
    if (plane.kind === 'plane') {
      return plane;
    }
    return sampleImplicitSurface(expression, { calcMin, calcMax, steps, kValue });
  }

  const variables = getExpressionVariables(expression);
  if (variables.includes('z')) {
    return sampleImplicitSurface(expression, { calcMin, calcMax, steps, kValue });
  }
  if (variables.includes('y')) {
    return sampleExplicitSurface(expression, { calcMin, calcMax, steps, kValue });
  }

  return sampleCartesianCurve(expression, { calcMin, calcMax, steps, kValue });
}

export function computeAutoView(functionDataList, { coordSystem = 'cartesian', isPolar = false, fallback = defaultView() } = {}) {
  const resolvedCoordSystem = coordSystem || (isPolar ? 'polar' : 'cartesian');
  let globalMinX = Infinity;
  let globalMaxX = -Infinity;
  let globalMinY = Infinity;
  let globalMaxY = -Infinity;

  functionDataList.forEach((data) => {
    if (!data || !data.bounds) return;
    const { minX, maxX, minY, maxY } = data.bounds;
    if ([minX, maxX, minY, maxY].some((value) => !Number.isFinite(value))) return;
    globalMinX = Math.min(globalMinX, minX);
    globalMaxX = Math.max(globalMaxX, maxX);
    globalMinY = Math.min(globalMinY, minY);
    globalMaxY = Math.max(globalMaxY, maxY);
  });

  if (!Number.isFinite(globalMinX)) {
    return cloneViewState(fallback);
  }

  if (globalMinX === globalMaxX) {
    globalMinX -= 1;
    globalMaxX += 1;
  }
  if (globalMinY === globalMaxY) {
    globalMinY -= 1;
    globalMaxY += 1;
  }

  if (resolvedCoordSystem === 'polar') {
    const maxRange = Math.max(globalMaxX - globalMinX, globalMaxY - globalMinY) * 0.7;
    const finalRange = maxRange < 3 ? 10 : maxRange;
    return {
      minX: -finalRange,
      maxX: finalRange,
      minY: -finalRange,
      maxY: finalRange,
      isUserControlled: false
    };
  }

  const xPadding = Math.max(1, (globalMaxX - globalMinX) * 0.08);
  const yPadding = Math.max(1, (globalMaxY - globalMinY) * 0.12);
  return {
    minX: globalMinX - xPadding,
    maxX: globalMaxX + xPadding,
    minY: globalMinY - yPadding,
    maxY: globalMaxY + yPadding,
    isUserControlled: false
  };
}

export function getNiceStep(range) {
  const rawStep = range / 10;
  if (rawStep === 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
  const residual = rawStep / magnitude;
  if (residual <= 1) return magnitude;
  if (residual <= 2) return 2 * magnitude;
  if (residual <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function readThemeColor(variableName, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
}

export function getCanvasTheme() {
  return {
    background: readThemeColor('--canvas-bg', '#ffffff'),
    grid: readThemeColor('--canvas-grid', '#ecf0f1'),
    axis: readThemeColor('--canvas-axis', '#2d3436'),
    text: readThemeColor('--canvas-text', '#2d3436'),
    meta: readThemeColor('--canvas-meta', '#0f172a'),
    increaseLabel: readThemeColor('--success-text', '#1e8449'),
    decreaseLabel: readThemeColor('--danger-text', '#c0392b')
  };
}

export function drawCoordinateSystem(ctx, width, height, view, options = {}) {
  const fontSize = options.fontSize || 12;
  const showLabels = options.showLabels !== false;

  const tX = (value) => toCanvasX(value, width, view);
  const tY = (value) => toCanvasY(value, height, view);

  const theme = getCanvasTheme();

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  const stepX = getNiceStep(view.maxX - view.minX);
  const stepY = getNiceStep(view.maxY - view.minY);

  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  let startX = Math.ceil(view.minX / stepX) * stepX;
  for (let x = startX; x <= view.maxX + stepX / 2; x += stepX) {
    ctx.beginPath();
    ctx.moveTo(tX(x), 0);
    ctx.lineTo(tX(x), height);
    ctx.stroke();
  }
  let startY = Math.ceil(view.minY / stepY) * stepY;
  for (let y = startY; y <= view.maxY + stepY / 2; y += stepY) {
    ctx.beginPath();
    ctx.moveTo(0, tY(y));
    ctx.lineTo(width, tY(y));
    ctx.stroke();
  }

  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.fillStyle = theme.text;
  ctx.font = `${fontSize}px Segoe UI`;

  const xZero = tX(0);
  const yZero = tY(0);
  const axisYPos = yZero >= 0 && yZero <= height ? yZero : height;
  const axisXPos = xZero >= 0 && xZero <= width ? xZero : 0;

  ctx.beginPath();
  ctx.moveTo(0, axisYPos);
  ctx.lineTo(width, axisYPos);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(axisXPos, 0);
  ctx.lineTo(axisXPos, height);
  ctx.stroke();

  if (!showLabels) return;

  for (let x = startX; x <= view.maxX + stepX / 2; x += stepX) {
    if (Math.abs(x) < stepX * 0.001) continue;
    const cx = tX(x);
    if (cx < -40 || cx > width + 40) continue;
    ctx.beginPath();
    ctx.moveTo(cx, axisYPos - 4);
    ctx.lineTo(cx, axisYPos + 4);
    ctx.stroke();
    ctx.fillText(formatNumber(x), cx - 12, Math.min(height - 6, axisYPos + 18));
  }

  for (let y = startY; y <= view.maxY + stepY / 2; y += stepY) {
    if (Math.abs(y) < stepY * 0.001) continue;
    const cy = tY(y);
    if (cy < -40 || cy > height + 40) continue;
    ctx.beginPath();
    ctx.moveTo(axisXPos - 4, cy);
    ctx.lineTo(axisXPos + 4, cy);
    ctx.stroke();
    ctx.fillText(formatNumber(y), axisXPos + 6, cy + 4);
  }
}

export function drawPolarCoordinateSystem(ctx, width, height, view, options = {}) {
  const fontSize = options.fontSize || 12;
  const showLabels = options.showLabels !== false;
  const theme = getCanvasTheme();

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  const centerX = toCanvasX(0, width, view);
  const centerY = toCanvasY(0, height, view);
  const maxRadius = Math.max(
    Math.abs(view.minX),
    Math.abs(view.maxX),
    Math.abs(view.minY),
    Math.abs(view.maxY),
    1
  );
  const radiusStep = getNiceStep(maxRadius / 4);

  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;

  for (let radius = radiusStep; radius <= maxRadius + radiusStep / 2; radius += radiusStep) {
    const left = toCanvasX(-radius, width, view);
    const right = toCanvasX(radius, width, view);
    const top = toCanvasY(radius, height, view);
    const bottom = toCanvasY(-radius, height, view);
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      Math.abs(right - left) / 2,
      Math.abs(bottom - top) / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  for (let degrees = 0; degrees < 360; degrees += 30) {
    const radians = toRadians(degrees);
    const x = maxRadius * Math.cos(radians);
    const y = maxRadius * Math.sin(radians);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(toCanvasX(x, width, view), toCanvasY(y, height, view));
    ctx.stroke();
  }

  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, height);
  ctx.stroke();

  if (showLabels) {
    ctx.fillStyle = theme.text;
    ctx.font = `${fontSize}px Segoe UI`;

    for (let radius = radiusStep; radius <= maxRadius + radiusStep / 2; radius += radiusStep) {
      const labelX = toCanvasX(radius, width, view);
      ctx.fillText(formatNumber(radius), labelX + 6, centerY - 6);
    }

    ['0°', '90°', '180°', '270°'].forEach((label, index) => {
      const degrees = index * 90;
      const radians = toRadians(degrees);
      const x = maxRadius * 0.9 * Math.cos(radians);
      const y = maxRadius * 0.9 * Math.sin(radians);
      ctx.fillText(label, toCanvasX(x, width, view) + 4, toCanvasY(y, height, view) - 4);
    });
  }

  ctx.restore();
}

export function drawPolyline(ctx, points, transformX, transformY, style = {}) {
  if (!points?.length) return;
  ctx.save();
  ctx.strokeStyle = style.strokeStyle || '#3498db';
  ctx.lineWidth = style.lineWidth || 2.5;
  if (style.lineDash) ctx.setLineDash(style.lineDash);
  if (style.alpha !== undefined) ctx.globalAlpha = style.alpha;
  ctx.beginPath();
  let started = false;
  points.forEach((point) => {
    if (!point) {
      started = false;
      return;
    }
    const cx = transformX(point.x);
    const cy = transformY(point.y);
    if (!started) {
      ctx.moveTo(cx, cy);
      started = true;
    } else {
      ctx.lineTo(cx, cy);
    }
  });
  ctx.stroke();
  ctx.restore();
}

export function computeMonotonicIntervals({ expression, view, kValue = 1, samples = 360 }) {
  let compiled;
  try {
    compiled = compileExpression(expression);
  } catch (error) {
    return [];
  }

  const xs = [];
  const ys = [];
  const rangeX = view.maxX - view.minX;
  const rangeY = view.maxY - view.minY;
  const jumpThreshold = Math.max(6, rangeY * 1.6);

  for (let index = 0; index <= samples; index += 1) {
    const x = view.minX + (index / samples) * rangeX;
    const y = safeEvaluate(compiled, { x, a: kValue, k: kValue });
    xs.push(x);
    ys.push(y);
  }

  const rawIntervals = [];
  let active = null;
  const epsilon = Math.max(1e-4, rangeY * 0.0005);

  for (let index = 1; index < xs.length; index += 1) {
    const y1 = ys[index - 1];
    const y2 = ys[index];
    if (y1 === null || y2 === null || Math.abs(y2 - y1) > jumpThreshold) {
      if (active) {
        active.endX = xs[index - 1];
        rawIntervals.push(active);
        active = null;
      }
      continue;
    }

    const dy = y2 - y1;
    let type = 'flat';
    if (dy > epsilon) type = 'increase';
    if (dy < -epsilon) type = 'decrease';

    if (type === 'flat') {
      if (active) {
        active.endX = xs[index - 1];
        rawIntervals.push(active);
        active = null;
      }
      continue;
    }

    if (!active || active.type !== type) {
      if (active) {
        active.endX = xs[index - 1];
        rawIntervals.push(active);
      }
      active = { type, startX: xs[index - 1], endX: xs[index], labelX: xs[index] };
    } else {
      active.endX = xs[index];
    }
  }

  if (active) rawIntervals.push(active);

  return rawIntervals
    .filter((interval) => interval.endX - interval.startX > rangeX * 0.04)
    .map((interval) => ({
      ...interval,
      label: interval.type === 'increase' ? '递增' : '递减'
    }));
}

export function drawMonotonicBands(ctx, width, height, view, intervals) {
  const tX = (value) => toCanvasX(value, width, view);
  const theme = getCanvasTheme();
  ctx.save();
  intervals.forEach((interval) => {
    const left = tX(interval.startX);
    const right = tX(interval.endX);
    ctx.fillStyle = interval.type === 'increase' ? INCREASE_COLOR : DECREASE_COLOR;
    ctx.fillRect(left, 0, right - left, height);

    ctx.fillStyle = interval.type === 'increase' ? theme.increaseLabel : theme.decreaseLabel;
    ctx.font = '12px Segoe UI';
    const mid = (left + right) / 2;
    ctx.fillText(interval.label, Math.max(6, mid - 15), 18);
  });
  ctx.restore();
}

function tryDetectReciprocalFeatures(compactExpr, kValue) {
  if (!compactExpr.includes('/')) return null;

  if (/1\/\(x-k\)$/.test(compactExpr) || /k\/\(x-k\)$/.test(compactExpr)) {
    return {
      family: 'shifted-reciprocal',
      verticalAsymptotes: [kValue],
      horizontalAsymptotes: [0],
      description: '竖直渐近线随 k 水平平移。'
    };
  }

  if (/1\/\(x\+k\)$/.test(compactExpr) || /k\/\(x\+k\)$/.test(compactExpr)) {
    return {
      family: 'shifted-reciprocal',
      verticalAsymptotes: [-kValue],
      horizontalAsymptotes: [0],
      description: '竖直渐近线随 k 水平平移。'
    };
  }

  if (/k\/x$/.test(compactExpr) || /1\/x$/.test(compactExpr) || /\)\/x$/.test(compactExpr)) {
    return {
      family: 'reciprocal',
      verticalAsymptotes: [0],
      horizontalAsymptotes: [0],
      description: '双曲线分支会靠近坐标轴，这两条轴就是渐近线。'
    };
  }

  if (/1\/x\+k$/.test(compactExpr)) {
    return {
      family: 'reciprocal',
      verticalAsymptotes: [0],
      horizontalAsymptotes: [kValue],
      description: '水平渐近线随 k 上下平移。'
    };
  }

  return null;
}

export function resolveFeatureSnapshot(expression, kValue = 1) {
  const compact = compactExpression(expression);
  const family = inferFunctionFamily(expression);

  const featureSnapshot = {
    family,
    points: {},
    horizontalLines: [],
    verticalLines: [],
    notes: []
  };

  try {
    const compiled = compileExpression(expression);
    const coefficients = estimateQuadraticCoefficients(compiled, kValue);
    if (coefficients) {
      const { a, b, c } = coefficients;
      const vertexX = -b / (2 * a);
      const vertexY = c - (b * b) / (4 * a);
      const p = 1 / (4 * a);
      featureSnapshot.family = 'quadratic';
      featureSnapshot.points.vertex = { x: vertexX, y: vertexY };
      featureSnapshot.points.focus = { x: vertexX, y: vertexY + p };
      featureSnapshot.horizontalLines.push({ y: vertexY - p, kind: 'directrix', label: `准线 y=${formatNumber(vertexY - p)}` });
      featureSnapshot.notes.push(a > 0 ? '开口向上。' : '开口向下。');
      return featureSnapshot;
    }
  } catch (error) {
    // ignore parsing issues here
  }

  const reciprocal = tryDetectReciprocalFeatures(compact, kValue);
  if (reciprocal) {
    reciprocal.verticalAsymptotes?.forEach((x) => {
      featureSnapshot.verticalLines.push({ x, kind: 'asymptote', label: `x=${formatNumber(x)}` });
    });
    reciprocal.horizontalAsymptotes?.forEach((y) => {
      featureSnapshot.horizontalLines.push({ y, kind: 'asymptote', label: `y=${formatNumber(y)}` });
    });
    featureSnapshot.family = reciprocal.family;
    featureSnapshot.notes.push(reciprocal.description);
    return featureSnapshot;
  }

  if (/sin\(/.test(compact) || /cos\(/.test(compact)) {
    const period = Math.abs(kValue) < 1e-8 ? Infinity : (2 * Math.PI) / Math.abs(kValue);
    if (Number.isFinite(period)) {
      featureSnapshot.notes.push(`当前周期约为 ${formatNumber(period)}。`);
    } else {
      featureSnapshot.notes.push('当 k 趋近于 0 时，周期趋向无穷大。');
    }
  }

  return featureSnapshot;
}

export function createFeatureTraceStore() {
  return {
    vertex: [],
    focus: [],
    directrix: [],
    verticalAsymptotes: [],
    horizontalAsymptotes: []
  };
}

export function recordFeatureSnapshot(traceStore, snapshot) {
  if (snapshot.points?.vertex) {
    traceStore.vertex.push(snapshot.points.vertex);
  }
  if (snapshot.points?.focus) {
    traceStore.focus.push(snapshot.points.focus);
  }
  snapshot.horizontalLines?.forEach((line) => {
    if (line.kind === 'directrix') traceStore.directrix.push(line.y);
    if (line.kind === 'asymptote') traceStore.horizontalAsymptotes.push(line.y);
  });
  snapshot.verticalLines?.forEach((line) => {
    traceStore.verticalAsymptotes.push(line.x);
  });
}

export function drawFeatureOverlay(ctx, width, height, view, snapshot, traceStore, options = {}) {
  const tX = (value) => toCanvasX(value, width, view);
  const tY = (value) => toCanvasY(value, height, view);
  const showHistory = options.showHistory !== false;

  ctx.save();

  if (showHistory) {
    const drawHistory = (points, strokeStyle) => {
      if (!points?.length) return;
      drawPolyline(ctx, points, tX, tY, {
        strokeStyle,
        lineWidth: 1.4,
        lineDash: [5, 5],
        alpha: 0.55
      });
    };

    drawHistory(traceStore.vertex, '#2980b9');
    drawHistory(traceStore.focus, '#c0392b');

    const drawHistoryLines = (values, axis, color) => {
      if (!values?.length) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.globalAlpha = 0.25;
      values.forEach((value) => {
        if (!Number.isFinite(value)) return;
        ctx.beginPath();
        if (axis === 'x') {
          const cx = tX(value);
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, height);
        } else {
          const cy = tY(value);
          ctx.moveTo(0, cy);
          ctx.lineTo(width, cy);
        }
        ctx.stroke();
      });
      ctx.restore();
    };

    drawHistoryLines(traceStore.directrix, 'y', '#e67e22');
    drawHistoryLines(traceStore.verticalAsymptotes, 'x', '#8e44ad');
    drawHistoryLines(traceStore.horizontalAsymptotes, 'y', '#8e44ad');
  }

  snapshot.horizontalLines?.forEach((line) => {
    const cy = tY(line.y);
    ctx.save();
    ctx.strokeStyle = line.kind === 'directrix' ? '#e67e22' : '#8e44ad';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = '12px Segoe UI';
    ctx.fillText(line.label, 8, cy - 6);
    ctx.restore();
  });

  snapshot.verticalLines?.forEach((line) => {
    const cx = tX(line.x);
    ctx.save();
    ctx.strokeStyle = '#8e44ad';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8e44ad';
    ctx.font = '12px Segoe UI';
    ctx.fillText(line.label, cx + 6, 16);
    ctx.restore();
  });

  const drawPoint = (point, fillStyle, label) => {
    if (!point) return;
    const cx = tX(point.x);
    const cy = tY(point.y);
    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = getCanvasTheme().axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '12px Segoe UI';
    ctx.fillStyle = fillStyle;
    ctx.fillText(`${label} (${formatNumber(point.x)}, ${formatNumber(point.y)})`, cx + 8, cy - 8);
    ctx.restore();
  };

  drawPoint(snapshot.points?.vertex, '#3498db', '顶点');
  drawPoint(snapshot.points?.focus, '#e74c3c', '焦点');

  ctx.restore();
}

export function renderFunctionPreview(canvas, expression, options = {}) {
  const ctx = canvas?.getContext?.('2d');
  if (!canvas || !ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const coordSystem = options.coordSystem || 'cartesian';
  const seedView = options.view || defaultView();
  const computationRange = coordSystem === 'polar'
    ? {
      min: options.angleRange?.min ?? 0,
      max: options.angleRange?.max ?? 360
    }
    : {
      min: seedView.minX,
      max: seedView.maxX
    };
  const data = collectFunctionData({
    expression,
    coordSystem,
    calcMin: computationRange.min,
    calcMax: computationRange.max,
    steps: width * 2,
    kValue: options.kValue ?? 1
  });

  const shouldAutoFit = coordSystem === 'polar' || data.kind === 'implicit-line';
  const view = shouldAutoFit
    ? computeAutoView([data], { coordSystem, fallback: seedView })
    : seedView;

  if (coordSystem === 'polar') {
    drawPolarCoordinateSystem(ctx, width, height, view, { fontSize: 10, showLabels: false });
  } else {
    drawCoordinateSystem(ctx, width, height, view, { fontSize: 10, showLabels: false });
  }

  if (data.kind === 'curve' || data.kind === 'implicit-line' || data.kind === 'polar-curve') {
    const yKey = data.kind === 'polar-curve' ? 'y' : 'z';
    const previewCurve = data.points.map((point) => (point ? { x: point.x, y: point[yKey] } : null));
    drawPolyline(ctx, previewCurve, (value) => toCanvasX(value, width, view), (value) => toCanvasY(value, height, view), {
      strokeStyle: options.strokeStyle || COLORS[0],
      lineWidth: 2.2
    });
    return;
  }
  if (data.grid?.points?.length) {
    const previewPoints = data.grid.points.filter(Boolean).map((point) => ({ x: point.x, y: point.z }));
    drawPolyline(ctx, previewPoints, (value) => toCanvasX(value, width, view), (value) => toCanvasY(value, height, view), {
      strokeStyle: options.strokeStyle || COLORS[0],
      lineWidth: 1.6,
      alpha: 0.8
    });
  }
}

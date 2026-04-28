import { create, all } from 'mathjs';

export const math = create(all, {});

const NORMALIZATION_RULES = [
  [/Math\./g, ''],
  [/＝/g, '='],
  [/（/g, '('],
  [/）/g, ')'],
  [/，/g, ','],
  [/；/g, ';'],
  [/×/g, '*'],
  [/÷/g, '/'],
  [/\s+/g, ' '],
  [/\+\+/g, '+'],
  [/--/g, '+'],
  [/\+-/g, '-'],
  [/-\+/g, '-'],
  [/\bln\s*\(/gi, 'log('],
  [/\bPI\b/g, 'pi'],
  [/\bPi\b/g, 'pi'],
  [/\bE\b/g, 'e']
];

const GRAPH_VARIABLES = new Set(['x', 'y', 'z', 'theta', 't', 'r', 'a', 'k']);

export function normalizeExpression(rawExpression = '') {
  let expr = String(rawExpression ?? '').trim();
  NORMALIZATION_RULES.forEach(([pattern, replacement]) => {
    expr = expr.replace(pattern, replacement);
  });
  return expr.trim();
}

export function prettifyExpression(rawExpression = '') {
  return normalizeExpression(rawExpression)
    .replace(/\s*([=+\-*/^(),])\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compileExpression(rawExpression = '') {
  const normalized = normalizeExpression(rawExpression);
  if (!normalized) {
    throw new Error('表达式为空');
  }
  const node = math.parse(normalized);
  const code = node.compile();
  return { normalized, node, code };
}

export function safeEvaluate(compiled, scope = {}) {
  try {
    const value = compiled.code.evaluate(scope);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch (error) {
    return null;
  }
}

export function inferFunctionFamily(rawExpression = '') {
  const compact = normalizeExpression(rawExpression).replace(/\s+/g, '').toLowerCase();
  if (!compact) return 'empty';

  const hasTrig = compact.includes('sin(') || compact.includes('cos(') || compact.includes('tan(');
  const hasQuadraticCore = compact.includes('x^2') || compact.includes('x*x') || /\(x[+-](k|\d+(?:\.\d+)?)\)\^2/.test(compact);
  const hasReciprocalCore = compact.includes('/x') || compact.includes('/(x-') || compact.includes('/(x+');

  if (hasTrig) {
    if (hasQuadraticCore) return 'composite-trig';
    return 'trigonometric';
  }
  if (hasReciprocalCore) return 'reciprocal';
  if (hasQuadraticCore) return 'quadratic';
  if (compact.includes('exp(') || compact.includes('e^x')) return 'exponential';
  if (compact.includes('log(')) return 'logarithmic';
  if (compact.includes('abs(')) return 'absolute';
  return 'generic';
}

export function estimateQuadraticCoefficients(compiled, kValue = 1) {
  const baseScope = { x: 0, a: kValue, k: kValue };
  const y0 = safeEvaluate(compiled, baseScope);
  const y1 = safeEvaluate(compiled, { ...baseScope, x: 1 });
  const y2 = safeEvaluate(compiled, { ...baseScope, x: 2 });

  if ([y0, y1, y2].some((value) => value === null)) {
    return null;
  }

  const a = (y2 - 2 * y1 + y0) / 2;
  const b = y1 - y0 - a;
  const c = y0;

  if (!Number.isFinite(a) || Math.abs(a) < 1e-8) {
    return null;
  }

  return { a, b, c };
}

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '--';
  }
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(digits);
  if (abs >= 0.01) return value.toFixed(Math.min(4, digits + 1));
  return value.toExponential(2);
}

export function detectPrimaryVariable(rawExpression = '') {
  const normalized = normalizeExpression(rawExpression);
  if (!normalized) return '';
  if (/\bx\b/.test(normalized)) return 'x';
  if (/\by\b/.test(normalized)) return 'y';
  if (/\bz\b/.test(normalized)) return 'z';
  if (/\btheta\b/i.test(normalized)) return 'theta';
  if (/\bt\b/.test(normalized)) return 't';
  return '';
}

export function deriveExpression(rawExpression = '', preferredVariable = '') {
  const normalized = normalizeExpression(rawExpression);
  if (!normalized) {
    return {
      variable: '',
      expression: '',
      label: '导函数: --'
    };
  }

  const variable = preferredVariable || detectPrimaryVariable(normalized);
  if (!variable) {
    return {
      variable: '',
      expression: '0',
      label: '导函数: 0'
    };
  }

  try {
    const derivativeNode = math.derivative(normalized, variable);
    const derivativeExpression = prettifyExpression(derivativeNode.toString({ parenthesis: 'auto' }));
    return {
      variable,
      expression: derivativeExpression || '0',
      label: `导函数: ${derivativeExpression || '0'}`
    };
  } catch (error) {
    return {
      variable,
      expression: '暂不支持',
      label: '导函数: 暂不支持'
    };
  }
}

export function compactExpression(rawExpression = '') {
  return normalizeExpression(rawExpression).replace(/\s+/g, '').toLowerCase();
}

function findEquationSeparator(expression = '') {
  for (let index = 0; index < expression.length; index += 1) {
    if (expression[index] !== '=') continue;
    const prev = expression[index - 1] || '';
    const next = expression[index + 1] || '';
    if (prev === '<' || prev === '>' || prev === '!' || next === '=') continue;
    return index;
  }
  return -1;
}

export function splitEquation(rawExpression = '') {
  const normalized = normalizeExpression(rawExpression);
  const separatorIndex = findEquationSeparator(normalized);
  if (separatorIndex < 0) return null;

  const left = normalized.slice(0, separatorIndex).trim();
  const right = normalized.slice(separatorIndex + 1).trim();
  if (!left || !right) return null;

  return {
    normalized,
    left,
    right
  };
}

export function buildImplicitExpression(rawExpression = '') {
  const equation = splitEquation(rawExpression);
  if (!equation) return normalizeExpression(rawExpression);
  return `(${equation.left}) - (${equation.right})`;
}

export function getExpressionVariables(rawExpression = '') {
  const normalized = normalizeExpression(rawExpression);
  const matches = normalized.match(/[A-Za-z_]\w*/g) || [];
  const variables = new Set();
  matches.forEach((token) => {
    const lower = token.toLowerCase();
    if (GRAPH_VARIABLES.has(lower)) {
      variables.add(lower);
    }
  });
  return Array.from(variables);
}

export function classifyPolarExpression(rawExpression = '') {
  const normalized = normalizeExpression(rawExpression);
  if (!normalized) {
    return {
      kind: 'empty',
      expression: '',
      suggestedCoordSystem: null
    };
  }

  const equation = splitEquation(normalized);
  if (equation) {
    const leftCompact = equation.left.replace(/\s+/g, '').toLowerCase();
    if (leftCompact === 'r') {
      return {
        kind: 'radius',
        expression: equation.right,
        suggestedCoordSystem: null
      };
    }
    if (leftCompact === 'r^2' || leftCompact === '(r)^2') {
      return {
        kind: 'radius-squared',
        expression: equation.right,
        suggestedCoordSystem: null
      };
    }
    return {
      kind: 'non-polar',
      expression: normalized,
      suggestedCoordSystem: 'cartesian'
    };
  }

  const variables = getExpressionVariables(normalized);
  const unsupportedVariables = variables.filter((item) => !['theta', 'a', 'k'].includes(item));
  if (unsupportedVariables.length) {
    return {
      kind: 'non-polar',
      expression: normalized,
      suggestedCoordSystem: 'cartesian'
    };
  }

  return {
    kind: 'expression',
    expression: normalized,
    suggestedCoordSystem: null
  };
}

export function analyzeLinearEquation(rawExpression = '', scope = {}) {
  const equation = splitEquation(rawExpression);
  if (!equation) return null;

  let compiled;
  try {
    compiled = compileExpression(`(${equation.left}) - (${equation.right})`);
  } catch (error) {
    return null;
  }

  const evaluateLinearForm = (point = {}) => safeEvaluate(compiled, {
    x: 0,
    y: 0,
    z: 0,
    a: 1,
    k: 1,
    ...scope,
    ...point
  });

  const offset = evaluateLinearForm();
  if (offset === null) return null;

  const sampleX = evaluateLinearForm({ x: 1 });
  const sampleY = evaluateLinearForm({ y: 1 });
  const sampleZ = evaluateLinearForm({ z: 1 });
  if ([sampleX, sampleY, sampleZ].some((value) => value === null)) {
    return null;
  }

  const coefficients = {
    x: sampleX - offset,
    y: sampleY - offset,
    z: sampleZ - offset
  };

  const tests = [
    { x: 0.35, y: -0.5, z: 1.25 },
    { x: -1.4, y: 0.8, z: -0.6 },
    { x: 2.2, y: 1.6, z: -1.1 }
  ];
  const scale = Math.max(
    1,
    Math.abs(offset),
    Math.abs(coefficients.x),
    Math.abs(coefficients.y),
    Math.abs(coefficients.z)
  );

  const isLinear = tests.every((point) => {
    const value = evaluateLinearForm(point);
    if (value === null) return false;
    const predicted = offset
      + coefficients.x * point.x
      + coefficients.y * point.y
      + coefficients.z * point.z;
    return Math.abs(value - predicted) <= 1e-6 * scale;
  });

  const coefficientMagnitude = Math.max(
    Math.abs(coefficients.x),
    Math.abs(coefficients.y),
    Math.abs(coefficients.z)
  );
  if (!isLinear || coefficientMagnitude < 1e-8) {
    return null;
  }

  return {
    ...equation,
    coefficients,
    constant: -offset
  };
}

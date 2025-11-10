
// Math functions - Excel-compatible mathematical operations

export const mathFunctions = {
  SUM: (...args: (number | number[])[]) => {
    const flat = args.flat(Infinity) as number[];
    return flat.reduce((sum, n) => sum + (Number(n) || 0), 0);
  },

  AVERAGE: (...args: (number | number[])[]) => {
    const flat = args.flat(Infinity) as number[];
    const nums = flat.filter(n => typeof n === 'number' && !isNaN(n));
    if (nums.length === 0) throw new Error('#DIV/0!');
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  },

  COUNT: (...args: any[]) => {
    const flat = args.flat(Infinity);
    return flat.filter(v => typeof v === 'number' && !isNaN(v)).length;
  },

  COUNTA: (...args: any[]) => {
    const flat = args.flat(Infinity);
    return flat.filter(v => v !== null && v !== undefined && v !== '').length;
  },

  MIN: (...args: (number | number[])[]) => {
    const flat = args.flat(Infinity) as number[];
    const nums = flat.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length ? Math.min(...nums) : 0;
  },

  MAX: (...args: (number | number[])[]) => {
    const flat = args.flat(Infinity) as number[];
    const nums = flat.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length ? Math.max(...nums) : 0;
  },

  ABS: (num: number) => Math.abs(Number(num) || 0),

  ROUND: (num: number, digits: number = 0) => {
    const n = Number(num) || 0;
    const d = Math.floor(Number(digits) || 0);
    if (d === 0) return Math.round(n);
    const factor = Math.pow(10, d);
    return Math.round(n * factor) / factor;
  },

  ROUNDUP: (num: number, digits: number = 0) => {
    const n = Number(num) || 0;
    const d = Math.floor(Number(digits) || 0);
    const factor = Math.pow(10, d);
    return Math.ceil(n * factor) / factor;
  },

  ROUNDDOWN: (num: number, digits: number = 0) => {
    const n = Number(num) || 0;
    const d = Math.floor(Number(digits) || 0);
    const factor = Math.pow(10, d);
    return Math.floor(n * factor) / factor;
  },

  CEILING: (num: number, significance: number = 1) => {
    const n = Number(num) || 0;
    const s = Number(significance) || 1;
    if (s === 0) return 0;
    return Math.ceil(n / s) * s;
  },

  FLOOR: (num: number, significance: number = 1) => {
    const n = Number(num) || 0;
    const s = Number(significance) || 1;
    if (s === 0) return 0;
    return Math.floor(n / s) * s;
  },

  POWER: (base: number, exponent: number) => {
    return Math.pow(Number(base) || 0, Number(exponent) || 0);
  },

  SQRT: (num: number) => {
      const n = Number(num) || 0;
      if (n < 0) throw new Error('#NUM!');
      return Math.sqrt(n);
  },

  MOD: (dividend: number, divisor: number) => {
    const n = Number(dividend) || 0;
    const d = Number(divisor) || 0;
    if (d === 0) throw new Error('#DIV/0!');
    return n % d;
  },

  RAND: () => Math.random(),

  RANDBETWEEN: (bottom: number, top: number) => {
    const b = Math.ceil(Number(bottom) || 0);
    const t = Math.floor(Number(top) || 0);
    if (b > t) throw new Error('#NUM!');
    return Math.floor(Math.random() * (t - b + 1)) + b;
  },

  PI: () => Math.PI,

  PRODUCT: (...args: (number | number[])[]) => {
    const flat = args.flat(Infinity) as number[];
    return flat.reduce((prod, n) => prod * (Number(n) || 1), 1);
  },
};
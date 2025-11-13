
import { mathFunctions } from './functions/math';
import { logicalFunctions } from './functions/logical';
import { textFunctions } from './functions/text';
import { dateFunctions } from './functions/date';
import { lookupFunctions } from './functions/lookup';
import { financialFunctions } from './functions/financial';
import { parser } from './parser';
import { evaluateNode, EvaluationContext } from './evaluator';

export type { EvaluationContext };

export const FUNCTIONS: Record<string, FormulaFunction> = {
  ...mathFunctions,
  ...logicalFunctions,
  ...textFunctions,
  ...dateFunctions,
  ...lookupFunctions,
  ...financialFunctions,
};

export type FormulaFunction = (...args: any[]) => any;
export type FunctionRegistry = Record<string, FormulaFunction>;

export const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort();

export const FUNCTION_CATEGORIES = {
  Math: Object.keys(mathFunctions),
  Logical: Object.keys(logicalFunctions),
  Text: Object.keys(textFunctions),
  'Date & Time': Object.keys(dateFunctions),
  'Lookup & Reference': Object.keys(lookupFunctions),
  'Financial': Object.keys(financialFunctions),
};

export const FUNCTION_SIGNATURES: Record<string, string> = {
  SUM: 'SUM(number1, [number2], ...)',
  AVERAGE: 'AVERAGE(number1, [number2], ...)',
  COUNT: 'COUNT(value1, [value2], ...)',
  MIN: 'MIN(number1, [number2], ...)',
  MAX: 'MAX(number1, [number2], ...)',
  ROUND: 'ROUND(number, num_digits)',
  IF: 'IF(logical_test, value_if_true, [value_if_false])',
  AND: 'AND(logical1, [logical2], ...)',
  OR: 'OR(logical1, [logical2], ...)',
  CONCATENATE: 'CONCATENATE(text1, [text2], ...)',
  LEFT: 'LEFT(text, [num_chars])',
  RIGHT: 'RIGHT(text, [num_chars])',
  MID: 'MID(text, start_num, num_chars)',
  LEN: 'LEN(text)',
  LOWER: 'LOWER(text)',
  UPPER: 'UPPER(text)',
  TODAY: 'TODAY()',
  NOW: 'NOW()',
  DATE: 'DATE(year, month, day)',
  YEAR: 'YEAR(serial_number)',
  MONTH: 'MONTH(serial_number)',
  DAY: 'DAY(serial_number)',
  VLOOKUP: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])',
  HLOOKUP: 'HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])',
  INDEX: 'INDEX(array, row_num, [column_num])',
  MATCH: 'MATCH(lookup_value, lookup_array, [match_type])',
  PMT: 'PMT(rate, nper, pv, [fv], [type])'
};

export const hasFunction = (name: string): boolean => {
  return name.toUpperCase() in FUNCTIONS;
};

export const getFunction = (name: string): FormulaFunction | undefined => {
  return FUNCTIONS[name.toUpperCase()];
};

export const evaluate = (
  formula: string,
  context: EvaluationContext
) => {
  const dependencies = new Set<string>();
  try {
    const ast = parser.parse(formula);
    const result = evaluateNode(ast, context, dependencies);
    
    // Prevent self-dependency
    dependencies.delete(context.currentCellId);
    
    return { result, dependencies: Array.from(dependencies) };
  } catch (e: any) {
    return { 
      result: 0,
      error: e.message, 
      dependencies: Array.from(dependencies) 
    };
  }
};

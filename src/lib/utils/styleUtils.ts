
import { CellData, CellStyle, ConditionalFormatRule } from "../store/types";
import { Getter } from '../formulas/evaluator';
import { isCellInRange } from "./rangeUtils";
import { idToAddress } from "./cellUtils";

const checkCondition = (
  cellValue: number | string,
  rule: ConditionalFormatRule,
): boolean => {
  const ruleValueNum = Number(rule.value);
  const cellValueNum = Number(cellValue);

  switch (rule.type) {
    case 'greaterThan':
      return !isNaN(cellValueNum) && !isNaN(ruleValueNum) && cellValueNum > ruleValueNum;
    case 'lessThan':
      return !isNaN(cellValueNum) && !isNaN(ruleValueNum) && cellValueNum < ruleValueNum;
    case 'equalTo':
      // Loose equality to handle numbers vs strings
      // eslint-disable-next-line eqeqeq
      return cellValue == rule.value;
    case 'textContains':
      return String(cellValue).toLowerCase().includes(String(rule.value).toLowerCase());
    default:
      return false;
  }
};

export const computeFinalCellStyle = (
  cell: CellData | null,
  conditionalFormats: ConditionalFormatRule[],
  getter: Getter
): Partial<CellStyle> => {
  const baseStyle = cell?.style || {};
  let finalStyle: Partial<CellStyle> = { ...baseStyle };

  // FIX: Check for null/undefined explicitly to allow formatting on cells with value 0.
  if (cell?.value == null) {
    return finalStyle;
  }
  
  const cellAddress = idToAddress(cell.id);

  for (const rule of conditionalFormats) {
    if (isCellInRange(cellAddress, rule.range)) {
        if (checkCondition(cell.value as number | string, rule)) {
          finalStyle = { ...finalStyle, ...rule.style };
        }
    }
  }

  return finalStyle;
};

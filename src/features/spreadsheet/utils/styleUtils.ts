import { CellData, CellStyle, ConditionalFormatRule } from "../store/types";
import { Getter } from '../services/formula/evaluator';

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

  if (!cell?.value) {
    return finalStyle;
  }

  for (const rule of conditionalFormats) {
    // This is a simplified check. A full implementation would check if the cell is in rule.range
    if (checkCondition(cell.value as number | string, rule)) {
      finalStyle = { ...finalStyle, ...rule.style };
    }
  }

  return finalStyle;
};
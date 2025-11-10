
import { CellAddress, CellData } from '../store/types';
import { formatValue } from './formatUtils';

/**
 * Converts a zero-based column index into its corresponding letter label (e.g., 0 -> 'A', 26 -> 'AA').
 */
export const colIndexToLabel = (col: number): string => {
  let label = '';
  let num = col + 1;
  while (num > 0) {
    const remainder = (num - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    num = Math.floor((num - 1) / 26);
  }
  return label;
};

/**
 * Converts a column letter label back to its zero-based index (e.g., 'A' -> 0, 'AA' -> 26).
 */
export const labelToColIndex = (label: string): number => {
    let index = 0;
    for (let i = 0; i < label.length; i++) {
        index = index * 26 + (label.charCodeAt(i) - 64);
    }
    return index - 1;
}

/**
 * Converts a cell address object into its string ID (e.g., { col: 0, row: 0 } -> 'A1').
 */
export const addressToId = (address: CellAddress): string => {
  return `${colIndexToLabel(address.col)}${address.row + 1}`;
};


/**
 * Converts a cell ID string back to its address object (e.g., 'A1' -> { col: 0, row: 0 }).
 */
export const idToAddress = (id: string): CellAddress => {
    const colLabel = id.match(/[A-Z]+/)?.[0] ?? '';
    const rowLabel = id.match(/\d+/)?.[0] ?? '';
    return {
        col: labelToColIndex(colLabel),
        row: parseInt(rowLabel, 10) - 1,
    };
}

/**
 * Validates if a string is a valid cell ID format (e.g., A1, BZ99).
 */
export const isValidCellId = (id: string): boolean => {
  const regex = /^[A-Z]+[1-9]\d*$/;
  return regex.test(id);
};

/**
 * Checks if a raw string value represents a formula.
 */
export const isFormula = (rawValue: string): boolean => {
    return typeof rawValue === 'string' && rawValue.startsWith('=');
};

/**
 * Gets the value to be displayed in the cell, applying any necessary formatting.
 * @param cell The cell data object.
 * @returns The formatted string to display.
 */
export const getDisplayValue = (cell: CellData | null): string => {
    if (!cell) return '';
    if (cell.error) return cell.error;
    if (cell.value === null || cell.value === undefined) return '';
    return formatValue(cell.value, cell.style);
};

/**
 * Gets the value to be displayed in the formula bar or cell editor.
 * @param cell The cell data object.
 * @returns The raw string value or formula.
 */
export const getEditValue = (cell: CellData | null): string => {
    if (!cell) return '';
    return cell.raw;
};
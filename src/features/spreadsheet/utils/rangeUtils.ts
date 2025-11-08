
import { CellAddress, Range } from "../store/types";
import { addressToId, idToAddress } from "./cellUtils";

/**
 * Checks if a given cell address is within a specified range.
 * @param cell The address of the cell to check.
 * @param range The range to check against.
 * @returns True if the cell is within the range, false otherwise.
 */
export const isCellInRange = (cell: CellAddress, range: Range): boolean => {
    const { start, end } = sortRange(range); // Ensure start is top-left
    return (
        cell.row >= start.row &&
        cell.row <= end.row &&
        cell.col >= start.col &&
        cell.col <= end.col
    );
};

/**
 * Compares two cell addresses for equality.
 * @param addr1 The first address.
 * @param addr2 The second address.
 * @returns True if the addresses are the same, false otherwise.
 */
export const areAddressesEqual = (addr1: CellAddress, addr2: CellAddress): boolean => {
    return addr1.col === addr2.col && addr1.row === addr2.row;
};

/**

 * Ensures that the start of a range is the top-left corner and the end is the bottom-right.
 * @param range The range to sort.
 * @returns A new, sorted range object.
 */
export const sortRange = (range: Range): Range => {
    return {
        start: {
            row: Math.min(range.start.row, range.end.row),
            col: Math.min(range.start.col, range.end.col),
        },
        end: {
            row: Math.max(range.start.row, range.end.row),
            col: Math.max(range.start.col, range.end.col),
        },
    };
};

/**
 * Expands a range string (e.g., 'A1:B2') into an array of cell IDs.
 * @param rangeString The range string.
 * @returns An array of all cell IDs within the range.
 */
export const expandRange = (rangeString: string): string[] => {
    const [startId, endId] = rangeString.split(':');
    const range = sortRange({
        start: idToAddress(startId),
        end: idToAddress(endId),
    });
    
    const cellIds: string[] = [];
    for (let row = range.start.row; row <= range.end.row; row++) {
        for (let col = range.start.col; col <= range.end.col; col++) {
            cellIds.push(addressToId({ row, col }));
        }
    }
    return cellIds;
};

/**
 * Finds the merge range that a given cell address belongs to.
 * @param address The address of the cell to check.
 * @param merges An array of all merge ranges in the sheet.
 * @returns The merge range if found, otherwise undefined.
 */
export const findMergeForCell = (address: CellAddress, merges: Range[]): Range | undefined => {
  return merges.find(range => isCellInRange(address, range));
};

/**
 * Checks if a range overlaps with any existing merges.
 * @param range The range to check.
 * @param merges An array of existing merge ranges.
 * @returns True if there is an overlap, false otherwise.
 */
export const doesRangeOverlapMerges = (range: Range, merges: Range[]): boolean => {
    const sortedRange = sortRange(range);
    return merges.some(merge => {
        const sortedMerge = sortRange(merge);
        // Check for intersection
        const overlap = (
            sortedRange.start.col <= sortedMerge.end.col &&
            sortedRange.end.col >= sortedMerge.start.col &&
            sortedRange.start.row <= sortedMerge.end.row &&
            sortedRange.end.row >= sortedMerge.start.row
        );
        // If they just touch at one edge, it's not an overlap unless it's the *same* merge
        if (overlap) {
            // If the ranges are identical, it's not an overlap for our purposes (e.g. unmerging)
            if (areAddressesEqual(sortedRange.start, sortedMerge.start) && areAddressesEqual(sortedRange.end, sortedMerge.end)) {
                return false;
            }
            return true;
        }
        return false;
    });
};
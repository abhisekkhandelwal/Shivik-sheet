
import { CellAddress, Range, Sheet } from "../store/types";
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

/**
 * Finds the contiguous block of data cells surrounding a starting cell using a Breadth-First Search.
 * This correctly identifies non-rectangular but connected data regions.
 * @param sheet The sheet to search within.
 * @param startAddress The starting cell address.
 * @returns The bounding box range of the contiguous data region.
 */
export const findDataRegion = (sheet: Sheet, startAddress: CellAddress): Range => {
    const { data, lastUsedCol, lastUsedRow } = sheet;
    const hasContent = (row: number, col: number): boolean => {
        if (row < 0 || col < 0 || row > lastUsedRow || col > lastUsedCol) return false;
        const cell = data[addressToId({ col, row })];
        return !!(cell && cell.raw && String(cell.raw).trim() !== '');
    };

    if (!hasContent(startAddress.row, startAddress.col)) {
        return { start: startAddress, end: startAddress };
    }

    const queue: CellAddress[] = [startAddress];
    const visited = new Set<string>([addressToId(startAddress)]);
    let minRow = startAddress.row, maxRow = startAddress.row;
    let minCol = startAddress.col, maxCol = startAddress.col;

    let head = 0;
    while (head < queue.length) {
        const { row, col } = queue[head++];

        // Update bounding box
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);

        // Check 8 neighbors (including diagonals) to properly connect table corners
        for (let r_offset = -1; r_offset <= 1; r_offset++) {
            for (let c_offset = -1; c_offset <= 1; c_offset++) {
                if (r_offset === 0 && c_offset === 0) continue;

                const neighbor: CellAddress = { row: row + r_offset, col: col + c_offset };
                const neighborId = addressToId(neighbor);

                if (!visited.has(neighborId) && hasContent(neighbor.row, neighbor.col)) {
                    visited.add(neighborId);
                    queue.push(neighbor);
                }
            }
        }
    }
    
    // Once the contiguous region is found, find the rectangular bounds of that region.
    // Excel's behavior is to find the region bounded by empty rows/columns. This BFS approach finds
    // the connected component of data, and then we'll determine the bounding box.
    // Then we expand this box to be rectangular, which is more intuitive for filtering.

    let top = minRow, bottom = maxRow, left = minCol, right = maxCol;

    // Expand to find the full rectangular table, bounded by empty rows/cols
    let changed = true;
    while(changed) {
        changed = false;
        // Expand down
        for (let c = left; c <= right; c++) {
            if (hasContent(bottom + 1, c)) {
                bottom++;
                changed = true;
                break;
            }
        }
        // Expand up
        for (let c = left; c <= right; c++) {
            if (hasContent(top - 1, c)) {
                top--;
                changed = true;
                break;
            }
        }
        // Expand right
        for (let r = top; r <= bottom; r++) {
            if (hasContent(r, right + 1)) {
                right++;
                changed = true;
                break;
            }
        }
        // Expand left
        for (let r = top; r <= bottom; r++) {
            if (hasContent(r, left - 1)) {
                left--;
                changed = true;
                break;
            }
        }
    }


    return {
        start: { row: top, col: left },
        end: { row: bottom, col: right },
    };
};

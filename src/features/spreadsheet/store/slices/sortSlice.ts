
import { StateCreator } from 'zustand';
import { SpreadsheetStore, SortSlice, CellData } from '../../../../lib/store/types';
import { addSnapshot } from '../storeHelpers';
import { addressToId } from '../../utils/cellUtils';
import { sortRange } from '../../utils/rangeUtils';

const compareValues = (a: any, b: any, direction: 'asc' | 'desc') => {
  const dir = direction === 'asc' ? 1 : -1;
  if (a === null || a === undefined) return 1 * dir;
  if (b === null || b === undefined) return -1 * dir;
  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * dir;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b) * dir;
  }
  // Mixed types: numbers before strings
  if (typeof a === 'number') return -1 * dir;
  if (typeof b === 'number') return 1 * dir;
  return String(a).localeCompare(String(b)) * dir;
};


export const createSortSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], SortSlice> = (set, get) => ({
    isSortDialogOpen: false,
    toggleSortDialog: () => {
        set(state => {
            state.isSortDialogOpen = !state.isSortDialogOpen;
        });
    },
    sortSheet: (col, direction, hasHeader) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;

            const sortArea = sheet.filter ? sheet.filter.range : sortRange(sheet.selection);
            const startRow = hasHeader ? sortArea.start.row + 1 : sortArea.start.row;

            const rowsToSort: { index: number, data: CellData[], sortValue: any }[] = [];
            for (let r = startRow; r <= sortArea.end.row; r++) {
                const rowData: CellData[] = [];
                for (let c = sortArea.start.col; c <= sortArea.end.col; c++) {
                    const cellId = addressToId({ col: c, row: r });
                    rowData.push(JSON.parse(JSON.stringify(sheet.data[cellId] || { id: cellId, raw: '', value: null, style: {} })));
                }
                const sortValue = sheet.data[addressToId({ col, row: r })]?.value;
                rowsToSort.push({ index: r, data: rowData, sortValue });
            }

            rowsToSort.sort((a, b) => compareValues(a.sortValue, b.sortValue, direction));
            
            rowsToSort.forEach((sortedRow, i) => {
                const targetRowIndex = startRow + i;
                sortedRow.data.forEach((cellData, c_idx) => {
                    const targetColIndex = sortArea.start.col + c_idx;
                    const targetCellId = addressToId({ col: targetColIndex, row: targetRowIndex });
                    // Important: create a new cell object to avoid reference issues
                    const newCellData: CellData = {
                        ...cellData,
                        id: targetCellId
                    };
                    sheet.data[targetCellId] = newCellData;
                });
            });
        });
        addSnapshot(get, set);
    }
});
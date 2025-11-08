
import { StateCreator } from 'zustand';
import { SpreadsheetStore, StructureSlice } from '../types';
import { findMergeForCell, sortRange, doesRangeOverlapMerges } from '../../utils/rangeUtils';
import { addSnapshot } from '../storeHelpers';

export const createStructureSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], StructureSlice> = (set, get) => ({
  setColumnWidth: (col, width) => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        if (!sheet.columns[col]) sheet.columns[col] = { id: col };
        sheet.columns[col].width = Math.max(20, width); // min width
    });
  },

  setRowHeight: (row, height) => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        if (!sheet.rows[row]) sheet.rows[row] = { id: row };
        sheet.rows[row].height = Math.max(18, height); // min height
    });
  },

  mergeSelection: () => {
      set(state => {
          if (!state.workbook) return;
          const sheet = state.workbook.sheets[state.workbook.activeSheetId];
          if (!sheet) return;

          const sorted = sortRange(sheet.selection);
          if (sorted.start.col === sorted.end.col && sorted.start.row === sorted.end.row) return;
          if (doesRangeOverlapMerges(sorted, sheet.merges)) return;
          
          sheet.merges.push(sorted);
          sheet.activeCell = sorted.start;
          sheet.selection = sorted;
      });
      addSnapshot(get, set);
  },

  unmergeSelection: () => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        
        const merge = findMergeForCell(sheet.activeCell, sheet.merges);
        if(merge) {
            sheet.merges = sheet.merges.filter(m => m !== merge);
            sheet.selection = merge;
            sheet.activeCell = merge.start;
        }
    });
    addSnapshot(get, set);
  },

  insertRows: () => { 
    console.warn("Insert Rows not fully implemented"); 
    // This would require shifting all cell data and updating formulas, a complex operation.
  },

  deleteRows: () => {
      const { workbook, clearSelection, setSelection } = get();
      if(!workbook) return;
      const sheet = workbook.sheets[workbook.activeSheetId];
      const originalSelection = sheet.selection;
      const fullRowSelection = { 
          ...originalSelection, 
          start: { ...originalSelection.start, col: 0 }, 
          end: { ...originalSelection.end, col: sheet.lastUsedCol }
      };
      setSelection(fullRowSelection);
      clearSelection();
      setSelection(originalSelection); // restore original selection
  },

  insertColumns: () => { 
    console.warn("Insert Columns not fully implemented"); 
    // This would require shifting all cell data and updating formulas.
  },

  deleteColumns: () => {
    const { workbook, clearSelection, setSelection } = get();
    if(!workbook) return;
    const sheet = workbook.sheets[workbook.activeSheetId];
    const originalSelection = sheet.selection;
    const fullColSelection = { 
        ...originalSelection, 
        start: { ...originalSelection.start, row: 0 }, 
        end: { ...originalSelection.end, row: sheet.lastUsedRow }
    };
    setSelection(fullColSelection);
    clearSelection();
    setSelection(originalSelection); // restore original selection
  },
});
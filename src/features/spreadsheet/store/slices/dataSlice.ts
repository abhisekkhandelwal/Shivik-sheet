
import { StateCreator } from 'zustand';
import { SpreadsheetStore, DataSlice } from '../../../../lib/store/types';
import { sortRange } from '../../utils/rangeUtils';
import { addressToId } from '../../utils/cellUtils';
import { updateCellAndDependents, recalculate, insertFormula, getOrCreateCell, getDefaultCellStyle, addSnapshot } from '../storeHelpers';

export const createDataSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], DataSlice> = (set, get) => ({
  clearSelection: () => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        
        const sorted = sortRange(sheet.selection);
        const changedIds = new Set<string>();

        for (let row = sorted.start.row; row <= sorted.end.row; row++) {
            for (let col = sorted.start.col; col <= sorted.end.col; col++) {
                const cellId = addressToId({col, row});
                const cell = sheet.data[cellId];
                if(cell) {
                    const changed = updateCellAndDependents(state.workbook, sheet, cellId, '');
                    changed.forEach(id => changedIds.add(id));
                }
            }
        }
        recalculate(state.workbook, sheet, changedIds);
    });
    addSnapshot(get, set);
  },

  autoSum: () => {
    set(state => insertFormula(state, 'SUM'));
    addSnapshot(get, set);
  },
  averageSelection: () => {
    set(state => insertFormula(state, 'AVERAGE'));
    addSnapshot(get, set);
  },
  countSelection: () => {
    set(state => insertFormula(state, 'COUNT'));
    addSnapshot(get, set);
  },
  maxSelection: () => {
    set(state => insertFormula(state, 'MAX'));
    addSnapshot(get, set);
  },
  minSelection: () => {
    set(state => insertFormula(state, 'MIN'));
    addSnapshot(get, set);
  },

  fillSelection: (direction) => {
      set(state => {
          if (!state.workbook) return;
          const sheet = state.workbook.sheets[state.workbook.activeSheetId];
          if (!sheet) return;
          const sorted = sortRange(sheet.selection);
          const allChangedIds = new Set<string>();

          if (direction === 'down') {
              for (let c = sorted.start.col; c <= sorted.end.col; c++) {
                  const sourceCell = sheet.data[addressToId({ col: c, row: sorted.start.row })];
                  if (!sourceCell) continue;
                  for (let r = sorted.start.row + 1; r <= sorted.end.row; r++) {
                      const targetId = addressToId({ col: c, row: r });
                      const changed = updateCellAndDependents(state.workbook, sheet, targetId, sourceCell.raw);
                      changed.forEach(id => allChangedIds.add(id));
                      const targetCell = getOrCreateCell(sheet, targetId);
                      targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
                  }
              }
          }
          // Implement up, left, right similarly if needed.
          recalculate(state.workbook, sheet, allChangedIds);
      });
      addSnapshot(get, set);
  },

  clearFormats: () => {
    const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
    if(sheet) get().setCellStyle(sheet.selection, getDefaultCellStyle());
  },
  
  clearAll: () => {
      get().clearSelection(); // Clears content + recalcs
      get().clearFormats(); // Clears formats
  },
});
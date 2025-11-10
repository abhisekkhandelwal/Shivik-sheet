
import { StateCreator } from 'zustand';
import { SpreadsheetStore, ClipboardSlice, CellData } from '../types';
import { sortRange } from '../../utils/rangeUtils';
import { addressToId, idToAddress } from '../../utils/cellUtils';
import { updateCellAndDependents, recalculate, getOrCreateCell, getDefaultCellStyle, addSnapshot } from '../storeHelpers';

export const createClipboardSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], ClipboardSlice> = (set, get) => ({
  clipboardRange: null,
  clipboardMode: null,

  copySelection: () => {
    const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
    if (!sheet) return;
    set({ clipboardRange: sheet.selection, clipboardMode: 'copy' });
  },

  cutSelection: () => {
    const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
    if (!sheet) return;
    set({ clipboardRange: sheet.selection, clipboardMode: 'cut' });
  },

  paste: (textData) => {
    set(state => {
      if (!state.workbook) return;
      const sheet = state.workbook.sheets[state.workbook.activeSheetId];
      if (!sheet) return;

      const pasteTargetCell = sheet.activeCell;
      const { clipboardRange, clipboardMode } = state;
      const allChangedIds = new Set<string>();

      if (textData) {
          const rows = textData.split(/\r?\n/).map(row => row.split('\t'));
          if(rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
              rows.pop();
          }
          rows.forEach((rowData, rIdx) => {
              rowData.forEach((cellText, cIdx) => {
                  const targetRow = pasteTargetCell.row + rIdx;
                  const targetCol = pasteTargetCell.col + cIdx;
                  const cellId = addressToId({ col: targetCol, row: targetRow });
                  const changed = updateCellAndDependents(sheet, cellId, cellText);
                  changed.forEach(id => allChangedIds.add(id));
              });
          });
          
      } else if (clipboardRange) {
          const sortedClip = sortRange(clipboardRange);
          const rowOffset = pasteTargetCell.row - sortedClip.start.row;
          const colOffset = pasteTargetCell.col - sortedClip.start.col;
          const cellsToCopy: CellData[] = [];

          for (let r = sortedClip.start.row; r <= sortedClip.end.row; r++) {
              for (let c = sortedClip.start.col; c <= sortedClip.end.col; c++) {
                  const sourceId = addressToId({ col: c, row: r });
                  const sourceCell = sheet.data[sourceId];
                  if (sourceCell) {
                      cellsToCopy.push(JSON.parse(JSON.stringify(sourceCell)));
                  }
              }
          }

          cellsToCopy.forEach((cellData) => {
            const sourceAddr = idToAddress(cellData.id);
            const targetAddr = { col: sourceAddr.col + colOffset, row: sourceAddr.row + rowOffset };
            const targetId = addressToId(targetAddr);
            
            const changed = updateCellAndDependents(sheet, targetId, cellData.raw);
            changed.forEach(id => allChangedIds.add(id));

            const targetCell = getOrCreateCell(sheet, targetId);
            targetCell.style = cellData.style;
            sheet.data[targetId] = targetCell;
          });

          if (clipboardMode === 'cut') {
              for (let r = sortedClip.start.row; r <= sortedClip.end.row; r++) {
                  for (let c = sortedClip.start.col; c <= sortedClip.end.col; c++) {
                      const id = addressToId({ col: c, row: r });
                      if (sheet.data[id]) {
                         const changed = updateCellAndDependents(sheet, id, '');
                         changed.forEach(cid => allChangedIds.add(cid));
                         const clearedCell = sheet.data[id];
                         if (clearedCell) clearedCell.style = getDefaultCellStyle();
                      }
                  }
              }
              state.clipboardMode = null;
              state.clipboardRange = null;
          }
      }
      recalculate(sheet, allChangedIds);
    });
    addSnapshot(get, set);
  },

  cancelClipboard: () => set({ clipboardRange: null, clipboardMode: null }),
});
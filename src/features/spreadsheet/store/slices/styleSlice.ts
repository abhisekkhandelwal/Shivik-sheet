import { StateCreator } from 'zustand';
import { SpreadsheetStore, StyleSlice } from '../types';
import { sortRange } from '../../utils/rangeUtils';
import { addressToId } from '../../utils/cellUtils';
import { getOrCreateCell, addSnapshot } from '../storeHelpers';
import { FONT_SIZES } from '../spreadsheetStore';

export const createStyleSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], StyleSlice> = (set, get) => ({
  toggleCellStyle: (styleKey) => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;

        // Determine the new style state based on the active cell
        const primaryCellId = addressToId(sheet.activeCell);
        const primaryCell = getOrCreateCell(sheet, primaryCellId);
        const isToggledOn = !(primaryCell.style?.[styleKey]);

        // Apply this new state to all cells in the current selection
        const { selection } = sheet;
        const sorted = sortRange(selection);
        for (let r = sorted.start.row; r <= sorted.end.row; r++) {
            for (let c = sorted.start.col; c <= sorted.end.col; c++) {
                const cellId = addressToId({col: c, row: r});
                const cell = getOrCreateCell(sheet, cellId);
                // Directly update the style on the draft object
                cell.style[styleKey] = isToggledOn;
            }
        }
    });
    addSnapshot(get, set);
  },

  setCellStyle: (selection, style) => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;

        const sorted = sortRange(selection);
        for (let r = sorted.start.row; r <= sorted.end.row; r++) {
            for (let c = sorted.start.col; c <= sorted.end.col; c++) {
                const cellId = addressToId({col: c, row: r});
                const cell = getOrCreateCell(sheet, cellId);
                cell.style = {...cell.style, ...style};
                sheet.data[cellId] = cell;
            }
        }
    });
    addSnapshot(get, set);
  },

  setSelectionTextAlign: (align) => {
    const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
    if(sheet) get().setCellStyle(sheet.selection, { textAlign: align });
  },

  setSelectionVAlign: (align) => {
    const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
    if(sheet) get().setCellStyle(sheet.selection, { vAlign: align });
  },

  toggleWrapText: () => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;

        const primaryCellId = addressToId(sheet.activeCell);
        const primaryCell = getOrCreateCell(sheet, primaryCellId);
        const isToggled = !(primaryCell.style?.wrap);

        get().setCellStyle(sheet.selection, { wrap: isToggled });
    });
  },

  setNumberFormat: (format) => {
    const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
    if(sheet) get().setCellStyle(sheet.selection, { format });
  },
  
  increaseFontSize: () => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        const primaryCellId = addressToId(sheet.activeCell);
        const primaryCell = getOrCreateCell(sheet, primaryCellId);
        const currentSize = primaryCell.style?.fontSize ?? 11;
        const nextSize = FONT_SIZES.find(s => s > currentSize) ?? FONT_SIZES[FONT_SIZES.length - 1];
        get().setCellStyle(sheet.selection, { fontSize: nextSize });
    });
  },

  decreaseFontSize: () => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        const primaryCellId = addressToId(sheet.activeCell);
        const primaryCell = getOrCreateCell(sheet, primaryCellId);
        const currentSize = primaryCell.style?.fontSize ?? 11;
        const nextSize = [...FONT_SIZES].reverse().find(s => s < currentSize) ?? FONT_SIZES[0];
        get().setCellStyle(sheet.selection, { fontSize: nextSize });
    });
  },

  addOutlineBorderToSelection: () => {
    set(state => {
        if(!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if(!sheet) return;
        const sorted = sortRange(sheet.selection);
        const borderStyle = '1px solid #000';

        for (let row = sorted.start.row; row <= sorted.end.row; row++) {
            for (let col = sorted.start.col; col <= sorted.end.col; col++) {
                const cellId = addressToId({col, row});
                const cell = getOrCreateCell(sheet, cellId);
                
                if(row === sorted.start.row) cell.style.borderTop = borderStyle;
                if(row === sorted.end.row) cell.style.borderBottom = borderStyle;
                if(col === sorted.start.col) cell.style.borderLeft = borderStyle;
                if(col === sorted.end.col) cell.style.borderRight = borderStyle;
                sheet.data[cellId] = cell;
            }
        }
    });
    addSnapshot(get, set);
  },

  removeBordersFromSelection: () => {
    const { workbook } = get();
    if(!workbook) return;
    const sheet = workbook.sheets[workbook.activeSheetId];
    if(!sheet) return;

    get().setCellStyle(sheet.selection, {
        borderTop: undefined,
        borderBottom: undefined,
        borderLeft: undefined,
        borderRight: undefined
    });
  },

  increaseDecimalPlaces: () => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        
        const sorted = sortRange(sheet.selection);
        for (let r = sorted.start.row; r <= sorted.end.row; r++) {
            for (let c = sorted.start.col; c <= sorted.end.col; c++) {
                const cellId = addressToId({col: c, row: r});
                const cell = getOrCreateCell(sheet, cellId);
                const current = cell.style.decimalPlaces ?? 2;
                cell.style.decimalPlaces = Math.min(20, current + 1);
                sheet.data[cellId] = cell;
            }
        }
    });
    addSnapshot(get, set);
  },

  decreaseDecimalPlaces: () => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;
        
        const sorted = sortRange(sheet.selection);
        for (let r = sorted.start.row; r <= sorted.end.row; r++) {
            for (let c = sorted.start.col; c <= sorted.end.col; c++) {
                const cellId = addressToId({col: c, row: r});
                const cell = getOrCreateCell(sheet, cellId);
                const current = cell.style.decimalPlaces ?? 2;
                cell.style.decimalPlaces = Math.max(0, current - 1);
                sheet.data[cellId] = cell;
            }
        }
    });
    addSnapshot(get, set);
  },
});
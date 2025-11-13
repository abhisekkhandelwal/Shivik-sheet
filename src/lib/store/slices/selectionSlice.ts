import { StateCreator } from 'zustand';
import { SpreadsheetStore, SelectionSlice, DataValidationRule, Range } from '../types';
import { findMergeForCell, sortRange, isCellInRange } from '../../utils/rangeUtils';
import { addressToId, idToAddress, isFormula } from '../../utils/cellUtils';
import { getOrCreateCell, updateCellAndDependents, recalculate, addSnapshot } from '../storeHelpers';
import { FUNCTION_NAMES } from '../../formulas';

const validateValue = (value: string, rule: DataValidationRule): boolean => {
    switch(rule.type) {
        case 'list':
            return rule.criteria.includes(value);
        // Other validation types would go here
        default:
            return true;
    }
}

export const createSelectionSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], SelectionSlice> = (set, get) => ({
  editingCellId: null,
  editingValue: '',
  formulaSelection: null,
  formulaRangeSelection: null,
  formulaSuggestions: [],
  selectedSuggestionIndex: 0,

  setActiveCell: (address) => {
    set((state) => {
      if (!state.workbook) return;
      const sheet = state.workbook.sheets[state.workbook.activeSheetId];
      if (sheet) {
        const merge = findMergeForCell(address, sheet.merges);
        if (merge) {
            sheet.activeCell = merge.start;
            sheet.selection = sortRange(merge);
        } else {
            sheet.activeCell = address;
            sheet.selection = { start: address, end: address };
        }
      }
    });
  },

  setSelection: (range) => {
    set((state) => {
      if (!state.workbook) return;
      const sheet = state.workbook.sheets[state.workbook.activeSheetId];
      if (sheet) {
        sheet.selection = range;
      }
    });
  },

  extendSelection: (direction) => {
    set(state => {
      if (!state.workbook) return;
      const sheet = state.workbook.sheets[state.workbook.activeSheetId];
      if (!sheet) return;

      let {col, row} = sheet.selection.end;
      if (direction === 'up') row = Math.max(0, row - 1);
      if (direction === 'down') row = Math.min(sheet.lastUsedRow + 10, row + 1);
      if (direction === 'left') col = Math.max(0, col - 1);
      if (direction === 'right') col = Math.min(sheet.lastUsedCol + 5, col + 1);
      sheet.selection.end = { col, row };
    });
  },

  extendSelectionToEnd: (direction) => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;

        const { start } = sheet.selection;
        let end = { ...start };

        if(direction === 'right') end.col = sheet.lastUsedCol;
        if(direction === 'left') end.col = 0;
        if(direction === 'down') end.row = sheet.lastUsedRow;
        if(direction === 'up') end.row = 0;

        sheet.selection.end = end;
    });
  },
  
  moveActiveCellToEndOfData: (direction) => {
    set(state => {
        if (!state.workbook) return;
        const sheet = state.workbook.sheets[state.workbook.activeSheetId];
        if (!sheet) return;

        const { col, row } = sheet.activeCell;
        const hasContent = (c: number, r: number) => {
            const cellId = addressToId({ col: c, row: r });
            // Cell has content if it exists and raw is not an empty string
            return !!sheet.data[cellId]?.raw;
        };

        const isCurrentCellEmpty = !hasContent(col, row);
        let newRow = row;
        let newCol = col;

        switch (direction) {
            case 'down': {
                let r = row + 1;
                if (isCurrentCellEmpty) {
                    while (r <= sheet.lastUsedRow && !hasContent(col, r)) r++;
                    newRow = (r > sheet.lastUsedRow) ? sheet.lastUsedRow : r;
                } else {
                    while (r <= sheet.lastUsedRow && hasContent(col, r)) r++;
                    newRow = r - 1;
                }
                break;
            }
            case 'up': {
                let r = row - 1;
                if (isCurrentCellEmpty) {
                    while (r >= 0 && !hasContent(col, r)) r--;
                    newRow = (r < 0) ? 0 : r;
                } else {
                    while (r >= 0 && hasContent(col, r)) r--;
                    newRow = r + 1;
                }
                break;
            }
            case 'right': {
                let c = col + 1;
                if (isCurrentCellEmpty) {
                    while (c <= sheet.lastUsedCol && !hasContent(c, row)) c++;
                    newCol = (c > sheet.lastUsedCol) ? sheet.lastUsedCol : c;
                } else {
                    while (c <= sheet.lastUsedCol && hasContent(c, row)) c++;
                    newCol = c - 1;
                }
                break;
            }
            case 'left': {
                let c = col - 1;
                if (isCurrentCellEmpty) {
                    while (c >= 0 && !hasContent(c, row)) c--;
                    newCol = (c < 0) ? 0 : c;
                } else {
                    while (c >= 0 && hasContent(c, row)) c--;
                    newCol = c + 1;
                }
                break;
            }
        }
        
        const newAddress = { col: newCol, row: newRow };
        sheet.activeCell = newAddress;
        sheet.selection = { start: newAddress, end: newAddress };
    });
  },

  selectAll: () => {
    set(state => {
      if (!state.workbook) return;
      const sheet = state.workbook.sheets[state.workbook.activeSheetId];
      if (!sheet) return;

      sheet.selection = {
        start: { col: 0, row: 0 },
        end: { col: sheet.lastUsedCol, row: sheet.lastUsedRow },
      };
    });
  },

  startEditing: (cellId, initialValue) => {
    const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
    if (!sheet) return;
    
    const address = idToAddress(cellId);
    const merge = findMergeForCell(address, sheet.merges);
    const targetCellId = merge ? addressToId(merge.start) : cellId;

    const cell = getOrCreateCell(sheet, targetCellId);
    
    const valueForFormulaCheck = initialValue !== undefined ? initialValue : cell.raw;
    const isEditingFormula = isFormula(valueForFormulaCheck);

    set({ 
        editingCellId: targetCellId, 
        editingValue: initialValue !== undefined ? initialValue : cell.raw,
        formulaSelection: isEditingFormula ? address : null,
        formulaRangeSelection: isEditingFormula ? { start: address, end: address } : null,
    });
    get().updateFormulaSuggestions(initialValue !== undefined ? initialValue : cell.raw);
  },

  setEditingValue: (value) => {
    set({ editingValue: value });
    get().updateFormulaSuggestions(value);
  },

  commitEditing: () => {
    const { editingCellId, editingValue: originalEditingValue, workbook } = get();
    if (editingCellId === null || !workbook) return;

    const sheet = workbook.sheets[workbook.activeSheetId];
    if (!sheet) return;

    const cellAddress = idToAddress(editingCellId);
    const validationRule = sheet.dataValidations.find(v => isCellInRange(cellAddress, v.range));

    if (validationRule && !validateValue(originalEditingValue, validationRule)) {
        alert(validationRule.errorMessage || 'The value you entered is not valid.');
        get().cancelEditing();
        return;
    }
    
    let finalEditingValue = originalEditingValue;
    if ((finalEditingValue.startsWith('+') || finalEditingValue.startsWith('-')) && /[A-Z]/i.test(finalEditingValue)) {
        finalEditingValue = '=' + finalEditingValue;
    }

    set(state => {
      if (!state.workbook) return;
      const sheet = state.workbook.sheets[state.workbook.activeSheetId];
      if (!sheet || !editingCellId) return;
      const changedIds = updateCellAndDependents(state.workbook, sheet, editingCellId, finalEditingValue);
      recalculate(state.workbook, sheet, changedIds);
    });

    get().cancelEditing();
    addSnapshot(get, set);
  },
  
  commitEditingAndMove: (direction) => {
      get().commitEditing();
      const sheet = get().workbook?.sheets[get().workbook!.activeSheetId];
      if(!sheet) return;
      
      let {col, row} = sheet.activeCell;
      if (direction === 'up') row = Math.max(0, row - 1);
      if (direction === 'down') row = Math.min(sheet.lastUsedRow + 10, row + 1);
      if (direction === 'left') col = Math.max(0, col - 1);
      if (direction === 'right') col = Math.min(sheet.lastUsedCol + 5, col + 1);
      get().setActiveCell({col, row});
  },

  cancelEditing: () => set({ editingCellId: null, editingValue: '', formulaSelection: null, formulaRangeSelection: null, formulaSuggestions: [], selectedSuggestionIndex: 0 }),

  moveFormulaSelection: (direction) => {
    set(state => {
      if(!state.editingCellId || !state.formulaSelection) return;
      let {col, row} = state.formulaSelection;

      if (direction === 'up') row = Math.max(0, row - 1);
      if (direction === 'down') row = row + 1;
      if (direction === 'left') col = Math.max(0, col - 1);
      if (direction === 'right') col = col + 1;
      
      const newSelection = {col, row};
      const newCellId = addressToId(newSelection);
      
      const regex = /([A-Z]+[0-9]+)(?::[A-Z]+[0-9]+)?$/i;
      
      if(regex.test(state.editingValue)) {
          state.editingValue = state.editingValue.replace(regex, newCellId);
      } else {
          state.editingValue += newCellId;
      }
      state.formulaSelection = newSelection;
      state.formulaRangeSelection = { start: newSelection, end: newSelection };
    });
  },

  extendFormulaSelection: (direction: 'up' | 'down' | 'left' | 'right') => {
    set(state => {
        if (!state.editingCellId || !state.formulaSelection || !state.formulaRangeSelection) return;
        
        let { col, row } = state.formulaSelection;

        if (direction === 'up') row = Math.max(0, row - 1);
        if (direction === 'down') row = row + 1;
        if (direction === 'left') col = Math.max(0, col - 1);
        if (direction === 'right') col = col + 1;

        const newActiveCell = { col, row };
        state.formulaSelection = newActiveCell;
        state.formulaRangeSelection.end = newActiveCell;

        const sortedRange = sortRange(state.formulaRangeSelection);
        const startId = addressToId(sortedRange.start);
        const endId = addressToId(sortedRange.end);
        
        let rangeString = startId;
        if (startId !== endId) {
            rangeString += `:${endId}`;
        }

        const regex = /([A-Z]+[0-9]+)(?::[A-Z]+[0-9]+)?$/i;
        if (regex.test(state.editingValue)) {
            state.editingValue = state.editingValue.replace(regex, rangeString);
        } else if (state.editingValue.endsWith('(') || state.editingValue.endsWith(',')) {
            state.editingValue += rangeString;
        }
    });
  },

  updateFormulaSuggestions: (text) => {
    if (!isFormula(text) || text.endsWith(')')) {
        set({ formulaSuggestions: [], selectedSuggestionIndex: 0 });
        return;
    }
    const match = text.match(/([A-Z0-9_]+)\($/i) ?? text.match(/([A-Z0-9_]+)$/i);
    if (match) {
        const query = match[1].toUpperCase();
        const suggestions = FUNCTION_NAMES.filter(name => name.startsWith(query));
        set({ formulaSuggestions: suggestions, selectedSuggestionIndex: 0 });
    } else {
        set({ formulaSuggestions: [], selectedSuggestionIndex: 0 });
    }
  },

  selectNextSuggestion: () => {
    set(state => {
        if (state.formulaSuggestions.length === 0) return;
        state.selectedSuggestionIndex = (state.selectedSuggestionIndex + 1) % state.formulaSuggestions.length;
    });
  },

  selectPreviousSuggestion: () => {
    set(state => {
        if (state.formulaSuggestions.length === 0) return;
        const newIndex = state.selectedSuggestionIndex - 1;
        state.selectedSuggestionIndex = newIndex < 0 ? state.formulaSuggestions.length - 1 : newIndex;
    });
  },

  applySuggestion: () => {
    set(state => {
        if (state.formulaSuggestions.length > 0) {
            const suggestion = state.formulaSuggestions[state.selectedSuggestionIndex];
            const regex = /([A-Z0-9_]+)$/i;
            const match = state.editingValue.match(regex);
            if (match) {
                state.editingValue = state.editingValue.substring(0, match.index) + suggestion + '(';
            }
            state.formulaSuggestions = [];
            state.selectedSuggestionIndex = 0;
        }
    });
  },
});
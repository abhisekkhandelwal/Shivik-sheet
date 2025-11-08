
import { StateCreator } from 'zustand';
import { SpreadsheetStore, Workbook } from '../types';
import { createInitialSheet, addSnapshot } from '../storeHelpers';

export const createWorkbookSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], Pick<SpreadsheetStore, 'loadWorkbook' | 'createWorkbook' | 'addSheet' | 'deleteSheet' | 'renameSheet' | 'setActiveSheet' | 'toggleConditionalFormattingPanel' | 'toggleDataValidationDialog'>> = (set, get) => ({
  loadWorkbook: (workbook) => {
    set({ workbook, history: [JSON.parse(JSON.stringify(workbook))], historyIndex: 0 });
  },

  createWorkbook: (name) => {
    const firstSheet = createInitialSheet('Sheet1');
    const newWorkbook: Workbook = {
      id: `wb_${Date.now()}`,
      name,
      sheets: { [firstSheet.id]: firstSheet },
      activeSheetId: firstSheet.id,
    };
    set({ workbook: newWorkbook, history: [JSON.parse(JSON.stringify(newWorkbook))], historyIndex: 0 });
  },

  addSheet: (name) => {
    set((state) => {
      if (state.workbook) {
        const sheetCount = Object.keys(state.workbook.sheets).length;
        const newSheet = createInitialSheet(name || `Sheet${sheetCount + 1}`);
        state.workbook.sheets[newSheet.id] = newSheet;
        state.workbook.activeSheetId = newSheet.id;
      }
    });
    addSnapshot(get, set);
  },
  
  deleteSheet: (sheetId) => {
    set(state => {
        if(state.workbook && Object.keys(state.workbook.sheets).length > 1) {
            delete state.workbook.sheets[sheetId];
            if(state.workbook.activeSheetId === sheetId) {
                state.workbook.activeSheetId = Object.keys(state.workbook.sheets)[0];
            }
        }
    });
    addSnapshot(get, set);
  },

  renameSheet: (sheetId, newName) => {
    set(state => {
        if(state.workbook?.sheets[sheetId]) {
            state.workbook.sheets[sheetId].name = newName;
        }
    });
    addSnapshot(get, set);
  },

  setActiveSheet: (sheetId) => set(state => {
    if(state.workbook) state.workbook.activeSheetId = sheetId;
  }),

  toggleConditionalFormattingPanel: () => {
    set(state => {
        state.isConditionalFormattingPanelOpen = !state.isConditionalFormattingPanelOpen;
    });
  },

  toggleDataValidationDialog: () => {
      set(state => {
          state.isDataValidationDialogOpen = !state.isDataValidationDialogOpen;
      });
  },
});
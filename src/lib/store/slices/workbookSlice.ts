
import { StateCreator } from 'zustand';
import { SpreadsheetStore, Workbook, ImportResult, Range } from '../types';
import { createInitialSheet, addSnapshot, getOrCreateCell } from '../storeHelpers';
import { addressToId } from '../../utils/cellUtils';
// FIX: Added imports for AI formatting analysis functions.
import { analyzeSheetFormat, applyAiFormattingRules } from '../../ai/formatAnalyzer';

// FIX: Added 'runAiAutoFormat' to the Pick utility type.
export const createWorkbookSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], Pick<SpreadsheetStore, 'loadWorkbook' | 'createWorkbook' | 'addSheet' | 'deleteSheet' | 'renameSheet' | 'setActiveSheet' | 'toggleConditionalFormattingPanel' | 'toggleDataValidationDialog' | 'importWorkbook' | 'defineName' | 'toggleChartBuilder' | 'setAiAnalyzing' | 'importFloorPlan' | 'runAiAutoFormat'>> = (set, get) => ({
  loadWorkbook: (workbook) => {
    // Rehydrate any Sets that were serialized
    for (const sheetId in workbook.sheets) {
        const sheet = workbook.sheets[sheetId];
        if (sheet.hiddenRows && !(sheet.hiddenRows instanceof Set)) {
             sheet.hiddenRows = new Set((sheet.hiddenRows as any).data || sheet.hiddenRows);
        }
    }
    const stringified = JSON.stringify(workbook);
    set({ workbook, history: [JSON.parse(stringified)], historyIndex: 0 });
  },

  importWorkbook: (result: ImportResult, name: string) => {
    const newWorkbook: Workbook = {
        id: `wb_${Date.now()}`,
        name,
        sheets: result.sheets,
        activeSheetId: result.activeSheet,
    };
    for (const sheetId in newWorkbook.sheets) {
        const sheet = newWorkbook.sheets[sheetId];
        if (sheet.hiddenRows && !(sheet.hiddenRows instanceof Set)) {
            sheet.hiddenRows = new Set((sheet.hiddenRows as any).data || []);
        }
    }
    set({ workbook: newWorkbook, history: [JSON.parse(JSON.stringify(newWorkbook))], historyIndex: 0 });
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

  defineName: (name, range, sheetId) => {
    set(state => {
        if (!state.workbook) return;
        if (!state.workbook.namedRanges) {
            state.workbook.namedRanges = {};
        }
        state.workbook.namedRanges[name.toUpperCase()] = { sheetId, range };
    });
    addSnapshot(get, set);
  },

  toggleChartBuilder: () => {
    set(state => {
        state.isChartBuilderOpen = !state.isChartBuilderOpen;
        if (state.isChartBuilderOpen) {
            // close other panels if they are open
            state.isConditionalFormattingPanelOpen = false;
        }
    });
  },

  setAiAnalyzing: (isAnalyzing: boolean) => {
    set({ isAiAnalyzing: isAnalyzing });
  },

  importFloorPlan: (cells) => {
    set(state => {
      if (!state.workbook) return;
      
      const sheetCount = Object.keys(state.workbook.sheets).length;
      const newSheet = createInitialSheet(`Floor Plan ${sheetCount}`);
      state.workbook.sheets[newSheet.id] = newSheet;
      state.workbook.activeSheetId = newSheet.id;

      let maxRow = 0;
      let maxCol = 0;

      cells.forEach(({ row, col, color }) => {
        maxRow = Math.max(maxRow, row);
        maxCol = Math.max(maxCol, col);
        const cellId = addressToId({ row, col });
        const cell = getOrCreateCell(newSheet, cellId);
        cell.style.fillColor = color;
        newSheet.data[cellId] = cell;
      });

      newSheet.lastUsedRow = maxRow;
      newSheet.lastUsedCol = maxCol;

      // Make cells square for better appearance
      for (let c = 0; c <= maxCol; c++) {
          newSheet.columns[c] = { id: c, width: 25 };
      }
      for (let r = 0; r <= maxRow; r++) {
          newSheet.rows[r] = { id: r, height: 25 };
      }
    });
    addSnapshot(get, set);
  },
  // FIX: Added implementation for 'runAiAutoFormat'.
  runAiAutoFormat: () => {
    const runAsync = async () => {
        set({ isAiAnalyzing: true });
        try {
            const { workbook } = get();
            if (!workbook) throw new Error("No active workbook.");
            const sheet = workbook.sheets[workbook.activeSheetId];
            if (!sheet) throw new Error("No active sheet.");

            const simpleCells: any[] = [];
            for (let r = 0; r <= Math.min(sheet.lastUsedRow, 50); r++) {
                for (let c = 0; c <= sheet.lastUsedCol; c++) {
                    const cellId = addressToId({col: c, row: r});
                    const storeCell = sheet.data[cellId];
                    if (storeCell && storeCell.value !== null && String(storeCell.value).trim() !== '') {
                        simpleCells.push({
                            id: cellId,
                            value: storeCell.value,
                            originalStyle: storeCell.style,
                        });
                    }
                }
            }

            if(simpleCells.length === 0) {
                alert("AI Auto-Format: The sheet appears to be empty.");
                return;
            }

            const formattingRules = await analyzeSheetFormat(simpleCells);
            
            if (formattingRules && formattingRules.length > 0) {
                set(state => {
                    const sheet = state.workbook!.sheets[state.workbook!.activeSheetId];
                    applyAiFormattingRules(sheet, formattingRules);
                });
                addSnapshot(get, set);
            } else {
                alert("AI Auto-Format: No formatting suggestions were generated.");
            }

        } catch (e: any) {
            console.error(e);
            alert(`AI Auto-Format failed: ${e.message}`);
        } finally {
            set({ isAiAnalyzing: false });
        }
    };
    runAsync();
  }
});
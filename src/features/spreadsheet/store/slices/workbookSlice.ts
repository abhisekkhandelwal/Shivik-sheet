

import { StateCreator } from 'zustand';
// FIX: Import the WorkbookSlice type to resolve the 'Cannot find name' error.
import { SpreadsheetStore, Workbook, ImportResult, Range, WorkbookSlice } from '../../../../lib/store/types';
import { createInitialSheet, addSnapshot, getOrCreateCell, updateCellAndDependents, recalculate } from '../storeHelpers';
import { addressToId } from '../../utils/cellUtils';
import { analyzeSheetFormat, applyAiFormattingRules } from '../../services/ai/formatAnalyzer';

export const createWorkbookSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], WorkbookSlice> = (set, get) => ({
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
    set({ workbook: newWorkbook });

    // Apply AI-generated formulas if they exist
    if (result.aiFormulas && result.aiFormulas.length > 0) {
        set(state => {
            const sheet = state.workbook!.sheets[state.workbook!.activeSheetId];
            const allChangedIds = new Set<string>();
            result.aiFormulas?.forEach(({ cellId, formula }) => {
                const changed = updateCellAndDependents(state.workbook!, sheet, cellId, formula);
                changed.forEach(id => allChangedIds.add(id));
            });
            recalculate(state.workbook!, sheet, allChangedIds);
        });
    }

    addSnapshot(get, set);
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
        if (state.isConditionalFormattingPanelOpen) {
            state.isChartBuilderOpen = false;
        }
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
  
  runAiAutoFormat: () => {
    const runAsync = async () => {
        set({ isAiAnalyzing: true });
        try {
            const { workbook } = get();
            if (!workbook) throw new Error("No active workbook.");
            const sheet = workbook.sheets[workbook.activeSheetId];
            if (!sheet) throw new Error("No active sheet.");

            const simpleCells: any[] = [];
            const maxRow = Math.min(sheet.lastUsedRow + 10, 100); // Increased buffer
            const maxCol = sheet.lastUsedCol;

            for (let r = 0; r <= maxRow; r++) {
                for (let c = 0; c <= maxCol; c++) {
                    const cellId = addressToId({col: c, row: r});
                    const storeCell = sheet.data[cellId];
                    if (storeCell && storeCell.value !== null && String(storeCell.value).trim() !== '') {
                        simpleCells.push({
                            id: cellId,
                            value: storeCell.value,
                            originalStyle: storeCell.style,
                        });
                    } else {
                        simpleCells.push({ id: cellId, value: null });
                    }
                }
            }
            
            if(simpleCells.length === 0) {
                alert("AI: The sheet appears to be empty.");
                return;
            }

            const { rules, formulas } = await analyzeSheetFormat(simpleCells);
            
            if ((!rules || rules.length === 0) && (!formulas || formulas.length === 0)) {
                alert("AI: No formatting or formula suggestions were generated. The sheet may already be complete.");
                return;
            }

            set(state => {
                const currentSheet = state.workbook!.sheets[state.workbook!.activeSheetId];
                if (rules && rules.length > 0) {
                    applyAiFormattingRules(currentSheet, rules);
                }

                if (formulas && formulas.length > 0) {
                    const allChangedIds = new Set<string>();
                    formulas.forEach(({ cellId, formula }) => {
                        // Only apply if cell is still empty
                        const existingCell = currentSheet.data[cellId];
                        if (!existingCell || existingCell.value === null || existingCell.raw === '') {
                            const changed = updateCellAndDependents(state.workbook!, currentSheet, cellId, formula);
                            changed.forEach(id => allChangedIds.add(id));
                        }
                    });
                    recalculate(state.workbook!, currentSheet, allChangedIds);
                }
            });

            addSnapshot(get, set);
            
            // Enhanced feedback
            const formulaCount = formulas?.length || 0;
            const ruleCount = rules?.length || 0;
            let message = 'AI analysis complete!\n\n';
            if (ruleCount > 0) message += `✓ Applied ${ruleCount} formatting rule${ruleCount !== 1 ? 's' : ''}\n`;
            if (formulaCount > 0) message += `✓ Generated ${formulaCount} formula${formulaCount !== 1 ? 's' : ''}`;
            alert(message);

        } catch (e: any) {
            console.error(e);
            alert(`AI analysis failed: ${e.message}`);
        } finally {
            set({ isAiAnalyzing: false });
        }
    };
    runAsync();
}
});

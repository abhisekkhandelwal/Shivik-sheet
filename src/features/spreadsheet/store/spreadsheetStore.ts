
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createWorkbookSlice } from './slices/workbookSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createStyleSlice } from './slices/styleSlice';
import { createClipboardSlice } from './slices/clipboardSlice';
import { createDataSlice } from './slices/dataSlice';
import { createStructureSlice } from './slices/structureSlice';
import { createHistorySlice } from './slices/historySlice';
import { createConditionalFormatSlice } from './slices/conditionalFormatSlice';
import { createDataValidationSlice } from './slices/dataValidationSlice';
import { createFilterSlice } from './slices/filterSlice';
import { createSortSlice } from './slices/sortSlice';
import { createChartSlice } from '../../../lib/store/slices/chartSlice';
import { SpreadsheetStore, Sheet } from '../../../lib/store/types';

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72];

export const useSpreadsheetStore = create<SpreadsheetStore>()(
  immer((...a) => ({
    // --- Initial State ---
    workbook: null,
    editingCellId: null,
    editingValue: '',
    formulaSelection: null,
    formulaRangeSelection: null,
    clipboardRange: null,
    clipboardMode: null,
    history: [],
    historyIndex: -1,
    isConditionalFormattingPanelOpen: false,
    isDataValidationDialogOpen: false,
    formulaSuggestions: [],
    selectedSuggestionIndex: 0,
    activeFilterMenu: null,
    isSortDialogOpen: false,
    isChartBuilderOpen: false,
    activeChartId: null,
    isAiAnalyzing: false,

    // --- Slices ---
    ...createWorkbookSlice(...a),
    ...createSelectionSlice(...a),
    ...createStyleSlice(...a),
    ...createClipboardSlice(...a),
    ...createDataSlice(...a),
    ...createStructureSlice(...a),
    ...createHistorySlice(...a),
    ...createConditionalFormatSlice(...a),
    ...createDataValidationSlice(...a),
    ...createFilterSlice(...a),
    ...createSortSlice(...a),
    ...createChartSlice(...a),
  }))
);

export const selectActiveSheet = (state: Pick<SpreadsheetStore, 'workbook'>): Sheet | undefined => {
  if (!state.workbook) return undefined;
  return state.workbook.sheets[state.workbook.activeSheetId];
};
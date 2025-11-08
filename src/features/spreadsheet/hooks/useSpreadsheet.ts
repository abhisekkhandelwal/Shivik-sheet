
import { useSpreadsheetStore, selectActiveSheet } from '../store/spreadsheetStore';
import { useMemo } from 'react';

/**
 * Custom hook to interact with the spreadsheet state.
 * It provides a clean interface for components to get data and dispatch actions.
 */
export const useSpreadsheet = () => {
    const store = useSpreadsheetStore();
    const activeSheet = useMemo(() => selectActiveSheet(store), [store.workbook, store.workbook?.activeSheetId]);
    const clipboardRange = useSpreadsheetStore(state => state.clipboardRange);
    const clipboardMode = useSpreadsheetStore(state => state.clipboardMode);

    const { renderRows, renderCols } = useMemo(() => {
        if (!activeSheet) {
            return { renderRows: 0, renderCols: 0 };
        }
        const renderRows = Math.max(100, activeSheet.lastUsedRow + 20);
        const renderCols = Math.max(26, activeSheet.lastUsedCol + 5);
        return { renderRows, renderCols };
    }, [activeSheet]);

    return {
        ...store,
        activeSheet,
        renderRows,
        renderCols,
        clipboardRange,
        clipboardMode,
    };
};
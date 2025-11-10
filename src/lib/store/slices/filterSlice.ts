
import { StateCreator } from 'zustand';
import { SpreadsheetStore, FilterSlice, Sheet } from '../types';
import { addSnapshot } from '../storeHelpers';
import { sortRange, findDataRegion } from '../../utils/rangeUtils';
import { addressToId, getDisplayValue } from '../../utils/cellUtils';

const recalculateHiddenRows = (sheet: Sheet) => {
    const hiddenRows = new Set<number>();
    if (!sheet.filter?.criteria || Object.keys(sheet.filter.criteria).length === 0) {
        sheet.hiddenRows = hiddenRows;
        return;
    }
    const { range, criteria } = sheet.filter;
    // Assume first row of filter range is header
    for (let r = range.start.row + 1; r <= range.end.row; r++) {
        let shouldHide = false;
        for (const colStr in criteria) {
            const col = parseInt(colStr, 10);
            const crit = criteria[col];
            const cellId = addressToId({ col, row: r });
            const cellValue = getDisplayValue(sheet.data[cellId]);
            if (!crit.values.has(cellValue)) {
                shouldHide = true;
                break;
            }
        }
        if (shouldHide) {
            hiddenRows.add(r);
        }
    }
    sheet.hiddenRows = hiddenRows;
};

export const createFilterSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], FilterSlice> = (set, get) => ({
    toggleFilter: () => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;

            if (sheet.filter) {
                // Turn off filter
                sheet.filter = undefined;
                sheet.hiddenRows = new Set();
            } else {
                // Turn on filter.
                // If selection is a single cell, find the current data region.
                // Otherwise, use the selection.
                const { activeCell, selection } = sheet;
                const sortedSelection = sortRange(selection);
                const isSingleCellSelection = (
                    sortedSelection.start.col === sortedSelection.end.col &&
                    sortedSelection.start.row === sortedSelection.end.row
                );

                const filterRange = isSingleCellSelection
                    ? findDataRegion(sheet, activeCell)
                    : sortedSelection;
                
                sheet.filter = { range: filterRange };
            }
        });
        addSnapshot(get, set);
    },
    openFilterMenu: (col: number) => {
        set({ activeFilterMenu: { col } });
    },
    closeFilterMenu: () => {
        set({ activeFilterMenu: null });
    },
    applyFilter: (col: number, values: Set<string>) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet || !sheet.filter) return;
            if (!sheet.filter.criteria) sheet.filter.criteria = {};

            sheet.filter.criteria[col] = { values };
            recalculateHiddenRows(sheet);
        });
        get().closeFilterMenu();
        addSnapshot(get, set);
    },
    clearColumnFilter: (col: number) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet || !sheet.filter?.criteria) return;

            delete sheet.filter.criteria[col];
            recalculateHiddenRows(sheet);
        });
        get().closeFilterMenu();
        addSnapshot(get, set);
    }
});
import { StateCreator } from 'zustand';
import { SpreadsheetStore, FilterSlice } from '../types';
import { addSnapshot } from '../storeHelpers';
import { sortRange } from '../../utils/rangeUtils';

export const createFilterSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], FilterSlice> = (set, get) => ({
    toggleFilter: () => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;

            if (sheet.filter) {
                // Turn off filter
                sheet.filter = undefined;
            } else {
                // Turn on filter for the current selection
                // A more robust implementation would find the "current region" if selection is a single cell.
                sheet.filter = { range: sortRange(sheet.selection) };
            }
        });
        addSnapshot(get, set);
    }
});
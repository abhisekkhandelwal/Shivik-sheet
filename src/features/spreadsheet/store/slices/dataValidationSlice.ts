import { StateCreator } from 'zustand';
import { SpreadsheetStore, DataValidationSlice, DataValidationRule, Range } from '../types';
import { addSnapshot } from '../storeHelpers';
import { sortRange } from '../../utils/rangeUtils';

const areRangesEqual = (r1: Range, r2: Range) => {
    const sr1 = sortRange(r1);
    const sr2 = sortRange(r2);
    return sr1.start.col === sr2.start.col &&
           sr1.start.row === sr2.start.row &&
           sr1.end.col === sr2.end.col &&
           sr1.end.row === sr2.end.row;
};

export const createDataValidationSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], DataValidationSlice> = (set, get) => ({
    setDataValidation: (rule: DataValidationRule) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;

            // Remove existing rules on the same range to avoid duplicates
            sheet.dataValidations = sheet.dataValidations.filter(
                (existingRule) => !areRangesEqual(existingRule.range, rule.range)
            );
            
            sheet.dataValidations.push(rule);
        });
        addSnapshot(get, set);
    },
    removeDataValidation: (range: Range) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;

            sheet.dataValidations = sheet.dataValidations.filter(
                (existingRule) => !areRangesEqual(existingRule.range, range)
            );
        });
        addSnapshot(get, set);
    },
});
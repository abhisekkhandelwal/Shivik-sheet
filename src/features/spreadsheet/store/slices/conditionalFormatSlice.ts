
import { StateCreator } from 'zustand';
import { SpreadsheetStore, ConditionalFormatSlice, ConditionalFormatRule } from '../../../../lib/store/types';
import { addSnapshot } from '../storeHelpers';

export const createConditionalFormatSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], ConditionalFormatSlice> = (set, get) => ({
    addConditionalFormat: (rule: Omit<ConditionalFormatRule, 'id'>) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;
            
            const newRule: ConditionalFormatRule = {
                ...rule,
                id: `cf-${Date.now()}`
            };
            sheet.conditionalFormats.push(newRule);
        });
        addSnapshot(get, set);
    },
    removeConditionalFormat: (ruleId: string) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;
            sheet.conditionalFormats = sheet.conditionalFormats.filter(rule => rule.id !== ruleId);
        });
        addSnapshot(get, set);
    },
});
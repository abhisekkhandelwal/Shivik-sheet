
import { StateCreator } from 'zustand';
import { SpreadsheetStore, HistorySlice } from '../../../../lib/store/types';

const rehydrateSet = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null && value._type === 'set') {
        return new Set(value.data);
    }
    return value;
};

export const createHistorySlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], HistorySlice> = (set, get) => ({
  history: [],
  historyIndex: -1,

  undo: () => {
    set(state => {
        if(state.historyIndex > 0) {
            state.historyIndex -= 1;
            const newWorkbookState = JSON.parse(JSON.stringify(state.history[state.historyIndex]), rehydrateSet);
            state.workbook = newWorkbookState;
        }
    });
  },
  
  redo: () => {
    set(state => {
        if(state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            const newWorkbookState = JSON.parse(JSON.stringify(state.history[state.historyIndex]), rehydrateSet);
            state.workbook = newWorkbookState;
        }
    })
  },
});
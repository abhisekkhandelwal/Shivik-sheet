
import { StateCreator } from 'zustand';
import { SpreadsheetStore, HistorySlice } from '../types';

export const createHistorySlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], HistorySlice> = (set, get) => ({
  history: [],
  historyIndex: -1,

  undo: () => {
    set(state => {
        if(state.historyIndex > 0) {
            state.historyIndex -= 1;
            state.workbook = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        }
    });
  },
  
  redo: () => {
    set(state => {
        if(state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            state.workbook = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        }
    })
  },
});
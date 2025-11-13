import { StateCreator } from 'zustand';
import { SpreadsheetStore, ChartSlice, ChartConfig } from '../types';
import { addSnapshot } from '../storeHelpers';

export const createChartSlice: StateCreator<SpreadsheetStore, [['zustand/immer', never]], [], ChartSlice> = (set, get) => ({
    addChart: (config) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet) return;

            const newChart: ChartConfig = {
                ...config,
                id: `chart_${Date.now()}`,
            };
            if (!sheet.charts) sheet.charts = [];
            sheet.charts.push(newChart);
        });
        addSnapshot(get, set);
    },
    updateChart: (chartId, updates) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet || !sheet.charts) return;
            
            const chartIndex = sheet.charts.findIndex(c => c.id === chartId);
            if (chartIndex > -1) {
                sheet.charts[chartIndex] = { ...sheet.charts[chartIndex], ...updates };
            }
        });
        addSnapshot(get, set);
    },
    deleteChart: (chartId) => {
        set(state => {
            if (!state.workbook) return;
            const sheet = state.workbook.sheets[state.workbook.activeSheetId];
            if (!sheet || !sheet.charts) return;
            sheet.charts = sheet.charts.filter(c => c.id !== chartId);
        });
        addSnapshot(get, set);
    },
    setActiveChart: (chartId) => {
        set({ activeChartId: chartId });
    }
});
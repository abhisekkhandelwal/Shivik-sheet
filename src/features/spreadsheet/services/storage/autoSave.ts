
import { useEffect, useCallback } from 'react';
import { useSpreadsheetStore } from '../../store/spreadsheetStore';
import { indexedDB, StoredSpreadsheet } from './indexedDB';
import { Workbook } from '../../store/types';

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

export const useAutoSave = () => {
    const workbook = useSpreadsheetStore(state => state.workbook);

    const debouncedSave = useCallback(
        debounce(async (wb: Workbook | null) => {
            if (wb) {
                try {
                    const existing = await indexedDB.get(wb.id);
                    const spreadsheetToSave: StoredSpreadsheet = {
                        id: wb.id,
                        name: wb.name,
                        data: wb,
                        updatedAt: Date.now(),
                        createdAt: existing?.createdAt ?? Date.now(),
                    };
                    await indexedDB.save(spreadsheetToSave);
                } catch (err) {
                    console.error("Auto-save failed:", err);
                }
            }
        }, 2000), 
    []);

    useEffect(() => {
        debouncedSave(workbook);
    }, [workbook, debouncedSave]);
};


import { Sheet } from '../store/types';
import { addressToId, getDisplayValue } from '../utils/cellUtils';

const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const exportToCSV = (sheet: Sheet) => {
    const { data, lastUsedRow, lastUsedCol } = sheet;
    let csvContent = '';

    for (let r = 0; r <= lastUsedRow; r++) {
        const row: string[] = [];
        for (let c = 0; c <= lastUsedCol; c++) {
            const cellId = addressToId({ col: c, row: r });
            const cell = data[cellId];
            const value = getDisplayValue(cell);
            const escapedValue = `"${String(value).replace(/"/g, '""')}"`;
            row.push(escapedValue);
        }
        csvContent += row.join(',') + '\r\n';
    }

    downloadFile(csvContent, `${sheet.name}.csv`, 'text/csv;charset=utf-8;');
};

export const exportToJSON = (sheet: Sheet) => {
    const { data, lastUsedRow, lastUsedCol } = sheet;
    const jsonData: Record<string, any>[] = [];
    
    const headers: string[] = [];
    for (let c = 0; c <= lastUsedCol; c++) {
        const cellId = addressToId({ col: c, row: 0 });
        headers.push(getDisplayValue(data[cellId]) || `Column_${c + 1}`);
    }

    for (let r = 1; r <= lastUsedRow; r++) {
        const rowObject: Record<string, any> = {};
        for (let c = 0; c <= lastUsedCol; c++) {
            const cellId = addressToId({ col: c, row: r });
            rowObject[headers[c]] = data[cellId]?.value ?? null;
        }
        jsonData.push(rowObject);
    }
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    downloadFile(jsonString, `${sheet.name}.json`, 'application/json;charset=utf-8;');
};
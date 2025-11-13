
import * as XLSX from 'xlsx';
import { ImportResult, Sheet, CellData, CellStyle } from '../../store/types';
import { addressToId, idToAddress, colIndexToLabel } from '../../utils/cellUtils';
import { analyzeSheetFormat, applyAiFormattingRules } from '../ai/formatAnalyzer';

const getDefaultCellStyle = (): CellStyle => ({
    fontFamily: 'Inter',
    fontSize: 11,
    textColor: '#000000',
    fillColor: '#ffffff',
    textAlign: 'left',
    vAlign: 'middle',
    wrap: false,
});

// This is the raw data parser, without styles from the xlsx file itself
const parseXLSXData = (content: ArrayBuffer): ImportResult => {
    const workbook = XLSX.read(content, { type: 'buffer', cellDates: true });
    const sheets: Record<string, Sheet> = {};
    let firstSheetId = '';

    workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const data: Record<string, CellData> = {};
        let lastUsedRow = 0;
        let lastUsedCol = 0;

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        lastUsedRow = range.e.r;
        lastUsedCol = range.e.c;

        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = worksheet[cell_ref];

                if (cell) {
                    const cellId = colIndexToLabel(C) + (R + 1);
                    const rawValue = cell.f ? `=${cell.f}` : (cell.w ?? String(cell.v ?? ''));
                    data[cellId] = {
                        id: cellId,
                        raw: rawValue,
                        value: cell.v ?? null,
                        style: getDefaultCellStyle(),
                    };
                }
            }
        }

        const sheetId = `sheet_${Date.now()}_${index}`;
        if(index === 0) firstSheetId = sheetId;
        
        sheets[sheetId] = {
            id: sheetId,
            name: sheetName,
            data,
            columns: {},
            rows: {},
            merges: (worksheet['!merges'] || []).map((m: any) => ({
                start: { col: m.s.c, row: m.s.r },
                end: { col: m.e.c, row: m.e.r },
            })),
            charts: [],
            filter: undefined,
            hiddenRows: new Set(),
            conditionalFormats: [],
            dataValidations: [],
            activeCell: { col: 0, row: 0 },
            selection: { start: { col: 0, row: 0 }, end: { col: 0, row: 0 } },
            lastUsedRow,
            lastUsedCol,
        };
    });

    return { sheets, activeSheet: firstSheetId };
}


const parseCSV = (content: string, sheetName: string = 'Sheet1'): ImportResult => {
  const lines = content.split(/\r?\n/);
  const data: Record<string, CellData> = {};
  let lastUsedRow = -1;
  let lastUsedCol = -1;

  lines.forEach((line, rowIndex) => {
    if (!line.trim() && rowIndex === lines.length - 1) return;
    lastUsedRow = rowIndex;

    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);
    lastUsedCol = Math.max(lastUsedCol, values.length - 1);

    values.forEach((value, colIndex) => {
      const cellRef = colIndexToLabel(colIndex) + (rowIndex + 1);
      const trimmed = value.trim().replace(/^"|"$/g, '');

      if (trimmed) {
        const num = Number(trimmed);
        data[cellRef] = {
          id: cellRef,
          raw: trimmed,
          value: !trimmed.trim() ? null : (isNaN(num) ? trimmed : num),
          style: getDefaultCellStyle(),
        };
      }
    });
  });

  const sheetId = `sheet_${Date.now()}`;
  const newSheet: Sheet = {
    id: sheetId,
    name: sheetName,
    data,
    columns: {},
    rows: {},
    merges: [],
    charts: [],
    filter: undefined,
    hiddenRows: new Set(),
    conditionalFormats: [],
    dataValidations: [],
    activeCell: { col: 0, row: 0 },
    selection: { start: { col: 0, row: 0 }, end: { col: 0, row: 0 } },
    lastUsedRow: Math.max(0, lastUsedRow),
    lastUsedCol: Math.max(0, lastUsedCol),
  };

  return { sheets: { [sheetId]: newSheet }, activeSheet: sheetId };
};

const parseJSON = (content: string, sheetName: string = 'Sheet1'): ImportResult => {
  try {
    const jsonData = JSON.parse(content);
    const data: Record<string, CellData> = {};
    let lastUsedRow = -1;
    let lastUsedCol = -1;

    if (Array.isArray(jsonData)) {
      if (jsonData.length > 0) {
        const keys = Object.keys(jsonData[0]);
        lastUsedCol = keys.length - 1;
        keys.forEach((key, colIndex) => {
          const cellRef = colIndexToLabel(colIndex) + '1';
          data[cellRef] = { id: cellRef, raw: key, value: key, style: { ...getDefaultCellStyle(), bold: true } };
        });
        jsonData.forEach((row, rowIndex) => {
          lastUsedRow = rowIndex + 1;
          keys.forEach((key, colIndex) => {
            const cellRef = colIndexToLabel(colIndex) + (rowIndex + 2);
            const value = row[key];
            const raw = String(value ?? '');
            const num = Number(raw);
            data[cellRef] = { id: cellRef, raw, value: !raw.trim() ? null : (isNaN(num) ? raw : num), style: getDefaultCellStyle() };
          });
        });
      }
    }

    const sheetId = `sheet_${Date.now()}`;
    const newSheet: Sheet = {
        id: sheetId,
        name: sheetName,
        data,
        columns: {},
        rows: {},
        merges: [],
        charts: [],
        filter: undefined,
        hiddenRows: new Set(),
        conditionalFormats: [],
        dataValidations: [],
        activeCell: { col: 0, row: 0 },
        selection: { start: { col: 0, row: 0 }, end: { col: 0, row: 0 } },
        lastUsedRow: Math.max(0, lastUsedRow),
        lastUsedCol: Math.max(0, lastUsedCol),
    };

    return { sheets: { [sheetId]: newSheet }, activeSheet: sheetId };
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};


export const importFile = async (file: File, setAiAnalyzing: (isAnalyzing: boolean) => void): Promise<ImportResult> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx') {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
              try {
                  const content = e.target?.result as ArrayBuffer;
                  
                  setAiAnalyzing(true);
                  
                  const workbookForAi = XLSX.read(content, { 
                      type: 'buffer', 
                      cellStyles: true,
                      cellNF: true
                  });
                  
                  const firstSheetName = workbookForAi.SheetNames[0];
                  if (!firstSheetName) {
                    setAiAnalyzing(false);
                    return reject(new Error("No sheets found in the workbook."));
                  }
                  const worksheetForAi = workbookForAi.Sheets[firstSheetName];
                  
                  const simpleCells: any[] = [];
                  const range = XLSX.utils.decode_range(worksheetForAi['!ref'] || 'A1');
                  
                  const maxRow = Math.min(range.e.r, 100);
                  const maxCol = Math.min(range.e.c, 26);

                  for (let R = range.s.r; R <= maxRow; ++R) {
                      for (let C = range.s.c; C <= maxCol; ++C) {
                          const cellId = addressToId({col: C, row: R});
                          const xlsxCell = worksheetForAi[cellId];
                          
                          if (xlsxCell && xlsxCell.v !== undefined && String(xlsxCell.v).trim() !== '') {
                              const cellPayload: any = { id: cellId, value: xlsxCell.v };
                              if (xlsxCell.z) {
                                  cellPayload.numberFormat = xlsxCell.z;
                              }

                              const style = xlsxCell.s;
                              if (style) {
                                  const originalStyle: any = {};
                                  const argbToRgb = (argb: string | undefined): string | undefined => {
                                      if (!argb) return undefined;
                                      if (argb.length >= 6) return `#${argb.slice(argb.length - 6)}`;
                                      return undefined;
                                  };
                                  const getColor = (colorObj: any): string | undefined => {
                                      if (!colorObj) return undefined;
                                      if (colorObj.rgb) return argbToRgb(colorObj.rgb);
                                      return undefined;
                                  };

                                  if (style.font) {
                                      if (style.font.bold) originalStyle.bold = true;
                                      const textColor = getColor(style.font.color);
                                      if (textColor) originalStyle.textColor = textColor;
                                  }
                                  if (style.fill && style.fill.fgColor) {
                                      const fillColor = getColor(style.fill.fgColor);
                                      if (fillColor) originalStyle.fillColor = fillColor;
                                  }
                                  if (style.alignment && style.alignment.horizontal) {
                                      originalStyle.textAlign = style.alignment.horizontal;
                                  }

                                  if (Object.keys(originalStyle).length > 0) {
                                      cellPayload.originalStyle = originalStyle;
                                  }
                              }

                              simpleCells.push(cellPayload);
                          } else {
                              simpleCells.push({ id: cellId, value: null });
                          }
                      }
                  }
                  
                  const { rules, formulas } = await analyzeSheetFormat(simpleCells);
                  
                  let importResult = parseXLSXData(content);

                  if (rules && rules.length > 0) {
                    Object.values(importResult.sheets).forEach(sheet => {
                        applyAiFormattingRules(sheet, rules);
                    });
                  }
                  
                  importResult.aiFormulas = formulas;

                  setAiAnalyzing(false);
                  resolve(importResult);

              } catch (error) {
                  console.error('Import error:', error);
                  setAiAnalyzing(false);
                  reject(error);
              }
          };
          reader.onerror = () => {
              setAiAnalyzing(false);
              reject(new Error('Failed to read file'));
          };
          reader.readAsArrayBuffer(file);
      });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        switch (extension) {
          case 'csv':
          case 'txt':
            resolve(parseCSV(content, file.name.replace(/\.(csv|txt)$/, '')));
            break;
          case 'json':
            resolve(parseJSON(content, file.name.replace('.json', '')));
            break;
          default:
            reject(new Error('Unsupported file format'));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

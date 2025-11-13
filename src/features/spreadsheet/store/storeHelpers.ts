import { evaluate, EvaluationContext } from '../../../lib/formulas';
import { addressToId, isFormula } from '../utils/cellUtils';
import { Sheet, CellData, CellStyle, Workbook, SpreadsheetStore } from '../../../lib/store/types';

const MAX_HISTORY_SIZE = 100;

export const getDefaultCellStyle = (): CellStyle => ({
    fontFamily: 'Inter',
    fontSize: 11,
    textColor: '#000000',
    fillColor: '#ffffff',
    textAlign: 'left',
    vAlign: 'middle',
    wrap: false,
});

export const createInitialSheet = (name: string): Sheet => ({
  id: `sheet_${Date.now()}`,
  name,
  data: {}, 
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
  lastUsedCol: 25, // Default to Z
  lastUsedRow: 99, // Default to 100 rows
});

export const getOrCreateCell = (sheet: Sheet, cellId: string): CellData => {
  const existing = sheet.data[cellId];
  if (existing) {
    if (!existing.style) {
      existing.style = getDefaultCellStyle();
    }
    return existing;
  }
  return { id: cellId, raw: '', value: null, style: getDefaultCellStyle() };
};

export const updateCellAndDependents = (workbook: Workbook, sheet: Sheet, cellId: string, rawValue: string): Set<string> => {
    const oldCell = getOrCreateCell(sheet, cellId);
    
    if (oldCell.dependencies) {
        oldCell.dependencies.forEach(depId => {
            const depCell = sheet.data[depId];
            if (depCell?.dependents) {
                depCell.dependents = depCell.dependents.filter(d => d !== cellId);
            }
        });
    }

    const newCell: CellData = { ...oldCell, raw: rawValue };
    if (!newCell.style) newCell.style = getDefaultCellStyle();
    
    if (isFormula(rawValue)) {
        newCell.formula = rawValue;
        const context: EvaluationContext = { workbook, activeSheetId: sheet.id, currentCellId: cellId };
        const { result, error, dependencies } = evaluate(rawValue, context);
        newCell.value = error || result;
        newCell.error = error;
        newCell.dependencies = dependencies;

        dependencies.forEach(depId => {
            const depCell = getOrCreateCell(sheet, depId);
            if (!depCell.dependents) depCell.dependents = [];
            if (!depCell.dependents.includes(cellId)) {
                depCell.dependents.push(cellId);
            }
            sheet.data[depId] = depCell;
        });

    } else {
        newCell.formula = undefined;
        newCell.dependencies = undefined;
        newCell.error = null;
        const num = Number(rawValue);
        newCell.value = !rawValue.trim() ? null : (isNaN(num) ? rawValue : num);
    }
    
    sheet.data[cellId] = newCell;
    return new Set<string>([cellId]);
};

export const recalculate = (workbook: Workbook, sheet: Sheet, changedCellIds: Set<string>) => {
    const queue = Array.from(changedCellIds);
    const visited = new Set<string>();

    while(queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const cell = sheet.data[currentId];
        if(cell?.dependents) {
            for(const dependentId of cell.dependents) {
                const dependentCell = sheet.data[dependentId];
                if(dependentCell?.formula) {
                   const context: EvaluationContext = { workbook, activeSheetId: sheet.id, currentCellId: dependentId };
                   const { result, error } = evaluate(dependentCell.formula, context);
                   dependentCell.value = error || result;
                   dependentCell.error = error;
                   queue.push(dependentId);
                }
            }
        }
    }
};

export const addSnapshot = (get: () => SpreadsheetStore, set: (partial: Partial<SpreadsheetStore> | ((state: SpreadsheetStore) => void)) => void) => {
    const { workbook, history, historyIndex } = get();
    if(!workbook) return;

    // Custom serialization to handle Set
    const serializedWorkbook = JSON.stringify(workbook, (key, value) => {
        if (value instanceof Set) {
            return { _type: 'set', data: Array.from(value) };
        }
        return value;
    });

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(serializedWorkbook));
    
    if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
    }

    set({ history: newHistory, historyIndex: newHistory.length - 1 });
}

export const insertFormula = (state: SpreadsheetStore, formulaName: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN') => {
    if (!state.workbook) return;
    const sheet = state.workbook.sheets[state.workbook.activeSheetId];
    if (!sheet) return;
    const { col, row } = sheet.activeCell;

    let startRow = -1;
    let startCol = -1;

    // Prioritize summing up a column of numbers
    for (let r = row - 1; r >= 0; r--) {
        const cell = sheet.data[addressToId({ col, row: r })];
        if (!cell || cell.value === null || typeof cell.value !== 'number') {
            break;
        }
        startRow = r;
    }

    if (startRow !== -1) {
        const startCell = addressToId({ col, row: startRow });
        const endCell = addressToId({ col, row: row - 1});
        const formula = `=${formulaName}(${startCell}:${endCell})`;
        const cellId = addressToId({col, row});
        const changed = updateCellAndDependents(state.workbook, sheet, cellId, formula);
        recalculate(state.workbook, sheet, changed);
        return;
    }

    // If no numbers above, try summing to the left
    for (let c = col - 1; c >= 0; c--) {
        const cell = sheet.data[addressToId({ col: c, row })];
        if (!cell || cell.value === null || typeof cell.value !== 'number') {
            break;
        }
        startCol = c;
    }

    if (startCol !== -1) {
        const startCell = addressToId({ col: startCol, row });
        const endCell = addressToId({ col: col - 1, row});
        const formula = `=${formulaName}(${startCell}:${endCell})`;
        const cellId = addressToId({col, row});
        const changed = updateCellAndDependents(state.workbook, sheet, cellId, formula);
        recalculate(state.workbook, sheet, changed);
    }
};
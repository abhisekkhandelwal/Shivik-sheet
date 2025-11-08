// --- Core Data Types ---
export type CellValue = string | number | boolean | null;

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  fillColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  format?: string; // e.g., 'currency', 'percent', 'date'
  decimalPlaces?: number;
  borderTop?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRight?: string;
}

export interface CellData {
  id: string; // e.g., 'A1'
  raw: string; // The raw user input, e.g., '=SUM(A2:A3)' or '123'
  value: CellValue; // The calculated/displayed value
  formula?: string; // The formula string, if it is one
  dependencies?: string[]; // List of cell IDs this cell depends on
  dependents?: string[]; // List of cell IDs that depend on this cell
  style: CellStyle;
  note?: string;
  error?: string | null;
}

export interface ConditionalFormatRule {
    id: string;
    range: Range;
    type: 'greaterThan' | 'lessThan' | 'equalTo' | 'textContains';
    value: string | number;
    style: Partial<CellStyle>;
}

export interface DataValidationRule {
    range: Range;
    type: 'list';
    allowBlank?: boolean;
    criteria: string[]; // for list, this is an array of options
    showErrorMessage?: boolean;
    errorMessage?: string;
}

// --- Structural Types ---
export interface CellAddress {
  col: number;
  row: number;
}

export interface Range {
  start: CellAddress;
  end: CellAddress;
}

export interface ColumnData {
  id: number;
  width?: number;
  hidden?: boolean;
}

export interface RowData {
  id: number;
  height?: number;
  hidden?: boolean;
}

export interface Sheet {
  id: string;
  name: string;
  data: Record<string, CellData>; // Keyed by cell ID, e.g., 'A1'
  columns: Record<number, ColumnData>;
  rows: Record<number, RowData>;
  merges: Range[];
  filter?: { range: Range };
  conditionalFormats: ConditionalFormatRule[];
  dataValidations: DataValidationRule[];
  activeCell: CellAddress;
  selection: Range;
  lastUsedRow: number;
  lastUsedCol: number;
}

export interface Workbook {
  id: string;
  name: string;
  sheets: Record<string, Sheet>; // Keyed by sheet ID
  activeSheetId: string;
}

// --- Store Types ---
export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export interface BaseState {
    workbook: Workbook | null;
    isConditionalFormattingPanelOpen: boolean;
    isDataValidationDialogOpen: boolean;
}

export interface WorkbookSlice {
    loadWorkbook: (workbook: Workbook) => void;
    createWorkbook: (name: string) => void;
    addSheet: (name?: string) => void;
    deleteSheet: (sheetId: string) => void;
    renameSheet: (sheetId: string, newName: string) => void;
    setActiveSheet: (sheetId: string) => void;
    toggleConditionalFormattingPanel: () => void;
    toggleDataValidationDialog: () => void;
}

export interface SelectionSlice {
    editingCellId: string | null;
    editingValue: string;
    formulaSelection: CellAddress | null;
    formulaRangeSelection: Range | null;
    formulaSuggestions: string[];
    selectedSuggestionIndex: number;
    setActiveCell: (address: CellAddress) => void;
    setSelection: (range: Range) => void;
    extendSelection: (direction: MoveDirection) => void;
    extendSelectionToEnd: (direction: MoveDirection) => void;
    moveActiveCellToEndOfData: (direction: MoveDirection) => void;
    selectAll: () => void;
    startEditing: (cellId: string, initialValue?: string) => void;
    setEditingValue: (value: string) => void;
    commitEditing: () => void;
    commitEditingAndMove: (direction: MoveDirection) => void;
    cancelEditing: () => void;
    moveFormulaSelection: (direction: MoveDirection) => void;
    extendFormulaSelection: (direction: MoveDirection) => void;
    updateFormulaSuggestions: (text: string) => void;
    selectNextSuggestion: () => void;
    selectPreviousSuggestion: () => void;
    applySuggestion: () => void;
}

export interface StyleSlice {
    toggleCellStyle: (styleKey: 'bold' | 'italic' | 'underline') => void;
    setCellStyle: (selection: Range, style: Partial<CellStyle>) => void;
    setSelectionTextAlign: (align: 'left' | 'center' | 'right') => void;
    setSelectionVAlign: (align: 'top' | 'middle' | 'bottom') => void;
    toggleWrapText: () => void;
    setNumberFormat: (format: string) => void;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    addOutlineBorderToSelection: () => void;
    removeBordersFromSelection: () => void;
    increaseDecimalPlaces: () => void;
    decreaseDecimalPlaces: () => void;
}

export interface ClipboardSlice {
    clipboardRange: Range | null;
    clipboardMode: 'copy' | 'cut' | null;
    copySelection: () => void;
    cutSelection: () => void;
    paste: (textData?: string) => void;
    cancelClipboard: () => void;
}

export interface DataSlice {
    clearSelection: () => void;
    autoSum: () => void;
    averageSelection: () => void;
    countSelection: () => void;
    maxSelection: () => void;
    minSelection: () => void;
    fillSelection: (direction: 'down' | 'up' | 'left' | 'right') => void;
    clearFormats: () => void;
    clearAll: () => void;
}

export interface StructureSlice {
    setColumnWidth: (col: number, width: number) => void;
    setRowHeight: (row: number, height: number) => void;
    mergeSelection: () => void;
    unmergeSelection: () => void;
    insertRows: () => void;
    deleteRows: () => void;
    insertColumns: () => void;
    deleteColumns: () => void;
}

export interface HistorySlice {
    history: Workbook[];
    historyIndex: number;
    undo: () => void;
    redo: () => void;
}

export interface ConditionalFormatSlice {
    addConditionalFormat: (rule: Omit<ConditionalFormatRule, 'id'>) => void;
    removeConditionalFormat: (ruleId: string) => void;
}

export interface DataValidationSlice {
    setDataValidation: (rule: DataValidationRule) => void;
    removeDataValidation: (range: Range) => void;
}

export interface FilterSlice {
    toggleFilter: () => void;
}

export type SpreadsheetStore = BaseState & WorkbookSlice & SelectionSlice & StyleSlice & ClipboardSlice & DataSlice & StructureSlice & HistorySlice & ConditionalFormatSlice & DataValidationSlice & FilterSlice;
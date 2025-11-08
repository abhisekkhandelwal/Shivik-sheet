
import React, { useRef, useEffect } from 'react';
import { useSpreadsheetStore } from '../store/spreadsheetStore';
import { addressToId, getDisplayValue, idToAddress } from '../utils/cellUtils';
import { isCellInRange, areAddressesEqual, findMergeForCell } from '../utils/rangeUtils';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import { computeFinalCellStyle } from '../utils/styleUtils';

interface CellProps {
  col: number;
  row: number;
}

const Cell: React.FC<CellProps> = ({ col, row }) => {
  const { 
    activeSheet, 
    startEditing, 
    commitEditing, 
    cancelEditing, 
    setEditingValue,
    commitEditingAndMove,
  } = useSpreadsheet();
  
  const editingCellId = useSpreadsheetStore(state => state.editingCellId);
  const editingValue = useSpreadsheetStore(state => state.editingValue);

  const cellId = addressToId({ col, row });
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  if (!activeSheet) return null;
  
  const merge = findMergeForCell({ col, row }, activeSheet.merges);
  const topLevelCellId = merge ? addressToId(merge.start) : cellId;
  const cellData = activeSheet.data[topLevelCellId] ?? null;

  const isEditing = editingCellId === topLevelCellId;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const { activeCell, selection } = activeSheet;
  if (!activeCell || !selection) return null;

  const isActive = areAddressesEqual(activeCell, { col, row });
  const isInSelection = isCellInRange({ col, row }, selection);

  const handleDoubleClick = () => {
    startEditing(topLevelCellId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingValue.startsWith('=')) {
        commitEditing();
      } else {
        commitEditingAndMove('down');
      }
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const displayValue = getDisplayValue(cellData);

  const finalStyle = computeFinalCellStyle(
    cellData,
    activeSheet.conditionalFormats,
    (id) => activeSheet.data[id]
  );
  
  const customStyle: React.CSSProperties = { ...finalStyle };

  if (finalStyle.bold) customStyle.fontWeight = 'bold';
  if (finalStyle.italic) customStyle.fontStyle = 'italic';
  if (finalStyle.underline) customStyle.textDecoration = 'underline';
  
  const hAlignMap = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };
  customStyle.justifyContent = hAlignMap[finalStyle.textAlign || 'left'];
  
  const vAlignMap = {
      top: 'flex-start',
      middle: 'center',
      bottom: 'flex-end'
  };
  customStyle.alignItems = vAlignMap[finalStyle.vAlign || 'middle'];

  if (finalStyle.wrap) {
    customStyle.whiteSpace = 'normal';
    customStyle.wordBreak = 'break-word';
  } else {
    customStyle.whiteSpace = 'nowrap';
  }

  if (isInSelection && !isActive && !customStyle.backgroundColor) {
    customStyle.backgroundColor = '#EFF6FF';
  } else if (!customStyle.backgroundColor) {
    customStyle.backgroundColor = '#FFFFFF';
  }
  
  const validationRule = activeSheet.dataValidations.find(v => isCellInRange({col, row}, v.range));
  const hasDropdown = validationRule?.type === 'list';

  if (isEditing) {
    return (
      <div className={`relative h-full w-full border-2 border-blue-500 z-40 bg-white`}>
        <input
          ref={inputRef}
          type="text"
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={commitEditing}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 w-full h-full p-1 text-sm border-none outline-none bg-white text-gray-900"
        />
      </div>
    );
  }
  
  let cellClassName = 'relative h-full p-1 text-sm overflow-hidden box-border flex';
  
  if (!customStyle.borderRight) cellClassName += ' border-r border-gray-300';
  if (!customStyle.borderBottom) cellClassName += ' border-b border-gray-300';
  
  if (isActive && !isEditing) {
    cellClassName += ' border-2 border-blue-500';
  }

  return (
    <div
      className={cellClassName}
      style={customStyle}
      onDoubleClick={handleDoubleClick}
    >
      {displayValue}
       {hasDropdown && !isEditing && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-1 text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </div>
      )}
    </div>
  );
};

export default React.memo(Cell);
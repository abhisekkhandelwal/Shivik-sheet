
import React, { useState, useEffect } from 'react';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import { addressToId, idToAddress, isValidCellId, getEditValue } from '../utils/cellUtils';
import { useSpreadsheetStore } from '../store/spreadsheetStore';

const FormulaBar: React.FC = () => {
  const { activeSheet, setEditingValue, commitEditing, startEditing, setActiveCell } = useSpreadsheet();
  const editingCellId = useSpreadsheetStore(state => state.editingCellId);
  const editingValue = useSpreadsheetStore(state => state.editingValue);

  const [nameBoxValue, setNameBoxValue] = useState('');

  if (!activeSheet) return null;

  const activeCellId = addressToId(activeSheet.activeCell);
  
  useEffect(() => {
    if (document.activeElement?.id !== 'name-box') {
      setNameBoxValue(activeCellId);
    }
  }, [activeCellId]);

  const activeCellData = activeSheet.data[activeCellId];
  const isEditing = editingCellId === activeCellId;

  const displayValue = isEditing ? editingValue : getEditValue(activeCellData);

  const handleFocus = () => {
    if (!isEditing) {
      startEditing(activeCellId);
    }
  };

  const handleFormulaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitEditing();
      (e.target as HTMLElement).blur(); 
    } else if (e.key === 'Escape') {
      (e.target as HTMLElement).blur();
    }
  };

  const handleNameBoxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newId = (e.target as HTMLInputElement).value.toUpperCase();
      if (isValidCellId(newId)) {
        setActiveCell(idToAddress(newId));
      } else {
        setNameBoxValue(activeCellId);
      }
      (e.target as HTMLElement).blur();
    }
  }

  return (
    <div className="flex items-center px-2 py-1 bg-gray-100 border-b border-gray-300">
      <input
        id="name-box"
        type="text"
        className="font-mono text-xs text-gray-700 mr-2 p-1 bg-white border border-gray-400 rounded-sm w-20 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={nameBoxValue}
        onChange={(e) => setNameBoxValue(e.target.value.toUpperCase())}
        onKeyDown={handleNameBoxKeyDown}
        onBlur={() => setNameBoxValue(activeCellId)}
      />
      <div className="font-mono text-xs text-gray-500 mr-2 italic select-none">fx</div>
      <input
        type="text"
        className="flex-grow p-1 text-sm bg-white border border-gray-400 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={displayValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleFormulaKeyDown}
      />
    </div>
  );
};

export default FormulaBar;
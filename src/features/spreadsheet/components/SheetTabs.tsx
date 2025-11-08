
import React, { useState, useEffect, useRef } from 'react';
import { useSpreadsheet } from '../hooks/useSpreadsheet';
import { Sheet } from '../store/types';

const SheetTab: React.FC<{sheet: Sheet}> = ({ sheet }) => {
  const { workbook, setActiveSheet, renameSheet, deleteSheet } = useSpreadsheet();
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(sheet.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = sheet.id === workbook?.activeSheetId;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleDoubleClick = () => {
    setIsRenaming(true);
  };

  const handleRename = () => {
    if (name.trim() && name.trim() !== sheet.name) {
      renameSheet(sheet.id, name.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setName(sheet.name);
      setIsRenaming(false);
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(Object.keys(workbook?.sheets ?? {}).length <= 1) {
        alert("Cannot delete the last sheet.");
        return;
    }
    if(window.confirm(`Are you sure you want to delete sheet "${sheet.name}"?`)) {
        deleteSheet(sheet.id);
    }
  }

  return (
    <div
      onClick={() => setActiveSheet(sheet.id)}
      onDoubleClick={handleDoubleClick}
      className={`flex items-center group px-3 py-1 text-xs rounded-t-md cursor-pointer border-r border-t border-b border-transparent ${
        isActive 
          ? 'bg-white border-gray-300 border-b-white font-semibold text-blue-600 -mb-px' 
          : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="bg-transparent outline-none ring-1 ring-blue-500 px-1"
        />
      ) : (
        <>
        <span>{sheet.name}</span>
        <button onClick={handleDelete} className="ml-2 text-gray-400 hover:text-red-600 hidden group-hover:inline">x</button>
        </>
      )}
    </div>
  );
}

const SheetTabs: React.FC = () => {
  const { workbook, addSheet } = useSpreadsheet();
  
  if (!workbook) return null;

  return (
    <div className="flex items-center px-2 bg-gray-100 border-t border-gray-300">
       <button 
          onClick={() => addSheet()}
          className="px-2 py-1 text-lg font-bold text-gray-500 hover:bg-gray-300 rounded-full mr-2"
          title="Add Sheet"
        >
          +
        </button>
      <div className="flex items-end">
        {Object.values(workbook.sheets).map((sheet: Sheet) => (
          <SheetTab key={sheet.id} sheet={sheet} />
        ))}
      </div>
    </div>
  );
};

export default SheetTabs;
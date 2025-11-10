
import { useEffect, useRef } from 'react';
import { useSpreadsheetStore } from '../lib/store/spreadsheetStore';
import { addressToId } from '../lib/utils/cellUtils';
import { MoveDirection } from '../lib/store/types';

const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const useKeyboard = () => {
  const keySequenceRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const resetSequence = () => {
        if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
        sequenceTimeoutRef.current = null;
        keySequenceRef.current = [];
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always get the freshest state directly within the event handler
      const state = useSpreadsheetStore.getState();
      const {
        workbook,
        editingCellId,
        editingValue,
        moveFormulaSelection,
        extendFormulaSelection,
        setActiveCell,
        startEditing,
        undo,
        redo,
        historyIndex,
        history,
        clearSelection,
        copySelection,
        cutSelection,
        paste,
        cancelClipboard,
        clipboardMode,
        extendSelection,
        extendSelectionToEnd,
        moveActiveCellToEndOfData,
        selectAll,
        toggleCellStyle,
        setSelectionTextAlign,
        addOutlineBorderToSelection,
        removeBordersFromSelection,
        formulaSuggestions,
        selectNextSuggestion,
        selectPreviousSuggestion,
        applySuggestion,
        autoSum,
        toggleFilter,
      } = state;

      const target = e.target as HTMLElement;
      const isMod = isMac ? e.metaKey : e.ctrlKey;

      // --- SEQUENCE & ALT SHORTCUTS ---
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        
        // AutoSum
        if (key === '=') {
            e.preventDefault();
            autoSum();
            resetSequence();
            return;
        }

        // Legacy Filter Toggle Sequence (Alt + D, F, F)
        if (/^[a-z]$/.test(key)) {
            e.preventDefault();
            if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);

            const currentSequence = keySequenceRef.current;
            
            if (key === 'd' && currentSequence.length === 0) {
                currentSequence.push('d');
            } else if (key === 'f' && currentSequence[0] === 'd' && currentSequence.length < 3) {
                currentSequence.push('f');
            } else {
                resetSequence();
                return;
            }
            
            if (currentSequence.join('') === 'dff') {
                toggleFilter();
                resetSequence();
            } else {
                sequenceTimeoutRef.current = window.setTimeout(resetSequence, 1500);
            }
            return;
        }
      } else {
          resetSequence();
      }

      // --- FORMULA SUGGESTION NAVIGATION ---
      if (editingCellId && formulaSuggestions && formulaSuggestions.length > 0) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectNextSuggestion();
                return;
            case 'ArrowUp':
                e.preventDefault();
                selectPreviousSuggestion();
                return;
            case 'Tab':
            case 'Enter':
                e.preventDefault();
                applySuggestion();
                return;
        }
      }

      // --- FORMULA EDITING NAVIGATION ---
      if (editingCellId && editingValue.startsWith('=')) {
          let direction: MoveDirection | null = null;
          switch (e.key) {
              case 'ArrowUp': direction = 'up'; break;
              case 'ArrowDown': direction = 'down'; break;
              case 'ArrowLeft': direction = 'left'; break;
              case 'ArrowRight': direction = 'right'; break;
              case 'Tab': 
                  direction = e.shiftKey ? 'left' : 'right';
                  break;
          }
          if (direction) {
              e.preventDefault(); // Prevent default input cursor movement
              if (e.shiftKey && e.key.startsWith('Arrow')) {
                  extendFormulaSelection(direction);
              } else {
                  moveFormulaSelection(direction);
              }
              return; // Stop further processing for this event
          }
      }
      
      // If focus is on any input-like element, let it handle its own keys.
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      if (!workbook) return;
      const activeSheet = workbook.sheets[workbook.activeSheetId];
      if (!activeSheet) return;
      
      const { activeCell, lastUsedRow, lastUsedCol } = activeSheet;
      const activeCellId = addressToId(activeCell);

      // --- MODIFIER KEY SHORTCUTS ---
      if (isMod) {
          if (e.shiftKey) {
            // --- MOD + SHIFT SHORTCUTS ---
            switch (e.key.toLowerCase()) {
                case 'z': // Redo
                    e.preventDefault();
                    if (historyIndex < history.length - 1) redo();
                    return;
                case '&': // Add outline border
                    e.preventDefault();
                    addOutlineBorderToSelection();
                    return;
                case '_': // Remove borders
                    e.preventDefault();
                    removeBordersFromSelection();
                    return;
                case 'l': // Toggle Filter
                    e.preventDefault();
                    toggleFilter();
                    return;
            }
            // Extend selection to end of data region
            if (e.key.startsWith('Arrow')) {
                e.preventDefault();
                const direction = e.key.replace('Arrow', '').toLowerCase() as MoveDirection;
                extendSelectionToEnd(direction);
                return;
            }

          } else {
            // --- MOD ONLY SHORTCUTS ---
            if (e.key.startsWith('Arrow')) {
              e.preventDefault();
              const direction = e.key.replace('Arrow', '').toLowerCase() as MoveDirection;
              moveActiveCellToEndOfData(direction);
              return;
            }

            switch (e.key.toLowerCase()) {
                case 'a': e.preventDefault(); selectAll(); return;
                case 'c': e.preventDefault(); copySelection(); return;
                case 'x': e.preventDefault(); cutSelection(); return;
                case 'v': e.preventDefault(); paste(); return;
                case 'z': e.preventDefault(); if (historyIndex > 0) undo(); return;
                case 'y': e.preventDefault(); if (historyIndex < history.length - 1) redo(); return;
                case 'b': e.preventDefault(); toggleCellStyle('bold'); return;
                case 'i': e.preventDefault(); toggleCellStyle('italic'); return;
                case 'u':
                    e.preventDefault();
                    if (isMac) { // On Mac, Cmd+U is for editing cell per user request
                        startEditing(activeCellId);
                    } else { // On Windows, Ctrl+U is for underline
                        toggleCellStyle('underline');
                    }
                    return;
                case 'e': e.preventDefault(); setSelectionTextAlign('center'); return;
            }
          }
      }
      
      // --- NON-MODIFIER SHORTCUTS ---
      switch (e.key) {
        case 'Escape':
          if (clipboardMode) {
            e.preventDefault();
            cancelClipboard();
          }
          break;
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          clearSelection();
          return;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'Enter':
        case 'Tab':
            e.preventDefault();
            const { col, row } = activeCell;
            const renderRows = Math.max(100, lastUsedRow + 10);
            const renderCols = Math.max(26, lastUsedCol + 3);
            
            if (e.shiftKey) {
                if (e.key === 'Enter') setActiveCell({ col, row: Math.max(0, row - 1) });
                else if (e.key === 'Tab') setActiveCell({ col: Math.max(0, col - 1), row });
                else extendSelection(e.key.replace('Arrow', '').toLowerCase() as MoveDirection);
            } else {
                if (e.key === 'ArrowUp') setActiveCell({ col, row: Math.max(0, row - 1) });
                if (e.key === 'ArrowDown' || e.key === 'Enter') setActiveCell({ col, row: Math.min(renderRows - 1, row + 1) });
                if (e.key === 'ArrowLeft') setActiveCell({ col: Math.max(0, col - 1), row });
                if (e.key === 'ArrowRight' || e.key === 'Tab') setActiveCell({ col: Math.min(renderCols - 1, col + 1), row });
            }
            break;
        case 'F2':
          e.preventDefault();
          startEditing(activeCellId);
          break;
        default:
          // Any printable character starts an edit.
          if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
            if (editingCellId) return; // FIX: Prevents re-starting edit on subsequent key presses.
            e.preventDefault();
            startEditing(activeCellId, e.key);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resetSequence();
    };
  }, []); // Empty dependency array ensures this runs only once.
};
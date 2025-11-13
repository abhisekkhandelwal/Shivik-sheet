import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cell from './Cell';
import ContextMenu from './ContextMenu';
import FormulaSuggestions from './FormulaSuggestions';
import FilterMenu from './FilterMenu';
import { colIndexToLabel, idToAddress } from '../../lib/utils/cellUtils';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import { useVirtualList } from '../../hooks/useVirtualGrid';
import { sortRange, findMergeForCell, areAddressesEqual } from '../../lib/utils/rangeUtils';
import { useSpreadsheetStore } from '../../lib/store/spreadsheetStore';

const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 24;
const ROW_HEADER_WIDTH = 80;
const COL_HEADER_HEIGHT = 24;

const MarchingAntsOverlay: React.FC = () => {
    const { clipboardRange } = useSpreadsheet();
    const [dashOffset, setDashOffset] = useState(0);

    useEffect(() => {
        if (clipboardRange) {
            const interval = setInterval(() => {
                setDashOffset(offset => (offset - 1) % 20);
            }, 50);
            return () => clearInterval(interval);
        }
    }, [clipboardRange]);

    if (!clipboardRange) return null;

    const style: React.CSSProperties = {
        stroke: '#3b82f6',
        strokeWidth: 2,
        fill: 'none',
        strokeDasharray: '6 4',
        strokeDashoffset: dashOffset,
    };
    
    return <rect x="0" y="0" width="100%" height="100%" style={style} />;
};

const Grid: React.FC = () => {
  const { 
    activeSheet, 
    setActiveCell, 
    setSelection, 
    commitEditing, 
    renderRows, 
    renderCols, 
    clipboardRange,
    editingCellId,
    formulaRangeSelection,
    setColumnWidth,
    setRowHeight,
    activeFilterMenu,
    openFilterMenu,
    closeFilterMenu,
    activeChartId,
    setActiveChart,
  } = useSpreadsheet();
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const [resizingCol, setResizingCol] = useState<{ index: number; startX: number; startWidth: number; } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ index: number; startY: number; startHeight: number; } | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const colHeaderContainerRef = useRef<HTMLDivElement>(null);
  const rowHeaderContainerRef = useRef<HTMLDivElement>(null);

  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [scrollPos, setScrollPos] = useState({ top: 0, left: 0 });
  
  const getColWidth = useCallback((index: number) => activeSheet?.columns[index]?.width ?? DEFAULT_COL_WIDTH, [activeSheet?.columns]);
  const getRowHeight = useCallback((index: number) => {
    if (activeSheet?.hiddenRows?.has(index)) return 0;
    return activeSheet?.rows[index]?.height ?? DEFAULT_ROW_HEIGHT
  }, [activeSheet?.rows, activeSheet?.hiddenRows]);

  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setGridSize({
        width: container.offsetWidth,
        height: container.offsetHeight,
      });
    });
    observer.observe(container);
    // Initial size
    setGridSize({
        width: container.offsetWidth,
        height: container.offsetHeight,
    });
    return () => observer.disconnect();
  }, []);
  
  const { virtualItems: virtualRows, totalSize: totalHeight, offsets: rowOffsets } = useVirtualList({
    itemCount: renderRows,
    getItemSize: getRowHeight,
    containerSize: gridSize.height,
    scrollOffset: scrollPos.top,
  });

  const { virtualItems: virtualCols, totalSize: totalWidth, offsets: colOffsets } = useVirtualList({
    itemCount: renderCols,
    getItemSize: getColWidth,
    containerSize: gridSize.width,
    scrollOffset: scrollPos.left,
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (resizingCol) {
        const diff = e.clientX - resizingCol.startX;
        setColumnWidth(resizingCol.index, resizingCol.startWidth + diff);
    }
    if (resizingRow) {
        const diff = e.clientY - resizingRow.startY;
        setRowHeight(resizingRow.index, resizingRow.startHeight + diff);
    }
  }, [resizingCol, resizingRow, setColumnWidth, setRowHeight]);

  const handleMouseUpGlobal = useCallback(() => {
    setIsDragging(false);
    setResizingCol(null);
    setResizingRow(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUpGlobal);
    }
  }, [handleMouseMove, handleMouseUpGlobal]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleMouseDown = useCallback((e: React.MouseEvent, col: number, row: number) => {
    if (activeChartId) {
        setActiveChart(null);
    }
    closeContextMenu();
    if (editingCellId) {
      commitEditing();
    }
    if (activeFilterMenu) {
        closeFilterMenu();
    }

    const state = useSpreadsheetStore.getState();
    const currentActiveCell = state.workbook?.sheets[state.workbook!.activeSheetId]?.activeCell;

    if (e.shiftKey && currentActiveCell) {
      setSelection({ start: currentActiveCell, end: { col, row } });
    } else {
      setIsDragging(true);
      setActiveCell({ col, row });
    }
  }, [editingCellId, commitEditing, setSelection, setActiveCell, closeContextMenu, activeFilterMenu, closeFilterMenu, activeChartId, setActiveChart]);

  const handleMouseOver = useCallback((col: number, row: number) => {
    if (isDragging) {
      const state = useSpreadsheetStore.getState();
      const currentActiveCell = state.workbook?.sheets[state.workbook!.activeSheetId]?.activeCell;
      if (currentActiveCell) {
        setSelection({ start: currentActiveCell, end: { col, row } });
      }
    }
  }, [isDragging, setSelection]);

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    setScrollPos({ top: scrollTop, left: scrollLeft });
    if (colHeaderContainerRef.current) colHeaderContainerRef.current.scrollLeft = scrollLeft;
    if (rowHeaderContainerRef.current) rowHeaderContainerRef.current.scrollTop = scrollTop;
  }, []);
  
  const renderClipboardOverlay = () => {
    if (!clipboardRange || !rowOffsets.length || !colOffsets.length) return null;
    const sorted = sortRange(clipboardRange);
    if(sorted.start.row >= rowOffsets.length -1 || sorted.start.col >= colOffsets.length -1) return null;

    const left = colOffsets[sorted.start.col];
    const top = rowOffsets[sorted.start.row];
    const width = colOffsets[sorted.end.col + 1] - left;
    const height = rowOffsets[sorted.end.row + 1] - top;

    return (
        <div 
            className="absolute pointer-events-none z-50"
            style={{ left, top, width, height, transform: `translate(${-scrollPos.left}px, ${-scrollPos.top}px)` }}
        >
           <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
               <MarchingAntsOverlay />
           </svg>
        </div>
    )
  }
  
  const renderFormulaRangeOverlay = () => {
      if (!editingCellId || !formulaRangeSelection || !rowOffsets.length || !colOffsets.length) return null;
      
      const sorted = sortRange(formulaRangeSelection);
      if(sorted.start.row >= rowOffsets.length -1 || sorted.start.col >= colOffsets.length -1) return null;

      const left = colOffsets[sorted.start.col];
      const top = rowOffsets[sorted.start.row];
      const width = colOffsets[sorted.end.col + 1] - left;
      const height = rowOffsets[sorted.end.row + 1] - top;
      
      return (
          <div
              className="absolute pointer-events-none z-40 bg-green-500 bg-opacity-20 border-2 border-green-600 box-border"
              style={{ left, top, width, height, transform: `translate(${-scrollPos.left}px, ${-scrollPos.top}px)` }}
          />
      )
  }

  const renderFormulaSuggestions = () => {
      const { editingCellId, formulaSuggestions } = useSpreadsheet();
      if (!editingCellId || !formulaSuggestions || formulaSuggestions.length === 0 || !rowOffsets.length || !colOffsets.length) return null;
      
      const { col, row } = idToAddress(editingCellId);
      if(row >= rowOffsets.length -1 || col >= colOffsets.length -1) return null;

      const left = colOffsets[col];
      const top = rowOffsets[row + 1]; // Position below the cell
      
      return (
          <div
              className="absolute pointer-events-auto"
              style={{ left, top, transform: `translate(${-scrollPos.left}px, ${-scrollPos.top}px)`, zIndex: 60 }}
          >
              <FormulaSuggestions />
          </div>
      )
  }

  if (!activeSheet) {
    return <div className="p-4 text-center text-gray-500">Select or create a sheet to begin.</div>;
  }
  
  const { filter } = activeSheet;

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden bg-gray-200 ${(resizingCol || resizingRow) ? 'cursor-ew-resize' : ''}`} onMouseDown={() => {if (activeChartId) setActiveChart(null)}} onMouseUp={handleMouseUpGlobal} onMouseLeave={handleMouseUpGlobal} onContextMenu={handleContextMenu}>
      {/* Column Headers */}
      <div className="flex select-none">
        <div className="flex-shrink-0 bg-gray-100 border-r border-b border-gray-300 z-30" style={{ width: ROW_HEADER_WIDTH, height: COL_HEADER_HEIGHT }}></div>
        <div ref={colHeaderContainerRef} className="relative overflow-hidden" style={{ height: COL_HEADER_HEIGHT, width: `calc(100% - ${ROW_HEADER_WIDTH}px - 1px)`}}>
          <div style={{ width: totalWidth, position: 'relative' }}>
            {virtualCols.map(({ index, offset }) => {
              const isFiltered = filter && index >= filter.range.start.col && index <= filter.range.end.col;
              return (
              <div key={index} className="absolute top-0 flex items-center justify-center px-2 font-bold text-gray-600 bg-gray-100 border-r border-b border-gray-300" style={{ left: offset, width: getColWidth(index), height: COL_HEADER_HEIGHT, boxSizing: 'border-box' }}>
                <span className="flex-grow text-center">{colIndexToLabel(index)}</span>
                {isFiltered && (
                    <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); openFilterMenu(index)}}>
                        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 14l6-6H4l6 6z"/></svg>
                    </div>
                )}
                <div 
                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-10"
                    onMouseDown={(e) => { e.stopPropagation(); setResizingCol({ index, startX: e.clientX, startWidth: getColWidth(index) }); }}
                />
              </div>
            )})}
          </div>
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Row Headers */}
        <div ref={rowHeaderContainerRef} className="relative overflow-hidden select-none" style={{ width: ROW_HEADER_WIDTH }}>
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualRows.map(({ index, offset }) => {
                if (getRowHeight(index) === 0) return null;
                return (
                  <div key={index} className="absolute left-0 flex items-center justify-end pr-2 font-bold text-gray-600 bg-gray-100 border-r border-b border-gray-300" style={{ top: offset, width: ROW_HEADER_WIDTH, height: getRowHeight(index), boxSizing: 'border-box' }}>
                    {index + 1}
                     <div 
                        className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-blue-400 z-10"
                        onMouseDown={(e) => { e.stopPropagation(); setResizingRow({ index, startY: e.clientY, startHeight: getRowHeight(index) }); }}
                    />
                  </div>
                )
            })}
          </div>
        </div>

        {/* Main Grid */}
        <div ref={gridContainerRef} className="flex-grow overflow-auto" onScroll={handleScroll}>
          <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
            {activeFilterMenu && (
                 <div
                    className="absolute"
                    style={{ left: colOffsets[activeFilterMenu.col] - scrollPos.left, top: COL_HEADER_HEIGHT - scrollPos.top, zIndex: 60 }}
                >
                    <FilterMenu col={activeFilterMenu.col} onClose={closeFilterMenu} />
                </div>
            )}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {renderClipboardOverlay()}
                {renderFormulaRangeOverlay()}
            </div>
            {renderFormulaSuggestions()}
            {virtualRows.map(({ index: rowIndex, offset: offsetTop }) => {
              if (getRowHeight(rowIndex) === 0) return null;
              return virtualCols.map(({ index: colIndex, offset: offsetLeft }) => {
                  const merge = findMergeForCell({ col: colIndex, row: rowIndex }, activeSheet.merges);
                  if (merge && !areAddressesEqual({ col: colIndex, row: rowIndex }, merge.start)) {
                      return null;
                  }

                  let cellWidth = getColWidth(colIndex);
                  let cellHeight = getRowHeight(rowIndex);
                  let zIndex = 10;
                  
                  if(merge) {
                    for(let i = merge.start.col + 1; i <= merge.end.col; i++) cellWidth += getColWidth(i);
                    for(let i = merge.start.row + 1; i <= merge.end.row; i++) cellHeight += getRowHeight(i);
                    zIndex = 20;
                  }

                  return (
                      <div key={`${colIndex}-${rowIndex}`} className="absolute" style={{ top: offsetTop, left: offsetLeft, width: cellWidth, height: cellHeight, zIndex }} onMouseDown={(e) => handleMouseDown(e, colIndex, rowIndex)} onMouseOver={() => handleMouseOver(colIndex, rowIndex)}>
                        <Cell col={colIndex} row={rowIndex} />
                      </div>
                  );
              })
            })}
          </div>
        </div>
      </div>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} />}
    </div>
  );
};

export default Grid;
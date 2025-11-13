import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import { ChartConfig } from '../../lib/store/types';
import { sortRange } from '../../lib/utils/rangeUtils';
import { addressToId, getDisplayValue } from '../../lib/utils/cellUtils';

// Chart.js components are now registered globally in index.tsx

interface ChartWrapperProps {
  chart: ChartConfig;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ chart }) => {
    const { activeSheet, deleteChart, updateChart, activeChartId, setActiveChart } = useSpreadsheet();

    const isSelected = chart.id === activeChartId;
    
    // Local state for live geometry updates during interaction
    const [currentGeom, setCurrentGeom] = useState({ 
        x: chart.position.x, y: chart.position.y, 
        width: chart.size.width, height: chart.size.height 
    });

    // Sync local state if chart prop changes from store (e.g., on undo/redo)
    useEffect(() => {
        setCurrentGeom({
            x: chart.position.x, y: chart.position.y,
            width: chart.size.width, height: chart.size.height
        });
    }, [chart.position, chart.size]);

    const interactionRef = useRef({
        type: null as 'move' | 'resize' | null,
        startX: 0, startY: 0,
        startGeom: { x:0, y:0, width:0, height:0 },
        handle: null as string | null
    });

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const interaction = interactionRef.current;
        if (!interaction.type) return;

        const dx = e.clientX - interaction.startX;
        const dy = e.clientY - interaction.startY;
        
        let newGeom = { ...interaction.startGeom };

        if (interaction.type === 'move') {
            newGeom.x += dx;
            newGeom.y += dy;
        } else if (interaction.type === 'resize') {
            if (interaction.handle?.includes('right')) newGeom.width += dx;
            if (interaction.handle?.includes('left')) { newGeom.width -= dx; newGeom.x += dx; }
            if (interaction.handle?.includes('bottom')) newGeom.height += dy;
            if (interaction.handle?.includes('top')) { newGeom.height -= dy; newGeom.y += dy; }
            
            // Enforce minimum size
            if(newGeom.width < 150) {
                if (interaction.handle?.includes('left')) newGeom.x = interaction.startGeom.x + interaction.startGeom.width - 150;
                newGeom.width = 150;
            }
            if(newGeom.height < 100) {
                if(interaction.handle?.includes('top')) newGeom.y = interaction.startGeom.y + interaction.startGeom.height - 100;
                newGeom.height = 100;
            }
        }
        setCurrentGeom(newGeom);
    }, []);

    const handleMouseUp = useCallback(() => {
        const interaction = interactionRef.current;
        if (!interaction.type) return;

        // Only commit to global store on mouse up to create a single undo history entry
        updateChart(chart.id, {
            position: { x: currentGeom.x, y: currentGeom.y },
            size: { width: currentGeom.width, height: currentGeom.height }
        });

        interactionRef.current.type = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [chart.id, currentGeom, updateChart, handleMouseMove]);
    
    const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize', handle?: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        setActiveChart(chart.id);

        interactionRef.current = {
            type,
            startX: e.clientX,
            startY: e.clientY,
            startGeom: { ...currentGeom },
            handle
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    if (!activeSheet) return null;

    // --- Data Extraction Logic ---
    const sorted = sortRange(chart.range);
    const labels: string[] = [];
    const datasets: { label: string; data: number[]; backgroundColor?: string[] }[] = [];
    
    // Standard assumption: first row contains series headers, first column contains category labels.
    const hasSeriesHeaders = sorted.end.row > sorted.start.row;
    const hasCategoryLabels = sorted.end.col > sorted.start.col;

    if (hasSeriesHeaders && hasCategoryLabels) {
        // This is a 2D data range (e.g., A1:C5)
        
        // 1. Get category labels (X-axis) from the first column, skipping the top-left header cell.
        for (let r = sorted.start.row + 1; r <= sorted.end.row; r++) {
            const cell = activeSheet.data[addressToId({ col: sorted.start.col, row: r })];
            labels.push(getDisplayValue(cell));
        }

        // 2. Get data for each series from subsequent columns.
        for (let c = sorted.start.col + 1; c <= sorted.end.col; c++) {
            // The series label is the header cell in this column.
            const headerCell = activeSheet.data[addressToId({ col: c, row: sorted.start.row })];
            const seriesLabel = getDisplayValue(headerCell) || `Series ${c}`;
            
            const data: number[] = [];
            // The data points are in the rows below the header.
            for (let r = sorted.start.row + 1; r <= sorted.end.row; r++) {
                const cell = activeSheet.data[addressToId({ col: c, row: r })];
                data.push(typeof cell?.value === 'number' ? cell.value : 0);
            }

            datasets.push({
                label: seriesLabel,
                data,
            });
        }
    } else {
        // Fallback for simple 1D data (either one row or one column)
        const data: number[] = [];
        if (sorted.end.row === sorted.start.row) {
            // One row of data
            for (let c = sorted.start.col; c <= sorted.end.col; c++) {
                const cell = activeSheet.data[addressToId({ col: c, row: sorted.start.row })];
                labels.push(getDisplayValue(cell) || `Point ${c+1}`);
                data.push(typeof cell?.value === 'number' ? cell.value : 0);
            }
        } else {
            // One column of data
            for (let r = sorted.start.row; r <= sorted.end.row; r++) {
                const cell = activeSheet.data[addressToId({ col: sorted.start.col, row: r })];
                labels.push(getDisplayValue(cell) || `Point ${r+1}`);
                data.push(typeof cell?.value === 'number' ? cell.value : 0);
            }
        }
        datasets.push({ label: chart.options.title || 'Data', data });
    }
    
    // Pie charts need a special data structure for colors.
    if (chart.type === 'pie' && datasets.length > 0) {
        const pieData = datasets[0]?.data ?? [];
        datasets[0] = {
            ...datasets[0],
            backgroundColor: [
              'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)',
              'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
              'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
            ],
            data: pieData
        }
    }

    const chartData = { labels, datasets };
    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const },
            title: { display: true, text: chart.options.title },
        },
    };

    if (chart.type === 'bar' || chart.type === 'line') {
        options.scales = {
            y: { 
                beginAtZero: true 
            }
        };
    }

    const ChartComponent = {
        bar: <Bar options={options} data={chartData} />,
        line: <Line options={options} data={chartData} />,
        pie: <Pie options={options} data={chartData} />,
    }[chart.type];

    return (
        <div
            style={{
                left: currentGeom.x,
                top: currentGeom.y,
                width: currentGeom.width,
                height: currentGeom.height,
                zIndex: isSelected ? 50 : 40,
            }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
            className={`absolute bg-white p-2 rounded-lg shadow-2xl border pointer-events-auto flex flex-col cursor-move ${isSelected ? 'border-blue-500 border-2' : 'border-gray-300'}`}
        >
            <div className="text-right -mt-1 -mr-1 h-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteChart(chart.id); }} 
                  className="text-red-500 hover:text-red-700 font-bold text-lg leading-none px-1 rounded-full hover:bg-gray-200"
                  style={{ visibility: isSelected ? 'visible' : 'hidden' }}
                >
                    &times;
                </button>
            </div>
            <div className="flex-grow h-full w-full">
                {ChartComponent}
            </div>

            {isSelected && (
                <>
                    {['top-left', 'top', 'top-right', 'left', 'right', 'bottom-left', 'bottom', 'bottom-right'].map(handle => {
                        let cursor = 'auto';
                        if (handle.includes('top') || handle.includes('bottom')) cursor = 'ns-resize';
                        if (handle.includes('left') || handle.includes('right')) cursor = 'ew-resize';
                        if (handle === 'top-left' || handle === 'bottom-right') cursor = 'nwse-resize';
                        if (handle === 'top-right' || handle === 'bottom-left') cursor = 'nesw-resize';

                        const style: React.CSSProperties = {
                            position: 'absolute',
                            width: '10px', 
                            height: '10px',
                            backgroundColor: 'white',
                            border: '1px solid #3b82f6',
                            transform: 'translate(-50%, -50%)',
                            cursor,
                            zIndex: 51,
                        };

                        if (handle.includes('top')) style.top = '0%';
                        if (handle.includes('bottom')) style.top = '100%';
                        if (handle === 'left' || handle === 'right') style.top = '50%';
                        if (handle.includes('left')) style.left = '0%';
                        if (handle.includes('right')) style.left = '100%';
                        if (handle === 'top' || handle === 'bottom') style.left = '50%';
                        
                        return (
                            <div
                                key={handle}
                                style={style}
                                onMouseDown={e => handleMouseDown(e, 'resize', handle)}
                            />
                        );
                    })}
                </>
            )}
        </div>
    );
};

export default ChartWrapper;
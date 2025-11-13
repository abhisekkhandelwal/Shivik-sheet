
import React, { useState, useEffect } from 'react';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import { ChartType } from '../../../../lib/store/types';
import { addressToId, idToAddress } from '../../utils/cellUtils';
import Button from '../ui/button';
import Select from '../ui/select';
import Input from '../ui/input';

const ChartBuilderSidebar: React.FC = () => {
    const { activeSheet, addChart, toggleChartBuilder } = useSpreadsheet();
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [range, setRange] = useState('');
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (activeSheet?.selection) {
            const { start, end } = activeSheet.selection;
            const startId = addressToId(start);
            const endId = addressToId(end);
            setRange(startId === endId ? startId : `${startId}:${endId}`);
        }
    }, [activeSheet?.selection]);

    const handleAddChart = () => {
        if (!range.trim() || !activeSheet) return;

        try {
            const [startId, endId] = range.split(':');
            const rangeObj = {
                start: idToAddress(startId),
                end: idToAddress(endId || startId),
            };

            addChart({
                range: rangeObj,
                type: chartType,
                options: { title: title || 'My Chart' },
                position: { x: 100, y: 100 },
                size: { width: 400, height: 250 },
            });
            toggleChartBuilder();
        } catch (e) {
            alert("Invalid range provided for the chart.")
            console.error(e)
        }
    };

    return (
        <div className="absolute top-0 right-0 h-full w-64 bg-gray-100 border-l border-gray-300 shadow-lg z-40 p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Chart Editor</h2>
                <button onClick={toggleChartBuilder} className="text-xl font-bold">&times;</button>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Chart Type</label>
                <Select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="pie">Pie</option>
                </Select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Data Range</label>
                <Input type="text" value={range} onChange={(e) => setRange(e.target.value.toUpperCase())} />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Chart Title</label>
                <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Chart" />
            </div>

            <div className="flex-grow"></div>
            <Button onClick={handleAddChart}>Add Chart</Button>
        </div>
    );
};

export default ChartBuilderSidebar;
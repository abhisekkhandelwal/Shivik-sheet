import React from 'react';
import { useSpreadsheet } from '../../hooks/useSpreadsheet';
import ChartWrapper from './ChartWrapper';

const ChartCanvas: React.FC = () => {
    const { activeSheet } = useSpreadsheet();

    if (!activeSheet?.charts || activeSheet.charts.length === 0) {
        return null;
    }

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30">
            {activeSheet.charts.map(chart => (
                <ChartWrapper key={chart.id} chart={chart} />
            ))}
        </div>
    );
};

export default ChartCanvas;
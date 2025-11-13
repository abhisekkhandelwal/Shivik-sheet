

import React from 'react';
import Toolbar from '../../components/spreadsheet/Toolbar';
import FormulaBar from '../../components/spreadsheet/FormulaBar';
import Grid from '../../components/spreadsheet/Grid';
import SheetTabs from '../../components/spreadsheet/SheetTabs';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSpreadsheetStore } from '../../lib/store/spreadsheetStore';
import { useAutoSave } from '../../lib/storage/autoSave';
import { indexedDB } from '../../lib/storage/indexedDB';
import ConditionalFormattingPanel from '../../components/spreadsheet/ConditionalFormattingPanel';
import DataValidationDialog from '../../components/spreadsheet/DataValidationDialog';
import SortDialog from '../../components/spreadsheet/SortDialog';
import ChartBuilderSidebar from '../../components/charts/ChartBuilderSidebar';
import ChartCanvas from '../../components/charts/ChartCanvas';

const SpreadsheetView: React.FC = () => {
  const { 
    workbook, 
    createWorkbook, 
    loadWorkbook, 
    isConditionalFormattingPanelOpen, 
    isDataValidationDialogOpen,
    isSortDialogOpen,
    isChartBuilderOpen,
    isAiAnalyzing,
  } = useSpreadsheetStore(state => ({
    workbook: state.workbook,
    createWorkbook: state.createWorkbook,
    loadWorkbook: state.loadWorkbook,
    isConditionalFormattingPanelOpen: state.isConditionalFormattingPanelOpen,
    isDataValidationDialogOpen: state.isDataValidationDialogOpen,
    isSortDialogOpen: state.isSortDialogOpen,
    isChartBuilderOpen: state.isChartBuilderOpen,
    isAiAnalyzing: state.isAiAnalyzing,
  }));
  
  useKeyboard();
  useAutoSave();

  React.useEffect(() => {
    if (!workbook) {
      const init = async () => {
        const recentWorkbooks = await indexedDB.getAll();
        if (recentWorkbooks.length > 0 && recentWorkbooks[0].data) {
          loadWorkbook(recentWorkbooks[0].data);
        } else {
          createWorkbook('My First Workbook');
        }
      };
      init();
    }
  }, [workbook, createWorkbook, loadWorkbook]);

  if (!workbook) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500">Loading Workbook...</p>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full max-w-screen-2xl flex flex-col font-sans text-sm outline-none bg-gray-200 text-gray-900 shadow-2xl rounded-lg overflow-hidden"
    >
      {isAiAnalyzing && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-[100]">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold text-gray-700">AI is analyzing your file's format...</p>
          </div>
        </div>
      )}
      <Toolbar />
      <FormulaBar />
      <div className="flex-grow flex overflow-hidden relative">
        <Grid />
        <ChartCanvas />
        {isConditionalFormattingPanelOpen && <ConditionalFormattingPanel />}
        {isChartBuilderOpen && <ChartBuilderSidebar />}
      </div>
      <SheetTabs />
      {isDataValidationDialogOpen && <DataValidationDialog />}
      {isSortDialogOpen && <SortDialog />}
    </div>
  );
};

export default SpreadsheetView;
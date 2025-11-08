
import React from 'react';
import Toolbar from './components/Toolbar';
import FormulaBar from './components/FormulaBar';
import Grid from './components/Grid';
import SheetTabs from './components/SheetTabs';
import { useKeyboard } from './hooks/useKeyboard';
import { useSpreadsheetStore } from './store/spreadsheetStore';
import { useAutoSave } from './services/storage/autoSave';
import { indexedDB } from './services/storage/indexedDB';
import ConditionalFormattingPanel from './components/ConditionalFormattingPanel';
import DataValidationDialog from './components/DataValidationDialog';

const SpreadsheetView: React.FC = () => {
  const { 
    workbook, 
    createWorkbook, 
    loadWorkbook, 
    isConditionalFormattingPanelOpen, 
    isDataValidationDialogOpen 
  } = useSpreadsheetStore(state => ({
    workbook: state.workbook,
    createWorkbook: state.createWorkbook,
    loadWorkbook: state.loadWorkbook,
    isConditionalFormattingPanelOpen: state.isConditionalFormattingPanelOpen,
    isDataValidationDialogOpen: state.isDataValidationDialogOpen,
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
      className="w-screen h-screen flex flex-col font-sans text-sm outline-none bg-gray-200 text-gray-900"
    >
      <Toolbar />
      <FormulaBar />
      <div className="flex-grow flex overflow-hidden relative">
        <Grid />
        {isConditionalFormattingPanelOpen && <ConditionalFormattingPanel />}
      </div>
      <SheetTabs />
      {isDataValidationDialogOpen && <DataValidationDialog />}
    </div>
  );
};

export default SpreadsheetView;
import { ASTNode } from './parser';
import { getFunction } from './index';
import { CellData, Workbook } from '../store/types';
import { expandRange } from '../utils/rangeUtils';
// FIX: Import 'addressToId' to convert cell addresses to string IDs.
import { addressToId } from '../utils/cellUtils';

export type Getter = (cellId: string) => CellData | undefined;

export interface EvaluationContext {
  workbook: Workbook;
  activeSheetId: string;
  currentCellId: string;
}

const evaluateNode = (
  node: ASTNode,
  context: EvaluationContext,
  dependencies: Set<string>
): any => {
  const getter = (cellId: string, sheetId: string = context.activeSheetId) => {
    return context.workbook.sheets[sheetId]?.data[cellId];
  };

  switch (node.type) {
    case 'number':
    case 'string':
    case 'boolean':
      return node.value;

    case 'cell':
      dependencies.add(node.ref);
      const cell = getter(node.ref);
      return cell?.value ?? 0;

    case 'name': {
      const namedRange = context.workbook.namedRanges?.[node.name];
      if (!namedRange) throw new Error(`#NAME?`);
      const { sheetId, range } = namedRange;
      const cellIds = expandRange(`${addressToId(range.start)}:${addressToId(range.end)}`);
      cellIds.forEach(id => dependencies.add(id));
      return cellIds.map(id => {
        const cell = getter(id, sheetId);
        return cell?.value ?? 0;
      });
    }

    case 'range': {
      const cellIds = expandRange(`${node.start}:${node.end}`);
      cellIds.forEach(id => dependencies.add(id));
      return cellIds.map(id => {
        const cell = getter(id);
        return cell?.value ?? 0;
      });
    }
    
    case 'sheetReference': {
        const { sheet: sheetName, reference } = node;
        const targetSheet = Object.values(context.workbook.sheets).find(s => s.name.toUpperCase() === sheetName.toUpperCase());
        if (!targetSheet) throw new Error('#REF!');

        // Evaluate the reference node within the context of the target sheet
        return evaluateNode(reference, { ...context, activeSheetId: targetSheet.id }, dependencies);
    }

    case 'unary':
      const operand = evaluateNode(node.operand, context, dependencies);
      if (node.op === '-') return -Number(operand);
      if (node.op === '+') return +Number(operand);
      throw new Error(`Unknown unary operator: ${node.op}`);

    case 'binary':
      const left = evaluateNode(node.left, context, dependencies);
      const right = evaluateNode(node.right, context, dependencies);
      
      const nLeft = Number(left);
      const nRight = Number(right);

      switch (node.op) {
        case '+': return nLeft + nRight;
        case '-': return nLeft - nRight;
        case '*': return nLeft * nRight;
        case '/':
          if (nRight === 0) throw new Error('#DIV/0!');
          return nLeft / nRight;
        case '^': return Math.pow(nLeft, nRight);
        case '=': return left == right;
        case '<>': return left != right;
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '&': return `${left}${right}`;
        default: throw new Error(`Unknown operator: ${node.op}`);
      }

    case 'function':
      const func = getFunction(node.name);
      if (!func) throw new Error(`#NAME?`);
      
      const args = node.args.map(arg => evaluateNode(arg, context, dependencies));
      
      try {
        const result = func(...args);
        if (typeof result === 'string' && result.startsWith('#')) {
            throw new Error(result);
        }
        return result;
      } catch (e: any) {
        throw new Error(e.message || '#ERROR!');
      }
  }
};

export { evaluateNode };
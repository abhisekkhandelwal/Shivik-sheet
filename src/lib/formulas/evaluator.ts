
import { ASTNode } from './parser';
import { getFunction } from './index';
import { CellData } from '../store/types';
// FIX: Corrected import path for range utilities.
import { expandRange } from '../utils/rangeUtils';

type Getter = (cellId: string) => CellData | undefined;

const evaluateNode = (
  node: ASTNode,
  getter: Getter,
  dependencies: Set<string>
): any => {
  switch (node.type) {
    case 'number':
    case 'string':
    case 'boolean':
      return node.value;

    case 'cell':
      dependencies.add(node.ref);
      const cell = getter(node.ref);
      return cell?.value ?? 0;

    case 'range':
      const cellIds = expandRange(`${node.start}:${node.end}`);
      cellIds.forEach(id => dependencies.add(id));
      return cellIds.map(id => {
        const cell = getter(id);
        return cell?.value ?? 0;
      });

    case 'unary':
      const operand = evaluateNode(node.operand, getter, dependencies);
      if (node.op === '-') return -Number(operand);
      if (node.op === '+') return +Number(operand);
      throw new Error(`Unknown unary operator: ${node.op}`);

    case 'binary':
      const left = evaluateNode(node.left, getter, dependencies);
      const right = evaluateNode(node.right, getter, dependencies);
      
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
      
      const args = node.args.map(arg => evaluateNode(arg, getter, dependencies));
      
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

export { evaluateNode, Getter };

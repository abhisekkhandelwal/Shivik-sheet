
// Formula Parser - Converts formula strings to AST for evaluation
// Supports Excel-compatible syntax: =SUM(A1:A10), =IF(B2>10, "High", "Low")

export type TokenType = 
  | 'FUNCTION' 
  | 'CELL_REF' 
  | 'RANGE' 
  | 'NUMBER' 
  | 'STRING' 
  | 'BOOLEAN'
  | 'OPERATOR' 
  | 'LPAREN' 
  | 'RPAREN' 
  | 'COMMA'
  | 'COLON';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export type ASTNode = 
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'cell'; ref: string }
  | { type: 'range'; start: string; end: string }
  | { type: 'function'; name: string; args: ASTNode[] }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode };

export class FormulaParser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(formula: string): ASTNode {
    // Remove leading = if present
    const cleaned = formula.trim().startsWith('=') ? formula.trim().slice(1) : formula.trim();
    this.tokens = this.tokenize(cleaned);
    this.pos = 0;
    return this.parseExpression();
  }

  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // String literal
      if (char === '"') {
        let str = '';
        const start = i;
        i++;
        while (i < input.length && input[i] !== '"') {
          str += input[i];
          i++;
        }
        i++; // Skip closing "
        tokens.push({ type: 'STRING', value: str, pos: start });
        continue;
      }

      // Numbers
      if (/\d/.test(char) || (char === '.' && /\d/.test(input[i + 1]))) {
        let num = '';
        const start = i;
        while (i < input.length && /[\d.]/.test(input[i])) {
          num += input[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: num, pos: start });
        continue;
      }

      // Cell references & functions (A1, SUM, etc.)
      if (/[A-Za-z]/.test(char)) {
        let word = '';
        const start = i;
        while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) {
          word += input[i];
          i++;
        }

        const upper = word.toUpperCase();

        // Check if it's a boolean
        if (upper === 'TRUE' || upper === 'FALSE') {
          tokens.push({ type: 'BOOLEAN', value: upper, pos: start });
          continue;
        }

        // Check if followed by ( -> function
        while (i < input.length && /\s/.test(input[i])) i++;
        if (i < input.length && input[i] === '(') {
          tokens.push({ type: 'FUNCTION', value: upper, pos: start });
        } else if (/^[A-Z]+[0-9]+$/.test(upper)) {
          // Cell reference pattern (A1, BC123)
          tokens.push({ type: 'CELL_REF', value: upper, pos: start });
        } else {
          // Default to named range / invalid ref, handled by evaluator
          tokens.push({ type: 'CELL_REF', value: upper, pos: start });
        }
        continue;
      }

      // Operators and punctuation
      const charMap: Record<string, TokenType> = {
        '(': 'LPAREN',
        ')': 'RPAREN',
        ',': 'COMMA',
        ':': 'COLON',
        '+': 'OPERATOR',
        '-': 'OPERATOR',
        '*': 'OPERATOR',
        '/': 'OPERATOR',
        '^': 'OPERATOR',
        '=': 'OPERATOR',
        '>': 'OPERATOR',
        '<': 'OPERATOR',
        '&': 'OPERATOR'
      };

      // Handle >= <= <>
      if ((char === '>' || char === '<') && input[i + 1] === '=') {
        tokens.push({ type: 'OPERATOR', value: char + '=', pos: i });
        i += 2;
        continue;
      }
      if (char === '<' && input[i + 1] === '>') {
        tokens.push({ type: 'OPERATOR', value: '<>', pos: i });
        i += 2;
        continue;
      }

      if (charMap[char]) {
        tokens.push({ type: charMap[char], value: char, pos: i });
        i++;
        continue;
      }

      throw new Error(`Unexpected character: ${char} at position ${i}`);
    }

    return tokens;
  }

  private parseExpression(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddSub();

    while (this.match('OPERATOR', ['=', '>', '<', '>=', '<=', '<>'])) {
      const op = this.previous().value;
      const right = this.parseAddSub();
      left = { type: 'binary', op, left, right };
    }

    return left;
  }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();

    while (this.match('OPERATOR', ['+', '-', '&'])) {
      const op = this.previous().value;
      const right = this.parseMulDiv();
      left = { type: 'binary', op, left, right };
    }

    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parsePower();

    while (this.match('OPERATOR', ['*', '/'])) {
      const op = this.previous().value;
      const right = this.parsePower();
      left = { type: 'binary', op, left, right };
    }

    return left;
  }

  private parsePower(): ASTNode {
    let left = this.parseUnary();

    while (this.match('OPERATOR', ['^'])) {
      const op = this.previous().value;
      const right = this.parseUnary();
      left = { type: 'binary', op, left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match('OPERATOR', ['-', '+'])) {
      const op = this.previous().value;
      const operand = this.parseUnary();
      return { type: 'unary', op, operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    // Number
    if (this.match('NUMBER')) {
      return { type: 'number', value: parseFloat(this.previous().value) };
    }

    // String
    if (this.match('STRING')) {
      return { type: 'string', value: this.previous().value };
    }

    // Boolean
    if (this.match('BOOLEAN')) {
      return { type: 'boolean', value: this.previous().value === 'TRUE' };
    }

    // Function call
    if (this.match('FUNCTION')) {
      const name = this.previous().value;
      this.consume('LPAREN', `Expected '(' after function ${name}`);
      
      const args: ASTNode[] = [];
      if (!this.check('RPAREN')) {
        do {
          args.push(this.parseExpression());
        } while (this.match('COMMA'));
      }
      
      this.consume('RPAREN', `Expected ')' after function arguments`);
      return { type: 'function', name, args };
    }

    // Cell reference or range
    if (this.match('CELL_REF')) {
      const start = this.previous().value;
      
      // Check for range (A1:B10)
      if (this.match('COLON')) {
        this.consume('CELL_REF', 'Expected cell reference after ":"');
        const end = this.previous().value;
        return { type: 'range', start, end };
      }
      
      return { type: 'cell', ref: start };
    }

    // Parentheses
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', `Expected ')' after expression`);
      return expr;
    }

    const peeked = this.peek();
    throw new Error(`Unexpected token: ${peeked?.value || 'EOF'} at position ${peeked?.pos || 'end'}`);
  }

  private match(type: TokenType, values?: string[]): boolean {
    if (this.check(type, values)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType, values?: string[]): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (values && !values.includes(token.value)) return false;
    return true;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }
}

// Singleton instance
export const parser = new FormulaParser();
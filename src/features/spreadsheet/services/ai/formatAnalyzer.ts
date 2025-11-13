
import { GoogleGenAI, Type } from "@google/genai";
import { Sheet } from "../../../lib/store/types";
import { getOrCreateCell } from "../../store/storeHelpers";
import { labelToColIndex, addressToId } from "../../utils/cellUtils";
import { expandRange } from "../../utils/rangeUtils";


// Define the expected AI response structure
const aiResponseSchema = {
    type: Type.OBJECT,
    properties: {
        rules: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    range: { type: Type.STRING, description: "The cell range (e.g., 'A1', 'A1:Z1', 'C:C' for column C, '5:5' for row 5)." },
                    priority: { 
                        type: Type.NUMBER, 
                        description: "Rule priority (1-10). Lower numbers apply first and can be overridden by higher numbers.",
                        nullable: true 
                    },
                    style: {
                        type: Type.OBJECT,
                        properties: {
                            bold: { type: Type.BOOLEAN, nullable: true },
                            italic: { type: Type.BOOLEAN, nullable: true },
                            underline: { type: Type.BOOLEAN, nullable: true },
                            textColor: { type: Type.STRING, description: "Hex color code, e.g., '#FFFFFF'", nullable: true },
                            fillColor: { type: Type.STRING, description: "Hex color code, e.g., '#4F81BD'", nullable: true },
                            textAlign: { type: Type.STRING, description: "'left', 'center', or 'right'", nullable: true },
                            format: { 
                                type: Type.STRING, 
                                description: "The semantic number format. Possible values: 'currency', 'accounting', 'short_date', 'long_date', 'percentage', 'number', 'text', 'comma'.", 
                                nullable: true 
                            },
                            borderTop: { type: Type.STRING, description: "CSS border style (e.g., '1px solid #000000') or null.", nullable: true },
                            borderBottom: { type: Type.STRING, description: "CSS border style (e.g., '1px solid #000000') or null.", nullable: true },
                            borderLeft: { type: Type.STRING, description: "CSS border style (e.g., '1px solid #000000') or null.", nullable: true },
                            borderRight: { type: Type.STRING, description: "CSS border style (e.g., '1px solid #000000') or null.", nullable: true },
                        },
                        required: []
                    }
                },
                required: ['range', 'style']
            },
            nullable: true
        },
        formulas: {
            type: Type.ARRAY,
            description: "An array of formulas to insert into empty cells to complete calculations like sums or row-wise differences.",
            items: {
                type: Type.OBJECT,
                properties: {
                    cellId: { type: Type.STRING, description: "The ID of the cell for the formula (e.g., 'D11')." },
                    formula: { type: Type.STRING, description: "The Excel-style formula (e.g., '=SUM(D2:D10)')." }
                },
                required: ["cellId", "formula"]
            },
            nullable: true
        }
    },
    required: []
};

export async function analyzeSheetFormat(sheetData: any[]): Promise<{ rules: any[], formulas: any[] }> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const enrichedData = sheetData.map(cell => {
            const address = cell.id;
            const row = parseInt(address.match(/\d+/)?.[0] || '0') - 1;
            
            return {
                ...cell,
                isHeader: row === 0,
                dataType: cell.value === null ? 'empty' : 
                         typeof cell.value === 'number' ? 'number' : 
                         typeof cell.value === 'string' ? 'string' : 'other'
            };
        });
        
        const prompt = `
    You are an expert spreadsheet analyst. Your task is to analyze spreadsheet data to infer formatting rules and identify missing calculations.

    PART 1: FORMATTING GUIDELINES
    1.  **Header Detection**: Identify header rows (usually row 0 or 1). Headers typically have bold text, a background color, and a bottom border. Create a single rule for the entire header row (e.g., range '1:1').
    2.  **Data Table Structure**: Identify the main data area. Right-align numeric columns, left-align text columns. If the table is large, consider adding alternating row colors for readability (e.g., a rule for even rows with a light gray fill).
    3.  **Number Formatting**: Analyze 'numberFormat' and 'value' fields.
        - Currency ("$" or "£"): format 'currency'.
        - Percentage ("%"): format 'percentage'.
        - Dates ("m/d/yy", "yyyy"): format 'short_date'.
        - Numbers with commas: format 'comma'.
    4.  **Total/Summary Rows**: Identify rows with totals (keywords: "Total", "Sum"). These should be bold and have a top border ('2px solid #000000').
    5.  **Border Strategy**: Use borders to define tables. For a data table, suggest a rule for 'all' borders within the data range (e.g., range 'A2:F100' style with '1px solid #D9D9D9' on all border properties).
    6.  **Color Palette**: Use professional colors. Headers: '#4F81BD' (blue). Alternating rows: '#F2F2F2'. Borders: '#D9D9D9' (light gray), '#000000' (black).
    7.  **Priority System**: Assign a priority (1-10) to control rule application order. Lower numbers apply first.
        - Priority 1-3: General styles (e.g., alternating row colors).
        - Priority 4-6: Column/row-specific styles (e.g., right-align a numeric column).
        - Priority 7-9: Header and total row styles, which should override general styles.
        - Priority 10: Specific cell overrides.

    PART 2: FORMULA COMPLETION (CRITICAL)
    Analyze the data to find empty cells where calculations should be.
    
    A. **COLUMN TOTALS**: Look for numeric columns with an empty cell below the last data row. If the header is 'Amount', 'Sales', etc., generate a =SUM(start:end) formula.
       Example: If D2:D10 has numbers and D11 is empty, generate: { cellId: "D11", formula: "=SUM(D2:D10)" }
    
    B. **ROW-WISE CALCULATIONS**: Identify columns that can be calculated from others in the same row (e.g., Profit = Revenue - Cost). Generate formulas for ALL empty cells in that column.
       Example: Headers are "Revenue"(B), "Cost"(C), "Profit"(D), and D2:D10 are empty, generate: [ { cellId: "D2", formula: "=B2-C2" }, { cellId: "D3", formula: "=B3-C3" }, ... ]
    
    RULES:
    - Only generate formulas for currently empty cells (value is null).
    - Ensure cell references are correct.
    - Prioritize obvious patterns.

    Return a JSON object with optional "rules" (for formatting) and "formulas" (for calculations) keys.

    Here is the spreadsheet data (includes empty cells):
    ${JSON.stringify(enrichedData.slice(0, 300), null, 2)}
`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: aiResponseSchema,
            },
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);

        if (result.rules) {
            result.rules.sort((a: any, b: any) => (a.priority || 5) - (b.priority || 5));
        }

        return {
            rules: result.rules || [],
            formulas: result.formulas || [],
        };

    } catch (error) {
        console.error("Error analyzing sheet with AI:", error);
        return { rules: [], formulas: [] };
    }
}

export function applyAiFormattingRules(sheet: Sheet, rules: any[]) {
    if (!rules) return;

    const applyStyleToCell = (cellId: string, style: any) => {
        const cleanStyle: any = {};
        for (const key in style) {
            if (style[key] !== null && style[key] !== undefined) {
                cleanStyle[key] = style[key];
            }
        }
        if (Object.keys(cleanStyle).length === 0) return;

        const cell = getOrCreateCell(sheet, cellId);
        cell.style = { ...cell.style, ...cleanStyle };
        sheet.data[cellId] = cell;
    };

    rules.forEach(rule => {
        if (!rule.range || !rule.style) return;
        
        try {
            if (/^[A-Z]+:[A-Z]+$/.test(rule.range)) { // e.g., C:C
                const colLabel = rule.range.split(':')[0];
                const col = labelToColIndex(colLabel);
                for (let r = 0; r <= sheet.lastUsedRow; r++) {
                    applyStyleToCell(addressToId({ col, row: r }), rule.style);
                }
                return;
            }
            if (/^[0-9]+:[0-9]+$/.test(rule.range)) { // e.g., 1:1
                const row = parseInt(rule.range.split(':')[0], 10) - 1;
                for (let c = 0; c <= sheet.lastUsedCol; c++) {
                    applyStyleToCell(addressToId({ col: c, row: row }), rule.style);
                }
                return;
            }

            const cellIds = expandRange(rule.range);
            cellIds.forEach(cellId => {
                applyStyleToCell(cellId, rule.style);
            });
        } catch (e) {
            console.warn(`Could not apply AI formatting rule for range "${rule.range}":`, e);
        }
    });
}

import { GoogleGenAI, Type } from "@google/genai";
import { Sheet } from "../store/types";
import { getOrCreateCell } from "../store/storeHelpers";
import { labelToColIndex, addressToId } from "../utils/cellUtils";
import { expandRange } from "../utils/rangeUtils";


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
                                description: "The semantic number format. Possible values: 'currency', 'accounting', 'short_date', 'long_date', 'percentage', 'number', 'text'.", 
                                nullable: true 
                            },
                        },
                        required: []
                    }
                },
                required: ['range', 'style']
            }
        }
    },
    required: ['rules']
};

export async function analyzeSheetFormat(sheetData: any[]): Promise<any> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            You are an expert spreadsheet format designer. I will provide you with a JSON representation of cells from a spreadsheet.
            Your task is to analyze the data, styling hints, and number format codes to infer the overall formatting rules.
            - Do not just copy the styles from single cells. Identify patterns and create general rules. For example, if all cells in the first row are bold and have a blue background, you should create a single rule for the entire first row ('1:1').
            - Analyze the 'value' and the 'numberFormat' hint (which is the raw Excel format string) to determine the semantic number format for the cell. For example, if 'numberFormat' is '"$"#,##0.00' or similar, the format should be 'currency'. If it is 'm/d/yy' or contains 'yyyy', it should be 'short_date'. If it contains a '%', it should be 'percentage'.
            - Focus on identifying header rows, total rows, and columns with consistent data types.
            Return a JSON object that strictly adheres to the provided schema. The JSON must contain a single key, "rules", which is an array of formatting rule objects.
            Each rule must have a "range" and a "style" object.

            Here is the spreadsheet data (showing a sample of up to 200 cells):
            ${JSON.stringify(sheetData.slice(0, 200))}
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
        return result.rules || [];

    } catch (error) {
        console.error("Error analyzing sheet format with AI:", error);
        // Return empty rules on error so the import can proceed without AI styling
        return [];
    }
}

export function applyAiFormattingRules(sheet: Sheet, rules: any[]) {
    if (!rules) return;

    const applyStyleToCell = (cellId: string, style: any) => {
        // AI may return nullable values, filter them out
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
            // Handle full column/row ranges
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

            // Handle normal ranges (A1, A1:B5)
            const cellIds = expandRange(rule.range);
            cellIds.forEach(cellId => {
                applyStyleToCell(cellId, rule.style);
            });
        } catch (e) {
            console.warn(`Could not apply AI formatting rule for range "${rule.range}":`, e);
        }
    });
}
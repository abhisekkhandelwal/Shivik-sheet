
import { GoogleGenAI, Type } from "@google/genai";

const floorPlanSchema = {
    type: Type.OBJECT,
    properties: {
        cells: {
            type: Type.ARRAY,
            description: "An array of cell objects representing the floor plan.",
            items: {
                type: Type.OBJECT,
                properties: {
                    row: { type: Type.INTEGER, description: "The zero-based row index." },
                    col: { type: Type.INTEGER, description: "The zero-based column index." },
                    color: { type: Type.STRING, description: "The hex color code for the cell." }
                },
                required: ["row", "col", "color"]
            }
        }
    },
    required: ["cells"]
};


export async function analyzeFloorPlanImage(base64Image: string): Promise<{ row: number; col: number; color: string }[]> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            You are an architectural assistant that digitizes floor plans.
            Analyze the provided floor plan image and convert it into a coarse grid-based representation suitable for a spreadsheet.
            The final grid should be approximately 50x50 cells.
            Identify the main structural components: walls, and empty spaces.
            
            Generate a JSON object containing an array of cells to be colored according to the following scheme:
            - Walls: '#333333' (dark gray)
            - Empty Space: '#FFFFFF' (white)

            Return a JSON object that strictly adheres to the provided schema. The JSON must contain a single key, "cells", which is an array of cell objects.
        `;

        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [ { text: prompt }, imagePart ] },
            config: {
                responseMimeType: "application/json",
                responseSchema: floorPlanSchema,
            },
        });

        const jsonText = response.text;
        if (!jsonText) {
          throw new Error("AI returned an empty response.");
        }
        const result = JSON.parse(jsonText);
        return result.cells || [];

    } catch (error) {
        console.error("Error analyzing floor plan with AI:", error);
        throw new Error("The AI could not process the floor plan image. Please try again with a clearer image.");
    }
}

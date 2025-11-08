
import { CellValue, CellStyle } from "../store/types";

/**
 * Formats a raw cell value into a display string based on a format rule.
 * @param value The raw value from the cell data.
 * @param style The cell's style object.
 * @returns A formatted string for display.
 */
export const formatValue = (value: CellValue, style?: Partial<CellStyle>): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

    const { format = 'general', decimalPlaces } = style || {};

    const num = Number(value);
    if (typeof value === 'string' && (format === 'general' || format === 'text')) {
        return value;
    }
    if (isNaN(num)) return String(value);

    try {
        switch(format) {
            case 'number':
            case 'comma':
                return new Intl.NumberFormat('en-US', { 
                    minimumFractionDigits: decimalPlaces,
                    maximumFractionDigits: 20,
                    useGrouping: format === 'comma',
                }).format(num);
            case 'currency':
            case 'accounting':
                return new Intl.NumberFormat('en-US', { 
                    style: 'currency', currency: 'USD',
                    minimumFractionDigits: decimalPlaces ?? 2,
                    maximumFractionDigits: decimalPlaces ?? 2,
                }).format(num);
            case 'percentage':
                return new Intl.NumberFormat('en-US', { 
                    style: 'percent', 
                    minimumFractionDigits: decimalPlaces ?? 2,
                    maximumFractionDigits: 20,
                }).format(num);
            case 'scientific':
                return num.toExponential(decimalPlaces ?? 2);
            // Date/Time formats are simplified for now
            case 'short_date':
                return new Date(num).toLocaleDateString();
             case 'long_date':
                return new Date(num).toDateString();
            case 'time':
                return new Date(num).toLocaleTimeString();
            
            default: // general
                return String(value);
        }
    } catch (e) {
        // Handle cases like invalid dates
        return String(value);
    }
};
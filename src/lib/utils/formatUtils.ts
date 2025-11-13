import { CellValue, CellStyle } from "../store/types";

/**
 * Converts an Excel serial number to a JavaScript Date object.
 * Excel's epoch is 1900-01-01, but it incorrectly treats 1900 as a leap year.
 * The convention is to use 1899-12-30 as the epoch for conversion.
 * @param serial The Excel serial number.
 * @returns A JavaScript Date object.
 */
const excelSerialToDate = (serial: number): Date => {
    // Excel serial date is days since 1899-12-30 (day 1 is 1900-01-01)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    // Adjust for timezone offset to get the correct UTC date
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + timezoneOffset);
}

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

    // Handle Date objects directly (from xlsx import with cellDates:true)
    if (value instanceof Date) {
        try {
            switch(format) {
                case 'short_date':
                    return value.toLocaleDateString();
                 case 'long_date':
                    return value.toDateString();
                case 'time':
                    return value.toLocaleTimeString();
                default: // If a date object has a non-date format, show date string
                    return value.toLocaleDateString();
            }
        } catch (e) {
            return 'Invalid Date';
        }
    }

    if (typeof value === 'string' && (format === 'general' || format === 'text')) {
        return value;
    }
    
    const num = Number(value);
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
            
            // Handle date/time formats when the value is a number (Excel serial date)
            case 'short_date': {
                const date = excelSerialToDate(num);
                return date.toLocaleDateString();
            }
            case 'long_date': {
                const date = excelSerialToDate(num);
                return date.toDateString();
            }
            case 'time': {
                const date = excelSerialToDate(num);
                return date.toLocaleTimeString();
            }
            
            default: // general
                return String(value);
        }
    } catch (e) {
        // Handle cases like invalid dates from bad serial numbers
        return String(value);
    }
};
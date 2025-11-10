
// Text functions - Excel-compatible

// Helper to convert any value to a string for text functions.
const asString = (val: any): string => {
    if (val === null || val === undefined) {
      return '';
    }
    return String(val);
};
  
export const textFunctions = {
    CONCATENATE: (...args: any[]): string => {
        return args.flat(Infinity).map(asString).join('');
    },
    
    LEFT: (text: any, numChars: any = 1): string => {
        const s = asString(text);
        const n = Math.max(0, parseInt(String(numChars), 10) || 1);
        return s.substring(0, n);
    },
    
    RIGHT: (text: any, numChars: any = 1): string => {
        const s = asString(text);
        const n = Math.max(0, parseInt(String(numChars), 10) || 1);
        if (n >= s.length) return s;
        return s.substring(s.length - n);
    },
    
    MID: (text: any, start_num: any, num_chars: any): string => {
        const s = asString(text);
        const start = Math.max(1, parseInt(String(start_num), 10) || 1) - 1;
        const num = Math.max(0, parseInt(String(num_chars), 10) || 0);
        return s.substring(start, start + num);
    },
    
    LEN: (text: any): number => {
        return asString(text).length;
    },
    
    LOWER: (text: any): string => {
        return asString(text).toLowerCase();
    },
    
    UPPER: (text: any): string => {
        return asString(text).toUpperCase();
    }
};
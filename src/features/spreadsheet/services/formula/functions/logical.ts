
// Logical functions - Excel-compatible

export const logicalFunctions = {
    IF: (logicalTest: any, valueIfTrue: any, valueIfFalse: any = false): any => {
        return !!logicalTest ? valueIfTrue : valueIfFalse;
    },
    
    AND: (...args: any[]): boolean => {
        return args.flat(Infinity).every(arg => !!arg);
    },
    
    OR: (...args: any[]): boolean => {
        return args.flat(Infinity).some(arg => !!arg);
    },
    
    NOT: (logical: any): boolean => {
        return !logical;
    }
};

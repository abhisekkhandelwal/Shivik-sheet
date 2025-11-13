
// Financial functions

/**
 * Calculates the payment for a loan based on constant payments and a constant interest rate.
 * @param rate The interest rate for the loan.
 * @param nper The total number of payments for the loan.
 * @param pv The present value, or the total amount that a series of future payments is worth now.
 * @param fv [optional] The future value, or a cash balance you want to attain after the last payment is made. Defaults to 0.
 * @param type [optional] The number 0 (end of period) or 1 (beginning of period). Defaults to 0.
 */
const PMT = (rate: number, nper: number, pv: number, fv: number = 0, type: number = 0): number => {
    if (rate === 0) {
        return -(pv + fv) / nper;
    }
    const pvif = Math.pow(1 + rate, nper);
    let pmt = rate / (pvif - 1) * -(pv * pvif + fv);

    if (type === 1) {
        pmt /= (1 + rate);
    }

    return pmt;
};


export const financialFunctions = {
    PMT,
};

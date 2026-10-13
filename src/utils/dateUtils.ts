/**
 * Global Date Formatting Utilities for OlaCars Frontend
 * Standardizes all date displays into DD/MM/YY format.
 */

/**
 * Formats a date string, Date object, or timestamp number into DD/MM/YY format.
 * Example: '2026-10-03' -> '03/10/26'
 * Example: '2026-10-03T08:00:00.000Z' -> '03/10/26'
 * 
 * @param dateInput - The date to format
 * @param fallback - String to return if date is invalid or missing (default: '-')
 * @returns Formatted date string in DD/MM/YY
 */
export const formatDate = (
    dateInput?: string | Date | number | null,
    fallback: string = '-'
): string => {
    if (!dateInput) return fallback;

    // Fast-path ISO date string 'YYYY-MM-DD' without time part to prevent UTC timezone shift
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        // Match exact YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss... where only date portion is needed
        const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymdMatch) {
            const [, y, m, d] = ymdMatch;
            return `${d}/${m}/${y.slice(-2)}`;
        }
        // Match DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
        const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (dmyMatch) {
            const [, d, m, y] = dmyMatch;
            return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.slice(-2)}`;
        }
    }

    const d = typeof dateInput === 'number' || typeof dateInput === 'string'
        ? new Date(dateInput)
        : dateInput;

    if (!(d instanceof Date) || isNaN(d.getTime())) {
        return typeof dateInput === 'string' && dateInput.trim() ? dateInput : fallback;
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
};

/**
 * Formats a date with time into DD/MM/YY, HH:mm format.
 * Example: '03/10/26, 14:30'
 */
export const formatDateTime = (
    dateInput?: string | Date | number | null,
    fallback: string = '-'
): string => {
    if (!dateInput) return fallback;

    const d = typeof dateInput === 'number' || typeof dateInput === 'string'
        ? new Date(dateInput)
        : dateInput;

    if (!(d instanceof Date) || isNaN(d.getTime())) {
        return typeof dateInput === 'string' && dateInput.trim() ? dateInput : fallback;
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
};

/**
 * Formats a date range span string into DD/MM/YY format.
 * Example: formatSpan('2026-09-01', '2026-10-03') -> 'Span: 01/09/26 - 03/10/26'
 */
export const formatSpan = (
    startDate?: string | Date | null,
    endDate?: string | Date | null,
    startFallback = 'Start',
    endFallback = 'Now'
): string => {
    const s = startDate ? formatDate(startDate) : startFallback;
    const e = endDate ? formatDate(endDate) : endFallback;
    return `Span: ${s} - ${e}`;
};

// Aliases for compatibility
export const formatDateDDMMYY = formatDate;
export const formatDateToDMY = formatDate;
export const formatDateDMY = formatDate;
export const formatDateForDisplay = formatDate;
export const formatDateUTC = formatDate;

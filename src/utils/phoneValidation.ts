import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input';
import { validatePhoneNumberLength } from 'libphonenumber-js';

export type PhoneValidationErrorKey = 
    | 'REQUIRED' 
    | 'REPEATED_DIGITS' 
    | 'TOO_SHORT' 
    | 'TOO_LONG' 
    | 'INVALID_LENGTH' 
    | 'INVALID_FORMAT' 
    | 'INVALID_COUNTRY';

export interface PhoneValidationResult {
    isValid: boolean;
    errorKey?: PhoneValidationErrorKey;
    defaultMessage?: string;
}

/**
 * Validates a phone number using standard libphonenumber-js metadata.
 * Also checks if the national number consists of all repeated digits (e.g., 99999-99999)
 * or contains 6 or more repeated digits in a row.
 * 
 * @param phone - The phone number string (e.g., "919876543210" or "+919876543210")
 * @returns PhoneValidationResult - Object indicating status and specific error reason.
 */
export const validatePhoneDetails = (phone: string): PhoneValidationResult => {
    // 1. Check if empty
    if (!phone || !phone.trim()) {
        return {
            isValid: false,
            errorKey: 'REQUIRED',
            defaultMessage: 'Phone number is required.'
        };
    }
    
    // Ensure phone number starts with '+' as required by E.164 standard validation
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    // 2. Parse phone digits to check for repetition
    try {
        const parsed = parsePhoneNumber(formattedPhone);
        if (parsed && parsed.nationalNumber) {
            const nationalDigits = parsed.nationalNumber;
            const isAllSameDigit = /^(.)\1+$/.test(nationalDigits);
            const hasSixRepeatedInARow = /(\d)\1{5,}/.test(nationalDigits);
            
            if (isAllSameDigit || hasSixRepeatedInARow) {
                return {
                    isValid: false,
                    errorKey: 'REPEATED_DIGITS',
                    defaultMessage: 'Phone number cannot consist of repeated digits.'
                };
            }
        }
    } catch (e) {
        return {
            isValid: false,
            errorKey: 'INVALID_COUNTRY',
            defaultMessage: 'Please select a valid country code.'
        };
    }
    
    // 3. Check for specific length limits (Too Short / Too Long) using libphonenumber-js rules
    try {
        const lengthError = validatePhoneNumberLength(formattedPhone);
        if (lengthError) {
            if (lengthError === 'TOO_SHORT') {
                return {
                    isValid: false,
                    errorKey: 'TOO_SHORT',
                    defaultMessage: 'Phone number is too short for this country.'
                };
            }
            if (lengthError === 'TOO_LONG') {
                return {
                    isValid: false,
                    errorKey: 'TOO_LONG',
                    defaultMessage: 'Phone number is too long for this country.'
                };
            }
            return {
                isValid: false,
                errorKey: 'INVALID_LENGTH',
                defaultMessage: 'Invalid phone number length.'
            };
        }
    } catch (e) {
        return {
            isValid: false,
            errorKey: 'INVALID_FORMAT',
            defaultMessage: 'Please enter a valid phone number.'
        };
    }
    
    // 4. Strict pattern checks (validates area codes / prefix combinations)
    if (!isValidPhoneNumber(formattedPhone)) {
        return {
            isValid: false,
            errorKey: 'INVALID_FORMAT',
            defaultMessage: 'Please enter a valid phone number.'
        };
    }
    
    return { isValid: true };
};

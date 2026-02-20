/**
 * File Upload Validation Utility
 * Provides security checks for CSV and JSON file uploads
 */

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (matches backend)
const MAX_ENTRIES = Infinity; // No limit on entries

// Dangerous patterns to strip
const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<[^>]+on\w+\s*=/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
];

/**
 * Sanitize a string by removing dangerous content
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    let sanitized = str;
    DANGEROUS_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
    });
    // Remove null bytes and control characters
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    return sanitized.trim();
}

/**
 * Validate file before processing
 */
export function validateFile(file, allowedTypes) {
    const errors = [];

    if (!file) {
        errors.push('No file selected');
        return { valid: false, errors };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(extension)) {
        errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate and sanitize abbreviation data
 */
export function validateAbbreviationData(data) {
    const errors = [];

    if (!Array.isArray(data)) {
        errors.push('Data must be an array');
        return { valid: false, errors, data: null };
    }

    if (data.length > MAX_ENTRIES) {
        errors.push(`Too many entries. Maximum is ${MAX_ENTRIES}`);
        return { valid: false, errors, data: null };
    }

    const sanitizedData = data.map((item, idx) => {
        if (!item.abbreviation || !item.fullForm) {
            errors.push(`Entry ${idx + 1}: Missing abbreviation or fullForm`);
            return null;
        }
        return {
            abbreviation: sanitizeString(String(item.abbreviation)),
            fullForm: sanitizeString(String(item.fullForm))
        };
    }).filter(Boolean);

    return {
        valid: errors.length === 0,
        errors,
        data: sanitizedData
    };
}

/**
 * Validate and sanitize dictionary data
 */
export function validateDictionaryData(data) {
    const errors = [];

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push('Data must be an object with words as keys');
        return { valid: false, errors, data: null };
    }

    const keys = Object.keys(data);
    if (keys.length > MAX_ENTRIES) {
        errors.push(`Too many entries. Maximum is ${MAX_ENTRIES}`);
        return { valid: false, errors, data: null };
    }

    const sanitizedData = {};
    keys.forEach(word => {
        const sanitizedWord = sanitizeString(word);
        const wordData = data[word];

        if (!wordData.MEANINGS || !Array.isArray(wordData.MEANINGS)) {
            errors.push(`${word}: Missing MEANINGS array`);
            return;
        }

        sanitizedData[sanitizedWord] = {
            MEANINGS: wordData.MEANINGS.map(m => [
                sanitizeString(String(m[0] || 'noun')),
                sanitizeString(String(m[1] || '')),
                Array.isArray(m[2]) ? m[2].map(s => sanitizeString(String(s))) : [],
                Array.isArray(m[3]) ? m[3].map(s => sanitizeString(String(s))) : []
            ]),
            SYNONYMS: Array.isArray(wordData.SYNONYMS)
                ? wordData.SYNONYMS.map(s => sanitizeString(String(s)))
                : [],
            ANTONYMS: Array.isArray(wordData.ANTONYMS)
                ? wordData.ANTONYMS.map(s => sanitizeString(String(s)))
                : []
        };
    });

    return {
        valid: errors.length === 0,
        errors,
        data: sanitizedData
    };
}

/**
 * Parse CSV content for abbreviations
 */
export function parseAbbreviationCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return { valid: false, errors: ['CSV must have header and at least one data row'], data: null };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const abbrIdx = headers.findIndex(h => h === 'abbreviation');
    const fullIdx = headers.findIndex(h => h === 'fullform');

    if (abbrIdx === -1 || fullIdx === -1) {
        return { valid: false, errors: ['CSV must have "abbreviation" and "fullForm" columns'], data: null };
    }

    const data = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
            abbreviation: cols[abbrIdx] || '',
            fullForm: cols[fullIdx] || ''
        };
    }).filter(row => row.abbreviation && row.fullForm);

    return validateAbbreviationData(data);
}

/**
 * Parse CSV content for dictionary
 */
export function parseDictionaryCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return { valid: false, errors: ['CSV must have header and at least one data row'], data: null };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const wordIdx = headers.indexOf('word');
    const posIdx = headers.indexOf('partofspeech');
    const defIdx = headers.indexOf('definition');
    const synIdx = headers.indexOf('synonyms');
    const antIdx = headers.indexOf('antonyms');

    if (wordIdx === -1 || defIdx === -1) {
        return { valid: false, errors: ['CSV must have "word" and "definition" columns'], data: null };
    }

    const dictionary = {};
    lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const word = (cols[wordIdx] || '').toUpperCase();
        if (!word) return;

        if (!dictionary[word]) {
            dictionary[word] = { MEANINGS: [], SYNONYMS: [], ANTONYMS: [] };
        }

        dictionary[word].MEANINGS.push([
            cols[posIdx] || 'noun',
            cols[defIdx] || '',
            cols[synIdx] ? cols[synIdx].split(';').map(s => s.trim()) : [],
            []
        ]);

        if (cols[synIdx]) {
            const syns = cols[synIdx].split(';').map(s => s.trim());
            dictionary[word].SYNONYMS = [...new Set([...dictionary[word].SYNONYMS, ...syns])];
        }
        if (cols[antIdx]) {
            const ants = cols[antIdx].split(';').map(s => s.trim());
            dictionary[word].ANTONYMS = [...new Set([...dictionary[word].ANTONYMS, ...ants])];
        }
    });

    return validateDictionaryData(dictionary);
}

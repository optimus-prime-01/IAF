/**
 * Security Question Service
 * 
 * Handles encryption and verification of security question answers.
 * Uses bcrypt for one-way hashing (same approach as passwords).
 * 
 * @module services/securityQuestion.service
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Predefined security questions for users to choose from.
 */
const AVAILABLE_QUESTIONS = [
    'What is your girlfriend\'s secret nickname that only you know?',
    'What is Shreya\'s (mother/crush/girlfriend) favorite food that you made for her?',
    'What is your mother\'s maiden name?',
    'What was the name of your first pet?',
    'What city were you born in?',
    'What is your favorite movie?',
    'What was your childhood nickname?',
    'What is the name of your first school?',
    'What is your father\'s middle name?',
    'What was the make of your first car?',
    'What is your favorite book?',
    'What street did you grow up on?',
    'What was the first gift you gave your girlfriend?'
];

/**
 * Hash a security question answer.
 * Normalizes the answer (lowercase, trim) before hashing.
 * 
 * @param {string} answer - Plain text answer
 * @returns {Promise<string>} - Bcrypt hash of the normalized answer
 */
const hashAnswer = async (answer) => {
    if (!answer || typeof answer !== 'string') {
        throw new Error('Answer is required');
    }
    // Normalize: lowercase, trim, remove extra spaces
    const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
    return bcrypt.hash(normalized, SALT_ROUNDS);
};

/**
 * Hash multiple security question answers.
 * 
 * @param {Array<{question: string, answer: string}>} questionAnswers - Array of Q&A pairs
 * @returns {Promise<Array<{question: string, answerHash: string}>>} - Hashed Q&A pairs
 */
const hashSecurityAnswers = async (questionAnswers) => {
    if (!Array.isArray(questionAnswers) || questionAnswers.length === 0) {
        throw new Error('At least 3 security questions are required');
    }

    const hashedPairs = await Promise.all(
        questionAnswers.map(async ({ question, answer }) => {
            if (!question || !answer) {
                throw new Error('Both question and answer are required');
            }
            return {
                question: question.trim(),
                answerHash: await hashAnswer(answer)
            };
        })
    );

    return hashedPairs;
};

/**
 * Verify a single security answer against its hash.
 * 
 * @param {string} providedAnswer - User's answer attempt
 * @param {string} storedHash - Bcrypt hash from database
 * @returns {Promise<boolean>} - True if answer matches
 */
const verifyAnswer = async (providedAnswer, storedHash) => {
    if (!providedAnswer || !storedHash) {
        return false;
    }
    const normalized = providedAnswer.toLowerCase().trim().replace(/\s+/g, ' ');
    return bcrypt.compare(normalized, storedHash);
};

/**
 * Verify all security answers for a user.
 * All answers must be correct for verification to pass.
 * 
 * @param {Array<{question: string, answer: string}>} providedAnswers - User's answers
 * @param {Array<{question: string, answerHash: string}>} storedQuestions - From database
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
const verifySecurityAnswers = async (providedAnswers, storedQuestions) => {
    if (!Array.isArray(providedAnswers) || !Array.isArray(storedQuestions)) {
        return { valid: false, error: 'Invalid input format' };
    }

    if (providedAnswers.length !== storedQuestions.length) {
        return { valid: false, error: 'Number of answers does not match' };
    }

    // Create a map of stored questions for easier lookup
    const storedMap = new Map(
        storedQuestions.map(q => [q.question, q.answerHash])
    );

    for (const { question, answer } of providedAnswers) {
        const storedHash = storedMap.get(question);
        if (!storedHash) {
            return { valid: false, error: `Unknown question: ${question}` };
        }

        const isCorrect = await verifyAnswer(answer, storedHash);
        if (!isCorrect) {
            return { valid: false, error: 'One or more answers are incorrect' };
        }
    }

    return { valid: true };
};

module.exports = {
    AVAILABLE_QUESTIONS,
    hashAnswer,
    hashSecurityAnswers,
    verifyAnswer,
    verifySecurityAnswers
};

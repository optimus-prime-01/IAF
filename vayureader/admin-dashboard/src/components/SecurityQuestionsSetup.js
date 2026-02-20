import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SecurityQuestionsSetup({ onComplete }) {
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState([
        { question: '', answer: '' },
        { question: '', answer: '' },
        { question: '', answer: '' }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const res = await api.get('/api/admin/recovery/questions');
            setAvailableQuestions(res.data.data?.questions || []);
        } catch (err) {
            setError('Failed to load security questions');
        }
    };

    const handleQuestionChange = (index, field, value) => {
        const updated = [...selectedQuestions];
        updated[index][field] = value;
        setSelectedQuestions(updated);
    };

    const addQuestion = () => {
        if (selectedQuestions.length < 5) {
            setSelectedQuestions([...selectedQuestions, { question: '', answer: '' }]);
        }
    };

    const removeQuestion = (index) => {
        if (selectedQuestions.length > 3) {
            setSelectedQuestions(selectedQuestions.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate
        const valid = selectedQuestions.every(q => q.question && q.answer.trim().length >= 2);
        if (!valid) {
            setError('All questions must have answers (min 2 characters)');
            return;
        }

        // Check for duplicate questions
        const questions = selectedQuestions.map(q => q.question);
        if (new Set(questions).size !== questions.length) {
            setError('Please select different questions for each field');
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/admin/recovery/setup', { securityQuestions: selectedQuestions });
            setSuccess('Security questions set successfully!');
            setTimeout(() => onComplete?.(), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set security questions');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>🔐 Setup Security Questions</h2>
                    <p style={styles.subtitle}>
                        Set up security questions to enable password recovery.
                        You must complete this step before accessing the dashboard.
                    </p>
                </div>

                {error && <div style={styles.errorBox}>{error}</div>}
                {success && <div style={styles.successBox}>{success}</div>}

                <form onSubmit={handleSubmit}>
                    {selectedQuestions.map((sq, index) => (
                        <div key={index} style={styles.questionGroup}>
                            <div style={styles.questionHeader}>
                                <span style={styles.questionNumber}>Question {index + 1}</span>
                                {selectedQuestions.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeQuestion(index)}
                                        style={styles.removeBtn}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <select
                                value={sq.question}
                                onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                                style={styles.select}
                                required
                            >
                                <option value="">Select a question...</option>
                                {availableQuestions.map((q, i) => (
                                    <option key={i} value={q} disabled={selectedQuestions.some((s, si) => si !== index && s.question === q)}>
                                        {q}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Your answer..."
                                value={sq.answer}
                                onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                                style={styles.input}
                                required
                                minLength={2}
                            />
                        </div>
                    ))}

                    {selectedQuestions.length < 5 && (
                        <button type="button" onClick={addQuestion} style={styles.addBtn}>
                            + Add another question
                        </button>
                    )}

                    <button type="submit" disabled={loading} style={styles.submitBtn}>
                        {loading ? 'Saving...' : 'Save Security Questions'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20
    },
    card: {
        background: '#fff',
        borderRadius: 16,
        padding: 40,
        maxWidth: 500,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
    },
    header: {
        marginBottom: 30,
        textAlign: 'center'
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#1e293b',
        margin: 0
    },
    subtitle: {
        color: '#64748b',
        marginTop: 8,
        fontSize: '0.95rem',
        lineHeight: 1.5
    },
    errorBox: {
        background: '#fef2f2',
        color: '#dc2626',
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #fecaca'
    },
    successBox: {
        background: '#f0fdf4',
        color: '#16a34a',
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #bbf7d0'
    },
    questionGroup: {
        marginBottom: 24,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #e2e8f0'
    },
    questionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    questionNumber: {
        fontWeight: 600,
        color: '#475569',
        fontSize: '0.9rem'
    },
    removeBtn: {
        background: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        borderRadius: 6,
        padding: '4px 10px',
        cursor: 'pointer',
        fontSize: '0.85rem'
    },
    select: {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: '0.95rem',
        marginBottom: 12,
        background: '#fff'
    },
    input: {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: '0.95rem',
        boxSizing: 'border-box'
    },
    addBtn: {
        width: '100%',
        padding: '12px',
        background: '#f1f5f9',
        color: '#475569',
        border: '2px dashed #cbd5e1',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: '0.95rem',
        marginBottom: 20
    },
    submitBtn: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer'
    }
};

import React, { useState } from 'react';
import api from '../utils/api';

const STEPS = {
    ENTER_CONTACT: 1,
    ANSWER_QUESTIONS: 2,
    ENTER_OTP: 3
};

export default function ForgotPassword({ onBack, onSuccess }) {
    const [step, setStep] = useState(STEPS.ENTER_CONTACT);
    const [contact, setContact] = useState('');
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [loginToken, setLoginToken] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [devOtp, setDevOtp] = useState('');

    // Step 1: Initiate recovery
    const handleInitiate = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/api/admin/recovery/initiate', { contact });
            setQuestions(res.data.data.questions || []);
            setAnswers(new Array(res.data.data.questions.length).fill(''));
            setStep(STEPS.ANSWER_QUESTIONS);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initiate recovery');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify answers
    const handleVerifyAnswers = async (e) => {
        e.preventDefault();
        setError('');

        if (answers.some(a => !a.trim())) {
            setError('Please answer all security questions');
            return;
        }

        setLoading(true);
        try {
            // Format answers as expected by backend [{ question, answer }]
            const formattedAnswers = questions.map((q, i) => ({
                question: q,
                answer: answers[i]
            }));

            const res = await api.post('/api/admin/recovery/verify', {
                contact,
                answers: formattedAnswers
            });
            setLoginToken(res.data.data.loginToken);
            if (res.data.data.otp) {
                setDevOtp(res.data.data.otp); // DEV MODE
            }
            setStep(STEPS.ENTER_OTP);
        } catch (err) {
            setError(err.response?.data?.message || 'Incorrect answers');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Verify OTP and reset password
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Use the admin reset endpoint
            await api.post('/api/admin/recovery/reset', {
                contact,
                otp,
                loginToken,
                newPassword: password // Send as newPassword
            });
            onSuccess?.();
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (index, value) => {
        const updated = [...answers];
        updated[index] = value;
        setAnswers(updated);
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>🔑 Password Recovery</h2>
                    <p style={styles.subtitle}>
                        {step === STEPS.ENTER_CONTACT && 'Enter your contact number to recover your account'}
                        {step === STEPS.ANSWER_QUESTIONS && 'Answer your security questions'}
                        {step === STEPS.ENTER_OTP && 'Enter OTP and set your new password'}
                    </p>
                </div>

                {/* Progress Steps */}
                <div style={styles.progress}>
                    <div style={{ ...styles.progressStep, ...(step >= 1 ? styles.progressStepActive : {}) }}>1</div>
                    <div style={{ ...styles.progressLine, ...(step >= 2 ? styles.progressLineActive : {}) }}></div>
                    <div style={{ ...styles.progressStep, ...(step >= 2 ? styles.progressStepActive : {}) }}>2</div>
                    <div style={{ ...styles.progressLine, ...(step >= 3 ? styles.progressLineActive : {}) }}></div>
                    <div style={{ ...styles.progressStep, ...(step >= 3 ? styles.progressStepActive : {}) }}>3</div>
                </div>

                {error && <div style={styles.errorBox}>{error}</div>}
                {devOtp && <div style={styles.devBox}>DEV MODE: OTP is {devOtp}</div>}

                {/* Step 1: Enter Contact */}
                {step === STEPS.ENTER_CONTACT && (
                    <form onSubmit={handleInitiate}>
                        <input
                            type="text"
                            placeholder="Enter your contact number"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            style={styles.input}
                            required
                        />
                        <button type="submit" disabled={loading} style={styles.submitBtn}>
                            {loading ? 'Processing...' : 'Continue'}
                        </button>
                    </form>
                )}

                {/* Step 2: Answer Questions */}
                {step === STEPS.ANSWER_QUESTIONS && (
                    <form onSubmit={handleVerifyAnswers}>
                        {questions.map((question, index) => (
                            <div key={index} style={styles.questionGroup}>
                                <label style={styles.label}>{question}</label>
                                <input
                                    type="text"
                                    placeholder="Your answer..."
                                    value={answers[index] || ''}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    style={styles.input}
                                    required
                                />
                            </div>
                        ))}
                        <button type="submit" disabled={loading} style={styles.submitBtn}>
                            {loading ? 'Verifying...' : 'Verify Answers'}
                        </button>
                    </form>
                )}

                {/* Step 3: Enter OTP */}
                {step === STEPS.ENTER_OTP && (
                    <form onSubmit={handleVerifyOtp}>
                        <input
                            type="text"
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            style={styles.input}
                            required
                            maxLength={6}
                        />
                        <input
                            type="password"
                            placeholder="Enter new password (min 8 chars)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                            minLength={8}
                        />
                        <button type="submit" disabled={loading} style={styles.submitBtn}>
                            {loading ? 'Resetting...' : 'Reset Password & Login'}
                        </button>
                    </form>
                )}

                <button onClick={onBack} style={styles.backBtn}>
                    ← Back to Login
                </button>
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
        maxWidth: 450,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
    },
    header: {
        marginBottom: 24,
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
        fontSize: '0.95rem'
    },
    progress: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30
    },
    progressStep: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#e2e8f0',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: '0.9rem'
    },
    progressStepActive: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff'
    },
    progressLine: {
        width: 40,
        height: 3,
        background: '#e2e8f0',
        margin: '0 4px'
    },
    progressLineActive: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    errorBox: {
        background: '#fef2f2',
        color: '#dc2626',
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #fecaca'
    },
    devBox: {
        background: '#fef3c7',
        color: '#92400e',
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 20,
        border: '1px solid #fcd34d',
        fontFamily: 'monospace'
    },
    questionGroup: {
        marginBottom: 20
    },
    label: {
        display: 'block',
        fontWeight: 500,
        color: '#475569',
        marginBottom: 8,
        fontSize: '0.95rem'
    },
    input: {
        width: '100%',
        padding: '14px 16px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: '1rem',
        marginBottom: 16,
        boxSizing: 'border-box'
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
        cursor: 'pointer',
        marginBottom: 16
    },
    backBtn: {
        width: '100%',
        padding: '12px',
        background: 'transparent',
        color: '#64748b',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: '0.95rem',
        cursor: 'pointer'
    }
};

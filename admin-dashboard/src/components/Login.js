import React, { useState, useRef } from 'react';
import api from '../utils/api';
import { useNotifications, NotificationToast } from '../hooks/useNotifications';

export default function Login({ onLoginSuccess, onForgotPassword }) {
    const [step, setStep] = useState(1); // 1: password, 2: OTP
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loginToken, setLoginToken] = useState('');
    const [deviceId] = useState(() => {
        let id = localStorage.getItem('admin_device_id');
        if (!id) {
            id = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
            localStorage.setItem('admin_device_id', id);
        }
        return id;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { notifications, addNotification, removeNotification } = useNotifications();

    // Refs for OTP input boxes
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    // Format phone input - only allow digits, max 10
    const handlePhoneChange = (e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        setContact(digits);
    };

    // Handle OTP input change
    const handleOtpChange = (index, value) => {
        // Only allow single digit
        const digit = value.replace(/\D/g, '').slice(0, 1);

        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        // Auto-focus next input
        if (digit && index < 5) {
            otpRefs[index + 1].current?.focus();
        }
    };

    // Handle backspace for OTP
    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs[index - 1].current?.focus();
        }
    };

    // Handle paste for OTP
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length && i < 6; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        // Focus last filled or next empty
        const lastIndex = Math.min(pastedData.length, 5);
        otpRefs[lastIndex].current?.focus();
    };

    // Get OTP as string
    const getOtpString = () => otp.join('');

    // Step 1: Verify password and request OTP
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (contact.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/admin/login/request-otp', { contact, password, deviceId });
            setLoginToken(res.data.data.loginToken);
            setStep(2);
            if (res.data.data && res.data.data.otp) {
                console.log("DEV MODE OTP:", res.data.data.otp);
                addNotification(`[DEV MODE] Your OTP is: ${res.data.data.otp}`, 'success', 10000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP and complete login
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpString = getOtpString();
        if (otpString.length !== 6) {
            setError('Please enter complete 6-digit OTP');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/admin/login/verify-otp', {
                contact,
                otp: otpString,
                loginToken,
                deviceId
            });
            const { admin } = res.data.data;
            // JWT is now stored in HTTP-only cookie by the server
            localStorage.setItem('admin_info', JSON.stringify(admin));
            onLoginSuccess(admin);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep(1);
        setOtp(['', '', '', '', '', '']);
        setError('');
    };

    return (
        <div style={styles.container}>
            <NotificationToast notifications={notifications} onRemove={removeNotification} />
            <div style={styles.card}>
                <img src="/iaf.png" alt="IAF Logo" style={styles.logo} />
                <h2 style={styles.title}>VayuReader Admin</h2>
                <p style={styles.subtitle}>Two-Factor Authentication</p>

                {error && <div style={styles.error}>{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handlePasswordSubmit}>
                        <input
                            style={styles.input}
                            type="tel"
                            placeholder="Phone Number (10 digits)"
                            value={contact}
                            onChange={handlePhoneChange}
                            maxLength={10}
                            required
                        />
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button style={styles.button} disabled={loading}>
                            {loading ? 'Verifying...' : 'Login'}
                        </button>
                        <button
                            type="button"
                            style={styles.forgotLink}
                            onClick={onForgotPassword}
                        >
                            Forgot Password?
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div style={styles.infoBox}>
                            <span style={styles.checkIcon}>✓</span>
                            OTP sent to ******{contact.slice(-4)}
                        </div>

                        {/* 6-Box OTP Input */}
                        <div style={styles.otpContainer}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={otpRefs[index]}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    onPaste={handleOtpPaste}
                                    style={{
                                        ...styles.otpBox,
                                        borderColor: digit ? '#2563eb' : '#e2e8f0'
                                    }}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <button style={styles.button} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        <button type="button" style={styles.link} onClick={handleBack}>
                            ← Back
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
    },
    card: {
        background: '#fff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
    },
    logo: {
        width: '80px',
        marginBottom: '16px',
    },
    title: {
        marginBottom: '4px',
        color: '#1a1a1a',
        fontSize: '24px',
        fontWeight: '700',
    },
    subtitle: {
        marginBottom: '24px',
        color: '#64748b',
        fontSize: '14px',
    },
    input: {
        width: '100%',
        padding: '14px 16px',
        marginBottom: '16px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box',
    },
    button: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    error: {
        color: '#dc2626',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    infoBox: {
        color: '#16a34a',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    checkIcon: {
        color: '#16a34a',
        fontWeight: 'bold',
    },
    otpContainer: {
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '24px',
    },
    otpBox: {
        width: '48px',
        height: '56px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '24px',
        fontWeight: '700',
        textAlign: 'center',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        caretColor: '#2563eb',
    },
    link: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        marginTop: '16px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'block',
        width: '100%',
    },
    forgotLink: {
        background: 'none',
        border: 'none',
        color: '#2563eb',
        marginTop: '16px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'block',
        width: '100%',
        textDecoration: 'underline'
    }
};

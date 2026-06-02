import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import './auth.css';
import CertiLogo from '../../src/Images/CertiLogo.png';
import stacy from '../../src/Images/Hotel.jpg';

import { API_BASE } from '/src/config';

const SCHOOL_EMAIL_DOMAIN = '@ua.edu.ph';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const isSchoolEmail = (value) => value.trim().toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN);

  const handleGoogleSignup = () => {
    const returnTo = `${window.location.origin}/login`;
    const googleUrl = `${API_BASE}/api/auth/google/login/?return_to=${encodeURIComponent(returnTo)}&hd=ua.edu.ph`;
    window.location.href = googleUrl;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (!isSchoolEmail(formData.email)) {
      setError('Only @ua.edu.ph email addresses are allowed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sending data that matches your Django view requirements
      await axios.post(`${API_BASE}/api/auth/register/`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: 'student' // Default role
      });

      setShowSuccess(true);

      // Redirect to login after success
      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (err) {
      // Capture the specific error message from Django
      const errorDetail = err.response?.data?.error || err.response?.data?.detail || "Registration failed.";
      setError(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* SUCCESS TOAST */}
      {showSuccess && (
        <div className="success-toast">
          <div className="toast-content" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <CheckCircle2 color="#22c55e" size={24} />
            <div className="toast-text">
              <strong>Account Created!</strong>
              <p>Redirecting to login page...</p>
            </div>
          </div>
        </div>
      )}

      <button className="back-btn" onClick={() => navigate('/HomePage')}>
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="auth-split-wrapper">
        {/* LEFT SIDE: Info Section */}
        <div className="auth-info-section register-theme" style={{
          backgroundImage: `linear-gradient(165deg, rgba(5, 9, 80, 1), rgba(2, 2, 12, 0.7)), url(${stacy})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}>
          <div className="info-content">
            <div className='LogoLoginContainer'>
              <img className='LogoLogin' src={CertiLogo} alt="Certifier Logo" />
            </div>
            <h1>Join Us Today</h1>
            <p>Start organizing your certificates and credentials in one secure location.</p>
            <div className="info-graphic">
              <span>✓ Free Account</span>
              <span>✓ EdDSA</span>
              <span>✓ Data Privacy</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Register Form */}
        <div className="auth-form-section">
          <div className="auth-card">
            <div className="auth-header">
              <h2>Create Account</h2>
              <p>Please fill in the details below to get started.</p>
            </div>

            {error && (
              <div className="error-inline">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    style={{ paddingLeft: '16px' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    style={{ paddingLeft: '16px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={18} />
                  <input
                    name="email"
                    type="email"
                    placeholder="name@ua.edu.ph"
                    value={formData.email}
                    onChange={handleChange}
                    pattern="^[A-Za-z0-9\\._%\\+\\-]+@ua\\.edu\\.ph$"
                    title="Use your school email ending with @ua.edu.ph"
                    required
                  />
                </div>
                <small className="input-hint">Registration is limited to UA school emails (@ua.edu.ph).</small>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={18} />
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={18} />
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading || showSuccess}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              <div className="auth-divider"><span>OR CONTINUE WITH</span></div>

              <button type="button" className="google-auth-btn" onClick={handleGoogleSignup} disabled={loading || showSuccess}>
                <svg width="20" height="20" viewBox="0 0 48 48" aria-label="Google" role="img">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.233 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.841 1.154 7.959 3.041l5.657-5.657C34.047 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.841 1.154 7.959 3.041l5.657-5.657C34.047 6.053 29.27 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z" />
                  <path fill="#4CAF50" d="M24 44c5.164 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.144 35.091 26.715 36 24 36c-5.212 0-9.619-3.329-11.283-7.946l-6.522 5.024C9.5 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                Google Account
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign in here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
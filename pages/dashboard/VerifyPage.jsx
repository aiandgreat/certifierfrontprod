import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VerifyPage.css';
import CertiLogo from '../../src/Images/CertiLogo.png';

// I-define ang Base URL para iwas error sa typos
const API_BASE = 'http://127.0.0.1:8000';

const VerifyPage = () => {
    const navigate = useNavigate();
    const [certId, setCertId] = useState('');
    const [result, setResult] = useState(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                window.URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    const handleVerify = async (e) => {
        e.preventDefault();
        
        const trimmedId = certId.trim();
        if (!trimmedId) {
            setError("Please enter a Certificate ID.");
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);
        
        if (pdfBlobUrl) {
            window.URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
        }

        const formattedId = trimmedId.toUpperCase();

        try {
            // 1. API Call: Siguraduhing may trailing slash sa dulo (Django requirement)
            const response = await axios.get(`${API_BASE}/api/verify/${formattedId}/`);
            
            // Note: Depende sa Django view mo, baka response.data agad ang object
            const data = response.data;

            if (data && (data.status === 'VALID' || data.full_name)) {
                setResult(data);

                // 2. Fetch PDF as Blob
                if (data.file_url) {
                    try {
                        const pdfRes = await axios.get(data.file_url, {
                            responseType: 'blob',
                            // Tanggalin muna ang Authorization header dito kung ang file_url ay external (S3/Cloudinary)
                            // para iwas CORS preflight error
                        });
                        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        setPdfBlobUrl(url);
                    } catch (pdfErr) {
                        console.error("PDF Preview Error:", pdfErr);
                        // Hahayaan nating result lang ang makita kung ayaw mag-load ng PDF
                    }
                }
            } else {
                setError("Certificate details are incomplete or invalid.");
            }
        } catch (err) {
            console.error("Verification Error:", err);
            if (err.response?.status === 404) {
                setError(`Certificate "${formattedId}" not found in our database.`);
            } else {
                setError("Server error. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <button className="back-btn" onClick={() => navigate(-1)}>Back</button>

            <div className="auth-split-wrapper glass-effect">
                <div className="verify-left">
                    <div className="info-content">
                        <div className='Logo-Container'>
                            <img className='Logo' src={CertiLogo} alt="Logo" />
                            <h1>Certificate Verification</h1>
                        </div>
                        <p>Authenticate official credentials by entering the unique Certificate ID below.</p>
                        
                        <form onSubmit={handleVerify} className="verify-form-inline">
                            <div className="form-group">
                                <input
                                    type="text"
                                    className="verify-input"
                                    placeholder="e.g. CERT-2024-001"
                                    value={certId}
                                    onChange={(e) => setCertId(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="verify-btn" disabled={loading}>
                                {loading ? 'Checking...' : 'Verify Now'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="verify-right">
                    <div className="result-container">
                        {!result && !error && (
                            <div className="empty-state">
                                <div className="search-icon-placeholder">🔍</div>
                                <p>Waiting for verification...</p>
                                <span>Results will appear here.</span>
                            </div>
                        )}

                        {error && (
                            <div className="result-box invalid">
                                <div className="status-icon">⚠️</div>
                                <h3>Verification Failed</h3>
                                <p>{error}</p>
                            </div>
                        )}

                        {result && (
                            <div className="result-box valid">
                                <div className="status-header">
                                    <span className="status-icon">✅</span>
                                    <div>
                                        <h3>Verified Successfully</h3>
                                        <small>{result.certificate_id || formattedId}</small>
                                    </div>
                                </div>

                                <div className="pdf-preview-wrapper">
                                    {pdfBlobUrl ? (
                                        <iframe
                                            src={`${pdfBlobUrl}#toolbar=0`}
                                            title="Certificate PDF"
                                            className="pdf-iframe"
                                        ></iframe>
                                    ) : (
                                        <div className="pdf-loader">
                                            {loading ? "Fetching Document..." : "Document Preview Unavailable"}
                                        </div>
                                    )}
                                    {result.file_url && (
                                        <a href={result.file_url} target="_blank" rel="noreferrer" className="fullscreen-link">
                                            Download / View Original PDF ↗
                                        </a>
                                    )}
                                </div>

                                <div className="cert-grid">
                                    <div className="grid-item">
                                        <span>Full Name</span>
                                        <p>{result.full_name || 'N/A'}</p>
                                    </div>
                                    <div className="grid-item">
                                        <span>Course/Event</span>
                                        <p>{result.course || result.event_name || 'N/A'}</p>
                                    </div>
                                    <div className="grid-item">
                                        <span>Issued By</span>
                                        <p>{result.issued_by || 'University Administrator'}</p>
                                    </div>
                                    <div className="grid-item">
                                        <span>Date Issued</span>
                                        <p>{result.date_issued || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyPage;
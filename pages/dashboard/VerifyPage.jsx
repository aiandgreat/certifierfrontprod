import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsQR from 'jsqr';
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
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCameraStarting, setIsCameraStarting] = useState(false);
    const [cameraError, setCameraError] = useState('');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const animationFrameRef = useRef(null);
    const scanningRef = useRef(false);

    const normalizeScannedCertificateId = useCallback((value) => {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';

        const pathMatch = rawValue.match(/(?:^|\/)(?:api\/)?verify\/([^/?#]+)/i);
        if (pathMatch?.[1]) {
            return decodeURIComponent(pathMatch[1]).trim();
        }

        try {
            const parsedUrl = new URL(rawValue, window.location.origin);
            const segments = parsedUrl.pathname.split('/').filter(Boolean);
            if (segments.length > 0) {
                return decodeURIComponent(segments[segments.length - 1]).trim();
            }
        } catch {
            // Not a URL, fall back to the raw value below.
        }

        return rawValue.replace(/^.*\//, '').trim();
    }, []);

    const stopScanner = useCallback(() => {
        scanningRef.current = false;

        if (animationFrameRef.current) {
            window.cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsScannerOpen(false);
        setIsCameraStarting(false);
    }, []);

    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                window.URL.revokeObjectURL(pdfBlobUrl);
            }
            stopScanner();
        };
    }, [pdfBlobUrl, stopScanner]);

    const performVerification = async (inputId) => {
        const trimmedId = inputId.trim();
        
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

    const handleVerify = async (e) => {
        e.preventDefault();
        await performVerification(certId);
    };

    const startScanner = async () => {
        setCameraError('');
        setIsScannerOpen(true);
        setIsCameraStarting(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' }
                },
                audio: false
            });

            streamRef.current = stream;

            if (!videoRef.current) {
                throw new Error('Camera preview is not ready.');
            }

            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            scanningRef.current = true;
            setIsCameraStarting(false);

            const scanFrame = () => {
                if (!scanningRef.current || !videoRef.current || !canvasRef.current) {
                    return;
                }

                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d', { willReadFrequently: true });

                if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
                    animationFrameRef.current = window.requestAnimationFrame(scanFrame);
                    return;
                }

                const width = video.videoWidth;
                const height = video.videoHeight;

                if (!width || !height) {
                    animationFrameRef.current = window.requestAnimationFrame(scanFrame);
                    return;
                }

                canvas.width = width;
                canvas.height = height;
                context.drawImage(video, 0, 0, width, height);

                const imageData = context.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, width, height, {
                    inversionAttempts: 'dontInvert'
                });

                if (code?.data) {
                    const scannedValue = normalizeScannedCertificateId(code.data);
                    setCertId(scannedValue);
                    stopScanner();
                    performVerification(scannedValue);
                    return;
                }

                animationFrameRef.current = window.requestAnimationFrame(scanFrame);
            };

            animationFrameRef.current = window.requestAnimationFrame(scanFrame);
        } catch (err) {
            console.error('Camera error:', err);
            stopScanner();
            setCameraError('Camera access failed. Please allow camera permission or use manual entry.');
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

                        <div className="scanner-actions">
                            <button
                                type="button"
                                className="scan-btn"
                                onClick={isScannerOpen ? stopScanner : startScanner}
                                disabled={loading || isCameraStarting}
                            >
                                {isScannerOpen ? 'Close Camera' : (isCameraStarting ? 'Starting Camera...' : 'Scan QR with Camera')}
                            </button>
                            <p className="scanner-note">
                                Point your camera at the QR code on the certificate to auto-fill the Certificate ID.
                            </p>
                        </div>

                        {cameraError && <p className="camera-error">{cameraError}</p>}

                        {isScannerOpen && (
                            <div className="scanner-panel">
                                <div className="scanner-frame">
                                    <video ref={videoRef} className="scanner-video" playsInline muted />
                                    <canvas ref={canvasRef} className="scanner-canvas" aria-hidden="true" />
                                    <div className="scanner-overlay">
                                        <span className="scanner-corner tl" />
                                        <span className="scanner-corner tr" />
                                        <span className="scanner-corner bl" />
                                        <span className="scanner-corner br" />
                                    </div>
                                </div>
                                <div className="scanner-status">
                                    {isCameraStarting ? 'Requesting camera access...' : 'Scanning for QR code...'}
                                </div>
                            </div>
                        )}
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
                                        <small>{result.certificate_id || certId.trim().toUpperCase()}</small>
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
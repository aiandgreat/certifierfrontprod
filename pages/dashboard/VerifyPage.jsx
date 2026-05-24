import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsQR from 'jsqr';
import { Search, Scan, Camera, X, CheckCircle2, AlertCircle, FileText, Download, ArrowLeft } from 'lucide-react';
import '../auth/auth.css';
import './VerifyPage.css';
import CertiLogo from '../../src/Images/CertiLogo.png';
import stacy from '../../src/Images/flagpole.jpg';

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
            const response = await axios.get(`${API_BASE}/api/verify/${formattedId}/`);
            const data = response.data;
            if (data && (data.status === 'VALID' || data.full_name)) {
                setResult(data);
                if (data.file_url) {
                    try {
                        const pdfRes = await axios.get(data.file_url, { responseType: 'blob' });
                        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        setPdfBlobUrl(url);
                    } catch (pdfErr) {
                        console.error("PDF Preview Error:", pdfErr);
                    }
                }
            } else {
                setError("Certificate details are incomplete or invalid.");
            }
        } catch (err) {
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
                video: { facingMode: { ideal: 'environment' } },
                audio: false
            });
            streamRef.current = stream;
            if (!videoRef.current) throw new Error('Camera preview is not ready.');
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            scanningRef.current = true;
            setIsCameraStarting(false);
            const scanFrame = () => {
                if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
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
                const code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
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
            stopScanner();
            setCameraError('Camera access failed. Please allow camera permission or use manual entry.');
        }
    };

    return (
        <div className="auth-container">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
                Back
            </button>

            <div className="auth-split-wrapper">
                {/* LEFT SIDE: Branding */}
                <div className="auth-info-section" style={{
                    backgroundImage: `linear-gradient(165deg, rgba(5, 9, 80, 1), rgba(2, 2, 12, 0.7)), url(${stacy})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover"
                }}>
                    <div className="info-content">
                        <div className='LogoLoginContainer'>
                            <img className='LogoLogin' src={CertiLogo} alt="Certifier Logo" />
                        </div>
                        <h1>Authenticity, Verified.</h1>
                        <p>Instantly validate the integrity and origin of academic credentials with our secure verification engine.</p>
                        <div className="info-graphic">
                            <span>✓ QR Scanned</span>
                            <span>✓ Signed</span>
                            <span>✓ Instant</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Verification Area */}
                <div className="auth-form-section">
                    <div className="auth-card verify-card">
                        <div className="auth-header">
                            <h2>Verify Certificate</h2>
                            <p>Enter the Certificate ID or use your camera to scan the QR code.</p>
                        </div>

                        <form onSubmit={handleVerify} className="auth-form">
                            <div className="form-group">
                                <label>Certificate ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. CERT-B12CEA93"
                                    value={certId}
                                    onChange={(e) => setCertId(e.target.value)}
                                    required
                                    style={{ paddingLeft: '16px' }}
                                />
                            </div>

                            <div className="verify-actions-row">
                                <button type="submit" className="auth-submit" disabled={loading}>
                                    {loading ? 'Verifying...' : 'Verify Now'}
                                </button>
                                <button
                                    type="button"
                                    className="google-auth-btn scan-trigger-btn"
                                    onClick={isScannerOpen ? stopScanner : startScanner}
                                    disabled={loading || isCameraStarting}
                                >
                                    {isScannerOpen ? <X size={20} /> : <Scan size={20} />}
                                    {isScannerOpen ? 'Close Scanner' : 'Scan QR Code'}
                                </button>
                            </div>
                        </form>

                        {cameraError && (
                            <div className="error-inline" style={{ marginTop: '20px' }}>
                                <AlertCircle size={18} />
                                {cameraError}
                            </div>
                        )}

                        {isScannerOpen && (
                            <div className="scanner-panel-wrapper">
                                <div className="scanner-frame">
                                    <video ref={videoRef} className="scanner-video" playsInline muted />
                                    <canvas ref={canvasRef} className="scanner-canvas" aria-hidden="true" />
                                    <div className="scanner-overlay-grid">
                                        <div className="scan-corner tl"></div>
                                        <div className="scan-corner tr"></div>
                                        <div className="scan-corner bl"></div>
                                        <div className="scan-corner br"></div>
                                    </div>
                                </div>
                                <p className="scanner-status-text">
                                    {isCameraStarting ? 'Starting camera...' : 'Center the QR code in the frame'}
                                </p>
                            </div>
                        )}

                        {/* RESULTS AREA */}
                        <div className="results-display-area">
                            {error && (
                                <div className="result-box-error">
                                    <AlertCircle size={32} color="#D71313" />
                                    <h3>Verification Failed</h3>
                                    <p>{error}</p>
                                </div>
                            )}

                            {result && (
                                <div className="result-box-success">
                                    <div className="success-header">
                                        <CheckCircle2 size={32} color="#22c55e" />
                                        <div>
                                            <h3>Credential Validated</h3>
                                            <code>{result.certificate_id}</code>
                                        </div>
                                    </div>

                                    <div className="verification-details-grid">
                                        <div className="detail-item">
                                            <label>Recipient</label>
                                            <p>{result.full_name}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Issued For</label>
                                            <p>{result.course || result.event_name}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Date Issued</label>
                                            <p>{result.date_issued}</p>
                                        </div>
                                        <div className="detail-item">
                                            <label>Status</label>
                                            <span className="status-badge-valid">ACTIVE</span>
                                        </div>
                                    </div>

                                    <div className="preview-action-row">
                                        {pdfBlobUrl && (
                                            <div className="pdf-mini-preview">
                                                <iframe src={`${pdfBlobUrl}#toolbar=0&navpanes=0`} title="Preview" />
                                            </div>
                                        )}
                                        <div className="action-buttons-stack">
                                            <a href={result.file_url} target="_blank" rel="noreferrer" className="action-btn-link">
                                                <FileText size={18} />
                                                View Full Document
                                            </a>
                                            {pdfBlobUrl && (
                                                <a href={pdfBlobUrl} download={`Verified_${result.certificate_id}.pdf`} className="action-btn-link download">
                                                    <Download size={18} />
                                                    Download PDF
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyPage;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CertificateCard.css';

const CertificateCard = ({ cert }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handleCardClick = () => {
    setShowModal(true);
  };

  const handleDownload = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      navigate('/login');
      return;
    }

    setLoadingPdf(true);
    try {
      // Note: Ensure the URL ends with a slash / to match Django's urls.py
      const response = await axios.get(`http://127.0.0.1:8000/api/certificates/${cert.id}/download/`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob' // Essential for PDF files
      });

      // Create a Blob from the PDF Stream
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = window.URL.createObjectURL(file);

      // Create temporary link to trigger download
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Cert_${cert.certificate_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error('Download error:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/login');
      } else {
        alert('Could not download certificate. The file might not be generated yet.');
      }
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleVerify = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      return;
    }

    setVerifying(true);
    try {
      // Using the certificate_id string for verification as per your urls.py
      const response = await axios.get(`http://127.0.0.1:8000/api/verify/${cert.certificate_id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVerifyStatus(response.data);
    } catch (error) {
      console.error('Verify error:', error);
      setVerifyStatus({ status: 'ERROR', message: 'Verification service unavailable.' });
    } finally {
      setVerifying(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setVerifyStatus(null);
  };

  return (
    <>
      <div className="certificate-card" onClick={handleCardClick}>
        <div className="cert-header">
          <span className={`cert-badge ${cert.status?.toLowerCase()}`}>
            {cert.status || 'Official'}
          </span>
          <h3>{cert.title || cert.course}</h3>
        </div>
        <div className="cert-body">
          <p><strong>ID:</strong> {cert.certificate_id}</p>
          <p><strong>Issued:</strong> {new Date(cert.date_issued).toLocaleDateString()}</p>
        </div>
        <div className="cert-footer">
          <button className="btn-preview">View Details</button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>×</button>
            <h2>Certificate Details</h2>
            
            <div className="preview-details">
              <div className="detail-row"><span>Title:</span> <strong>{cert.title}</strong></div>
              <div className="detail-row"><span>Full Name:</span> <strong>{cert.full_name}</strong></div>
              <div className="detail-row"><span>Course:</span> <strong>{cert.course}</strong></div>
              <div className="detail-row"><span>Issued By:</span> <strong>{cert.issued_by}</strong></div>
              <div className="detail-row"><span>Date:</span> <strong>{new Date(cert.date_issued).toLocaleDateString()}</strong></div>
              <div className="detail-row"><span>ID:</span> <code>{cert.certificate_id}</code></div>
            </div>

            <div className="preview-actions">
              <button 
                className="btn-download" 
                onClick={handleDownload} 
                disabled={loadingPdf}
              >
                {loadingPdf ? 'Preparing PDF...' : 'Download PDF'}
              </button>
              
              <button 
                className="btn-verify" 
                onClick={handleVerify} 
                disabled={verifying}
              >
                {verifying ? 'Checking Blockchain...' : 'Verify Authenticity'}
              </button>
            </div>

            {verifyStatus && (
              <div className={`verify-result ${verifyStatus.status.toLowerCase()}`}>
                <p><strong>Result:</strong> {verifyStatus.status}</p>
                {verifyStatus.message && <p className="verify-msg">{verifyStatus.message}</p>}
                {verifyStatus.status === 'VALID' && <p className="verify-success">✓ This certificate is authentic.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CertificateCard;
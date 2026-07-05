import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Papa from 'papaparse';
import { ArrowLeft, CheckCircle2, AlertCircle, Upload, FileText } from 'lucide-react';
import '../auth/auth.css';
import './CSVUploadPage.css';
import CertiLogo from '../../src/Images/CertiLogo.png';
import stacy from '../../src/Images/Stacy.jpg';
import { API_BASE } from '/src/config';

const CSVUploadPage = () => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  // ... (rest of states)
  const [csvFile, setCsvFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsingCsv, setParsingCsv] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvWarnings, setCsvWarnings] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [confirmationModal, setConfirmationModal] = useState({ show: false, certCount: 0 });
  const [currentCsvPage, setCurrentCsvPage] = useState(1);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE}/api/templates/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setTemplates(response.data);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setMessage({ type: 'error', text: 'Failed to load templates.' });
      }
    };

    fetchTemplates();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        setCsvFile(selectedFile);
        setParsingCsv(true);
        setCsvWarnings([]);
        setCurrentCsvPage(1);
        setMessage({ type: '', text: '' });

        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: 'greedy',
          complete: (result) => {
            const headers = result.meta?.fields || [];
            const parsedRows = Array.isArray(result.data) ? result.data : [];
            const normalizedRows = parsedRows.map((row) => {
              const normalized = {};
              headers.forEach((header) => {
                normalized[header] = row?.[header] ?? '';
              });
              return normalized;
            });

            if (headers.length === 0 || normalizedRows.length === 0) {
              setCsvHeaders([]);
              setCsvRows([]);
              setCurrentCsvPage(1);
              setMessage({ type: 'error', text: 'CSV must include headers and at least one data row.' });
            } else {
              setCsvHeaders(headers);
              setCsvRows(normalizedRows);
              setCurrentCsvPage(1);
              if (result.errors?.length) {
                setCsvWarnings(result.errors.map((item) => `${item.code}: ${item.message}`));
              }
            }

            setParsingCsv(false);
          },
          error: () => {
            setParsingCsv(false);
            setCsvHeaders([]);
            setCsvRows([]);
            setMessage({ type: 'error', text: 'Unable to parse this CSV file.' });
          }
        });
      } else {
        setMessage({ type: 'error', text: 'Please select a valid CSV file.' });
      }
    }
  };

  const handleTemplateChange = (e) => {
    setSelectedTemplate(e.target.value);
  };

  const handleCellChange = (rowIndex, header, value) => {
    setCsvRows((prevRows) => prevRows.map((row, index) => {
      if (index !== rowIndex) return row;
      return { ...row, [header]: value };
    }));
  };

  const handleAddRow = () => {
    if (csvHeaders.length === 0) return;
    const emptyRow = csvHeaders.reduce((acc, header) => {
      acc[header] = '';
      return acc;
    }, {});
    setCsvRows((prev) => prev.concat(emptyRow));
  };

  const handleDeleteRow = (rowIndex) => {
    setCsvRows((prevRows) => prevRows.filter((_, index) => index !== rowIndex));
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(csvRows.length / ITEMS_PER_PAGE));
    if (currentCsvPage > totalPages) {
      setCurrentCsvPage(totalPages);
    }
  }, [csvRows.length, currentCsvPage]);

  const handleConfirmGenerate = async () => {
    setConfirmationModal({ show: false, certCount: 0 });
    setLoading(true);
    setMessage({ type: '', text: '' });

    const csvContent = Papa.unparse({
      fields: csvHeaders,
      data: csvRows.map((row) => csvHeaders.map((header) => row?.[header] ?? ''))
    });

    const finalCsvFile = new File(
      [csvContent],
      csvFile.name.replace(/\.csv$/i, '') + '_edited.csv',
      { type: 'text/csv;charset=utf-8;' }
    );

    const formData = new FormData();
    formData.append('csv_file', finalCsvFile);
    formData.append('template', selectedTemplate);

    try {
      const token = localStorage.getItem('token');

      const createResponse = await axios.post(
        `${API_BASE}/api/uploads/create/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const uploadId = createResponse.data.id;

      await axios.post(
        `${API_BASE}/api/uploads/${uploadId}/process/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage({ type: 'success', text: `Successfully generated and signed ${csvRows.length} certificate(s).` });

      setCsvFile(null);
      setSelectedTemplate('');
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvWarnings([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error.response?.data);

      const serverErr = error.response?.data;
      const errorText = serverErr
        ? Object.keys(serverErr)
          .map(k =>
            `${k.toUpperCase()}: ${Array.isArray(serverErr[k])
              ? serverErr[k].join(', ')
              : serverErr[k]
            }`
          )
          .join(' | ')
        : 'Upload failed.';

      setMessage({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTemplate) {
      setMessage({ type: 'error', text: 'Please select a template.' });
      return;
    }

    if (!csvFile || csvHeaders.length === 0 || csvRows.length === 0) {
      setMessage({ type: 'error', text: 'Upload a CSV and make sure it has at least one row to sign.' });
      return;
    }

    setConfirmationModal({ show: true, certCount: csvRows.length });
  };

  const handleReset = () => {
    setCsvFile(null);
    setSelectedTemplate('');
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvWarnings([]);
    setCurrentCsvPage(1);
    setMessage({ type: '', text: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['title', 'full_name', 'course', 'issued_by', 'date_issued', 'email'];
    const sampleRows = [
      ['Certificate of Completion', 'Aian Jae S. Garcia', 'BSCS', 'Dean John Doe', '2026-07-05', 'student1@ua.edu.ph'],
      ['Certificate of Appreciation', 'Jane Doe', 'BSIT', 'Director Smith', '2026-07-05', 'student2@ua.edu.ph']
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'certificate_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCsvPages = Math.max(1, Math.ceil(csvRows.length / ITEMS_PER_PAGE));
  const csvStartIndex = (currentCsvPage - 1) * ITEMS_PER_PAGE;
  const paginatedCsvRows = csvRows.slice(csvStartIndex, csvStartIndex + ITEMS_PER_PAGE);

  return (
    <div className="auth-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        Back
      </button>

      {message.text && (
        <div className={message.type === 'success' ? 'success-toast' : 'error-toast'}>
          <div className="toast-content">
            <span className="toast-icon">
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            <div className="toast-text">
              <strong>{message.type === 'success' ? 'Success' : 'Error'}</strong>
              <p>{message.text}</p>
            </div>
          </div>
        </div>
      )}

      <div className="auth-split-wrapper">
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
            <h1>Bulk Generation.</h1>
            <p>Upload your data and generate hundreds of certificates in seconds with our secure batch engine.</p>
            <div className="info-graphic">
              <span>✓ CSV Support</span>
              <span>✓ Bulk Sign</span>
              <span>✓ Automated</span>
            </div>
          </div>
        </div>

        <div className="auth-form-section">
          <div className="auth-card wide">
            <div className="auth-header">
              <h2>Generate Certificates</h2>
              <p>Upload, preview, and bulk-edit certificates before final signing.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}
                >
                  <option value="">Choose a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="csv-info-box" style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: '#0D1282', fontSize: '0.95rem', fontWeight: '700' }}>CSV Upload Guide</h4>
                  <button 
                    type="button" 
                    onClick={handleDownloadTemplate}
                    className="pagination-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', margin: 0, height: 'auto' }}
                  >
                    <FileText size={14} /> Download Template
                  </button>
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                  Required Columns for the CSV:
                </p>
                <code style={{ display: 'block', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#0f172a', marginBottom: '12px', border: '1px solid #e2e8f0', wordBreak: 'break-all' }}>
                  title, full_name, course, issued_by, date_issued, email
                </code>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: '#b45309', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>Double check credentials and information before uploading or committing.</span>
                </div>
              </div>

              <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  hidden
                />

                <div className="drop-zone-label">
                  <Upload className="upload-icon" size={48} style={{ margin: '0 auto 12px', color: '#0D1282' }} />
                  {csvFile ? (
                    <strong>{csvFile.name}</strong>
                  ) : (
                    <p>Click to upload CSV File</p>
                  )}
                </div>
              </div>

              {parsingCsv && <p className="csv-status">Reading CSV...</p>}

              {!parsingCsv && csvRows.length > 0 && (
                <div className="preview-editor">
                  <div className="preview-header-row">
                    <h3>Preview and Bulk Edit</h3>
                    <span>{csvRows.length} row(s)</span>
                  </div>

                  {csvWarnings.length > 0 && (
                    <div className="warning-box">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <AlertCircle size={18} color="#8a6b00" />
                        <strong>CSV warnings detected:</strong>
                      </div>
                      <p>{csvWarnings[0]}</p>
                    </div>
                  )}

                  <div className="table-scroll">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          {csvHeaders.map((header) => (
                            <th key={header}>{header}</th>
                          ))}
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCsvRows.map((row, rowOffset) => {
                          const rowIndex = csvStartIndex + rowOffset;

                          return (
                            <tr key={`row-${rowIndex}`}>
                              <td>{rowIndex + 1}</td>
                              {csvHeaders.map((header) => (
                                <td key={`${header}-${rowIndex}`}>
                                  <input
                                    type="text"
                                    value={row?.[header] ?? ''}
                                    onChange={(event) => handleCellChange(rowIndex, header, event.target.value)}
                                  />
                                </td>
                              ))}
                              <td>
                                <button
                                  type="button"
                                  className="btn-danger"
                                  onClick={() => handleDeleteRow(rowIndex)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-controls">
                    <span className="pagination-summary">
                      Showing {csvRows.length === 0 ? 0 : csvStartIndex + 1}-{Math.min(csvStartIndex + ITEMS_PER_PAGE, csvRows.length)} of {csvRows.length}
                    </span>
                    <div className="pagination-buttons">
                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setCurrentCsvPage((page) => Math.max(1, page - 1))}
                        disabled={currentCsvPage === 1}
                      >
                        Previous
                      </button>
                      <span className="pagination-page-indicator">
                        Page {currentCsvPage} of {totalCsvPages}
                      </span>
                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setCurrentCsvPage((page) => Math.min(totalCsvPages, page + 1))}
                        disabled={currentCsvPage === totalCsvPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <button type="button" className="btn-add-row" onClick={handleAddRow} style={{ marginTop: '12px' }}>
                    Add Row
                  </button>
                </div>
              )}

              <div className="upload-actions" style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                <button type="submit" className="auth-submit" style={{ flex: 2, margin: 0 }} disabled={loading || parsingCsv || csvRows.length === 0}>
                  {loading ? 'Generating & Signing...' : 'Generate + Sign'}
                </button>
                <button type="button" className="google-auth-btn" style={{ flex: 1 }} onClick={handleReset}>
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {confirmationModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Generation</h2>
            <p>Generate and sign <strong>{confirmationModal.certCount} certificate(s)</strong>?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setConfirmationModal({ show: false, certCount: 0 })}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleConfirmGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVUploadPage;
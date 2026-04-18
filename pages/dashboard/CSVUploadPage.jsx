import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// Paparse for parsing CSV Files
import Papa from 'papaparse';
import './CSVUploadPage.css';

const CSVUploadPage = () => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
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
        const response = await axios.get('http://127.0.0.1:8000/api/templates/', {
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
        'http://127.0.0.1:8000/api/uploads/create/',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const uploadId = createResponse.data.id;

      await axios.post(
        `http://127.0.0.1:8000/api/uploads/${uploadId}/process/`,
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
              `${k.toUpperCase()}: ${
                Array.isArray(serverErr[k])
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

  const totalCsvPages = Math.max(1, Math.ceil(csvRows.length / ITEMS_PER_PAGE));
  const csvStartIndex = (currentCsvPage - 1) * ITEMS_PER_PAGE;
  const paginatedCsvRows = csvRows.slice(csvStartIndex, csvStartIndex + ITEMS_PER_PAGE);

  return (
    <div className="upload-page-container">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate(-1)}>
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

      <div className="upload-card">
        <div className="upload-header">
          <h1>Upload CSV</h1>
          <p>Upload, preview, and bulk-edit certificates before final signing.</p>
        </div>

        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Template</label>
            <select
              value={selectedTemplate}
              onChange={handleTemplateChange}
              required
            >
              <option value="">Choose a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className="drop-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              hidden
            />

            <div className="drop-zone-label">
              <span className="upload-icon">📄</span>
              {csvFile ? (
                <strong>{csvFile.name}</strong>
              ) : (
                "Click to upload CSV File"
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
                  <strong>CSV warnings detected:</strong>
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

              <button type="button" className="btn-add-row" onClick={handleAddRow}>
                Add Row
              </button>
            </div>
          )}

          <div className="upload-actions">
            <button type="submit" className="btn-primary" disabled={loading || parsingCsv || csvRows.length === 0}>
              {loading ? 'Generating & Signing...' : 'Generate + Sign Certificates'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {confirmationModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Certificate Generation</h2>
            <p>Generate and sign <strong>{confirmationModal.certCount} certificate(s)</strong> with the edited data?</p>
            <p style={{ fontSize: '0.9rem', color: '#636e72', marginTop: '12px' }}>This action will create and sign all certificates using the current preview data.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setConfirmationModal({ show: false, certCount: 0 })}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleConfirmGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVUploadPage;
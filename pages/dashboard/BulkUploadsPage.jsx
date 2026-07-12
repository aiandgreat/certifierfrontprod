import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, BarChart3, FileText, Upload, ShieldCheck, LogOut, Trash2, Database } from 'lucide-react';
import './AdminDashboard.css';
import { API_BASE } from '/src/config';
import './BulkUploads.css';

const BulkUploadsPage = ({ closeMobileNav }) => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUpload, setExpandedUpload] = useState(null);
  const [modal, setModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const token = localStorage.getItem('token');

  const getFileName = (url) => {
    if (!url) return 'Unknown File';
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const fileName = parts[parts.length - 1];
      return fileName.split('?')[0];
    } catch (e) {
      return 'Unknown File';
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_BASE}/api/uploads/`, { headers });
      const sortedUploads = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setUploads(sortedUploads);
    } catch (err) {
      console.error("Error fetching uploads:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUpload = async (id) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_BASE}/api/uploads/${id}/`, { headers });
      fetchUploads();
    } catch (err) {
      console.error("Error deleting upload:", err);
      alert("Failed to delete upload.");
    }
  };

  const confirmDelete = (upload) => {
    const name = getFileName(upload.csv_file);
    setModal({
      show: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      onConfirm: () => {
        deleteUpload(upload.id);
        setModal({ ...modal, show: false });
      }
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <section className="admin-table-container">
      {modal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{modal.title}</h2>
            <p>{modal.message}</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setModal({ ...modal, show: false })}>Cancel</button>
              <button className="save-btn" style={{ background: '#D71313' }} onClick={modal.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      <div className="table-header"><h3>Bulk Uploads</h3></div>
      <div className="table-responsive">
        <table className="admin-table">
          <thead><tr><th>File Name</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {uploads.map((upload) => {
              const fileName = getFileName(upload.csv_file);
              return (
                <React.Fragment key={upload.id}>
                  <tr onClick={() => setExpandedUpload(expandedUpload === upload.id ? null : upload.id)} style={{ cursor: 'pointer' }}>
                    <td>{fileName}</td>
                    <td><span className={`badge ${upload.status?.toLowerCase() === 'completed' ? 'valid' : 'invalid'}`}>{upload.status}</span></td>
                    <td><button className="delete-btn-sm" onClick={(e) => { e.stopPropagation(); confirmDelete(upload); }}><Trash2 size={16} /></button></td>
                  </tr>
                  {expandedUpload === upload.id && (
                    <tr>
                      <td colSpan="3" className="upload-details">
                        <div className="details-content">
                          <h4>Details for {fileName}</h4>
                          <div className="upload-stats">
                            <p><strong>Total Records:</strong> {upload.total_records || 0}</p>
                            <p><strong>Processed Records:</strong> {upload.processed_records || 0}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default BulkUploadsPage;

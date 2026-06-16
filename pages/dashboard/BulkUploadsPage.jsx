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
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_BASE}/api/uploads/`, { headers });
      setUploads(res.data);
    } catch (err) {
      console.error("Error fetching uploads:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUpload = async (id) => {
    if (!window.confirm("Are you sure you want to delete this upload?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_BASE}/api/uploads/${id}/`, { headers });
      fetchUploads();
    } catch (err) {
      console.error("Error deleting upload:", err);
      alert("Failed to delete upload.");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <section className="admin-table-container">
      <div className="table-header"><h3>Bulk Uploads</h3></div>
      <div className="table-responsive">
        <table className="admin-table">
          <thead><tr><th>ID</th><th>File Name</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {uploads.map((upload) => (
              <React.Fragment key={upload.id}>
                <tr onClick={() => setExpandedUpload(expandedUpload === upload.id ? null : upload.id)} style={{ cursor: 'pointer' }}>
                  <td>{upload.id}</td>
                  <td>{upload.file_name}</td>
                  <td><span className={`badge ${upload.status?.toLowerCase() === 'completed' ? 'valid' : 'invalid'}`}>{upload.status}</span></td>
                  <td><button className="delete-btn-sm" onClick={(e) => { e.stopPropagation(); deleteUpload(upload.id); }}><Trash2 size={16} /></button></td>
                </tr>
                {expandedUpload === upload.id && (
                  <tr>
                    <td colSpan="4" className="upload-details">
                      <div className="details-content">
                        <h4>Details for {upload.file_name}</h4>
                        <pre>{JSON.stringify(upload.description || 'No description available', null, 2)}</pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default BulkUploadsPage;

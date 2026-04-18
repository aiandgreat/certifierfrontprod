import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';

const API_BASE = "http://127.0.0.1:8000";
const ITEMS_PER_PAGE = 10;

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [myCerts, setMyCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const previewUrlRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('user_name') || 'Student';

  const fetchMyCerts = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/my-certificates/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyCerts(res.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    fetchMyCerts();
  }, [fetchMyCerts]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(myCerts.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [myCerts.length, currentPage]);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const closeMobileNav = () => setIsMobileNavOpen(false);

  const totalPages = Math.max(1, Math.ceil(myCerts.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCerts = myCerts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePreview = async (cert) => {
    try {
      const res = await axios.get(
        `${API_BASE}/api/certificates/${cert.id}/preview/`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const file = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(file);
      // Revoke any previous preview URL to avoid memory leaks
      if (previewUrlRef.current) {
        try { window.URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
      }
      previewUrlRef.current = url;
      setPreviewPdfUrl(url);
    } catch {
      alert("Preview failed");
    }
  };

  const closePreview = () => {
    if (previewUrlRef.current) {
      try { window.URL.revokeObjectURL(previewUrlRef.current); } catch (e) {}
      previewUrlRef.current = null;
    }
    setPreviewPdfUrl(null);
  };

  const handleDownload = async (cert) => {
    try {
      const res = await axios.get(
        `${API_BASE}/api/certificates/${cert.id}/download/`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' })
      );

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cert.certificate_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Download failed");
    }
  };

  if (loading) return <div className="loading-screen">Loading Portal...</div>;

  return (
    <div className="student-container">

      <button
        className="mobile-menu-toggle"
        type="button"
        onClick={() => setIsMobileNavOpen((open) => !open)}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileNavOpen}
      >
        <span />
        <span />
        <span />
      </button>

      {isMobileNavOpen && (
        <div className="mobile-menu-overlay" onClick={closeMobileNav} />
      )}

      {/* SIDEBAR */}
      <aside className={`student-sidebar ${isMobileNavOpen ? 'open' : ''}`}>
        <h2>CertiFier</h2>

        <nav className="student-nav">
          <Link to="/StudentDashboard" className="student-nav-link active" onClick={closeMobileNav}>
            Dashboard
          </Link>
          <Link to="/verify" className="student-nav-link" onClick={closeMobileNav}>
            Verify
          </Link>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="student-main">

        <div className="student-content">

          {/* HEADER */}
          <header className="student-header">
            <h1>Welcome, {userName}</h1>
            <p>Your issued certificates overview.</p>
          </header>

          {/* TABLE */}
          <section className="student-table-container">
            <h3 className="section-title">My Certificates</h3>

            {myCerts.length === 0 ? (
              <div className="empty-state">
                <h3>No Certificates Found</h3>
                <p>You don’t have any certificates yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Course</th>
                      <th>Date Issued</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedCerts.map((cert) => (
                      <tr key={cert.id}>
                        <td>#{cert.certificate_id?.toUpperCase()}</td>
                        <td>{cert.course}</td>
                        <td>{formatDate(cert.created_at)}</td>
                        <td>
                          <span className={`badge ${cert.status?.toLowerCase()}`}>
                            {cert.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="edit-btn"
                              onClick={() => handlePreview(cert)}
                            >
                              Preview
                            </button>

                            <button
                              className="save-btn"
                              onClick={() => handleDownload(cert)}
                            >
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {myCerts.length > 0 && (
              <div className="pagination-controls">
                <span className="pagination-summary">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, myCerts.length)} of {myCerts.length}
                </span>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-page-indicator">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* MODAL */}
      {previewPdfUrl && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview-x" onClick={closePreview}>
              &times;
            </button>

            <object data={previewPdfUrl} type="application/pdf" className="preview-frame">
              <p style={{ padding: 20 }}>Preview not available. <a href={previewPdfUrl} target="_blank" rel="noreferrer">Open in a new tab</a></p>
            </object>
            <div className="preview-info">Certificate Preview</div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
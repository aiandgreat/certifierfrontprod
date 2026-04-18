import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import './AdminDashboard.css';
import PlaceholderImg from '../../src/assets/hero.png';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [stats, setStats] = useState({ totalCerts: 0, totalUsers: 0, uploads: 0 });
  const [recentCerts, setRecentCerts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // States para sa Editing
  const [editingCert, setEditingCert] = useState(null);
  const [editFormData, setEditFormData] = useState({ full_name: '', course: '', owner: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [editUserFormData, setEditUserFormData] = useState({ 
    first_name: '', last_name: '', email: '', username: '', role: '' 
  });

  // UI States
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });
  const [toast, setToast] = useState({ show: false, message: '' });
  const [assignModal, setAssignModal] = useState({ show: false, certId: null, owner: '' });
  const [assigningCertId, setAssigningCertId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [issuanceSearch, setIssuanceSearch] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState('all');
  const [selectedCerts, setSelectedCerts] = useState(new Set());
  const [downloadingCerts, setDownloadingCerts] = useState(false);
  const [reissuingCertId, setReissuingCertId] = useState(null);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [currentTemplatePage, setCurrentTemplatePage] = useState(1);
  const [currentCertPage, setCurrentCertPage] = useState(1);

  const token = localStorage.getItem('token');
  const API_BASE = "http://127.0.0.1:8000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const role = localStorage.getItem('user_role');
    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [certs, userRes, uploads, tmpls] = await Promise.all([
        axios.get(`${API_BASE}/api/certificates/`, { headers }),
        axios.get(`${API_BASE}/api/users/`, { headers }),
        axios.get(`${API_BASE}/api/uploads/`, { headers }),
        axios.get(`${API_BASE}/api/templates/`, { headers })
      ]);

      setRecentCerts(certs.data);
      setTemplates(tmpls.data);
      setUsers(userRes.data);
      setStats({
        totalCerts: certs.data.length,
        totalUsers: userRes.data.length,
        uploads: uploads.data.length
      });
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (path) => {
    if (!path) return PlaceholderImg;
    if (typeof path === 'string' && path.startsWith('http')) return path;
    const cleanPath = String(path).startsWith('/') ? String(path).substring(1) : String(path);
    return `${API_BASE}/${cleanPath}`;
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const getUserLabel = (user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.email || user.username || `User ${user.id}`;
  };

  const getOwnerId = (cert) => {
    if (!cert?.owner) return '';
    if (typeof cert.owner === 'object') {
      if (cert.owner.id !== undefined && cert.owner.id !== null) return String(cert.owner.id);
      return '';
    }
    return String(cert.owner);
  };

  const getOwnerDisplay = (cert) => {
    const ownerId = getOwnerId(cert);
    if (!ownerId) return 'Unassigned';
    const matchedUser = users.find((user) => String(user.id) === ownerId);
    if (matchedUser) return getUserLabel(matchedUser);
    if (typeof cert.owner === 'object') {
      const fullName = `${cert.owner.first_name || ''} ${cert.owner.last_name || ''}`.trim();
      return fullName || cert.owner.email || cert.owner.username || 'Unknown User';
    }
    return `User ${ownerId}`;
  };

  const getTemplateId = (cert) => {
    if (!cert?.template) return null;
    if (typeof cert.template === 'object') {
      if (cert.template.id !== undefined && cert.template.id !== null) return cert.template.id;
      return null;
    }
    return cert.template;
  };

  const filteredUsers = users.filter((user) => {
    const term = userSearch.toLowerCase();
    if (!term) return true;
    return `${user.first_name || ''} ${user.last_name || ''} ${user.email || ''} ${user.username || ''}`
      .toLowerCase()
      .includes(term);
  });

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const handleSaveReissue = async (cert) => {
    setReissuingCertId(cert.id);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        full_name: editFormData.full_name,
        course: editFormData.course,
        owner: editFormData.owner || null,
        issued_by: cert.issued_by,
        date_issued: cert.date_issued,
        title: cert.title,
        template: getTemplateId(cert)
      };

      // Prefer dedicated reissue endpoint if backend provides it.
      try {
        await axios.post(`${API_BASE}/api/certificates/${cert.id}/reissue/`, payload, { headers });
      } catch (error) {
        if (error?.response?.status !== 404) {
          throw error;
        }

        // Fallback: create new certificate from existing data (keep old certificate).
        await axios.post(`${API_BASE}/api/certificates/`, payload, { headers });
      }

      setEditingCert(null);
      showToast('Certificate reissued successfully!');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Failed to reissue certificate');
    } finally {
      setReissuingCertId(null);
    }
  };

  const handleSaveUserEdit = async (id) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Pinadala ang data na walang password field
      await axios.patch(`${API_BASE}/api/users/${id}/`, editUserFormData, { headers });
      setEditingUser(null);
      showToast('User updated successfully!');
      fetchData();
    } catch (err) { alert("Error updating user."); }
  };

  const handleDelete = (id, type) => {
    let url = `${API_BASE}/api/${type === 'cert' ? 'certificates' : type + 's'}/${id}/`;
    
    setModal({
      show: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          await axios.delete(url, { headers });
          showToast(`${type.toUpperCase()} deleted!`);
          fetchData();
        } catch (err) { console.error(err); }
      }
    });
  };

    const openAssignModal = (cert) => {
      setAssignModal({ show: true, certId: cert.id, owner: getOwnerId(cert) });
    };

    const handleAssignConfirm = async () => {
      if (!assignModal.certId) return;
      setAssigningCertId(assignModal.certId);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        await axios.patch(`${API_BASE}/api/certificates/${assignModal.certId}/`, { owner: assignModal.owner || null }, { headers });
        showToast('Certificate assigned successfully!');
        setAssignModal({ show: false, certId: null, owner: '' });
        fetchData();
      } catch (err) {
        console.error('Assign error', err);
        showToast('Failed to assign certificate');
      } finally {
        setAssigningCertId(null);
      }
    };

  const closeMobileNav = () => setIsMobileNavOpen(false);

  useEffect(() => {
    setCurrentUserPage(1);
  }, [userSearch]);

  useEffect(() => {
    setCurrentTemplatePage(1);
  }, [templateSearch]);

  useEffect(() => {
    setCurrentCertPage(1);
  }, [issuanceSearch, certStatusFilter]);

  useEffect(() => {
    const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
    const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE));
    const totalCertPages = Math.max(1, Math.ceil(recentCerts.length / ITEMS_PER_PAGE));

    if (currentUserPage > totalUserPages) {
      setCurrentUserPage(totalUserPages);
    }
    if (currentTemplatePage > totalTemplatePages) {
      setCurrentTemplatePage(totalTemplatePages);
    }
    if (currentCertPage > totalCertPages) {
      setCurrentCertPage(totalCertPages);
    }
  }, [filteredUsers.length, filteredTemplates.length, recentCerts.length, currentUserPage, currentTemplatePage, currentCertPage]);

  if (loading) return <div className="loading-screen">Loading Portal...</div>;

  const paginatedUsers = filteredUsers.slice((currentUserPage - 1) * ITEMS_PER_PAGE, currentUserPage * ITEMS_PER_PAGE);
  const paginatedTemplates = filteredTemplates.slice((currentTemplatePage - 1) * ITEMS_PER_PAGE, currentTemplatePage * ITEMS_PER_PAGE);
  const filteredRecentCerts = recentCerts
    .filter((cert) => {
      if (certStatusFilter === 'all') return true;
      if (certStatusFilter === 'valid') return cert.status === 'VALID';
      if (certStatusFilter === 'invalid') return cert.status === 'INVALID' || cert.status === 'REVOKED';
      return true;
    })
    .filter((cert) => {
      const term = issuanceSearch.toLowerCase();
      if (!term) return true;
      const certId = cert.certificate_id?.toLowerCase() || '';
      const fullName = cert.full_name?.toLowerCase() || '';
      const course = cert.course?.toLowerCase() || '';
      const ownerName = getOwnerDisplay(cert).toLowerCase();
      return certId.includes(term) || fullName.includes(term) || course.includes(term) || ownerName.includes(term);
    });

  const paginatedRecentCerts = filteredRecentCerts.slice((currentCertPage - 1) * ITEMS_PER_PAGE, currentCertPage * ITEMS_PER_PAGE);

  const toggleCertSelect = (certId) => {
    const newSelected = new Set(selectedCerts);
    if (newSelected.has(certId)) {
      newSelected.delete(certId);
    } else {
      newSelected.add(certId);
    }
    setSelectedCerts(newSelected);
  };

  const toggleSelectAll = () => {
    const visibleCertIds = paginatedRecentCerts.map((cert) => cert.id);
    const allVisibleSelected = visibleCertIds.length > 0 && visibleCertIds.every((certId) => selectedCerts.has(certId));

    if (allVisibleSelected) {
      setSelectedCerts((prevSelected) => {
        const nextSelected = new Set(prevSelected);
        visibleCertIds.forEach((certId) => nextSelected.delete(certId));
        return nextSelected;
      });
    } else {
      setSelectedCerts((prevSelected) => {
        const nextSelected = new Set(prevSelected);
        visibleCertIds.forEach((certId) => nextSelected.add(certId));
        return nextSelected;
      });
    }
  };

  const downloadSinglePDF = async (cert) => {
    setDownloadingCerts(true);
    try {
      const response = await axios.get(`${API_BASE}/api/certificates/${cert.id}/download/`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = window.URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Cert_${cert.certificate_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileURL);
      showToast(`Downloaded ${cert.certificate_id}.pdf`);
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download certificate');
    } finally {
      setDownloadingCerts(false);
    }
  };

  const downloadMultiplePDFs = async () => {
    if (selectedCerts.size === 0) {
      showToast('Please select at least one certificate');
      return;
    }

    setDownloadingCerts(true);
    try {
      const zip = new JSZip();
      const selectedCertsList = filteredRecentCerts.filter((cert) => selectedCerts.has(cert.id));

      // Download all PDFs and add to zip
      await Promise.all(
        selectedCertsList.map(async (cert) => {
          const response = await axios.get(`${API_BASE}/api/certificates/${cert.id}/download/`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          });
          zip.file(`Cert_${cert.certificate_id}.pdf`, response.data);
        })
      );

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fileURL = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Certificates_${new Date().getTime()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileURL);
      
      showToast(`Downloaded ${selectedCerts.size} certificate(s) as zip`);
      setSelectedCerts(new Set());
    } catch (error) {
      console.error('Bulk download error:', error);
      showToast('Failed to download certificates');
    } finally {
      setDownloadingCerts(false);
    }
  };

  return (
    <div className="admin-container">
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

      {toast.show && (
        <div className="delete-success-toast">
          <span className="toast-icon">✅</span>
          <p>{toast.message}</p>
        </div>
      )}

      <aside className={`admin-sidebar ${isMobileNavOpen ? 'open' : ''}`}>
        <h2>CertiFier</h2>
        <nav className="admin-nav">
          <Link to="/AdminDashboard" className="admin-nav-link active" onClick={closeMobileNav}>Overview</Link>
          <Link to="/UploadTemplate" className="admin-nav-link" onClick={closeMobileNav}>Templates</Link>
          <Link to="/CSVUpload" className="admin-nav-link" onClick={closeMobileNav}>Generate Certificate</Link>
          <Link to="/verify" className="admin-nav-link" onClick={closeMobileNav}>Verify Tool</Link>
        </nav>
        <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/login'); }}>Logout</button>
      </aside>

      <main className="admin-main">
        <header>
          <h1>Administrator Dashboard</h1>
          <p>Manage users, certificates, and system templates.</p>
        </header>

        <section className="admin-stats-grid">
          <div className="admin-stat-card"><h3>{stats.totalCerts}</h3><p>Certificates Issued</p></div>
          <div className="admin-stat-card"><h3>{stats.totalUsers}</h3><p>Registered Users</p></div>
          <div className="admin-stat-card"><h3>{stats.uploads}</h3><p>Bulk Uploads</p></div>
        </section>


      {assignModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Assign Certificate</h2>
            <p>Select an owner for this certificate.</p>
            <div style={{ margin: '12px 0' }}>
              <select className="edit-input" value={assignModal.owner} onChange={(e) => setAssignModal({ ...assignModal, owner: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={String(user.id)}>{getUserLabel(user)}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setAssignModal({ show: false, certId: null, owner: '' })}>Cancel</button>
              <button className="save-btn" onClick={handleAssignConfirm} disabled={assigningCertId === assignModal.certId}>
                {assigningCertId === assignModal.certId ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
        <section className="admin-table-container">
          <div className="table-header">
            <h3>Registered Users</h3>
            <input type="text" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="table-search-input" />
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>First Name</th><th>Last Name</th><th>Email</th><th>Role</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{editingUser === user.id ? <input className="edit-input" value={editUserFormData.first_name} onChange={e => setEditUserFormData({...editUserFormData, first_name: e.target.value})} /> : user.first_name}</td>
                    <td>{editingUser === user.id ? <input className="edit-input" value={editUserFormData.last_name} onChange={e => setEditUserFormData({...editUserFormData, last_name: e.target.value})} /> : user.last_name}</td>
                    <td>{editingUser === user.id ? <input className="edit-input" value={editUserFormData.email} onChange={e => setEditUserFormData({...editUserFormData, email: e.target.value})} /> : user.email}</td>
                    <td><span className={`badge ${user.role === 'admin' ? 'invalid' : 'valid'}`}>{user.role?.toUpperCase()}</span></td>
                    <td>
                      <div className="action-buttons">
                        {editingUser === user.id ? (
                          <><button className="save-btn" onClick={() => handleSaveUserEdit(user.id)}>Save</button><button className="cancel-btn" onClick={() => setEditingUser(null)}>Cancel</button></>
                        ) : (
                          <><button className="edit-btn" onClick={() => { setEditingUser(user.id); setEditUserFormData({ first_name: user.first_name, last_name: user.last_name, email: user.email, username: user.username, role: user.role }); }}>Edit</button>
                          {user.role !== 'admin' && <button className="delete-btn" onClick={() => handleDelete(user.id, 'user')}>Delete</button>}</>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <span className="pagination-summary">
              Showing {filteredUsers.length === 0 ? 0 : (currentUserPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentUserPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentUserPage((page) => Math.max(1, page - 1))}
                disabled={currentUserPage === 1}
              >
                Previous
              </button>
              <span className="pagination-page-indicator">
                Page {currentUserPage} of {Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))}
              </span>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentUserPage((page) => Math.min(Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)), page + 1))}
                disabled={currentUserPage >= Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="admin-table-container">
          <div className="table-header">
            <h3>System Templates</h3>
            <input type="text" placeholder="Search templates..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="table-search-input" />
          </div>
          {templates.length === 0 ? (
            <p className="no-data">No templates uploaded yet.</p>
          ) : (
            <>
            <div className="templates-grid">
              {paginatedTemplates.map((template) => (
                <div key={template.id} className="template-card">
                  <div className="template-preview">
                    <img
                      src={getFullUrl(template.background)}
                      alt={template.name}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PlaceholderImg; }}
                    />
                  </div>
                  <div className="template-info">
                    <h4>{template.name}</h4>
                    <button className="delete-btn-sm" onClick={() => handleDelete(template.id, 'template')}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pagination-controls">
              <span className="pagination-summary">
                Showing {filteredTemplates.length === 0 ? 0 : (currentTemplatePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentTemplatePage * ITEMS_PER_PAGE, filteredTemplates.length)} of {filteredTemplates.length}
              </span>
              <div className="pagination-buttons">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setCurrentTemplatePage((page) => Math.max(1, page - 1))}
                  disabled={currentTemplatePage === 1}
                >
                  Previous
                </button>
                <span className="pagination-page-indicator">
                  Page {currentTemplatePage} of {Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE))}
                </span>
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setCurrentTemplatePage((page) => Math.min(Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE)), page + 1))}
                  disabled={currentTemplatePage >= Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE))}
                >
                  Next
                </button>
              </div>
            </div>
            </>
          )}
        </section>

        <section className="admin-table-container">
          <div className="table-header">
            <h3>Recent Issuances</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={certStatusFilter}
                onChange={(e) => setCertStatusFilter(e.target.value)}
                className="table-search-input"
                style={{ width: '150px' }}
              >
                <option value="all">All Certificates</option>
                <option value="valid">Valid</option>
                <option value="invalid">Invalid</option>
              </select>
              <input
                type="text"
                placeholder="Search issuances..."
                value={issuanceSearch}
                onChange={(e) => setIssuanceSearch(e.target.value)}
                className="table-search-input"
              />
              {selectedCerts.size > 0 && (
                <button
                  className="edit-btn"
                  onClick={downloadMultiplePDFs}
                  disabled={downloadingCerts}
                  style={{ whiteSpace: 'nowrap', minWidth: '150px' }}
                >
                  {downloadingCerts ? 'Downloading...' : `Download (${selectedCerts.size})`}
                </button>
              )}
            </div>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={paginatedRecentCerts.length > 0 && paginatedRecentCerts.every((cert) => selectedCerts.has(cert.id))}
                      onChange={toggleSelectAll}
                      title="Select all"
                    />
                  </th>
                  <th>Full ID</th><th>Recipient</th><th>Course</th><th>Owner</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecentCerts.map((cert) => (
                  <tr key={cert.id}>
                    <td style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedCerts.has(cert.id)}
                        onChange={() => toggleCertSelect(cert.id)}
                      />
                    </td>
                    <td>#{cert.certificate_id?.toUpperCase()}</td>
                    <td>{editingCert === cert.id ? <input className="edit-input" value={editFormData.full_name} onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })} /> : cert.full_name}</td>
                    <td>{editingCert === cert.id ? <input className="edit-input" value={editFormData.course} onChange={e => setEditFormData({ ...editFormData, course: e.target.value })} /> : cert.course}</td>
                    <td>
                      {editingCert === cert.id ? (
                        <select className="edit-input" value={editFormData.owner} onChange={e => setEditFormData({ ...editFormData, owner: e.target.value })}>
                          <option value="">Unassigned</option>
                          {users.map((user) => (
                            <option key={user.id} value={String(user.id)}>{getUserLabel(user)}</option>
                          ))}
                        </select>
                      ) : (
                        getOwnerDisplay(cert)
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {editingCert === cert.id ? (
                          <><button className="save-btn" onClick={() => handleSaveReissue(cert)} disabled={reissuingCertId === cert.id}>{reissuingCertId === cert.id ? 'Reissuing...' : 'Reissue Now'}</button><button className="cancel-btn" onClick={() => setEditingCert(null)} disabled={reissuingCertId === cert.id}>Cancel</button></>
                        ) : (
                          <>
                            <button className="edit-btn" onClick={() => { setEditingCert(cert.id); setEditFormData({ full_name: cert.full_name, course: cert.course, owner: getOwnerId(cert) }) }}>Reissue Certificate</button>
                            <button className="view-file-btn" onClick={() => downloadSinglePDF(cert)} disabled={downloadingCerts}>Download</button>
                            <button className="assign-btn" onClick={() => openAssignModal(cert)}>Assign</button>
                            <button className="delete-btn" onClick={() => handleDelete(cert.id, 'cert')}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <span className="pagination-summary">
              Showing {filteredRecentCerts.length === 0 ? 0 : (currentCertPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentCertPage * ITEMS_PER_PAGE, filteredRecentCerts.length)} of {filteredRecentCerts.length}
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentCertPage((page) => Math.max(1, page - 1))}
                disabled={currentCertPage === 1}
              >
                Previous
              </button>
              <span className="pagination-page-indicator">
                Page {currentCertPage} of {Math.max(1, Math.ceil(filteredRecentCerts.length / ITEMS_PER_PAGE))}
              </span>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentCertPage((page) => Math.min(Math.max(1, Math.ceil(filteredRecentCerts.length / ITEMS_PER_PAGE)), page + 1))}
                disabled={currentCertPage >= Math.max(1, Math.ceil(filteredRecentCerts.length / ITEMS_PER_PAGE))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {modal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{modal.title}</h2>
            <p>{modal.message}</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setModal({ ...modal, show: false })}>Cancel</button>
              <button className="save-btn" style={{ background: '#D71313' }} onClick={() => { modal.onConfirm(); setModal({ ...modal, show: false }) }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import { Leaf, BarChart3, LayoutDashboard, FileText, Upload, ShieldCheck, LogOut, Trash2, Edit2, UserPlus, Download as DownloadIcon, Database, Building2, RefreshCw, UserCheck } from 'lucide-react';
import './AdminDashboard.css';
import PlaceholderImg from '../../src/assets/hero.png';
import BulkUploadsPage from './BulkUploadsPage';
import { API_BASE } from '/src/config';
import CertiLogo from '../../src/Images/CertiLogo.png';
import Footer from '../components/Footer';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [currentView, setCurrentView] = useState('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [stats, setStats] = useState({ totalCerts: 0, totalUsers: 0, uploads: 0 });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [recentCerts, setRecentCerts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // States para sa Editing
  const [editingUser, setEditingUser] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [newDeptForm, setNewDeptForm] = useState({ name: '', abbreviation: '' });
  const [editUserFormData, setEditUserFormData] = useState({
    first_name: '', last_name: '', email: '', username: '', role: '', department: ''
  });
  const userRole = localStorage.getItem('user_role');

  // UI States
  const [modal, setModal] = useState({ show: false, type: '', title: '', message: '', onConfirm: null });
  const [toast, setToast] = useState({ show: false, message: '' });
  const [reissueModal, setReissueModal] = useState({ show: false, cert: null, full_name: '', course: '', owner: '' });
  const [assignModal, setAssignModal] = useState({ show: false, certId: null, owner: '' });
  const [assigningCertId, setAssigningCertId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [issuanceSearch, setIssuanceSearch] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState('all');
  const [analyticsYear, setAnalyticsYear] = useState('all');
  const [selectedCerts, setSelectedCerts] = useState(new Set());
  const [downloadingCerts, setDownloadingCerts] = useState(false);
  const [reissuingCertId, setReissuingCertId] = useState(null);
  const [activeRecentCertId, setActiveRecentCertId] = useState(null);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [currentTemplatePage, setCurrentTemplatePage] = useState(1);
  const [currentCertPage, setCurrentCertPage] = useState(1);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const role = localStorage.getItem('user_role');
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Individual fetching with error safety
      const safeGet = async (url) => {
        try {
          const res = await axios.get(url, { headers });
          return res.data;
        } catch (e) {
          console.error(`Error fetching ${url}:`, e);
          return [];
        }
      };

      const certsData = await safeGet(`${API_BASE}/api/certificates/`);
      const usersData = await safeGet(`${API_BASE}/api/users/`);
      const uploadsData = await safeGet(`${API_BASE}/api/uploads/`);
      const tmplsData = await safeGet(`${API_BASE}/api/templates/`);
      const deptsData = await safeGet(`${API_BASE}/api/departments/`);

      const studentUsers = usersData.filter((user) => user.role !== 'admin');

      setRecentCerts(certsData);
      setTemplates(tmplsData);
      setUsers(studentUsers);
      setDepartments(deptsData);
      setStats({
        totalCerts: certsData.length,
        totalUsers: studentUsers.length,
        uploads: uploadsData.length
      });
    } catch (err) {
      console.error("Critical fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_BASE}/api/analytics/`, { headers });
      setAnalyticsData(response.data);
    } catch (err) {
      console.error("Analytics fetch error", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'analytics') {
      fetchAnalytics();
    }
  }, [currentView]);

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
    if (!ownerId) {
      return cert.recipient_email ? `Unassigned (${cert.recipient_email})` : 'Unassigned';
    }
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

  const handleSaveReissue = async () => {
    if (!reissueModal.cert) return;
    setReissuingCertId(reissueModal.cert.id);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        full_name: reissueModal.full_name,
        course: reissueModal.course,
        owner: reissueModal.owner || null,
        issued_by: reissueModal.cert.issued_by,
        date_issued: reissueModal.cert.date_issued,
        title: reissueModal.cert.title,
        template: getTemplateId(reissueModal.cert)
      };

      try {
        await axios.post(`${API_BASE}/api/certificates/${reissueModal.cert.id}/reissue/`, payload, { headers });
      } catch (error) {
        if (error?.response?.status !== 404) throw error;
        await axios.post(`${API_BASE}/api/certificates/`, payload, { headers });
      }

      setReissueModal({ show: false, cert: null, full_name: '', course: '', owner: '' });
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

  useEffect(() => { setCurrentUserPage(1); }, [userSearch]);
  useEffect(() => { setCurrentTemplatePage(1); }, [templateSearch]);
  useEffect(() => { setCurrentCertPage(1); }, [issuanceSearch, certStatusFilter]);

  useEffect(() => {
    const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
    const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE));
    const totalCertPages = Math.max(1, Math.ceil(recentCerts.length / ITEMS_PER_PAGE));

    if (currentUserPage > totalUserPages) setCurrentUserPage(totalUserPages);
    if (currentTemplatePage > totalTemplatePages) setCurrentTemplatePage(totalTemplatePages);
    if (currentCertPage > totalCertPages) setCurrentCertPage(totalCertPages);
  }, [filteredUsers.length, filteredTemplates.length, recentCerts.length, currentUserPage, currentTemplatePage, currentCertPage]);

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

  useEffect(() => {
    if (paginatedRecentCerts.length === 0) {
      setActiveRecentCertId(null);
      return;
    }

    const activeVisible = paginatedRecentCerts.some((cert) => cert.id === activeRecentCertId);
    if (!activeVisible) {
      setActiveRecentCertId(paginatedRecentCerts[0].id);
    }
  }, [paginatedRecentCerts, activeRecentCertId]);

  if (loading) return <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8f9fa' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #0D1282', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
      <p style={{ fontWeight: '700', color: '#0D1282' }}>Loading Administrator Portal...</p>
    </div>
  </div>;

  const toggleCertSelect = (certId) => {
    const newSelected = new Set(selectedCerts);
    if (newSelected.has(certId)) newSelected.delete(certId);
    else newSelected.add(certId);
    setSelectedCerts(newSelected);
  };

  const selectedRecentCerts = paginatedRecentCerts.filter((cert) => selectedCerts.has(cert.id));
  const selectedRecentCert = selectedRecentCerts.length === 1 ? selectedRecentCerts[0] : null;
  const canUseSingleSelectionActions = selectedRecentCerts.length === 1;
  const canDownloadRecentCerts = selectedRecentCerts.length > 0;

  const handleHeaderReissue = () => {
    if (!selectedRecentCert) return;
    setReissueModal({
      show: true,
      cert: selectedRecentCert,
      full_name: selectedRecentCert.full_name || '',
      course: selectedRecentCert.course || '',
      owner: getOwnerId(selectedRecentCert)
    });
  };

  const handleHeaderAssign = () => {
    if (!selectedRecentCert) return;
    openAssignModal(selectedRecentCert);
  };

  const handleHeaderDownload = () => {
    if (!canDownloadRecentCerts) return;

    if (selectedRecentCerts.length > 1) {
      downloadMultiplePDFs();
      return;
    }

    downloadSinglePDF(selectedRecentCerts[0]);
  };

  const handleHeaderDelete = () => {
    if (!selectedRecentCert) return;
    handleDelete(selectedRecentCert.id, 'cert');
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
      link.setAttribute('download', `${cert.certificate_id}.pdf`);
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
      await Promise.all(
        selectedCertsList.map(async (cert) => {
          const response = await axios.get(`${API_BASE}/api/certificates/${cert.id}/download/`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          });
          zip.file(`${cert.certificate_id}.pdf`, response.data);
        })
      );
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

  const renderAnalytics = () => {
    if (analyticsLoading || !analyticsData) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid #f3f3f3', borderTop: '3px solid #0D1282', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      );
    }

    const monthlyStats = analyticsData.monthly_stats || [];
    const availableYears = [...new Set(
      monthlyStats
        .map((stat) => {
          const parsedDate = new Date(`${stat.month} 1`);
          return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getFullYear();
        })
        .filter((year) => year !== null)
    )].sort((left, right) => right - left);

    const selectedYear = analyticsYear === 'all' ? 'all' : Number(analyticsYear);

    const filteredMonthlyStats = selectedYear === 'all'
      ? monthlyStats
      : monthlyStats.filter((stat) => {
        const parsedDate = new Date(`${stat.month} 1`);
        return !Number.isNaN(parsedDate.getTime()) && parsedDate.getFullYear() === selectedYear;
      });

    const chartSeries = filteredMonthlyStats
      .map((stat) => {
        const parsedDate = new Date(`${stat.month} 1`);
        if (Number.isNaN(parsedDate.getTime())) return null;

        const count = Number(stat.count) || 0;
        if (count <= 0) return null;

        return {
          date: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1),
          month: parsedDate.toLocaleString('en-US', { month: 'short' }),
          year: parsedDate.getFullYear(),
          count,
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.date - right.date)
      .slice(0, 12);
    const chartMax = Math.max(1, ...chartSeries.map((stat) => stat.count));
    const filteredCerts = selectedYear === 'all'
      ? recentCerts
      : recentCerts.filter((cert) => {
        const parsedDate = new Date(cert.date_issued || cert.created_at || cert.created || '');
        return !Number.isNaN(parsedDate.getTime()) && parsedDate.getFullYear() === selectedYear;
      });
    const validCertificates = filteredCerts.filter((cert) => cert.status === 'VALID').length;
    const invalidCertificates = filteredCerts.filter((cert) => cert.status === 'INVALID' || cert.status === 'REVOKED').length;
    const certificateTotal = validCertificates + invalidCertificates;
    const validShare = certificateTotal > 0 ? (validCertificates / certificateTotal) * 100 : 0;

    return (
      <div className="analytics-view">
        <div className="admin-table-container analytics-chart-card analytics-pie-card">
          <div className="table-header analytics-chart-header">
            <div className="analytics-chart-title">
              <BarChart3 size={24} color="#0D1282" />
              <h3>Certificate Status</h3>
            </div>
            <p className="analytics-chart-subtitle">Valid vs invalid certificates for the selected year</p>
          </div>

          <div className="analytics-pie-chart" role="img" aria-label="Pie chart showing valid and invalid certificates">
            <div className="analytics-pie-ring" style={{ '--pie-share': `${validShare}%` }}>
              <div className="analytics-pie-surface" />
              <div className="analytics-pie-highlight" />
              <div className="analytics-pie-hole">
                <strong>{certificateTotal}</strong>
                <span>Total</span>
              </div>
            </div>

            <div className="analytics-pie-legend">
              <div className="analytics-pie-legend-item">
                <span className="analytics-pie-dot valid" />
                <div>
                  <strong>Valid Certificates</strong>
                  <p>{validCertificates}</p>
                </div>
              </div>
              <div className="analytics-pie-legend-item">
                <span className="analytics-pie-dot invalid" />
                <div>
                  <strong>Invalid Certificates</strong>
                  <p>{invalidCertificates}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-table-container analytics-chart-card">
          <div className="table-header analytics-chart-header">
            <div className="analytics-chart-title">
              <BarChart3 size={24} color="#0D1282" />
              <h3>Monthly Trends</h3>
            </div>
            <div className="analytics-chart-filter">
              <p className="analytics-chart-subtitle">Created certificates per month</p>
              <select
                className="analytics-year-select"
                value={analyticsYear}
                onChange={(e) => setAnalyticsYear(e.target.value)}
                aria-label="Filter analytics by year"
              >
                <option value="all">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="analytics-bar-chart" role="img" aria-label="Bar graph showing created certificates by month and year">
            <div className="analytics-bar-chart-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="analytics-bar-chart-bars">
              {chartSeries.map((stat, index) => {
                const barHeight = Math.max(12, (stat.count / chartMax) * 100);

                return (
                  <div key={`${stat.year}-${stat.month}-${index}`} className="analytics-bar-item">
                    <div className="analytics-bar-value">{stat.count}</div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{ height: `${barHeight}%` }}
                        title={`${stat.month} ${stat.year}: ${stat.count} certificates`}
                      />
                    </div>
                    <div className="analytics-bar-label">
                      <span>{stat.month}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-container">
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      <button className="mobile-menu-toggle" type="button" onClick={() => setIsMobileNavOpen((open) => !open)} aria-label="Toggle navigation menu">
        <span /><span /><span />
      </button>

      {isMobileNavOpen && <div className="mobile-menu-overlay" onClick={closeMobileNav} />}
      {toast.show && <div className="delete-success-toast"><span className="toast-icon">✅</span><p>{toast.message}</p></div>}

      <aside className={`admin-sidebar ${isMobileNavOpen ? 'open' : ''}`}>
        <div className="sidebar-logo-container">
          <img src={CertiLogo} alt="CertiFier Logo" className="sidebar-logo" />
        </div>
        <nav className="admin-nav">
          <button className={`admin-nav-link ${currentView === 'overview' ? 'active' : ''}`} onClick={() => { setCurrentView('overview'); closeMobileNav(); }}><LayoutDashboard size={20} /> Overview</button>
          {userRole === 'admin' && (
            <button className={`admin-nav-link ${currentView === 'analytics' ? 'active' : ''}`} onClick={() => { setCurrentView('analytics'); closeMobileNav(); }}><BarChart3 size={20} /> Analytics</button>
          )}
          <button className={`admin-nav-link ${currentView === 'uploads' ? 'active' : ''}`} onClick={() => { setCurrentView('uploads'); closeMobileNav(); }}><Database size={20} /> Bulk Uploads</button>
          {userRole === 'admin' && (
            <button className={`admin-nav-link ${currentView === 'departments' ? 'active' : ''}`} onClick={() => { setCurrentView('departments'); closeMobileNav(); }}><Building2 size={20} /> Departments</button>
          )}
          <Link to="/UploadTemplate" className="admin-nav-link" onClick={closeMobileNav}><FileText size={20} /> Templates</Link>
          <Link to="/CSVUpload" className="admin-nav-link" onClick={closeMobileNav}><Upload size={20} /> Generate Certificate</Link>
          <Link to="/verify" className="admin-nav-link" onClick={closeMobileNav}><ShieldCheck size={20} /> Verify Tool</Link>
        </nav>
        <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/login'); }}><LogOut size={20} /> Logout</button>
      </aside>

      <main className="admin-main">
        <header className='admin-header'>
          <h1>{
            currentView === 'overview' ? (userRole === 'admin' ? 'Administrator Dashboard' : `Sub-Admin Dashboard - ${localStorage.getItem('department_abbreviation') || ''}`) :
            currentView === 'analytics' ? 'System Analytics' :
            currentView === 'uploads' ? 'Bulk Uploads' :
            currentView === 'departments' ? 'Department Management' : ''
          }</h1>
          <p>{
            currentView === 'overview' ? (userRole === 'admin' ? 'Manage users, certificates, and system templates.' : 'Manage department certificates and templates.') :
            currentView === 'analytics' ? 'Real-time insights into system performance and environmental impact.' :
            currentView === 'uploads' ? 'View and manage bulk file uploads.' :
            currentView === 'departments' ? 'Add and manage university departments.' : ''
          }</p>
        </header>

        <div className="admin-content">

        {currentView === 'overview' ? (
          <>
            <section className="admin-stats-grid">
              <div className="admin-stat-card"><h3>{stats.totalCerts}</h3><p>Certificates Issued</p></div>
              {userRole === 'admin' && (
                <div className="admin-stat-card"><h3>{stats.totalUsers}</h3><p>Registered Users</p></div>
              )}
              <div className="admin-stat-card"><h3>{stats.uploads}</h3><p>Bulk Uploads</p></div>
            </section>

            {assignModal.show && (
              <div className="modal-overlay">
                <form className="modal-content assign-modal" onSubmit={(e) => { e.preventDefault(); handleAssignConfirm(); }}>
                  <h2>Assign Certificate</h2>
                  <p>Select an owner, then save the assignment.</p>
                  <div style={{ margin: '12px 0' }}>
                    <select className="edit-input" value={assignModal.owner} onChange={(e) => setAssignModal({ ...assignModal, owner: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.map((user) => <option key={user.id} value={String(user.id)}>{getUserLabel(user)}</option>)}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={() => setAssignModal({ show: false, certId: null, owner: '' })}>Cancel</button>
                    <button type="submit" className="save-btn" disabled={assigningCertId === assignModal.certId}>{assigningCertId === assignModal.certId ? 'Saving...' : 'Save Assignment'}</button>
                  </div>
                </form>
              </div>
            )}

            {reissueModal.show && reissueModal.cert && (
              <div className="modal-overlay">
                <form className="modal-content reissue-modal" onSubmit={(e) => { e.preventDefault(); handleSaveReissue(); }}>
                  <h2>Reissue Certificate</h2>
                  <p>Review the updated details, then save the reissue.</p>
                  <div style={{ display: 'grid', gap: '12px', margin: '12px 0' }}>
                    <input
                      className="edit-input"
                      value={reissueModal.full_name}
                      onChange={(e) => setReissueModal({ ...reissueModal, full_name: e.target.value })}
                      placeholder="Recipient name"
                    />
                    <input
                      className="edit-input"
                      value={reissueModal.course}
                      onChange={(e) => setReissueModal({ ...reissueModal, course: e.target.value })}
                      placeholder="Course"
                    />
                    <select className="edit-input" value={reissueModal.owner} onChange={(e) => setReissueModal({ ...reissueModal, owner: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.map((user) => <option key={user.id} value={String(user.id)}>{getUserLabel(user)}</option>)}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="cancel-btn" onClick={() => setReissueModal({ show: false, cert: null, full_name: '', course: '', owner: '' })}>Cancel</button>
                    <button type="submit" className="save-btn" disabled={reissuingCertId === reissueModal.cert.id}>{reissuingCertId === reissueModal.cert.id ? 'Saving...' : 'Save Reissue'}</button>
                  </div>
                </form>
              </div>
            )}

            {userRole === 'admin' && (
              <section className="admin-table-container">
                <div className="table-header"><h3>Registered Users</h3><input type="text" placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="table-search-input" /></div>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead><tr><th>First Name</th><th>Last Name</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th></tr></thead>
                    <tbody>
                      {paginatedUsers.map((user) => (
                        <tr key={user.id}>
                          <td>{editingUser === user.id ? <input className="edit-input" value={editUserFormData.first_name} onChange={e => setEditUserFormData({ ...editUserFormData, first_name: e.target.value })} /> : user.first_name}</td>
                          <td>{editingUser === user.id ? <input className="edit-input" value={editUserFormData.last_name} onChange={e => setEditUserFormData({ ...editUserFormData, last_name: e.target.value })} /> : user.last_name}</td>
                          <td>{editingUser === user.id ? <input className="edit-input" value={editUserFormData.email} onChange={e => setEditUserFormData({ ...editUserFormData, email: e.target.value })} /> : user.email}</td>
                          <td>{editingUser === user.id ? (
                            <select
                              className="edit-input"
                              value={editUserFormData.role}
                              onChange={e => setEditUserFormData({ ...editUserFormData, role: e.target.value })}
                            >
                              <option value="student">Student</option>
                              <option value="sub_admin">Sub-Administrator</option>
                              <option value="admin">Administrator</option>
                            </select>
                          ) : (
                            <span className="badge" style={
                              user.role === 'admin' ? { background: '#FDE8E8', color: '#E02424' } :
                              user.role === 'sub_admin' ? { background: '#FEF3C7', color: '#D97706' } :
                              { background: '#E2F6CA', color: '#70B817' }
                            }>
                              {user.role === 'sub_admin' ? 'SUB-ADMIN' : user.role?.toUpperCase()}
                            </span>
                          )}</td>
                          <td>{editingUser === user.id ? (
                            editUserFormData.role === 'sub_admin' ? (
                              <select
                                className="edit-input"
                                value={editUserFormData.department || ''}
                                onChange={e => setEditUserFormData({ ...editUserFormData, department: e.target.value })}
                              >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                  <option key={dept.id} value={dept.id}>{dept.abbreviation}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )
                          ) : (
                            user.department_details?.abbreviation || <span style={{ color: '#94a3b8' }}>—</span>
                          )}</td>
                          <td>
                            <div className="action-buttons">
                              {editingUser === user.id ? (
                                <><button className="save-btn" onClick={() => handleSaveUserEdit(user.id)}>Save</button><button className="cancel-btn" onClick={() => setEditingUser(null)}>                                    
                                Cancel</button></>
                              ) : (
                                <>
                                  <button
                                    className="edit-btn"
                                    onClick={() => {
                                      setEditingUser(user.id);
                                      setEditUserFormData({
                                        first_name: user.first_name,
                                        last_name: user.last_name,
                                        email: user.email,
                                        username: user.username,
                                        role: user.role,
                                        department: user.department || ''
                                      });
                                    }}
                                  >
                                    <Edit2 size={16} />
                                  </button>

                                    {user.role !== 'admin' && (
                                      <button
                                        className="delete-btn"
                                        onClick={() => handleDelete(user.id, 'user')}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
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
                  <span className="pagination-summary">Showing {filteredUsers.length === 0 ? 0 : (currentUserPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentUserPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}</span>
                  <div className="pagination-buttons">
                    <button className="pagination-btn" onClick={() => setCurrentUserPage((page) => Math.max(1, page - 1))} disabled={currentUserPage === 1}>Previous</button>
                    <span className="pagination-page-indicator">Page {currentUserPage} of {Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))}</span>
                    <button className="pagination-btn" onClick={() => setCurrentUserPage((page) => Math.min(Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)), page + 1))} disabled={currentUserPage >= Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))}>Next</button>
                  </div>
                </div>
              </section>
            )}

            <section className="admin-table-container">
              <div className="table-header"><h3>System Templates</h3><input type="text" placeholder="Search templates..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} className="table-search-input" /></div>
              {templates.length === 0 ? <p className="no-data">No templates uploaded yet.</p> : (
                <>
                  <div className="templates-grid">
                    {paginatedTemplates.map((template) => (
                      <div key={template.id} className="template-card">
                        <div className="template-preview1"><img src={getFullUrl(template.background)} alt={template.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PlaceholderImg; }} /></div>
                        <div className="template-info">
                          <h4 style={{ marginBottom: '4px' }}>{template.name}</h4>
                          {template.department_details && (
                            <span className="badge" style={{ background: '#E2F6CA', color: '#70B817', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
                              {template.department_details.abbreviation}
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', width: '100%' }}>
                            <button type="button" className="edit-btn-sm" onClick={() => navigate(`/EditTemplate/${template.id}`)}>Edit</button>
                            <button type="button" className="delete-btn-sm" onClick={() => handleDelete(template.id, 'template')}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pagination-controls">
                    <span className="pagination-summary">Showing {filteredTemplates.length === 0 ? 0 : (currentTemplatePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentTemplatePage * ITEMS_PER_PAGE, filteredTemplates.length)} of {filteredTemplates.length}</span>
                    <div className="pagination-buttons">
                      <button className="pagination-btn" onClick={() => setCurrentTemplatePage((page) => Math.max(1, page - 1))} disabled={currentTemplatePage === 1}>Previous</button>
                      <span className="pagination-page-indicator">Page {currentTemplatePage} of {Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE))}</span>
                      <button className="pagination-btn" onClick={() => setCurrentTemplatePage((page) => Math.min(Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE)), page + 1))} disabled={currentTemplatePage >= Math.max(1, Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE))}>Next</button>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="admin-table-container">
              <div className="table-header recent-issuance-header">
                <div className="table-title-group">
                  <h3>Recent Issuances</h3>
                  <div className="recent-issuance-actions" aria-label="Recent issuance actions">
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={handleHeaderReissue}
                      disabled={!canUseSingleSelectionActions || reissuingCertId === selectedRecentCert?.id}
                      title={canUseSingleSelectionActions ? 'Reissue selected certificate' : 'Select one certificate to reissue'}
                      aria-label="Reissue selected certificate"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={handleHeaderAssign}
                      disabled={!canUseSingleSelectionActions || assigningCertId === selectedRecentCert?.id}
                      title={canUseSingleSelectionActions ? 'Assign selected certificate' : 'Select one certificate to assign'}
                      aria-label="Assign selected certificate"
                    >
                      <UserCheck size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn icon-action-btn-primary"
                      onClick={handleHeaderDownload}
                      disabled={downloadingCerts || !canDownloadRecentCerts}
                      title={canDownloadRecentCerts ? `Download ${selectedRecentCerts.length} selected certificate(s)` : 'Select a certificate to download'}
                      aria-label="Download certificates"
                    >
                      <DownloadIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn icon-action-btn-danger"
                      onClick={handleHeaderDelete}
                      disabled={!canUseSingleSelectionActions || reissuingCertId === selectedRecentCert?.id}
                      title={canUseSingleSelectionActions ? 'Delete selected certificate' : 'Select one certificate to delete'}
                      aria-label="Delete selected certificate"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="issuance-toolbar">
                  <select value={certStatusFilter} onChange={(e) => setCertStatusFilter(e.target.value)} className="table-search-input issuance-filter"><option value="all">All Certificates</option><option value="valid">Valid</option><option value="invalid">Invalid</option></select>
                  <input type="text" placeholder="Search issuances..." value={issuanceSearch} onChange={(e) => setIssuanceSearch(e.target.value)} className="table-search-input issuance-search" />
                </div>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead><tr><th style={{ width: '40px' }}><input type="checkbox" checked={paginatedRecentCerts.length > 0 && paginatedRecentCerts.every((cert) => selectedCerts.has(cert.id))} onChange={toggleSelectAll} title="Select all" /></th><th>Full ID</th><th>Recipient</th><th>Course</th><th>Department</th><th>Owner</th></tr></thead>
                  <tbody>
                    {paginatedRecentCerts.map((cert) => (
                      <tr
                        key={cert.id}
                        className={activeRecentCertId === cert.id ? 'active-issuance-row' : ''}
                        onMouseEnter={() => setActiveRecentCertId(cert.id)}
                        onClick={() => setActiveRecentCertId(cert.id)}
                      >
                        <td style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" checked={selectedCerts.has(cert.id)} onChange={() => { toggleCertSelect(cert.id); setActiveRecentCertId(cert.id); }} /></td>
                        <td>#{cert.certificate_id?.toUpperCase()}</td>
                        <td>{cert.full_name}</td>
                        <td>{cert.course}</td>
                        <td>{cert.department_details?.abbreviation || '—'}</td>
                        <td>{getOwnerDisplay(cert)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination-controls">
                <span className="pagination-summary">Showing {filteredRecentCerts.length === 0 ? 0 : (currentCertPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentCertPage * ITEMS_PER_PAGE, filteredRecentCerts.length)} of {filteredRecentCerts.length}</span>
                <div className="pagination-buttons">
                  <button className="pagination-btn" onClick={() => setCurrentCertPage((page) => Math.max(1, page - 1))} disabled={currentCertPage === 1}>Previous</button>
                  <span className="pagination-page-indicator">Page {currentCertPage} of {Math.max(1, Math.ceil(filteredRecentCerts.length / ITEMS_PER_PAGE))}</span>
                  <button className="pagination-btn" onClick={() => setCurrentCertPage((page) => Math.min(Math.max(1, Math.ceil(filteredRecentCerts.length / ITEMS_PER_PAGE)), page + 1))} disabled={currentCertPage >= Math.max(1, Math.ceil(filteredRecentCerts.length / ITEMS_PER_PAGE))}>Next</button>
                </div>
              </div>
            </section>
          </>
        ) : currentView === 'uploads' ? (
          <BulkUploadsPage />
        ) : currentView === 'departments' && userRole === 'admin' ? (
          <section className="admin-table-container">
            <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>University Departments</h3>
            </div>
            
            <div className="dept-mgmt-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', padding: '20px' }}>
              {/* Form to Add Department */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ marginBottom: '16px', color: '#0F172A' }}>Add New Department</h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newDeptForm.name || !newDeptForm.abbreviation) {
                    showToast('Please fill all fields');
                    return;
                  }
                  try {
                    const headers = { Authorization: `Bearer ${token}` };
                    await axios.post(`${API_BASE}/api/departments/`, newDeptForm, { headers });
                    showToast('Department added successfully!');
                    setNewDeptForm({ name: '', abbreviation: '' });
                    fetchData();
                  } catch (err) {
                    console.error(err);
                    showToast('Failed to add department');
                  }
                }}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>Department Name</label>
                    <input
                      type="text"
                      className="edit-input"
                      placeholder="e.g. College of Information Technology"
                      value={newDeptForm.name}
                      onChange={(e) => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>Abbreviation</label>
                    <input
                      type="text"
                      className="edit-input"
                      placeholder="e.g. CIT"
                      value={newDeptForm.abbreviation}
                      onChange={(e) => setNewDeptForm({ ...newDeptForm, abbreviation: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff' }}
                    />
                  </div>
                  <button type="submit" className="save-btn" style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', background: '#0D1282' }}>
                    Add Department
                  </button>
                </form>
              </div>

              {/* Departments List Table */}
              <div className="table-responsive" style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Abbreviation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="no-data" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No departments registered.</td>
                      </tr>
                    ) : (
                      departments.map((dept) => (
                        <tr key={dept.id}>
                          <td>{editingDept === dept.id ? (
                            <input
                              className="edit-input"
                              value={dept.name}
                              onChange={(e) => {
                                const updated = departments.map(d => d.id === dept.id ? { ...d, name: e.target.value } : d);
                                setDepartments(updated);
                              }}
                              style={{ width: '100%', padding: '6px' }}
                            />
                          ) : dept.name}</td>
                          <td>{editingDept === dept.id ? (
                            <input
                              className="edit-input"
                              value={dept.abbreviation}
                              onChange={(e) => {
                                const updated = departments.map(d => d.id === dept.id ? { ...d, abbreviation: e.target.value } : d);
                                setDepartments(updated);
                              }}
                              style={{ width: '100%', padding: '6px' }}
                            />
                          ) : dept.abbreviation}</td>
                          <td>
                            <div className="action-buttons">
                              {editingDept === dept.id ? (
                                <>
                                  <button className="save-btn" onClick={async () => {
                                    try {
                                      const headers = { Authorization: `Bearer ${token}` };
                                      await axios.patch(`${API_BASE}/api/departments/${dept.id}/`, dept, { headers });
                                      setEditingDept(null);
                                      showToast('Department updated!');
                                      fetchData();
                                    } catch (err) {
                                      alert("Error updating department");
                                    }
                                  }}>Save</button>
                                  <button className="cancel-btn" onClick={() => setEditingDept(null)}>Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button className="edit-btn" onClick={() => setEditingDept(dept.id)}>
                                    <Edit2 size={16} />
                                  </button>
                                  <button className="delete-btn" onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete this department?")) {
                                      try {
                                        const headers = { Authorization: `Bearer ${token}` };
                                        await axios.delete(`${API_BASE}/api/departments/${dept.id}/`, { headers });
                                        showToast('Department deleted!');
                                        fetchData();
                                      } catch (err) {
                                        alert("Error deleting department");
                                      }
                                    }
                                  }}>
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          renderAnalytics()
        )}
        </div>
        <Footer />
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

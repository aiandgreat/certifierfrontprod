import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomePage from "./HomePage"; 
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import VerifyPage from "../pages/dashboard/VerifyPage";
import AdminDashboard from '../pages/dashboard/AdminDashboard'; 
import StudentDashboard from '../pages/dashboard/StudentDashboard';
import UploadTemplatePage from '../pages/dashboard/UploadTemplatePage';
import CSVUploadPage from '../pages/dashboard/CSVUploadPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/AdminDashboard" element={<AdminDashboard />} />
        <Route path="/StudentDashboard" element={<StudentDashboard />} />
        <Route path="/UploadTemplate" element={<UploadTemplatePage />} />
        <Route path="/CSVUpload" element={<CSVUploadPage />} />
        <Route path="*" element={<HomePage />} />

      </Routes>
    </Router>
  );
}

export default App;
import React from 'react';
import { Link } from 'react-router-dom';
import './App.css'; 
import uaLogo from './Images/UALOGO.png';
import CertiLogo from '../src/Images/CertiLogo.png';

const HomePage = () => {
  return (
    <div className="home-container">
      <header>
        <div className="hero-content">
          <div className='LOGOS'>
            <img className="logo" src={CertiLogo} alt="CertiFier Logo" />
            <img className="logo" src={uaLogo} alt="UA LOGO" />
          </div>
          <h1>CertiFier</h1>
          <p>University of the Assumption's First Automated Certificate Generation and Verification system.</p>
          
          <div className="cta-buttons">
            <Link to="/register">
              <button>Register</button>
            </Link>
            <Link to="/login">
              <button>Login</button>
            </Link>
            <Link to="/verify">
              <button>Verify</button>
            </Link>
          </div>
        </div>
      </header>

      <section className="features-section">
        <div className="feature-card">
          <h3>Secure Storage</h3>
          <p>Keep your certificates safe and accessible anytime, anywhere with high-level encryption.</p>
        </div>
        <div className="feature-card">
          <h3>Easy Verification</h3>
          <p>Instantly check the authenticity of any document with our verification engine.</p>
        </div>
        <div className="feature-card">
          <h3>Fast Upload</h3>
          <p>Upload multiple files and manage your records with our intuitive dashboard.</p>
        </div>
      </section>

      <footer>
        <p>&copy; 2026 CertiFier | GALARA. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
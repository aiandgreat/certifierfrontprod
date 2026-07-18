import React from 'react';
import { Link } from 'react-router-dom';
import './App.css'; 
import uaLogo from './Images/UALOGO.png';
import CertiLogo from '../src/Images/CertiLogo.png';
import Footer from '../pages/components/Footer';

const HomePage = () => {
  return (
    <div className="home-container">
      <header className="hero-header">
        <div className="hero-content">
          <div className='LOGOS'>
            <div className="logo-wrapper">
              <img className="logo" src={CertiLogo} alt="CertiFier Logo" />
            </div>
            <div className="logo-wrapper">
              <img className="logo" src={uaLogo} alt="UA LOGO" />
            </div>
          </div>
          <div className="hero-text">
            <h1>CertiFier</h1>
            <p>University of the Assumption's First Automated Certificate Generation and Verification system.</p>
          </div>
          
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

      <Footer />
    </div>
  );
};

export default HomePage;
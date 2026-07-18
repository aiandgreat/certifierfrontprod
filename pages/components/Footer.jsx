import React, { useState } from 'react';
import './Footer.css';
import FooterLogo from '../../src/Images/FooterLogo.png';
import newcitLogo from '../../src/Images/newcit.png';
import uaLogo from '../../src/Images/UALOGO.png';

const DEVELOPERS = ['Garcia', 'Laxamana', 'Guevarra', 'David', 'Payumo', 'Magat'];

const Footer = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <footer className="site-footer">
      {/* Left side — UA & CIT logos (clickable) */}
      <div className="footer-left">
        <a
          href="https://web.ua.edu.ph/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-ua-link"
          aria-label="Visit University of the Assumption website"
        >
          <img src={uaLogo} alt="University of the Assumption Logo" className="footer-ua-logo" />
        </a>
        <a
          href="https://ua-cit.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-cit-link"
          aria-label="Visit UA College of Information Technology website"
        >
          <img src={newcitLogo} alt="UA CIT Logo" className="footer-cit-logo" />
        </a>
      </div>

      {/* Center — copyright & privacy policy */}
      <div className="footer-center">
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} CertiFier &mdash; University of the Assumption
        </p>
        <p className="footer-tagline">Secure Certificate Generation &amp; Verification</p>
        <button 
          className="footer-privacy-btn" 
          onClick={() => setShowPrivacy(true)}
          type="button"
        >
          Privacy Policy
        </button>
      </div>

      {/* Right side — FooterLogo + developer surnames */}
      <div className="footer-right">
        <div className="footer-developers">
          <span className="footer-dev-label">Developed by</span>
          <img src={FooterLogo} alt="CertiFier Footer Logo" className="footer-brand-logo" />
          <div className="footer-dev-names">
            {DEVELOPERS.map((name, i) => (
              <span key={name} className="footer-dev-name">
                {name}{i < DEVELOPERS.length - 1 && <span className="footer-dev-sep"> &bull; </span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* PRIVACY POLICY MODAL */}
      {showPrivacy && (
        <div className="privacy-modal-overlay" onClick={() => setShowPrivacy(false)}>
          <div className="privacy-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="privacy-close-btn" 
              onClick={() => setShowPrivacy(false)}
              aria-label="Close privacy policy"
              type="button"
            >
              &times;
            </button>
            <h2>CertiFier Privacy Policy</h2>
            <div className="privacy-modal-body">
              <h3>1. Compliance with Data Privacy Act of 2012</h3>
              <p>
                CertiFier is dedicated to protecting the personal data of all University of the Assumption students, 
                administrators, and verification partners in accordance with Republic Act No. 10173, also known 
                as the Data Privacy Act of 2012 of the Philippines.
              </p>
              
              <h3>2. Information We Process</h3>
              <p>
                To generate and verify authentic academic credentials, we collect and process limited personal 
                records, including:
              </p>
              <ul>
                <li>Full student names and identification numbers.</li>
                <li>University courses, departments, and honors earned.</li>
                <li>Date of certificate issuance and administrator metadata.</li>
                <li>Verification transaction logs.</li>
              </ul>

              <h3>3. Purpose of Processing</h3>
              <p>
                All records are collected and processed purely for the automation of academic certificate generation, 
                distribution, and security verification. This safeguards credentials from academic fraud 
                and unauthorized tampering.
              </p>

              <h3>4. Public Verification & Data Sharing</h3>
              <p>
                Academic certificates generated on this system are designed to be publicly verifiable strictly 
                through secure URL query hashes and ID verification. No sensitive user account credentials 
                are ever exposed to the public or shared with third-party marketing entities.
              </p>

              <h3>5. Data Retention & Safeguards</h3>
              <p>
                Data is stored in highly encrypted databases utilizing technical security safeguards. We retain 
                student certificate details indefinitely to ensure future verification rights for graduates, unless 
                a formal deletion request is filed with the University's Data Protection Office.
              </p>

              <h3>6. Your Privacy Rights</h3>
              <p>
                Under the Data Privacy Act, you have the right to access, inspect, verify the presence of, 
                or request correction/deletion of your personal records. For inquiries, please reach out directly 
                to the University of the Assumption Data Protection Office (DPO).
              </p>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;

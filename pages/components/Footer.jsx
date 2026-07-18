import React from 'react';
import './Footer.css';
import FooterLogo from '../../src/Images/FooterLogo.png';
import newcitLogo from '../../src/Images/newcit.png';

const DEVELOPERS = ['Garcia', 'Laxamana', 'Guevarra', 'David', 'Payumo', 'Magat'];

const Footer = () => {
  return (
    <footer className="site-footer">
      {/* Left side — CIT logo (clickable) */}
      <div className="footer-left">
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

      {/* Center — copyright */}
      <div className="footer-center">
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} CertiFier &mdash; University of the Assumption
        </p>
        <p className="footer-tagline">Secure Certificate Generation &amp; Verification</p>
      </div>

      {/* Right side — FooterLogo + developer surnames */}
      <div className="footer-right">
        <img src={FooterLogo} alt="CertiFier Footer Logo" className="footer-brand-logo" />
        <div className="footer-developers">
          <span className="footer-dev-label">Developed by</span>
          <div className="footer-dev-names">
            {DEVELOPERS.map((name, i) => (
              <span key={name} className="footer-dev-name">
                {name}{i < DEVELOPERS.length - 1 && <span className="footer-dev-sep"> &bull; </span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

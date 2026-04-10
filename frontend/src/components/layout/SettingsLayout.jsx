import React from 'react';
import FooterLogo from "../../assets/FooterLogo.png";
import "../../styles/Settings.css";
import { FiArrowLeft } from "react-icons/fi";

export const SettingsLayout = ({ children, onNavigateToMainProfile, className = "" }) => {
  return (
    <div className={`settings-page ${className}`}>
        <main className="settings-content">
            <div className="settings-top-bar">
                <button className="back-button" onClick={onNavigateToMainProfile}>
                    <FiArrowLeft size={20} />
                </button>
            </div>
            {children}
            <div className="footer-logo-container">
                <div className="footer-line"></div>
                <div className="footer-logo">
                    <img src={FooterLogo} alt="Logo" />
                </div>
            </div>
        </main>
    </div>
  );
};
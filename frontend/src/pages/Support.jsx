import BottomNav from "../components/layout/BottomNav";
import "../styles/Settings.css";
import "../styles/Support.css";
import { FiArrowLeft, FiMail, FiChevronRight } from "react-icons/fi";
import { SettingsLayout } from "../components/layout/SettingsLayout";


const SUPPORT_EMAIL = "Contact@portf4olio.com";

const SUPPORT_OPTIONS = [
    {
        id: "email",
        label: "Email Us Directly",
        icon: FiMail,
        description: "Send us an email about any issue",
    },
];

export default function Support({ onNavigateToMainProfile, onNavigate }) {
    const handleOptionClick = (optionId) => {
        if (optionId === "email") {
            window.location.href = `mailto:${SUPPORT_EMAIL}`;
        }
    };

    return (
        <div className="appShell">
            <SettingsLayout onNavigateToMainProfile={onNavigateToMainProfile}>
                <div className="settings-header">
                    <h1>Support</h1>
                </div>

                <div className="support-section">
                    <p className="support-subtitle">How can we help you?</p>
                    
                    <div className="support-options">
                        {SUPPORT_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    className="support-option-btn"
                                    onClick={() => handleOptionClick(option.id)}
                                >
                                    <Icon size={22} />
                                    <div className="support-option-text">
                                        <span className="support-option-label">{option.label}</span>
                                        <span className="support-option-desc">{option.description}</span>
                                    </div>
                                    <FiChevronRight size={18} className="option-arrow" />
                                </button>
                                );
                            })}
                        </div>
                    </div>
                <div className="app-download-section">
                    <a className="IOS-DownloadBtn">
                        Download IOS
                    </a>
                    <a 
                    className="Android-DownloadBtn"
                    href="/portf4olio.apk" 
                    download="portf4olio.apk"
                    >
                        Download APK
                    </a>
                </div>
            </SettingsLayout>
            <BottomNav onNavigate={onNavigate} />
        </div>
    );
}

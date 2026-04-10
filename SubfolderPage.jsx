import BottomNav from "../components/layout/BottomNav";
import "../styles/Settings.css";
import { FiArrowLeft } from "react-icons/fi";
import { SettingsLayout } from "../components/layout/SettingsLayout";

export default function FeedPreferences({ onNavigateToMainProfile, onNavigate }) {
    return (
        <div className="appShell">
            <SettingsLayout onNavigateToMainProfile={onNavigateToMainProfile}>
                <div className="settings-header">
                    <h1>Feed Preferences</h1>
                </div>

                {/* Empty for now */}
                <div className="settings-section">
                    <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>
                        Feed preferences coming soon...
                        <br /><br />
                        (Musicians, Dancers, Models, Videographers, etc.)
                    </p>
                </div>
            </SettingsLayout>
            <BottomNav onNavigate={onNavigate} />
        </div>
    );
}

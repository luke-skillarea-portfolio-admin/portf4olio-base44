import BottomNav from "../components/layout/BottomNav";
import "../styles/Settings.css";
import { SettingsLayout } from "../components/layout/SettingsLayout";
import { useAuth } from "../hooks/useAuth";
import "../styles/BioEdit.css";
import { useState } from "react";

export default function EditBio({ onNavigateToMainProfile, onNavigate }) {
    const { user, updateBio } = useAuth();
    const [bioDraft, setBioDraft] = useState(user?.bio || "");

    const handleSave = async () => {
    const result = await updateBio(bioDraft); 

    if (result.success) {
        // This takes the user back to the main profile globally
        onNavigateToMainProfile(); 
    } else {
        alert(result.error);
    }
};

    return (
    <div className="appShell">
        <SettingsLayout onNavigateToMainProfile={onNavigateToMainProfile}>
            <div className="settings-header">
                <h1>Edit Bio</h1>
            </div>

            {/* User Info Section */}
            <textarea value={bioDraft} onChange={(e) => setBioDraft(e.target.value)}></textarea>
            <button className="save-bio-button" onClick={handleSave}>
                Save
            </button>
        </SettingsLayout>
        <BottomNav onNavigate={onNavigate} />
    </div>
);
}
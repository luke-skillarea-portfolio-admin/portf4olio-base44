import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/layout/BottomNav";
import VideoUpload from "../components/Feed/VideoUpload";

import "../styles/Feed.css";

export default function Post({ onNavigate }) {
  const { user } = useAuth();
  const canPost = ["talent", "agency_talent", "agency"].includes(
    user?.account_type,
  );

  return (
    <div className="appShell">
      <div className="feedViewport">
        <div style={{ padding: 16 }}>
          {!canPost ? (
            <div className="uploadCard">
              <div className="uploadHeader">
                <h2>Posting disabled</h2>
                <p style={{ marginTop: 8 }}>
                  Only Talent, Agency Talent, and Agency accounts can post
                  content.
                </p>
              </div>
            </div>
          ) : (
            <VideoUpload onUpload={() => onNavigate && onNavigate("feed")} />
          )}
        </div>
      </div>

      <BottomNav onNavigate={onNavigate} />
    </div>
  );
}

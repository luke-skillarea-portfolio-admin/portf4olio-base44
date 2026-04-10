import { useState } from "react";
import TopBar from "../components/layout/TopBar";
import BottomNav from "../components/layout/BottomNav";
import VideoFeed from "../components/Feed/VideoFeed";
import SearchOverlay from "../components/SearchOverlay";

import "../styles/Feed.css";

function Feed({ onNavigate, scrollToVideoId, onScrollToVideoComplete, onProfileClick, onFolderClick }) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="appShell">
      <div className="feedViewport">
        <div className="topBarOverlay">
          <TopBar onSearchClick={() => setShowSearch(true)} />
        </div>
        <VideoFeed
          scrollToVideoId={scrollToVideoId}
          onScrollToVideoComplete={onScrollToVideoComplete}
          onProfileClick={onProfileClick}
          onFolderClick={onFolderClick}
        />
      </div>
      <BottomNav onNavigate={onNavigate} />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onProfileClick={onProfileClick}
      />
    </div>
  );
}

export default Feed;
import { useState, useEffect } from "react";
import BottomNav from "../components/layout/BottomNav";
import { favoritesAPI, talentFavoritesAPI } from "../services/api";
import { FiArrowLeft, FiStar, FiPlay, FiLoader, FiUser } from "react-icons/fi";
import "../styles/Favorites.css";
import { SettingsLayout } from "../components/layout/SettingsLayout";

export default function Favorites({ onNavigateBack, onNavigate, onVideoSelect, onProfileClick }) {
    const [activeTab, setActiveTab] = useState("posts"); 
    const [favorites, setFavorites] = useState([]);
    const [favoriteTalents, setFavoriteTalents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (activeTab === "posts") {
            fetchFavorites();
        } else {
            fetchFavoriteTalents();
        }
    }, [activeTab]);

    const fetchFavorites = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await favoritesAPI.getMyFavorites();
            setFavorites(data.favorites || []);
        } catch (err) {
            console.error('Failed to fetch favorites:', err.message);
            setError('Could not load favorites');
        } finally {
            setLoading(false);
        }
    };

    const fetchFavoriteTalents = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await talentFavoritesAPI.getMyFavorites();
            setFavoriteTalents(data.favorites || []);
        } catch (err) {
            console.error('Failed to fetch favorite talents:', err.message);
            setError('Could not load favorite talents');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = async (videoId) => {
        try {
            await favoritesAPI.toggleFavorite(videoId);
            setFavorites(prev => prev.filter(fav => fav.video !== videoId));
        } catch (err) {
            console.error('Failed to remove favorite:', err.message);
        }
    };

    const handleRemoveTalentFavorite = async (talentId) => {
        try {
            await talentFavoritesAPI.toggleFavorite(talentId);
            setFavoriteTalents(prev => prev.filter(fav => fav.talent !== talentId));
        } catch (err) {
            console.error('Failed to remove talent favorite:', err.message);
        }
    };

    const handleVideoClick = (videoData) => {
        if (videoData && onVideoSelect) {
            onVideoSelect(videoData.id);
        }
    };

    const handleTalentClick = (username) => {
        if (username && onProfileClick) {
            onProfileClick(username);
        }
    };

    const renderPostsContent = () => {
        if (loading) {
            return (
                <div className="favorites-loading">
                    <FiLoader size={32} className="spin" />
                    <p>Loading favorites...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="favorites-empty">
                    <FiStar size={48} />
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchFavorites}>
                        Retry
                    </button>
                </div>
            );
        }

        if (favorites.length === 0) {
            return (
                <div className="favorites-empty">
                    <FiStar size={48} />
                    <h3>No favorite posts yet</h3>
                    <p>Long press on any video and tap "Favorite" to save it here</p>
                </div>
            );
        }

        return (
            <div className="favorites-grid">
                {favorites.map((fav) => (
                    <div
                        key={fav.id}
                        className="favorite-item"
                        onClick={() => handleVideoClick(fav.video_data)}
                    >
                        <video
                            src={fav.video_data?.stream_url || fav.video_data?.video_url}
                            className="favorite-thumbnail"
                            muted
                            preload="metadata"
                        />
                        <div className="favorite-overlay">
                            <FiPlay size={24} />
                        </div>
                        <div className="favorite-info">
                            <span className="favorite-username">
                                @{fav.video_data?.user_username}
                            </span>
                            {fav.video_data?.folder_path && (
                                <span className="favorite-video-title">
                                    {fav.video_data.folder_path}
                                </span>
                            )}
                        </div>
                        <button
                            className="remove-favorite-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFavorite(fav.video);
                            }}
                        >
                            <FiStar size={16} fill="#facc15" color="#facc15" />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    const renderTalentsContent = () => {
        if (loading) {
            return (
                <div className="favorites-loading">
                    <FiLoader size={32} className="spin" />
                    <p>Loading favorite talents...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="favorites-empty">
                    <FiUser size={48} />
                    <p>{error}</p>
                    <button className="retry-btn" onClick={fetchFavoriteTalents}>
                        Retry
                    </button>
                </div>
            );
        }

        if (favoriteTalents.length === 0) {
            return (
                <div className="favorites-empty">
                    <FiUser size={48} />
                    <h3>No favorite talents yet</h3>
                    <p>Tap the star icon on any profile to save them here</p>
                </div>
            );
        }

        return (
            <div className="favorites-talents-grid">
                {favoriteTalents.map((fav) => (
                    <div
                        key={fav.id}
                        className="favorite-talent-item"
                        onClick={() => handleTalentClick(fav.talent_data?.username)}
                    >
                        <div className="talent-avatar">
                            {fav.talent_data?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="talent-info">
                            <span className="talent-username">
                                @{fav.talent_data?.username}
                            </span>
                            {fav.talent_data?.genre && (
                                <span className="talent-genre">{fav.talent_data.genre}</span>
                            )}
                            <span className="talent-posts">
                                {fav.talent_data?.post_count || 0} posts
                            </span>
                        </div>
                        <button
                            className="remove-favorite-btn talent-remove-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTalentFavorite(fav.talent);
                            }}
                        >
                            <FiStar size={16} fill="#facc15" color="#facc15" />
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="appShell">
            <SettingsLayout onNavigateToMainProfile={onNavigateBack}>
                <div className="settings-header">
                    <h1>Favorites</h1>
                </div>
                {/* Tabs */}
                <div className="favorites-tabs">
                    <button
                        className={`favorites-tab ${activeTab === "posts" ? "active" : ""}`}
                        onClick={() => setActiveTab("posts")}
                    >
                        <FiPlay size={16} />
                        <span>Posts</span>
                    </button>
                    <button
                        className={`favorites-tab ${activeTab === "talents" ? "active" : ""}`}
                        onClick={() => setActiveTab("talents")}
                    >
                        <FiUser size={16} />
                        <span>Talents</span>
                    </button>
                </div>

                <main className="favorites-content">
                    {activeTab === "posts" ? renderPostsContent() : renderTalentsContent()}
                </main>
            </SettingsLayout>
            <BottomNav onNavigate={onNavigate} />
        </div>
    );
}

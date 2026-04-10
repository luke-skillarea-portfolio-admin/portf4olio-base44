import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import Feed from "../pages/Feed";
import Post from "../pages/Post";
import AdminAnalytics from "../pages/AdminAnalytics";
import Settings from "../pages/Settings";
import Messages from "../pages/Messages";
import Auth from "../pages/Auth";
import AdminAuth from "../pages/AdminAuth";
import ProfileVisibility from "../pages/ProfileVisibility";
import FolderPage from "../pages/FolderPage";
import SubfolderPage from "../pages/SubfolderPage";
import FeedPreferences from "../pages/FeedPreferences";
import Subscription from "../pages/Subscription";
import SwitchAccount from "../pages/SwitchAccount";
import ReferralEarnings from "../pages/ReferralEarnings";
import Support from "../pages/Support";
import Favorites from "../pages/Favorites";
import UserProfile from "../pages/UserProfile";
import MainProfile from "../pages/MainProfile";
import Notifications from "../pages/Notifications";
import Search from "../pages/Search";
import PrivateFolderJoin from "../pages/PrivateFolderJoin";
import JoinAgencyTalent from "../pages/JoinAgencyTalent";
import InviteTalent from "../pages/InviteTalent";
import BioEdit from "../pages/BioEdit";
import AgencyTalentManager from "../pages/AgencyTalentManager";
import PrehomeLogo from "../assets/preHome.png";
import PreHomeAnimated from "../assets/preHome.gif";

function AppContent() {
    const [currentPage, setCurrentPage] = useState("feed");
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [userReports, setUserReports] = useState([]);
    const [scrollToVideoId, setScrollToVideoId] = useState(null);
    const [groupInviteCode, setGroupInviteCode] = useState(null);
    const [selectedFolderType, setSelectedFolderType] = useState(null);
    const [selectedSubfolder, setSelectedSubfolder] = useState(null);
    const [privateFolderInviteCode, setPrivateFolderInviteCode] = useState(null);
    const [selectedAgencyTalent, setSelectedAgencyTalent] = useState(null);
    const [messageTargetUserId, setMessageTargetUserId] = useState(null);
    const { user, loading } = useAuth();
    const [timerActive, setTimerActive] = useState(true);

    // Check URL for group invite links and private folder invite links on mount
    useEffect(() => {
        const checkInviteLink = () => {
            const path = window.location.pathname;

            const groupMatch = path.match(/^\/group\/join\/([^/]+)$/);
            const privateFolderMatch = path.match(/^\/private-folder\/join\/([^/]+)$/);

            if (groupMatch) {
                const inviteCode = groupMatch[1];
                setGroupInviteCode(inviteCode);
                // Store in localStorage so it persists through login
                localStorage.setItem('pendingGroupInvite', inviteCode);
                setCurrentPage("messages");
                // Clean URL without reloading
                window.history.replaceState({}, '', '/');
            } else if (privateFolderMatch) {
                const inviteCode = privateFolderMatch[1];
                setPrivateFolderInviteCode(inviteCode);
                localStorage.setItem('pendingPrivateFolderInvite', inviteCode);
                setCurrentPage("privateFolderJoin");
                window.history.replaceState({}, '', '/');
            } else if (path === '/admin') {
                // Show admin login page or admin analytics depending on auth
                if (user && user.account_type === 'admin') {
                    setCurrentPage('admin');
                } else {
                    setCurrentPage('adminLogin');
                }
            } else {
                const pendingGroupInvite = localStorage.getItem('pendingGroupInvite');
                const pendingPrivateFolderInvite = localStorage.getItem('pendingPrivateFolderInvite');

                if (pendingGroupInvite && user) {
                    setGroupInviteCode(pendingGroupInvite);
                    localStorage.removeItem('pendingGroupInvite');
                    setCurrentPage("messages");
                } else if (pendingPrivateFolderInvite && user) {
                    setPrivateFolderInviteCode(pendingPrivateFolderInvite);
                    localStorage.removeItem('pendingPrivateFolderInvite');
                    setCurrentPage("privateFolderJoin");
                }
            }
        };
        checkInviteLink();
    }, [user]);

    // Reset to feed page when user logs in
    useEffect(() => {
        if (user && !loading && !groupInviteCode && !privateFolderInviteCode) {
            setCurrentPage("feed");
        }
    }, [user, loading, groupInviteCode, privateFolderInviteCode]);

    // Guard admin-only page
    useEffect(() => {
        if (loading) return;
        if (currentPage !== 'admin') return;

        if (!user) {
            setCurrentPage('auth');
            return;
        }

        if (user.account_type !== 'admin') {
            setCurrentPage('feed');
        }
    }, [currentPage, user, loading]);

    useEffect(() => {
        const timer = setTimeout(() => {
        setTimerActive(false); // Disable the timer after 3 seconds
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const shouldShowLoading = loading || timerActive;

    // Show loading state while checking authentication or timer is active
    if (shouldShowLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                background: '#252525',
                maxWidth: '390px',
            }}>
                <img 
                src={PreHomeAnimated}
                className="prehome-logo" 
                style={{ width: '390px', height: 'auto'}}
                />
            </div>
        );
    }

    // Navigation handler for bottom nav
    const handleNavigation = (key) => {
        if (key === "messages") {
            if (!user) {
                setCurrentPage("auth");
            } else {
                setCurrentPage("messages");
            }
        } else if (key === "profile") {
            if (!user) {
                setCurrentPage("auth");
            } else {
                setCurrentPage("mainProfile");
            }
        } else if (key === "post") {
            if (!user) {
                setCurrentPage("auth");
            } else {
                setCurrentPage("post");
            }
        } else if (key === "notifications") {
            if (!user) {
                setCurrentPage("auth");
            } else {
                setCurrentPage("notifications");
            }
        } else if (key === "search") {
            setCurrentPage("search");
        } else if (key === "feed") {
            setCurrentPage("feed");
        }
    };

    // Handle profile click from feed
    const handleProfileClick = (username) => {
        if (!user) {
            setCurrentPage('auth');
            return;
        }

        setSelectedProfile(username);
        setCurrentPage("userProfile");
    };

    // Handle agency talent management click (for agency accounts)
    const handleAgencyTalentClick = (talentId, talentUsername) => {
        setSelectedAgencyTalent({ id: talentId, username: talentUsername });
        setCurrentPage("agencyTalentManager");
    };

    // Handle folder click from feed
    const handleFolderClick = (folderInfo) => {
        if (!user) {
            setCurrentPage('auth');
            return;
        }

        // Navigate to the user's profile first, then to the specific folder
        setSelectedProfile(folderInfo.user);
        
        // Set folder info for both regular folders and subfolders
        setSelectedSubfolder({ 
            id: folderInfo.id, 
            name: folderInfo.name,
            user: folderInfo.user,
            type: folderInfo.type,
            fromFeed: true  // Flag to indicate this came from a feed click
        });
        
        setCurrentPage("userProfile");
    };

    // Handle report submission
    const handleReportSubmit = (report) => {
        setUserReports(prev => [report, ...prev]);
    };

    // Handle message from profile
    const handleMessageFromProfile = (userId, username) => {
        setMessageTargetUserId(userId);
        setCurrentPage("messages");
    };

    // Handle folder navigation (public/private)
    const handleNavigateToFolder = (folderType) => {
        setSelectedFolderType(folderType);
        setCurrentPage("folderPage");
    };

    // Handle subfolder navigation
    const handleNavigateToSubfolder = (subfolder, folderType) => {
        setSelectedSubfolder(subfolder);
        setSelectedFolderType(folderType);
        setCurrentPage("subfolderPage");
    };

    // Show auth page if not logged in
    if (currentPage === "auth") {
        return <Auth onNavigate={(page) => setCurrentPage(page)} />;
    }

    if (currentPage === 'adminLogin') {
        return (
            <AdminAuth 
                onBack={() => { setCurrentPage('feed'); window.history.replaceState({}, '', '/'); }}
                onLoggedIn={() => { setCurrentPage('admin'); }}
            />
        );
    }

    // Menu navigation handler
    const handleMenuNavigation = (page) => {
        setCurrentPage(page);
    };

    // Show notifications page
    if (currentPage === "notifications") {
        return (
            <Notifications
                onNavigate={handleNavigation}
                onBack={() => setCurrentPage("feed")}
                currentUser={user}
            />
        );
    }

    // Show search page
    if (currentPage === "search") {
        return (
            <Search
                onNavigate={handleNavigation}
                onProfileClick={handleProfileClick}
                currentUser={user}
            />
        );
    }

    // Show user profile
    if (currentPage === "userProfile") {
        return (
            <UserProfile
                username={selectedProfile}
                onBack={() => {
                    setSelectedProfile(null);
                    setSelectedSubfolder(null);
                    setCurrentPage("feed");
                }}
                onNavigate={handleNavigation}
                onReportSubmit={handleReportSubmit}
                onMessage={handleMessageFromProfile}
                currentUser={user}
                initialSubfolder={selectedSubfolder}
            />
        );
    }

    // Show main profile
    if (currentPage === "mainProfile") {
        return (
            <MainProfile
                onBack={() => setCurrentPage("feed")}
                onNavigate={handleNavigation}
                onNavigateToSettings={() => setCurrentPage("settings")}
                onMenuNavigate={handleMenuNavigation}
                onProfileClick={handleProfileClick}
                onAgencyTalentClick={handleAgencyTalentClick}
            />
        );
    }

    // Show agency talent manager (for agency accounts managing their talents)
    if (currentPage === "agencyTalentManager" && selectedAgencyTalent) {
        return (
            <AgencyTalentManager
                talentId={selectedAgencyTalent.id}
                talentUsername={selectedAgencyTalent.username}
                onBack={() => setCurrentPage("mainProfile")}
                onNavigate={handleNavigation}
            />
        );
    }

    if (currentPage === "bioEdit") {
        return (
            <BioEdit
                onNavigateToMainProfile={() => setCurrentPage("mainProfile")}
                onNavigate={handleNavigation}
            />
        );
    }

    // Show main app if logged in
    if (currentPage === "admin") {
        if (!user || user.account_type !== 'admin') {
            return <Feed 
                onNavigateToSettings={() => setCurrentPage("settings")} 
                onNavigate={handleNavigation}
                onMenuNavigate={handleMenuNavigation}
                onProfileClick={handleProfileClick}
            />;
        }
        return <AdminAnalytics
            onNavigateToSettings={() => setCurrentPage("settings")}
            onViewVideo={(videoId) => {
                setScrollToVideoId(videoId);
                setCurrentPage("feed");
            }}
        />;
    }

    if (currentPage === "settings") {
        if (!user) {
                setCurrentPage("auth");
            }
        return (
            <Settings 
                onNavigate={handleNavigation}
                onNavigateToBio={() => setCurrentPage("bioEdit")}
                onNavigateToMainProfile={() => setCurrentPage("mainProfile")} 
                onNavigateToAdmin={() => setCurrentPage("admin")}
            />
        );
    }

    if (currentPage === "messages") {
        return (
            <Messages
                onNavigateToFeed={() => setCurrentPage("feed")}
                onNavigate={handleNavigation}
                inviteCode={groupInviteCode}
                onClearInviteCode={() => {
                    setGroupInviteCode(null);
                    localStorage.removeItem('pendingGroupInvite');
                }}
                messageTargetUserId={messageTargetUserId}
                onClearMessageTarget={() => setMessageTargetUserId(null)}
            />
        );
    }

    if (currentPage === "privateFolderJoin") {
        if (!user) {
            if (privateFolderInviteCode) {
                localStorage.setItem('pendingPrivateFolderInvite', privateFolderInviteCode);
            }
            return <Auth onNavigate={() => setCurrentPage("feed")} />;
        }
        return (
            <PrivateFolderJoin
                inviteCode={privateFolderInviteCode}
                onBack={() => setCurrentPage("feed")}
                onClearInviteCode={() => {
                    setPrivateFolderInviteCode(null);
                    localStorage.removeItem('pendingPrivateFolderInvite');
                }}
            />
        );
    }

    if (currentPage === "profileVisibility") {
        return (
            <ProfileVisibility
                onNavigateToMainProfile={() => setCurrentPage("mainProfile")}
                onNavigate={handleNavigation}
                onNavigateToFolder={handleNavigateToFolder}
            />
        );
    }

    if (currentPage === "folderPage") {
        return (
            <FolderPage
                folderType={selectedFolderType}
                onNavigate={handleNavigation}
                onBack={() => setCurrentPage("profileVisibility")}
                onNavigateToSubfolder={(subfolder) => handleNavigateToSubfolder(subfolder, selectedFolderType)}
            />
        );
    }

    if (currentPage === "subfolderPage") {
        return (
            <SubfolderPage
                subfolder={selectedSubfolder}
                folderType={selectedFolderType}
                onNavigate={handleNavigation}
                onBack={() => {
                    setSelectedSubfolder(null);
                    setCurrentPage("folderPage");
                }}
            />
        );
    }

    if (currentPage === "feedPreferences") {
        return <FeedPreferences onNavigateToMainProfile={() => setCurrentPage("mainProfile")} onNavigate={handleNavigation} />;
    }

    if (currentPage === "subscription") {
        return <Subscription onNavigateToMainProfile={() => setCurrentPage("mainProfile")} onNavigate={handleNavigation} />;
    }

    if (currentPage === "switchAccount") {
        return <SwitchAccount onNavigateToMainProfile={() => setCurrentPage("mainProfile")} onNavigate={handleNavigation} />;
    }

    if (currentPage === "referralEarnings") {
        return <ReferralEarnings onNavigateToMainProfile={() => setCurrentPage("mainProfile")} onNavigate={handleNavigation} />;
    }

    if (currentPage === "inviteTalent") {
        return (
            <InviteTalent
                onBack={() => setCurrentPage("mainProfile")}
            />
        );
    }

    if (currentPage === "joinAgencyTalent") {
        return (
            <JoinAgencyTalent
                onBack={() => setCurrentPage("mainProfile")}
            />
        );
    }

    if (currentPage === "support") {
        return (
            <Support 
                onNavigateToMainProfile={() => setCurrentPage("mainProfile")} 
                onNavigate={handleNavigation}
            />
        );
    }

    if (currentPage === "favorites") {
        return (
            <Favorites
                onNavigateBack={() => setCurrentPage("mainProfile")}
                onNavigate={handleNavigation}
                onVideoSelect={(videoId) => {
                    setScrollToVideoId(videoId);
                    setCurrentPage("feed");
                }}
                onProfileClick={handleProfileClick}
            />
        );
    }

    if (currentPage === "post") {
        return <Post onNavigate={handleNavigation} />;
    }

    return (
        <Feed 
            onNavigateToSettings={() => setCurrentPage("settings")} 
            onNavigate={handleNavigation}
            onMenuNavigate={handleMenuNavigation}
            onProfileClick={handleProfileClick}
            onFolderClick={handleFolderClick}
            scrollToVideoId={scrollToVideoId}
            onScrollToVideoComplete={() => setScrollToVideoId(null)}
        />
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

import { useState, useEffect } from "react";
import { FiUsers, FiUser, FiBriefcase, FiLink2, FiUsers as FiGroups, FiGift, FiUserX, FiFileText } from "react-icons/fi";
import BottomNav from "../components/layout/BottomNav";
import StatCard from "../components/analytics/StatCard";
import NotificationsList from "../components/analytics/NotificationsList";
import CustomerSupportPanel from "../components/analytics/CustomerSupportPanel";
import UserList from "../components/analytics/UserList";
import ReferralsStats from "../components/analytics/ReferralsStats";
import SuspendedAccountsList from "../components/analytics/SuspendedAccountsList";
import SuspendedPostsList from "../components/analytics/SuspendedPostsList";
import { adminAnalyticsAPI } from "../services/api";
import "../styles/AdminAnalytics.css";

export default function AdminAnalytics({ onNavigateToSettings, onViewVideo }) {
    const [stats, setStats] = useState({
        total_users: 0,
        total_talents: 0,
        total_agencies: 0,
        total_referrals: 0,
        total_collabs: 0,
        total_groups: 0,
        total_suspended: 0,
        total_suspended_posts: 0,
    });
    const [referralBreakdown, setReferralBreakdown] = useState({
        user_referrals: 0,
        talent_referrals: 0,
        agency_referrals: 0,
    });
    const [notifications, setNotifications] = useState([]);
    const [users, setUsers] = useState([]);
    const [talents, setTalents] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [suspendedAccounts, setSuspendedAccounts] = useState([]);
    const [suspendedPosts, setSuspendedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState("dashboard");

    // Fetch all data on mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch stats
                const statsRes = await adminAnalyticsAPI.getStats();
                setStats(statsRes.stats);
                setReferralBreakdown(statsRes.referral_breakdown);

                // Fetch notifications
                const notifsRes = await adminAnalyticsAPI.getNotifications();
                setNotifications(notifsRes.notifications);

                // Fetch users list
                const usersRes = await adminAnalyticsAPI.getUsers();
                setUsers(usersRes.users);

                // Fetch talents list
                const talentsRes = await adminAnalyticsAPI.getTalents();
                setTalents(talentsRes.talents);

                // Fetch agencies list
                const agenciesRes = await adminAnalyticsAPI.getAgencies();
                setAgencies(agenciesRes.agencies);

                // Fetch suspended accounts
                const suspendedRes = await adminAnalyticsAPI.getSuspendedAccounts();
                setSuspendedAccounts(suspendedRes.suspended_accounts || []);

                // Fetch suspended posts
                const suspendedPostsRes = await adminAnalyticsAPI.getSuspendedPosts();
                setSuspendedPosts(suspendedPostsRes.suspended_posts || []);
            } catch (error) {
                console.error("Error fetching admin analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Handle navigation
    if (currentView === "users") {
        return <UserList users={users} userType="user" onBack={() => setCurrentView("dashboard")} />;
    }
    if (currentView === "talents") {
        return <UserList users={talents} userType="talent" onBack={() => setCurrentView("dashboard")} />;
    }
    if (currentView === "agencies") {
        return <UserList users={agencies} userType="agency" onBack={() => setCurrentView("dashboard")} />;
    }
    if (currentView === "referrals") {
        return <ReferralsStats referralStats={referralBreakdown} onBack={() => setCurrentView("dashboard")} />;
    }
    if (currentView === "suspended") {
        return <SuspendedAccountsList suspendedAccounts={suspendedAccounts} onBack={() => setCurrentView("dashboard")} />;
    }
    if (currentView === "suspendedPosts") {
        return <SuspendedPostsList suspendedPosts={suspendedPosts} onBack={() => setCurrentView("dashboard")} />;
    }

    return (
        <div className="appShell">
            <div className="admin-analytics-page">
                <div className="admin-top-bar">
                    <button className="back-to-feed-button" onClick={onNavigateToSettings}>
                        ← Back to Settings
                    </button>
                </div>

                <main className="admin-analytics-content">
                <div className="analytics-header">
                    <h1>Admin Analytics Dashboard</h1>
                    <p className="analytics-subtitle">Overview of platform metrics and activity</p>
                </div>

                {loading ? (
                    <div className="analytics-loading">Loading analytics data...</div>
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="stats-grid">
                            <StatCard
                                icon={FiUsers}
                                label="No of Users"
                                value={stats.total_users}
                                color="blue"
                                onClick={() => setCurrentView("users")}
                            />
                            <StatCard
                                icon={FiUser}
                                label="No of Talents"
                                value={stats.total_talents}
                                color="purple"
                                onClick={() => setCurrentView("talents")}
                            />
                            <StatCard
                                icon={FiBriefcase}
                                label="No of Agencies"
                                value={stats.total_agencies}
                                color="orange"
                                onClick={() => setCurrentView("agencies")}
                            />
                            <StatCard
                                icon={FiGift}
                                label="No of Referrals"
                                value={stats.total_referrals}
                                color="green"
                                onClick={() => setCurrentView("referrals")}
                            />
                            <StatCard
                                icon={FiUserX}
                                label="Suspended Accounts"
                                value={stats.total_suspended}
                                color="red"
                                onClick={() => setCurrentView("suspended")}
                            />
                            <StatCard
                                icon={FiFileText}
                                label="Suspended Posts"
                                value={stats.total_suspended_posts}
                                color="pink"
                                onClick={() => setCurrentView("suspendedPosts")}
                            />
                            <StatCard
                                icon={FiLink2}
                                label="No of Collabs"
                                value={stats.total_collabs}
                                color="teal"
                            />
                            <StatCard
                                icon={FiGroups}
                                label="No of Groups"
                                value={stats.total_groups}
                                color="gray"
                            />
                        </div>

                        {/* Notifications List */}
                        <NotificationsList notifications={notifications} />

                        {/* Customer Support Panel */}
                        <CustomerSupportPanel onViewVideo={onViewVideo} />
                    </>
                )}
            </main>

            <BottomNav />
        </div>
        </div>
    );
}

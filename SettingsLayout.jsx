import { FiUsers, FiUser, FiBriefcase } from "react-icons/fi";
import StatCard from "./StatCard";
import BottomNav from "../layout/BottomNav";
import "../../styles/AdminAnalytics.css";

export default function ReferralsStats({ referralStats, onBack }) {
    return (
        <div className="appShell">
            <div className="admin-analytics-page">
                <div className="admin-top-bar">
                    <button className="back-to-feed-button" onClick={onBack}>
                        ← Back to Analytics
                    </button>
                </div>

                <main className="admin-analytics-content">
                    <div className="analytics-header">
                        <h1>Referrals</h1>
                        <p className="analytics-subtitle">Overview of referral statistics</p>
                    </div>

                    <div className="stats-grid">
                        <StatCard
                            icon={FiUsers}
                            label="No of User Referrals"
                            value={referralStats.user_referrals || 0}
                            color="blue"
                        />
                        <StatCard
                            icon={FiUser}
                            label="No of Talent Referrals"
                            value={referralStats.talent_referrals || 0}
                            color="purple"
                        />
                        <StatCard
                            icon={FiBriefcase}
                            label="No of Agency Referrals"
                            value={referralStats.agency_referrals || 0}
                            color="orange"
                        />
                    </div>
                </main>
                <BottomNav />
            </div>
        </div>
    );
}

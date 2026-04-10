import { useState, useEffect, useRef } from "react";
import { FiUserPlus, FiBriefcase, FiBell, FiChevronDown, FiFlag, FiMessageSquare } from "react-icons/fi";
import "../../styles/AdminAnalytics.css";

const FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'new_talent', label: 'New Talents' },
    { value: 'new_agency', label: 'New Agencies' },
    { value: 'post_report', label: 'Post Reports' },
    { value: 'message_report', label: 'Message Reports' },
];

export default function NotificationsList({ notifications }) {
    const [filter, setFilter] = useState("all");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredNotifications = notifications.filter(notif => {
        if (filter === "all") return true;
        return notif.type === filter;
    });

    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const notifTime = new Date(timestamp);
        const diffMs = now - notifTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case "new_talent":
                return <FiUserPlus size={20} />;
            case "new_agency":
                return <FiBriefcase size={20} />;
            case "post_report":
                return <FiFlag size={20} />;
            case "message_report":
                return <FiMessageSquare size={20} />;
            default:
                return <FiBell size={20} />;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case "new_talent":
                return "purple";
            case "new_agency":
                return "orange";
            case "post_report":
                return "red";
            case "message_report":
                return "red";
            default:
                return "blue";
        }
    };

    return (
        <div className="notifications-container">
            <div className="notifications-header">
                <h2>Recent Notifications</h2>
                <div className="notif-custom-dropdown" ref={dropdownRef}>
                    <button
                        className="notif-custom-dropdown-trigger"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        type="button"
                    >
                        <span>{FILTER_OPTIONS.find(f => f.value === filter)?.label}</span>
                        <FiChevronDown size={14} />
                    </button>
                    {dropdownOpen && (
                        <div className="notif-custom-dropdown-menu">
                            {FILTER_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    className={`notif-custom-dropdown-item ${filter === option.value ? 'active' : ''}`}
                                    onClick={() => {
                                        setFilter(option.value);
                                        setDropdownOpen(false);
                                    }}
                                    type="button"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="notifications-list">
                {filteredNotifications.length === 0 ? (
                    <div className="no-notifications">No notifications found</div>
                ) : (
                    filteredNotifications.map((notif) => (
                        <div 
                            key={notif.id} 
                            className={`notification-item ${!notif.read ? 'unread' : ''} notif-${getNotificationColor(notif.type)}`}
                        >
                            <div className="notification-icon">{getNotificationIcon(notif.type)}</div>
                            <div className="notification-content">
                                <div className="notification-message">{notif.message}</div>
                                <div className="notification-time">{getTimeAgo(notif.timestamp)}</div>
                            </div>
                            {!notif.read && <div className="unread-badge"></div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

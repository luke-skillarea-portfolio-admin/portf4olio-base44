import { useState, useEffect, useRef } from "react";
import { FiUser, FiUserCheck, FiUserX, FiFolder, FiFolderPlus, FiUsers, FiBriefcase, FiGift, FiAlertCircle, FiTrash2, FiCheckCircle, FiStar, FiFlag, FiMessageSquare, FiChevronDown } from "react-icons/fi";
import BottomNav from "../components/layout/BottomNav";
import { notificationsAPI } from "../services/api";
import "../styles/Notifications.css";

// User notification types (displayed in Notifications tab)
const NOTIFICATION_ICONS = {
    // Profile Access
    profile_access_request: FiUser,
    profile_access_granted: FiUserCheck,
    profile_access_denied: FiUserX,
    // Folder Access
    folder_access_request: FiFolder,
    private_folder_access_granted: FiFolderPlus,
    private_folder_access_denied: FiFolder,
    // Group Access
    group_invite: FiUsers,
    group_join_request: FiUsers,
    // Account
    agency_talent_linked: FiBriefcase,
    referral_added: FiGift,
    // Moderation
    post_suspended: FiAlertCircle,
    // Admin notifications
    admin_new_talent: FiStar,
    admin_new_agency: FiBriefcase,
    admin_post_report: FiFlag,
    admin_message_report: FiMessageSquare,
};

const NOTIFICATION_COLORS = {
    // Profile Access
    profile_access_request: '#3b82f6',
    profile_access_granted: '#10b981',
    profile_access_denied: '#ef4444',
    // Folder Access
    folder_access_request: '#8b5cf6',
    private_folder_access_granted: '#10b981',
    private_folder_access_denied: '#ef4444',
    // Group Access
    group_invite: '#10b981',
    group_join_request: '#10b981',
    // Account
    agency_talent_linked: '#f59e0b',
    referral_added: '#22c55e',
    // Moderation
    post_suspended: '#ef4444',
    // Admin notifications
    admin_new_talent: '#8b5cf6',
    admin_new_agency: '#f59e0b',
    admin_post_report: '#ef4444',
    admin_message_report: '#ef4444',
};

// Message notification types (excluded from Notifications tab - shown only in Messages tab)
const MESSAGE_NOTIFICATION_TYPES = ['new_message', 'new_group_message'];

const ADMIN_TYPE_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'admin_new_talent', label: 'New Talent' },
    { value: 'admin_new_agency', label: 'New Agency' },
    { value: 'admin_post_report', label: 'Post Reports' },
    { value: 'admin_message_report', label: 'Message Reports' },
];

export default function Notifications({ onNavigate, onBack, currentUser }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [adminTypeFilter, setAdminTypeFilter] = useState('all'); 
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const isAdmin = currentUser?.is_staff || currentUser?.is_superuser;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [filter, adminTypeFilter]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const filters = {};
            if (filter === 'unread') {
                filters.is_read = false;
            }
            if (isAdmin && adminTypeFilter !== 'all') {
                filters.type = adminTypeFilter;
            }
            const data = await notificationsAPI.getNotifications(filters);
            // Filter out message notifications - they should only appear in Messages tab
            const filteredNotifications = (data.notifications || []).filter(
                n => !MESSAGE_NOTIFICATION_TYPES.includes(n.notification_type)
            );
            setNotifications(filteredNotifications);
            // Also filter unread count to exclude message notifications
            const filteredUnreadCount = filteredNotifications.filter(n => !n.is_read).length;
            setUnreadCount(filteredUnreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationsAPI.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to clear all notifications?')) return;
        try {
            await notificationsAPI.clearAll();
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const getIcon = (type) => {
        return NOTIFICATION_ICONS[type] || FiAlertCircle;
    };

    const getColor = (type) => {
        return NOTIFICATION_COLORS[type] || '#6b7280';
    };

    return (
        <div className="appShell">
            <div className="notifications-page">
                <div className="notifications-top-bar">
                    <button className="back-button-notifications" onClick={onBack}>
                        ← Back to Feed
                    </button>
                </div>

                <div className="notifications-header">
                    <div className="notifications-header-row">
                        <h1>Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="unread-badge">{unreadCount}</span>
                        )}
                    </div>
                    <div className="notifications-actions">
                        <div className="notifications-filter">
                            <button
                                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                All
                            </button>
                            <button
                                className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                                onClick={() => setFilter('unread')}
                            >
                                Unread
                            </button>
                        </div>
                        {notifications.length > 0 && (
                            <div className="notifications-bulk-actions">
                                {unreadCount > 0 && (
                                    <button
                                        className="bulk-action-btn"
                                        onClick={handleMarkAllAsRead}
                                        title="Mark all as read"
                                    >
                                        <FiCheckCircle size={16} />
                                    </button>
                                )}
                                <button
                                    className="bulk-action-btn danger"
                                    onClick={handleClearAll}
                                    title="Clear all"
                                >
                                    <FiTrash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Admin notification type filter */}
                    {isAdmin && (
                        <div className="admin-type-filter">
                            <span className="admin-filter-label">Filter by Type:</span>
                            <div className="custom-dropdown" ref={dropdownRef}>
                                <button
                                    className="custom-dropdown-trigger"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    type="button"
                                >
                                    <span>{ADMIN_TYPE_FILTERS.find(f => f.value === adminTypeFilter)?.label}</span>
                                    <FiChevronDown size={14} />
                                </button>
                                {dropdownOpen && (
                                    <div className="custom-dropdown-menu">
                                        {ADMIN_TYPE_FILTERS.map((typeFilter) => (
                                            <button
                                                key={typeFilter.value}
                                                className={`custom-dropdown-item ${adminTypeFilter === typeFilter.value ? 'active' : ''}`}
                                                onClick={() => {
                                                    setAdminTypeFilter(typeFilter.value);
                                                    setDropdownOpen(false);
                                                }}
                                                type="button"
                                            >
                                                {typeFilter.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="notifications-content">
                    {loading ? (
                        <div className="notifications-loading">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                        <div className="notifications-empty">
                            <FiAlertCircle size={48} />
                            <p>No notifications</p>
                            <span>When you have notifications, they will appear here.</span>
                        </div>
                    ) : (
                        <div className="notifications-list">
                            {notifications.map((notification) => {
                                const Icon = getIcon(notification.notification_type);
                                const color = getColor(notification.notification_type);
                                return (
                                    <div
                                        key={notification.id}
                                        className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                        onClick={() => {
                                            if (!notification.is_read) {
                                                handleMarkAsRead(notification.id);
                                            }
                                        }}
                                    >
                                        <div
                                            className="notification-icon"
                                            style={{ backgroundColor: `${color}20`, color: color }}
                                        >
                                            <Icon size={20} />
                                        </div>
                                        <div className="notification-body">
                                            <p className="notification-message">{notification.message}</p>
                                            <span className="notification-time">{notification.time_ago}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <BottomNav onNavigate={onNavigate} />
            </div>
        </div>
    );
}

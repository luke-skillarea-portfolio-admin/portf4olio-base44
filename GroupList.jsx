import { useState, useEffect } from "react";
import "../../styles/BottomNav.css";
import { BOTTOM_NAV_ITEMS } from "../../constants/navigation";
import { notificationsAPI } from "../../services/api";

export default function BottomNav({ onNavigate }) {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const data = await notificationsAPI.getNotifications({ unread_only: true });
            setUnreadCount(data.unread_count || 0);
        } catch (error) {
            // Silently fail
        }
    };

    const handleClick = (key) => {
        if (onNavigate) {
            onNavigate(key);
        }
    };

    return (
        <nav className="bottomNav">
            {BOTTOM_NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                    <button
                        key={item.key}
                        className="bottomNavItem"
                        aria-label={item.label}
                        onClick={() => handleClick(item.key)}
                    >
                        <div className="bottomNavIconWrapper">
                            <Icon size={22} strokeWidth={1.75} />
                            {item.key === 'notifications' && unreadCount > 0 && (
                                <span className="notificationBadge">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

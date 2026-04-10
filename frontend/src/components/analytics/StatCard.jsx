import "../../styles/AdminAnalytics.css";

export default function StatCard({ icon: Icon, label, value, color = "blue", trend, onClick }) {
    return (
        <div 
            className={`stat-card stat-card-${color} ${onClick ? 'stat-card-clickable' : ''}`}
            onClick={onClick}
        >
            <div className="stat-card-icon">
                {Icon && <Icon size={24} />}
            </div>
            <div className="stat-card-content">
                <div className="stat-card-value">{value.toLocaleString()}</div>
                <div className="stat-card-label">{label}</div>
                {trend && (
                    <div className={`stat-card-trend ${trend > 0 ? 'positive' : 'negative'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import { postReportsAPI, messageReportsAPI, adminPostsAPI } from "../../services/api";
import { FiLoader, FiAlertOctagon, FiX, FiExternalLink } from "react-icons/fi";
import "../../styles/AdminAnalytics.css";

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending Review' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'dismissed', label: 'Dismissed' },
];

// Post reports filter options (Talent, Agency, Agency Talent)
const POST_REPORT_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'talent', label: 'Talent' },
    { value: 'agency', label: 'Agency' },
    { value: 'agency_talent', label: 'Agency Talent' },
];

// Message reports filter options (User, Talent, Agency, Agency Talent)
const MESSAGE_REPORT_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'user', label: 'User' },
    { value: 'talent', label: 'Talent' },
    { value: 'agency', label: 'Agency' },
    { value: 'agency_talent', label: 'Agency Talent' },
];

// Post suspend reason options (Admin end)
const SUSPEND_REASON_OPTIONS = [
    { value: 'inappropriate', label: 'Inappropriate Public Content' },
    { value: 'bullying', label: 'Bullying and Harassment' },
    { value: 'fraudulent', label: 'Fraudulent Activity' },
    { value: 'impersonation', label: 'Impersonation' },
];

export default function CustomerSupportPanel({ onViewVideo }) {
    // Post Reports state
    const [reports, setReports] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [postReportFilter, setPostReportFilter] = useState('all');

    // Message Reports state
    const [messageReports, setMessageReports] = useState([]);
    const [messageTotalCount, setMessageTotalCount] = useState(0);
    const [messagePendingCount, setMessagePendingCount] = useState(0);
    const [messageLoading, setMessageLoading] = useState(true);
    const [messageError, setMessageError] = useState(null);
    const [messageUpdatingId, setMessageUpdatingId] = useState(null);
    const [messageReportFilter, setMessageReportFilter] = useState('all');

    // Post suspension state
    const [suspendingId, setSuspendingId] = useState(null);
    const [suspendModal, setSuspendModal] = useState({ show: false, report: null });
    const [suspendReason, setSuspendReason] = useState('');

    useEffect(() => {
        fetchReports();
    }, [postReportFilter]);

    useEffect(() => {
        fetchMessageReports();
    }, [messageReportFilter]);

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            const filters = {};
            if (postReportFilter !== 'all') {
                filters.reporter_type = postReportFilter;
            }
            const data = await postReportsAPI.getAdminReports(filters);
            setReports(data.reports || []);
            setTotalCount(data.total_count || 0);
            setPendingCount(data.pending_count || 0);
        } catch (err) {
            console.log('Could not fetch admin reports:', err.message);
            setError('Could not load reports');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessageReports = async () => {
        setMessageLoading(true);
        setMessageError(null);
        try {
            const filters = {};
            if (messageReportFilter !== 'all') {
                filters.reporter_type = messageReportFilter;
            }
            const data = await messageReportsAPI.getAdminReports(filters);
            setMessageReports(data.reports || []);
            setMessageTotalCount(data.total_count || 0);
            setMessagePendingCount(data.pending_count || 0);
        } catch (err) {
            console.log('Could not fetch message reports:', err.message);
            setMessageError('Could not load message reports');
        } finally {
            setMessageLoading(false);
        }
    };

    const handleStatusChange = async (reportId, newStatus) => {
        setUpdatingId(reportId);
        try {
            await postReportsAPI.updateReportStatus(reportId, newStatus);
            // Update local state
            setReports(prev => prev.map(report =>
                report.id === reportId
                    ? { ...report, status: newStatus, status_display: STATUS_OPTIONS.find(s => s.value === newStatus)?.label }
                    : report
            ));
            // Update counts
            const updatedReports = reports.map(report =>
                report.id === reportId ? { ...report, status: newStatus } : report
            );
            setPendingCount(updatedReports.filter(r => r.status === 'pending').length);
        } catch (err) {
            console.log('Could not update status:', err.message);
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleMessageStatusChange = async (reportId, newStatus) => {
        setMessageUpdatingId(reportId);
        try {
            await messageReportsAPI.updateReportStatus(reportId, newStatus);
            setMessageReports(prev => prev.map(report =>
                report.id === reportId
                    ? { ...report, status: newStatus, status_display: STATUS_OPTIONS.find(s => s.value === newStatus)?.label }
                    : report
            ));
            const updatedReports = messageReports.map(report =>
                report.id === reportId ? { ...report, status: newStatus } : report
            );
            setMessagePendingCount(updatedReports.filter(r => r.status === 'pending').length);
        } catch (err) {
            console.log('Could not update message report status:', err.message);
            alert('Failed to update status');
        } finally {
            setMessageUpdatingId(null);
        }
    };

    const openSuspendModal = (report) => {
        setSuspendModal({ show: true, report });
        setSuspendReason('');
    };

    const closeSuspendModal = () => {
        setSuspendModal({ show: false, report: null });
        setSuspendReason('');
    };

    const handleSuspendPost = async () => {
        if (!suspendModal.report || !suspendReason) return;

        const report = suspendModal.report;
        setSuspendingId(report.id);
        try {
            // Determine post type and ID
            const postType = report.post_type || (report.video ? 'video' : 'photo');
            const postId = report.video || report.photo_post;
            // Get the full label to send to the user
            const reasonLabel = SUSPEND_REASON_OPTIONS.find(opt => opt.value === suspendReason)?.label || suspendReason;
            await adminPostsAPI.suspendPost(postType, postId, reasonLabel);
            closeSuspendModal();
            alert('Post suspended successfully. User has been notified.');
            // Update status to suspended
            await handleStatusChange(report.id, 'suspended');
        } catch (err) {
            console.log('Could not suspend post:', err.message);
            alert('Failed to suspend post: ' + (err.message || 'Unknown error'));
        } finally {
            setSuspendingId(null);
        }
    };

    const handleViewPost = (report) => {
        // Only handle video posts for now 
        if (onViewVideo && report.video) {
            onViewVideo(report.video);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#eab308';
            case 'reviewed': return '#3b82f6';
            case 'resolved': return '#22c55e';
            case 'suspended': return '#dc2626';
            case 'dismissed': return '#6b7280';
            default: return '#eab308';
        }
    };

    return (
        <div className="customer-support-container">
            <div className="customer-support-header">
                <h2>Admin Customer Support Panel</h2>
            </div>

            {/* Post Report Count */}
            <div className="report-count-section">
                <div className="report-count-card">
                    <div className="report-count-header">
                        <div>
                            <div className="report-count-label">Post Report Count</div>
                            <div className="report-count-value">
                                {loading ? "..." : totalCount}
                            </div>
                            {!loading && pendingCount > 0 && (
                                <div className="report-count-pending">
                                    {pendingCount} pending
                                </div>
                            )}
                        </div>
                        <div className="report-filter">
                            <span className="report-filter-label">Filter:</span>
                            <select
                                className="report-filter-select"
                                value={postReportFilter}
                                onChange={(e) => setPostReportFilter(e.target.value)}
                            >
                                {POST_REPORT_FILTERS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Reports List */}
            <div className="reports-list">
                {loading ? (
                    <div className="no-reports">
                        <FiLoader className="spin" size={24} />
                        <span style={{ marginLeft: '8px' }}>Loading reports...</span>
                    </div>
                ) : error ? (
                    <div className="no-reports">
                        {error}
                        <button
                            onClick={fetchReports}
                            style={{
                                marginLeft: '12px',
                                padding: '6px 12px',
                                background: '#22c55e',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'black',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="no-reports">No post reports found</div>
                ) : (
                    reports.map((report) => {
                        const isSuspended = report.status === 'suspended';
                        const isClickable = onViewVideo && report.video && !isSuspended;

                        return (
                        <div key={report.id} className="report-item" style={isSuspended ? { opacity: 0.7 } : {}}>
                            <div
                                className="report-clickable-area"
                                onClick={() => isClickable && handleViewPost(report)}
                                style={{ cursor: isClickable ? 'pointer' : 'default' }}
                            >
                                <div className="report-reporter">
                                    <span className="reporter-name">{report.reporter_username}</span>
                                    <span className="reported-separator">→</span>
                                    <span className="reported-name" style={isSuspended ? { textDecoration: 'line-through', opacity: 0.6 } : {}}>
                                        {report.post_title || (report.video ? `Video #${report.video}` : `Photo #${report.photo_post}`)}
                                    </span>
                                    {report.post_type && (
                                        <span style={{ marginLeft: '6px', opacity: 0.5, fontSize: '11px' }}>
                                            ({report.post_type})
                                        </span>
                                    )}
                                    {isSuspended && (
                                        <span style={{ marginLeft: '8px', color: '#dc2626', fontSize: '11px', fontWeight: '600' }}>
                                            [SUSPENDED]
                                        </span>
                                    )}
                                    {isClickable && <FiExternalLink size={12} style={{ marginLeft: '6px', opacity: 0.5 }} />}
                                </div>
                                <div className="report-video-owner">
                                    by @{report.post_owner_username || report.video_owner_username}
                                </div>
                                <div className="report-note">
                                    {report.reason_display}{report.note ? `: ${report.note}` : ''}
                                </div>
                            </div>
                            <div className="report-footer">
                                <div className="report-date">
                                    {formatDate(report.created_at)}
                                </div>
                                <div className="report-actions">
                                    {!isSuspended && (
                                    <button
                                        onClick={() => openSuspendModal(report)}
                                        disabled={suspendingId === report.id}
                                        style={{
                                            background: '#dc2626',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: 'white',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            cursor: suspendingId === report.id ? 'wait' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            marginRight: '8px',
                                        }}
                                    >
                                        <FiAlertOctagon size={14} />
                                        Suspend Post
                                    </button>
                                    )}
                                    <select
                                        value={report.status}
                                        onChange={(e) => handleStatusChange(report.id, e.target.value)}
                                        disabled={updatingId === report.id}
                                        style={{
                                            background: '#2a2a2a',
                                            border: `1px solid ${getStatusColor(report.status)}`,
                                            borderRadius: '6px',
                                            color: getStatusColor(report.status),
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            cursor: updatingId === report.id ? 'wait' : 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        {STATUS_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        );
                    })
                )}
            </div>

            {/* Message Report Count */}
            <div className="report-count-section" style={{ marginTop: '32px' }}>
                <div className="report-count-card">
                    <div className="report-count-header">
                        <div>
                            <div className="report-count-label">Message Report Count</div>
                            <div className="report-count-value">
                                {messageLoading ? "..." : messageTotalCount}
                            </div>
                            {!messageLoading && messagePendingCount > 0 && (
                                <div className="report-count-pending">
                                    {messagePendingCount} pending
                                </div>
                            )}
                        </div>
                        <div className="report-filter">
                            <span className="report-filter-label">Filter:</span>
                            <select
                                className="report-filter-select"
                                value={messageReportFilter}
                                onChange={(e) => setMessageReportFilter(e.target.value)}
                            >
                                {MESSAGE_REPORT_FILTERS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message Reports List */}
            <div className="reports-list">
                {messageLoading ? (
                    <div className="no-reports">
                        <FiLoader className="spin" size={24} />
                        <span style={{ marginLeft: '8px' }}>Loading message reports...</span>
                    </div>
                ) : messageError ? (
                    <div className="no-reports">
                        {messageError}
                        <button
                            onClick={fetchMessageReports}
                            style={{
                                marginLeft: '12px',
                                padding: '6px 12px',
                                background: '#22c55e',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'black',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : messageReports.length === 0 ? (
                    <div className="no-reports">No message reports found</div>
                ) : (
                    messageReports.map((report) => (
                        <div key={report.id} className="report-item">
                            <div className="report-reporter">
                                <span className="reporter-name">{report.reporter_username}</span>
                                <span className="reported-separator">→</span>
                                <span className="reported-name">@{report.reported_username}</span>
                            </div>
                            <div className="report-message-type">
                                {report.message_type === 'dm' ? 'Direct Message' : 'Group Message'}
                            </div>
                            <div className="report-message-content">
                                "{report.message_content}"
                            </div>
                            <div className="report-note">
                                {report.reason_display}{report.note ? `: ${report.note}` : ''}
                            </div>
                            <div className="report-footer">
                                <div className="report-date">
                                    {formatDate(report.created_at)}
                                </div>
                                <div className="report-status-dropdown">
                                    <select
                                        value={report.status}
                                        onChange={(e) => handleMessageStatusChange(report.id, e.target.value)}
                                        disabled={messageUpdatingId === report.id}
                                        style={{
                                            background: '#2a2a2a',
                                            border: `1px solid ${getStatusColor(report.status)}`,
                                            borderRadius: '6px',
                                            color: getStatusColor(report.status),
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            cursor: messageUpdatingId === report.id ? 'wait' : 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        {STATUS_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Suspend Post Modal */}
            {suspendModal.show && (
                <div className="suspend-modal-overlay" onClick={closeSuspendModal}>
                    <div className="suspend-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="suspend-modal-header">
                            <h3>Suspend Post</h3>
                            <button className="suspend-modal-close" onClick={closeSuspendModal}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="suspend-modal-body">
                            <p className="suspend-modal-info">
                                Suspending: <strong>{suspendModal.report?.post_title || (suspendModal.report?.video ? `Video #${suspendModal.report?.video}` : `Photo #${suspendModal.report?.photo_post}`)}</strong>
                                {suspendModal.report?.post_type && <span style={{ marginLeft: '6px', opacity: 0.7 }}>({suspendModal.report?.post_type})</span>}
                                <br />
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>by @{suspendModal.report?.post_owner_username || suspendModal.report?.video_owner_username}</span>
                            </p>
                            <label className="suspend-modal-label">
                                Suspension Reason
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'normal', marginLeft: '8px' }}>
                                    (will be sent to the user)
                                </span>
                            </label>
                            <div className="suspend-reason-options">
                                {SUSPEND_REASON_OPTIONS.map((option) => (
                                    <label key={option.value} className="suspend-reason-option">
                                        <input
                                            type="radio"
                                            name="suspendReason"
                                            value={option.value}
                                            checked={suspendReason === option.value}
                                            onChange={(e) => setSuspendReason(e.target.value)}
                                        />
                                        <span>{option.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="suspend-modal-actions">
                                <button className="suspend-modal-cancel" onClick={closeSuspendModal}>
                                    Cancel
                                </button>
                                <button
                                    className="suspend-modal-confirm"
                                    onClick={handleSuspendPost}
                                    disabled={!suspendReason || suspendingId === suspendModal.report?.id}
                                >
                                    {suspendingId === suspendModal.report?.id ? (
                                        <>
                                            <FiLoader className="spin" size={14} />
                                            Suspending...
                                        </>
                                    ) : (
                                        <>
                                            <FiAlertOctagon size={14} />
                                            Suspend Post
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/layout/BottomNav";
import "../styles/Settings.css";
import { FiArrowLeft, FiCheck, FiCreditCard } from "react-icons/fi";
import { SettingsLayout } from "../components/layout/SettingsLayout";
import { authAPI, paymentsAPI } from "../services/api";

export default function Subscription({ onNavigateToMainProfile, onNavigate }) {
    const { user, checkAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);

    // Define subscription plans
    const SUBSCRIPTIONS = {
        talent: {
            name: "Talent Subscription",
            price: "$10.99 CAD",
            pricePerMonth: 10.99,
        },
        agency_tier1: {
            name: "Agency Subscription - Tier 1",
            price: "$39.99 CAD",
            pricePerMonth: 39.99,
        },
        agency_tier2: {
            name: "Agency Subscription - Tier 2",
            price: "$69.99 CAD",
            pricePerMonth: 69.99,
        }
    };

    // Load subscription status on mount
    useEffect(() => {
        if (!isUser && user) {
            loadSubscriptionStatus();
        }
    }, [user]);

    const loadSubscriptionStatus = async () => {
        try {
            const status = await paymentsAPI.getSubscriptionStatus();
            setSubscriptionStatus(status);
        } catch (err) {
            console.error('Failed to load subscription status:', err);
        }
    };

    const handleUpgrade = async (accountType, agencyTier = null) => {
        if (loading) return;
        
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await authAPI.upgradeAccount(accountType, agencyTier);
            await checkAuth(); // Refresh user data
            const subscriptionName = accountType === 'agency' 
                ? SUBSCRIPTIONS[`agency_${agencyTier}`].name
                : SUBSCRIPTIONS[accountType].name;
            setSuccess(`Successfully upgraded to ${subscriptionName}! You can now proceed to payment.`);
        } catch (err) {
            setError(err?.message || 'Failed to upgrade account');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (paymentLoading) return;

        setError('');
        setPaymentLoading(true);

        try {
            const response = await paymentsAPI.createCheckoutSession();
            // Redirect to Stripe Checkout
            window.location.href = response.checkout_url;
        } catch (err) {
            setError(err?.message || 'Failed to initiate payment');
            setPaymentLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.')) {
            return;
        }

        setError('');
        setPaymentLoading(true);

        try {
            await paymentsAPI.cancelSubscription();
            setSuccess('Subscription will be canceled at the end of the current billing period.');
            await loadSubscriptionStatus();
        } catch (err) {
            setError(err?.message || 'Failed to cancel subscription');
        } finally {
            setPaymentLoading(false);
        }
    };

    const getAccountTypeDisplay = (accountType) => {
        const typeMap = {
            "user": "User",
            "talent": "Talent",
            "agency": "Agency",
            "agency_talent": "Agency Talent",
        };
        return typeMap[accountType] || accountType;
    };

    const getCurrentSubscription = () => {
        if (user?.account_type === 'talent' || user?.account_type === 'agency_talent') {
            return SUBSCRIPTIONS.talent;
        } else if (user?.account_type === 'agency') {
            const tier = user?.agency_tier || 'tier1';
            return SUBSCRIPTIONS[`agency_${tier}`];
        }
        return null;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return '#6bff6b';
            case 'past_due':
                return '#ffa500';
            case 'canceled':
            case 'unpaid':
                return '#ff6b6b';
            default:
                return '#999';
        }
    };

    const getStatusDisplay = (status) => {
        if (!status) return 'No active subscription';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    };

    const currentSubscription = getCurrentSubscription();
    const isUser = user?.account_type === 'user';
    const hasActiveSubscription = user?.subscription_status === 'active';

    return (
        <div className="appShell">
            <SettingsLayout onNavigateToMainProfile={onNavigateToMainProfile}>
                <div className="settings-header">
                    <h1>Subscription</h1>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div style={{ 
                        backgroundColor: '#442222', 
                        color: '#ff6b6b',
                        padding: '12px', 
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ 
                        backgroundColor: '#224422', 
                        color: '#6bff6b',
                        padding: '12px', 
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        {success}
                    </div>
                )}

                {/* User Account - Show Subscription Options */}
                {isUser && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Choose Your Subscription</h2>
                        <p style={{ color: '#999', marginBottom: '20px', fontSize: '14px' }}>
                            Upgrade your account to access premium features
                        </p>

                        {/* Talent Subscription Option */}
                        <div style={{
                            backgroundColor: '#2a2a2a',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '16px',
                            border: '1px solid #3a3a3a',
                        }}>
                            <div style={{ marginBottom: '12px' }}>
                                <h3 style={{ 
                                    color: '#e0e0e0', 
                                    fontSize: '18px', 
                                    marginBottom: '4px',
                                    fontWeight: '600'
                                }}>
                                    {SUBSCRIPTIONS.talent.name}
                                </h3>
                                <p style={{ 
                                    color: '#007bff', 
                                    fontSize: '24px', 
                                    fontWeight: 'bold',
                                    marginBottom: '8px'
                                }}>
                                    {SUBSCRIPTIONS.talent.price}
                                    <span style={{ fontSize: '14px', color: '#999' }}> / month</span>
                                </p>
                            </div>
                            <button
                                onClick={() => handleUpgrade('talent')}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: loading ? '#555' : '#007bff',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) e.target.style.backgroundColor = '#0056b3';
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) e.target.style.backgroundColor = '#007bff';
                                }}
                            >
                                {loading ? 'Processing...' : 'Select Talent Subscription'}
                            </button>
                        </div>

                        {/* Agency Subscription Tier 1 Option */}
                        <div style={{
                            backgroundColor: '#2a2a2a',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '16px',
                            border: '1px solid #3a3a3a',
                        }}>
                            <div style={{ marginBottom: '12px' }}>
                                <h3 style={{ 
                                    color: '#e0e0e0', 
                                    fontSize: '18px', 
                                    marginBottom: '4px',
                                    fontWeight: '600'
                                }}>
                                    {SUBSCRIPTIONS.agency_tier1.name}
                                </h3>
                                <p style={{ 
                                    color: '#007bff', 
                                    fontSize: '24px', 
                                    fontWeight: 'bold',
                                    marginBottom: '8px'
                                }}>
                                    {SUBSCRIPTIONS.agency_tier1.price}
                                    <span style={{ fontSize: '14px', color: '#999' }}> / month</span>
                                </p>
                            </div>
                            <button
                                onClick={() => handleUpgrade('agency', 'tier1')}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: loading ? '#555' : '#007bff',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) e.target.style.backgroundColor = '#0056b3';
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) e.target.style.backgroundColor = '#007bff';
                                }}
                            >
                                {loading ? 'Processing...' : 'Select Agency Tier 1'}
                            </button>
                        </div>

                        {/* Agency Subscription Tier 2 Option */}
                        <div style={{
                            backgroundColor: '#2a2a2a',
                            borderRadius: '12px',
                            padding: '20px',
                            border: '1px solid #3a3a3a',
                        }}>
                            <div style={{ marginBottom: '12px' }}>
                                <h3 style={{ 
                                    color: '#e0e0e0', 
                                    fontSize: '18px', 
                                    marginBottom: '4px',
                                    fontWeight: '600'
                                }}>
                                    {SUBSCRIPTIONS.agency_tier2.name}
                                </h3>
                                <p style={{ 
                                    color: '#28a745', 
                                    fontSize: '24px', 
                                    fontWeight: 'bold',
                                    marginBottom: '8px'
                                }}>
                                    {SUBSCRIPTIONS.agency_tier2.price}
                                    <span style={{ fontSize: '14px', color: '#999' }}> / month</span>
                                </p>
                            </div>
                            <button
                                onClick={() => handleUpgrade('agency', 'tier2')}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: loading ? '#555' : '#28a745',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) e.target.style.backgroundColor = '#218838';
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) e.target.style.backgroundColor = '#28a745';
                                }}
                            >
                                {loading ? 'Processing...' : 'Select Agency Tier 2'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Non-User Account - Show Current Subscription */}
                {!isUser && currentSubscription && (
                    <>
                        <div className="settings-section">
                            <h2 className="settings-section-title">Current Subscription</h2>
                            
                            <div style={{
                                backgroundColor: '#2a2a2a',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '2px solid #007bff',
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    marginBottom: '12px',
                                    gap: '8px'
                                }}>
                                    <FiCheck size={24} color="#6bff6b" />
                                    <h3 style={{ 
                                        color: '#e0e0e0', 
                                        fontSize: '18px', 
                                        fontWeight: '600',
                                        margin: 0
                                    }}>
                                        {currentSubscription.name}
                                    </h3>
                                </div>
                                
                                <p style={{ 
                                    color: '#007bff', 
                                    fontSize: '28px', 
                                    fontWeight: 'bold',
                                    marginBottom: '4px'
                                }}>
                                    {currentSubscription.price}
                                    <span style={{ fontSize: '14px', color: '#999' }}> / month</span>
                                </p>
                                
                                <div style={{ 
                                    color: '#b0b0b0', 
                                    fontSize: '14px',
                                    marginTop: '12px'
                                }}>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Account Type:</strong> {getAccountTypeDisplay(user?.account_type)}
                                    </p>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Status:</strong> <span style={{ color: '#6bff6b' }}>Active</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h2 className="settings-section-title">Payment & Billing</h2>
                            
                            <div style={{
                                backgroundColor: '#2a2a2a',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '1px solid #3a3a3a',
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <div>
                                        <p style={{ 
                                            color: '#b0b0b0', 
                                            fontSize: '14px',
                                            margin: '0 0 4px 0'
                                        }}>
                                            Monthly Amount
                                        </p>
                                        <p style={{ 
                                            color: '#e0e0e0', 
                                            fontSize: '32px', 
                                            fontWeight: 'bold',
                                            margin: 0
                                        }}>
                                            {currentSubscription.price}
                                        </p>
                                    </div>
                                    <FiCreditCard size={40} color="#007bff" />
                                </div>
                                
                                <div style={{ 
                                    color: '#b0b0b0', 
                                    fontSize: '14px',
                                    marginBottom: '16px'
                                }}>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Subscription Status:</strong>{' '}
                                        <span style={{ color: getStatusColor(user?.subscription_status) }}>
                                            {getStatusDisplay(user?.subscription_status)}
                                        </span>
                                    </p>
                                    {user?.subscription_current_period_end && (
                                        <p style={{ margin: '4px 0' }}>
                                            <strong>Next Billing Date:</strong>{' '}
                                            {new Date(user.subscription_current_period_end).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </p>
                                    )}
                                </div>
                                
                                {!hasActiveSubscription ? (
                                    <button
                                        onClick={handlePayment}
                                        disabled={paymentLoading}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: paymentLoading ? '#555' : '#28a745',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!paymentLoading) e.target.style.backgroundColor = '#218838';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!paymentLoading) e.target.style.backgroundColor = '#28a745';
                                        }}
                                    >
                                        {paymentLoading ? 'Processing...' : 'Pay Now with Stripe'}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handlePayment}
                                            disabled={paymentLoading}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: paymentLoading ? '#555' : '#007bff',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                                transition: 'background-color 0.2s',
                                                marginBottom: '12px'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!paymentLoading) e.target.style.backgroundColor = '#0056b3';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!paymentLoading) e.target.style.backgroundColor = '#007bff';
                                            }}
                                        >
                                            {paymentLoading ? 'Processing...' : 'Update Payment Method'}
                                        </button>
                                        
                                        <button
                                            onClick={handleCancelSubscription}
                                            disabled={paymentLoading}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: 'transparent',
                                                color: '#ff6b6b',
                                                border: '1px solid #ff6b6b',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            Cancel Subscription
                                        </button>
                                    </>
                                )}
                                
                                <p style={{ 
                                    color: '#666', 
                                    fontSize: '12px',
                                    marginTop: '12px',
                                    textAlign: 'center'
                                }}>
                                    Powered by Stripe • Secure payment processing
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </SettingsLayout>
            <BottomNav onNavigate={onNavigate} />
        </div>
    );
}

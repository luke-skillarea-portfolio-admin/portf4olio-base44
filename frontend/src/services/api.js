export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for session cookies
  };

  const response = await fetch(url, config);
  
  // Handle 204 No Content responses (no JSON body)
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return { success: true };
  }
  
  const data = await response.json();

  if (!response.ok) {
    // Extract error message from Django REST Framework error format
    let errorMessage = 'Something went wrong';
    
    if (data.message) {
      errorMessage = data.message;
    } else if (data.error) {
      errorMessage = data.error;
    } else if (typeof data === 'object') {
      // Handle DRF serializer errors (can be nested)
      const errorMessages = [];
      for (const key in data) {
        if (Array.isArray(data[key])) {
          errorMessages.push(...data[key]);
        } else if (typeof data[key] === 'string') {
          errorMessages.push(data[key]);
        } else if (typeof data[key] === 'object') {
          // Handle nested errors
          for (const nestedKey in data[key]) {
            if (Array.isArray(data[key][nestedKey])) {
              errorMessages.push(...data[key][nestedKey]);
            }
          }
        }
      }
      if (errorMessages.length > 0) {
        errorMessage = errorMessages.join('. ');
      }
    }
    
    const error = new Error(errorMessage);
    error.data = data;
    throw error;
  }

  return data;
}

// Helper for multipart/form-data requests (do NOT set Content-Type manually)
async function apiRequestMultipart(endpoint, formData, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    method: 'POST',
    ...options,
    body: formData,
    credentials: 'include',
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || 'Something went wrong');
    error.data = data;
    throw error;
  }

  return data;
}

// Auth API functions
export const authAPI = {
  registerUser: async (username, email, password, passwordConfirm) => {
    return apiRequest('/auth/register/user/', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      }),
    });
  },

  registerTalent: async (username, email, password, passwordConfirm) => {
    return apiRequest('/auth/register/talent/', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      }),
    });
  },

  registerAgency: async (username, email, password, passwordConfirm) => {
    return apiRequest('/auth/register/agency/', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      }),
    });
  },

  registerAgencyTalent: async (username, email, password, passwordConfirm, inviteCode) => {
    const body = {
      email,
      password,
      password_confirm: passwordConfirm,
      invite_code: inviteCode,
    };
    
    // Only include username if provided (for agency talent it will be auto-generated)
    if (username) {
      body.username = username;
    }
    
    return apiRequest('/auth/register/agency-talent/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  registerAgencyTalentViaInvite: async (inviteCode, username) => {
    return apiRequest('/auth/register/agency-talent-invite/', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        invite_code: inviteCode,
        username: username,
      }),
    });
  },

  getAgencyInviteLink: async () => {
    return apiRequest('/auth/agency/invite-link/');
  },

  generateAgencyInviteLink: async () => {
    return apiRequest('/auth/agency/invite-link/', {
      method: 'POST',
    });
  },

  getAgencies: async () => {
    return apiRequest('/auth/agencies/');
  },

  login: async (usernameOrEmail, password) => {
    return apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password,
      }),
    });
  },

  loginAdmin: async (usernameOrEmail, password) => {
    return apiRequest('/auth/login/admin/', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password,
      }),
    });
  },

  logout: async () => {
    return apiRequest('/auth/logout/', {
      method: 'POST',
    });
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me/');
  },

  switchAccountType: async () => {
    return apiRequest('/auth/account/switch/', {
      method: 'POST'
    });
  },

  upgradeAccount: async (accountType, agencyTier = null) => {
    const body = { account_type: accountType };
    if (agencyTier) {
      body.agency_tier = agencyTier;
    }
    return apiRequest('/auth/account/upgrade/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  linkAccount: async (usernameOrEmail, password) => {
    return apiRequest('/auth/link-account/', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password: password,
      }),
    });
  },

  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return apiRequestMultipart('/auth/profile-picture/upload/', formData);
  },
};

// Payment API functions
export const paymentsAPI = {
  createCheckoutSession: async () => {
    return apiRequest('/auth/payments/create-checkout-session/', {
      method: 'POST',
    });
  },

  cancelSubscription: async () => {
    return apiRequest('/auth/payments/cancel-subscription/', {
      method: 'POST',
    });
  },

  getSubscriptionStatus: async () => {
    return apiRequest('/auth/payments/subscription-status/', {
      method: 'GET',
    });
  },
};

// Users API functions
export const usersAPI = {
  getUserProfile: async (username) => {
    return apiRequest(`/auth/profile/${username}/`);
  },

  getUserSubfolders: async (username) => {
    // For now, we'll extract from profile, but this should ideally be a separate endpoint
    const profile = await apiRequest(`/auth/profile/${username}/`);
    
    // Get all posts to find subfolders that have content
    const allVideos = profile.profile?.videos || [];
    const allPhotos = profile.profile?.photo_posts || [];
    const publicVideos = allVideos.filter(v => v.privacy === 'public');
    const publicPhotos = allPhotos.filter(p => p.privacy === 'public');
    
    // Extract all unique subfolders from posts (this will miss empty ones)
    const subfolderMap = new Map();
    
    // Process videos
    publicVideos.forEach(video => {
      if (video.subfolder && video.subfolder_name) {
        if (!subfolderMap.has(video.subfolder)) {
          subfolderMap.set(video.subfolder, {
            id: video.subfolder,
            name: video.subfolder_name,
            privacy_type: 'public',
            video_count: 0,
            photo_post_count: 0
          });
        }
        subfolderMap.get(video.subfolder).video_count++;
      }
    });
    
    // Process photos
    publicPhotos.forEach(photo => {
      if (photo.subfolder && photo.subfolder_name) {
        if (!subfolderMap.has(photo.subfolder)) {
          subfolderMap.set(photo.subfolder, {
            id: photo.subfolder,
            name: photo.subfolder_name,
            privacy_type: 'public',
            video_count: 0,
            photo_post_count: 0
          });
        }
        subfolderMap.get(photo.subfolder).photo_post_count++;
      }
    });
    
    return Array.from(subfolderMap.values());
  },

  getUserContent: async (username) => {
    const profile = await apiRequest(`/auth/profile/${username}/`);
    
    // Get all posts
    const allVideos = profile.profile?.videos || [];
    const allPhotos = profile.profile?.photo_posts || [];
    
    // Filter for public content
    const publicVideos = allVideos.filter(v => v.privacy === 'public');
    const publicPhotos = allPhotos.filter(p => p.privacy === 'public');
    
    // Use the public_subfolders data from backend
    const subfolders = profile.profile?.public_subfolders || [];
    
    // For the "Default" folder, we want videos/photos that are NOT in subfolders
    const defaultVideos = publicVideos.filter(v => !v.subfolder);
    const defaultPhotos = publicPhotos.filter(p => !p.subfolder);
    
    return {
      profile: profile.profile,
      content: {
        public: {
          videos: defaultVideos,
          photo_posts: defaultPhotos,
          subfolders: subfolders
        }
      }
    };
  },
};

// Privacy Settings API functions
export const privacyAPI = {
  getPrivacySettings: async () => {
    return apiRequest('/auth/privacy/');
  },

  updatePrivacySettings: async (privacySetting) => {
    return apiRequest('/auth/privacy/update/', {
      method: 'PATCH',
      body: JSON.stringify({ privacy_setting: privacySetting }),
    });
  },
};

// Messages API functions
export const messagesAPI = {
  getConversations: async () => {
    return apiRequest('/auth/messages/conversations/');
  },

  createOrGetConversation: async (participantId) => {
    return apiRequest('/auth/messages/conversations/create/', {
      method: 'POST',
      body: JSON.stringify({
        participant_id: participantId,
      }),
    });
  },

  getConversationMessages: async (conversationId) => {
    return apiRequest(`/auth/messages/conversations/${conversationId}/messages/`);
  },

  sendMessage: async (conversationId, content, attachmentType = 'none', attachmentUrl = null, replyTo = null) => {
    return apiRequest(`/auth/messages/conversations/${conversationId}/send/`, {
      method: 'POST',
      body: JSON.stringify({
        content: content,
        attachment_type: attachmentType,
        attachment_url: attachmentUrl,
        reply_to: replyTo,
      }),
    });
  },

  // Upload attachment (photo/video) for messages
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequestMultipart('/auth/messages/upload-attachment/', formData);
  },

  markMessageRead: async (messageId) => {
    return apiRequest(`/auth/messages/messages/${messageId}/read/`, {
      method: 'PATCH',
    });
  },

  getUsers: async () => {
    return apiRequest('/auth/users/');
  },
};

// Videos API functions
export const videosAPI = {
  uploadVideo: async (file, folderId = null, description = '') => {
    const formData = new FormData();
    formData.append('video', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    formData.append('description', description);
    return apiRequestMultipart('/auth/videos/upload/', formData);
  },

  getFeedVideos: async () => {
    return apiRequest('/auth/videos/feed/');
  },

  getMyVideos: async () => {
    return apiRequest('/auth/videos/my/');
  },

  // Get download URL with watermark
  getDownloadUrl: (videoId) => {
    return `${API_BASE_URL}/auth/videos/${videoId}/download/`;
  },

  // Delete a video (owner only)
  deleteVideo: async (videoId) => {
    const url = `/auth/videos/${videoId}/`;
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      let msg = 'Failed to delete video';
      try {
        const data = await response.json();
        msg = data?.error || data?.message || msg;
      } catch { /* ignore */ }
      const err = new Error(msg);
      throw err;
    }
    return true;
  },

  // Move video to different privacy section or subfolder
  moveVideo: async (videoId, privacy, subfolderId = null) => {
    return apiRequest(`/auth/videos/${videoId}/move/`, {
      method: 'POST',
      body: JSON.stringify({ privacy, subfolder_id: subfolderId }),
    });
  },

  // Update video 
  updateVideo: async (videoId, { folderId, privacy }) => {
    const data = {};
    if (folderId !== undefined) data.folder_id = folderId;
    if (privacy !== undefined) data.privacy = privacy;
    return apiRequest(`/auth/videos/${videoId}/move/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Toggle video privacy
  togglePrivacy: async (videoId, privacy) => {
    return apiRequest(`/auth/videos/${videoId}/privacy/`, {
      method: 'POST',
      body: JSON.stringify({ privacy }),
    });
  },
};

// Content Organization API 
export const contentAPI = {
  getMyContent: async () => {
    return apiRequest('/auth/content/');
  },

  // Subfolder management
  createSubfolder: async (name, privacyType, description = '') => {
    return apiRequest('/auth/subfolders/create/', {
      method: 'POST',
      body: JSON.stringify({ name, privacy_type: privacyType, description }),
    });
  },

  getSubfolderDetail: async (subfolderId) => {
    return apiRequest(`/auth/subfolders/${subfolderId}/`);
  },

  updateSubfolder: async (subfolderId, updates) => {
    return apiRequest(`/auth/subfolders/${subfolderId}/update/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteSubfolder: async (subfolderId, deleteContents = false) => {
    return apiRequest(`/auth/subfolders/${subfolderId}/delete/`, {
      method: 'DELETE',
      body: JSON.stringify({ delete_contents: deleteContents }),
    });
  },

  // Move photo post to different privacy section or subfolder
  movePhotoPost: async (postId, privacy, subfolderId = null) => {
    return apiRequest(`/auth/photos/posts/${postId}/move/`, {
      method: 'POST',
      body: JSON.stringify({ privacy, subfolder_id: subfolderId }),
    });
  },

  // Subfolder access management (for private subfolders)
  grantSubfolderAccess: async (subfolderId, userId) => {
    return apiRequest('/auth/subfolders/access/grant/', {
      method: 'POST',
      body: JSON.stringify({ subfolder_id: subfolderId, user_id: userId }),
    });
  },

  getSubfolderAccessList: async (subfolderId) => {
    return apiRequest(`/auth/subfolders/${subfolderId}/access/`);
  },

  revokeSubfolderAccess: async (subfolderId, userId) => {
    return apiRequest(`/auth/subfolders/${subfolderId}/access/${userId}/`, {
      method: 'DELETE',
    });
  },

  requestSubfolderAccess: async (subfolderId, message = '') => {
    return apiRequest('/auth/subfolders/access/request/', {
      method: 'POST',
      body: JSON.stringify({ subfolder_id: subfolderId, message }),
    });
  },

  getMyAccessRequests: async () => {
    return apiRequest('/auth/subfolders/access/requests/');
  },

  respondToAccessRequest: async (requestId, action) => {
    return apiRequest(`/auth/subfolders/access/requests/${requestId}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },
};

// Private Folder Access API 
export const privateFolderAPI = {
  getInviteLink: async () => {
    return apiRequest('/auth/private-folder/invite-link/');
  },

  // Generate a new invite link
  generateInviteLink: async () => {
    return apiRequest('/auth/private-folder/invite-link/', {
      method: 'POST',
    });
  },

  requestAccess: async (inviteCode, message = '') => {
    return apiRequest('/auth/private-folder/request-access/', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode, message }),
    });
  },

  getAccessRequests: async () => {
    return apiRequest('/auth/private-folder/access-requests/');
  },

  respondToRequest: async (requestId, action) => {
    return apiRequest(`/auth/private-folder/access-requests/${requestId}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  // Get list of users who have access
  getAccessList: async () => {
    return apiRequest('/auth/private-folder/access-list/');
  },

  // Revoke a user's access
  revokeAccess: async (userId) => {
    return apiRequest(`/auth/private-folder/revoke/${userId}/`, {
      method: 'DELETE',
    });
  },

  // Check if current user has access to someone's private folder
  checkAccess: async (username) => {
    return apiRequest(`/auth/private-folder/check-access/${username}/`);
  },
};

// Profile Access API (for private profiles)
export const profileAccessAPI = {
  // Request access to view a private profile
  requestAccess: async (username, message = '') => {
    return apiRequest('/auth/profile-access/request/', {
      method: 'POST',
      body: JSON.stringify({ username, message }),
    });
  },

  // Get pending access requests for your profile
  getAccessRequests: async () => {
    return apiRequest('/auth/profile-access/requests/');
  },

  // Approve or deny an access request
  respondToRequest: async (requestId, action) => {
    return apiRequest(`/auth/profile-access/requests/${requestId}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  // Get list of users who have access to your profile
  getAccessList: async () => {
    return apiRequest('/auth/profile-access/list/');
  },

  // Revoke a user's access to your profile
  revokeAccess: async (userId) => {
    return apiRequest(`/auth/profile-access/revoke/${userId}/`, {
      method: 'DELETE',
    });
  },

  // Check if current user has access to view a profile
  checkAccess: async (username) => {
    return apiRequest(`/auth/profile-access/check/${username}/`);
  },
};

// Photos API functions
export const photosAPI = {
  // Upload multiple images (up to 5)
  uploadPhotos: async (files, folderId = null, description = '') => {
    const formData = new FormData();
    files.slice(0, 5).forEach((file) => formData.append('images', file));
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    formData.append('description', description);
    return apiRequestMultipart('/auth/photos/upload/', formData);
  },
  // Delete a photo post (owner only)
  deletePost: async (postId) => {
    const url = `/auth/photos/posts/${postId}/`;
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      let msg = 'Failed to delete post';
      try {
        const data = await response.json();
        msg = data?.error || data?.message || msg;
      } catch { void 0; }
      const err = new Error(msg);
      throw err;
    }
    return true;
  },

  // Toggle photo post privacy
  togglePrivacy: async (postId, privacy) => {
    return apiRequest(`/auth/photos/posts/${postId}/privacy/`, {
      method: 'POST',
      body: JSON.stringify({ privacy }),
    });
  },
};

// Unified Posts API
export const postsAPI = {
  getFeed: async () => {
    const data = await apiRequest('/auth/posts/feed/');
    return data;
  },
};

// Post Reports API functions
export const postReportsAPI = {
  submitReport: async (postId, postType, reason, note = null) => {
    const body = { reason, note };
    if (postType === 'video') {
      body.video_id = postId;
    } else if (postType === 'photo') {
      body.photo_post_id = postId;
    }
    return apiRequest('/auth/post-reports/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Get all post reports (admin only)
  getAdminReports: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.reporter_type) params.append('reporter_type', filters.reporter_type);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/auth/post-reports/admin/${query}`);
  },

  // Update post report status (admin only)
  updateReportStatus: async (reportId, status) => {
    return apiRequest(`/auth/post-reports/${reportId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// Message Reports API functions
export const messageReportsAPI = {
  // Submit a message report (DM)
  submitReport: async (messageId, reason, note = null) => {
    return apiRequest('/auth/message-reports/', {
      method: 'POST',
      body: JSON.stringify({
        message_id: messageId,
        reason,
        note,
      }),
    });
  },

  // Submit a group message report
  submitGroupReport: async (groupMessageId, reason, note = null) => {
    return apiRequest('/auth/message-reports/', {
      method: 'POST',
      body: JSON.stringify({
        group_message_id: groupMessageId,
        reason,
        note,
      }),
    });
  },

  // Get all message reports (admin only)
  getAdminReports: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.reporter_type) params.append('reporter_type', filters.reporter_type);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/auth/message-reports/admin/${query}`);
  },

  // Update message report status (admin only)
  updateReportStatus: async (reportId, status) => {
    return apiRequest(`/auth/message-reports/${reportId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// Favorites API functions (Videos)
export const favoritesAPI = {
  // Toggle favorite (add or remove)
  toggleFavorite: async (videoId) => {
    return apiRequest('/auth/favorites/toggle/', {
      method: 'POST',
      body: JSON.stringify({ video_id: videoId }),
    });
  },

  // Get user's favorites
  getMyFavorites: async () => {
    return apiRequest('/auth/favorites/my/');
  },

  // Check if video is favorited
  checkFavorite: async (videoId) => {
    return apiRequest(`/auth/favorites/check/${videoId}/`);
  },
};

// Talent Favorites API functions
export const talentFavoritesAPI = {
  // Toggle talent favorite (add or remove)
  toggleFavorite: async (talentId) => {
    return apiRequest('/auth/favorites/talents/toggle/', {
      method: 'POST',
      body: JSON.stringify({ talent_id: talentId }),
    });
  },

  // Get user's favorite talents
  getMyFavorites: async () => {
    return apiRequest('/auth/favorites/talents/my/');
  },

  // Check if talent is favorited
  checkFavorite: async (talentId) => {
    return apiRequest(`/auth/favorites/talents/check/${talentId}/`);
  },
};

// Groups API functions
export const groupsAPI = {
  // Get all groups user is a member of
  getMyGroups: async () => {
    return apiRequest('/auth/groups/');
  },

  // Create a new group
  createGroup: async (name, description = '') => {
    return apiRequest('/auth/groups/create/', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  // Get group details
  getGroupDetail: async (groupId) => {
    return apiRequest(`/auth/groups/${groupId}/`);
  },

  // Get group messages
  getGroupMessages: async (groupId) => {
    return apiRequest(`/auth/groups/${groupId}/messages/`);
  },

  // Send message to group (with optional attachment)
  sendGroupMessage: async (groupId, content, attachmentType = 'none', attachmentUrl = null, replyTo = null) => {
    return apiRequest(`/auth/groups/${groupId}/send/`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        attachment_type: attachmentType,
        attachment_url: attachmentUrl,
        reply_to: replyTo,
      }),
    });
  },

  // Get invite link (admin only)
  getInviteLink: async (groupId) => {
    return apiRequest(`/auth/groups/${groupId}/invite-link/`);
  },

  // Join group by invite code
  joinByInvite: async (inviteCode) => {
    return apiRequest('/auth/groups/join/', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    });
  },

  // Get pending members (admin only)
  getPendingMembers: async (groupId) => {
    return apiRequest(`/auth/groups/${groupId}/pending/`);
  },

  // Admit pending member (admin only)
  admitMember: async (groupId, userId) => {
    return apiRequest(`/auth/groups/${groupId}/admit/${userId}/`, {
      method: 'POST',
    });
  },

  // Remove member (admin only)
  removeMember: async (groupId, userId) => {
    return apiRequest(`/auth/groups/${groupId}/remove/${userId}/`, {
      method: 'DELETE',
    });
  },

  // Make member admin (admin only)
  makeAdmin: async (groupId, userId) => {
    return apiRequest(`/auth/groups/${groupId}/make-admin/${userId}/`, {
      method: 'POST',
    });
  },

  // Leave group
  leaveGroup: async (groupId) => {
    return apiRequest(`/auth/groups/${groupId}/leave/`, {
      method: 'POST',
    });
  },

  // Add members directly (admin only)
  addMembers: async (groupId, userIds) => {
    return apiRequest(`/auth/groups/${groupId}/add-members/`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    });
  },
};

// Admin Analytics API functions
export const adminAnalyticsAPI = {
  getStats: async () => {
    return apiRequest('/auth/admin/analytics/stats/');
  },

  getUsers: async () => {
    return apiRequest('/auth/admin/analytics/users/');
  },

  getTalents: async () => {
    return apiRequest('/auth/admin/analytics/talents/');
  },

  getAgencies: async () => {
    return apiRequest('/auth/admin/analytics/agencies/');
  },

  getSuspendedAccounts: async (type = null) => {
    const query = type ? `?type=${type}` : '';
    return apiRequest(`/auth/admin/analytics/suspended/${query}`);
  },

  getSuspendedPosts: async (type = null) => {
    const query = type ? `?type=${type}` : '';
    return apiRequest(`/auth/admin/analytics/suspended-posts/${query}`);
  },

  getNotifications: async () => {
    return apiRequest('/auth/admin/analytics/notifications/');
  },
};

// User Notifications API functions
export const notificationsAPI = {
  getNotifications: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.is_read !== undefined) params.append('is_read', filters.is_read);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest(`/auth/notifications/${query}`);
  },

  getNotification: async (notificationId) => {
    return apiRequest(`/auth/notifications/${notificationId}/`);
  },

  markAsRead: async (notificationId) => {
    return apiRequest(`/auth/notifications/${notificationId}/read/`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async () => {
    return apiRequest('/auth/notifications/read-all/', {
      method: 'POST',
    });
  },

  deleteNotification: async (notificationId) => {
    return apiRequest(`/auth/notifications/${notificationId}/delete/`, {
      method: 'DELETE',
    });
  },

  clearAll: async () => {
    return apiRequest('/auth/notifications/clear-all/', {
      method: 'DELETE',
    });
  },
};

// Admin Post Suspension API
export const adminPostsAPI = {
  suspendPost: async (postType, postId, reason) => {
    return apiRequest('/auth/admin/posts/suspend/', {
      method: 'POST',
      body: JSON.stringify({
        post_type: postType,
        post_id: postId,
        reason,
      }),
    });
  },

  unsuspendPost: async (postType, postId) => {
    return apiRequest('/auth/admin/posts/unsuspend/', {
      method: 'POST',
      body: JSON.stringify({
        post_type: postType,
        post_id: postId,
      }),
    });
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    return apiRequest('/auth/admin/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
  },

  suspendAccount: async (userId, reason) => {
    return apiRequest('/auth/admin/accounts/suspend/', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        reason,
      }),
    });
  },

  unsuspendAccount: async (userId) => {
    return apiRequest('/auth/admin/accounts/unsuspend/', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
      }),
    });
  },
};

// Settings API for invite codes and other settings
export const settingsAPI = {
  generateInviteCode: async () => {
    return apiRequest('/auth/agency/invite-link/', {
      method: 'POST',
      requireAuth: true,
    });
  },

  getInviteCode: async () => {
    return apiRequest('/auth/agency/invite-link/', {
      method: 'GET',
      requireAuth: true,
    });
  },
};

// --- Folder Management API ---
export const foldersAPI = {
  // Get all folders for current user
  getFolders: async () => {
    return apiRequest('/auth/folders/');
  },

  // Create a new folder or subfolder
  createFolder: async (name, parentId = null, privacy = 'public') => {
    const data = { name, privacy };
    if (parentId) {
      data.parent_id = parentId;
    }
    return apiRequest('/auth/folders/create/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update folder name
  updateFolder: async (folderId, name) => {
    return apiRequest(`/auth/folders/${folderId}/update/`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  // Update folder privacy
  updateFolderPrivacy: async (folderId, privacy) => {
    return apiRequest(`/auth/folders/${folderId}/privacy/`, {
      method: 'PATCH',
      body: JSON.stringify({ privacy }),
    });
  },

  // Update subfolder privacy
  updateSubfolderPrivacy: async (subfolderId, privacy) => {
    return apiRequest(`/auth/subfolders/${subfolderId}/privacy/`, {
      method: 'PATCH',
      body: JSON.stringify({ privacy }),
    });
  },

  // Delete a folder
  deleteFolder: async (folderId) => {
    const response = await fetch(`${API_BASE_URL}/auth/folders/${folderId}/delete/`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      let msg = 'Failed to delete folder';
      try {
        const data = await response.json();
        msg = data?.error || data?.message || msg;
      } catch { void 0; }
      throw new Error(msg);
    }
    return true;
  },
};

// Search API functions
export const searchAPI = {
  searchAccounts: async (query, limit = 20) => {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    return apiRequest(`/auth/search/accounts/?${params.toString()}`);
  },

  searchPosts: async (query, type = 'all', limit = 20) => {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('type', type);
    params.append('limit', limit.toString());
    return apiRequest(`/auth/search/posts/?${params.toString()}`);
  },
};

// Agency Talent Management API
export const agencyAPI = {
  getAgencyTalents: async () => {
    return apiRequest('/auth/agency/talents/');
  },

  getTalentContent: async (talentId) => {
    return apiRequest(`/auth/agency/talents/${talentId}/content/`);
  },

  updateTalentPrivacy: async (talentId, privacySetting) => {
    return apiRequest(`/auth/agency/talents/${talentId}/privacy/`, {
      method: 'POST',
      body: JSON.stringify({ privacy_setting: privacySetting }),
    });
  },

  updateTalentSubfolderPrivacy: async (talentId, subfolderId, privacyType) => {
    return apiRequest(`/auth/agency/talents/${talentId}/subfolders/${subfolderId}/privacy/`, {
      method: 'POST',
      body: JSON.stringify({ privacy_type: privacyType }),
    });
  },
};

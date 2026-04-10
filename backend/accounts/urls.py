from django.urls import path
from . import views

from .views import VideoUploadView, MessageAttachmentUploadView, ProfilePictureUploadView, user_videos_view, feed_videos_view, video_stream_view, delete_video_view, toggle_video_privacy_view, toggle_photo_privacy_view
from .views import submit_post_report_view, admin_post_reports_view, update_post_report_status_view
from .views import submit_message_report_view, admin_message_reports_view, update_message_report_status_view
from .views import toggle_favorite_view, my_favorites_view, check_favorite_view
from .views import toggle_talent_favorite_view, my_favorite_talents_view, check_talent_favorite_view
from .views import download_video_with_watermark
from .views import (
    my_groups_view, create_group_view, group_detail_view, group_messages_view,
    send_group_message_view, get_group_invite_link_view, join_group_by_invite_view,
    pending_members_view, admit_member_view, remove_member_view, make_admin_view, leave_group_view,
    add_members_to_group_view
)
from .views import PhotoUploadView, posts_feed_view, delete_photo_post_view
from .views import get_privacy_settings_view, update_privacy_settings_view
# Content organization imports
from .views import (
    my_content_view, create_subfolder_view, subfolder_detail_view, update_subfolder_view, delete_subfolder_view,
    move_video_view, move_photo_post_view,
    grant_subfolder_access_view, revoke_subfolder_access_view, subfolder_access_list_view,
    request_subfolder_access_view, my_subfolder_access_requests_view, respond_to_subfolder_access_request_view,
    # Private folder access
    private_folder_invite_link_view, request_private_folder_access_view,
    my_private_folder_access_requests_view, respond_to_private_folder_access_request_view,
    private_folder_access_list_view, revoke_private_folder_access_view, check_private_folder_access_view,
    # Profile access
    request_profile_access_view, my_profile_access_requests_view, respond_to_profile_access_request_view,
    profile_access_list_view, revoke_profile_access_view, check_profile_access_view
)
# Admin analytics imports
from .views import (
    admin_analytics_stats_view, admin_users_list_view, admin_talents_list_view,
    admin_agencies_list_view, admin_suspended_accounts_view, admin_suspended_posts_view, admin_recent_signups_view
)
# User notifications imports
from .views import (
    user_notifications_view, notification_detail_view, mark_notification_read_view,
    mark_all_notifications_read_view, delete_notification_view, clear_all_notifications_view
)
# Admin post suspension imports
from .views import admin_suspend_post_view, admin_unsuspend_post_view
# Admin account suspension imports
from .views import admin_suspend_account_view, admin_unsuspend_account_view
# Admin password change
from .views import admin_change_password_view
# Folder management imports
from .views import FolderListView, FolderCreateView, FolderUpdateView, FolderDeleteView
# Search imports
from .views import search_accounts_view, search_posts_view
# Agency talent management imports
from .views import (
    agency_talents_list_view, agency_talent_content_view,
    agency_update_talent_privacy_view, agency_update_talent_subfolder_privacy_view,
    agency_create_talent_subfolder_view
)

urlpatterns = [
    path('register/user/', views.register_user_view, name='register_user'),
    path('register/talent/', views.register_talent_view, name='register_talent'),
    path('register/agency/', views.register_agency_view, name='register_agency'),
    path('register/agency-talent/', views.register_agency_talent_view, name='register_agency_talent'),
    path('register/agency-talent-invite/', views.register_agency_talent_invite_view, name='register_agency_talent_invite'),
    path('agencies/', views.agencies_list_view, name='agencies_list'),
    path('agency/invite-link/', views.agency_invite_link_view, name='agency_invite_link'),
    path('link-account/', views.link_account_view, name='link_account'),
    path('users/', views.users_list_view, name='users_list'),
    path('account/switch/', views.switch_account_type_view, name='switch_account_type'),
    path('account/upgrade/', views.upgrade_account_view, name='upgrade_account'),
    path('login/', views.login_view, name='login'),
    path('login/admin/', views.login_admin_view, name='login_admin'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.current_user_view, name='current_user'),
    path('profile/<str:username>/', views.user_profile_view, name='user_profile'),
    path('profile-picture/upload/', ProfilePictureUploadView.as_view(), name='upload_profile_picture'),
    # Privacy settings endpoints
    path('privacy/', get_privacy_settings_view, name='get_privacy_settings'),
    path('privacy/update/', update_privacy_settings_view, name='update_privacy_settings'),
    # Messaging endpoints
    path('messages/conversations/', views.conversations_list_view, name='conversations_list'),
    path('messages/conversations/create/', views.create_or_get_conversation_view, name='create_conversation'),
    path('messages/conversations/<int:conversation_id>/messages/', views.conversation_messages_view, name='conversation_messages'),
    path('messages/conversations/<int:conversation_id>/send/', views.send_message_view, name='send_message'),
    path('messages/messages/<int:message_id>/read/', views.mark_message_read_view, name='mark_message_read'),
    path('messages/upload-attachment/', MessageAttachmentUploadView.as_view(), name='upload_message_attachment'),

    # Video endpoints
    path('videos/upload/', VideoUploadView.as_view(), name='video_upload'),
    path('videos/my/', user_videos_view, name='user_videos'),
    path('videos/feed/', feed_videos_view, name='feed_videos'),
    path('videos/<int:video_id>/stream/', video_stream_view, name='video_stream'),
    path('videos/<int:video_id>/', delete_video_view, name='delete_video'),
    path('videos/<int:video_id>/privacy/', views.toggle_video_privacy_view, name='toggle_video_privacy'),
    # Content organization endpoints (simplified: public/private sections with optional subfolders)
    path('content/', my_content_view, name='my_content'),
    # Subfolder endpoints
    path('subfolders/create/', create_subfolder_view, name='create_subfolder'),
    path('subfolders/<int:subfolder_id>/', subfolder_detail_view, name='subfolder_detail'),
    path('subfolders/<int:subfolder_id>/update/', update_subfolder_view, name='update_subfolder'),
    path('subfolders/<int:subfolder_id>/delete/', delete_subfolder_view, name='delete_subfolder'),
    path('videos/<int:video_id>/move/', move_video_view, name='move_video'),
    path('photos/posts/<int:post_id>/move/', move_photo_post_view, name='move_photo_post'),
    path('subfolders/access/grant/', grant_subfolder_access_view, name='grant_subfolder_access'),
    path('subfolders/<int:subfolder_id>/access/', subfolder_access_list_view, name='subfolder_access_list'),
    path('subfolders/<int:subfolder_id>/access/<int:user_id>/', revoke_subfolder_access_view, name='revoke_subfolder_access'),
    path('subfolders/access/request/', request_subfolder_access_view, name='request_subfolder_access'),
    path('subfolders/access/requests/', my_subfolder_access_requests_view, name='my_subfolder_access_requests'),
    path('subfolders/access/requests/<int:request_id>/respond/', respond_to_subfolder_access_request_view, name='respond_to_subfolder_access_request'),
    path('private-folder/invite-link/', private_folder_invite_link_view, name='private_folder_invite_link'),
    path('private-folder/request-access/', request_private_folder_access_view, name='request_private_folder_access'),
    path('private-folder/access-requests/', my_private_folder_access_requests_view, name='my_private_folder_access_requests'),
    path('private-folder/access-requests/<int:request_id>/respond/', respond_to_private_folder_access_request_view, name='respond_to_private_folder_access_request'),
    path('private-folder/access-list/', private_folder_access_list_view, name='private_folder_access_list'),
    path('private-folder/revoke/<int:user_id>/', revoke_private_folder_access_view, name='revoke_private_folder_access'),
    path('private-folder/check-access/<str:username>/', check_private_folder_access_view, name='check_private_folder_access'),
    # Profile access endpoints (for private profiles)
    path('profile-access/request/', request_profile_access_view, name='request_profile_access'),
    path('profile-access/requests/', my_profile_access_requests_view, name='my_profile_access_requests'),
    path('profile-access/requests/<int:request_id>/respond/', respond_to_profile_access_request_view, name='respond_to_profile_access_request'),
    path('profile-access/list/', profile_access_list_view, name='profile_access_list'),
    path('profile-access/revoke/<int:user_id>/', revoke_profile_access_view, name='revoke_profile_access'),
    path('profile-access/check/<str:username>/', check_profile_access_view, name='check_profile_access'),
    # Photo endpoints
    path('photos/upload/', PhotoUploadView.as_view(), name='photo_upload'),
    path('photos/posts/<int:post_id>/', delete_photo_post_view, name='delete_photo_post'),
    path('photos/posts/<int:post_id>/privacy/', views.toggle_photo_privacy_view, name='toggle_photo_privacy'),
    # Unified feed
    path('posts/feed/', posts_feed_view, name='posts_feed'),
    # Post Report endpoints
    path('post-reports/', submit_post_report_view, name='submit_post_report'),
    path('post-reports/admin/', admin_post_reports_view, name='admin_post_reports'),
    path('post-reports/<int:report_id>/status/', update_post_report_status_view, name='update_post_report_status'),
    # Message Report endpoints
    path('message-reports/', submit_message_report_view, name='submit_message_report'),
    path('message-reports/admin/', admin_message_reports_view, name='admin_message_reports'),
    path('message-reports/<int:report_id>/status/', update_message_report_status_view, name='update_message_report_status'),
    # Favorite video endpoints
    path('favorites/toggle/', toggle_favorite_view, name='toggle_favorite'),
    path('favorites/my/', my_favorites_view, name='my_favorites'),
    path('favorites/check/<int:video_id>/', check_favorite_view, name='check_favorite'),
    # Favorite talent endpoints
    path('favorites/talents/toggle/', toggle_talent_favorite_view, name='toggle_talent_favorite'),
    path('favorites/talents/my/', my_favorite_talents_view, name='my_favorite_talents'),
    path('favorites/talents/check/<int:talent_id>/', check_talent_favorite_view, name='check_talent_favorite'),
    # Video download with watermark
    path('videos/<int:video_id>/download/', download_video_with_watermark, name='download_video_watermark'),
    # Group messaging endpoints
    path('groups/', my_groups_view, name='my_groups'),
    path('groups/create/', create_group_view, name='create_group'),
    path('groups/join/', join_group_by_invite_view, name='join_group'),
    path('groups/<int:group_id>/', group_detail_view, name='group_detail'),
    path('groups/<int:group_id>/messages/', group_messages_view, name='group_messages'),
    path('groups/<int:group_id>/send/', send_group_message_view, name='send_group_message'),
    path('groups/<int:group_id>/invite-link/', get_group_invite_link_view, name='group_invite_link'),
    path('groups/<int:group_id>/pending/', pending_members_view, name='pending_members'),
    path('groups/<int:group_id>/admit/<int:user_id>/', admit_member_view, name='admit_member'),
    path('groups/<int:group_id>/remove/<int:user_id>/', remove_member_view, name='remove_member'),
    path('groups/<int:group_id>/make-admin/<int:user_id>/', make_admin_view, name='make_admin'),
    path('groups/<int:group_id>/leave/', leave_group_view, name='leave_group'),
    path('groups/<int:group_id>/add-members/', add_members_to_group_view, name='add_members_to_group'),
    # Admin analytics endpoints
    path('admin/analytics/stats/', admin_analytics_stats_view, name='admin_analytics_stats'),
    path('admin/analytics/users/', admin_users_list_view, name='admin_users_list'),
    path('admin/analytics/talents/', admin_talents_list_view, name='admin_talents_list'),
    path('admin/analytics/agencies/', admin_agencies_list_view, name='admin_agencies_list'),
    path('admin/analytics/suspended/', admin_suspended_accounts_view, name='admin_suspended_accounts'),
    path('admin/analytics/suspended-posts/', admin_suspended_posts_view, name='admin_suspended_posts'),
    path('admin/analytics/notifications/', admin_recent_signups_view, name='admin_recent_signups'),
    # User notifications endpoints
    path('notifications/', user_notifications_view, name='user_notifications'),
    path('notifications/<int:notification_id>/', notification_detail_view, name='notification_detail'),
    path('notifications/<int:notification_id>/read/', mark_notification_read_view, name='mark_notification_read'),
    path('notifications/<int:notification_id>/delete/', delete_notification_view, name='delete_notification'),
    path('notifications/read-all/', mark_all_notifications_read_view, name='mark_all_notifications_read'),
    path('notifications/clear-all/', clear_all_notifications_view, name='clear_all_notifications'),
    # Admin post suspension endpoints
    path('admin/posts/suspend/', admin_suspend_post_view, name='admin_suspend_post'),
    path('admin/posts/unsuspend/', admin_unsuspend_post_view, name='admin_unsuspend_post'),
    # Admin account suspension endpoints
    path('admin/accounts/suspend/', admin_suspend_account_view, name='admin_suspend_account'),
    path('admin/accounts/unsuspend/', admin_unsuspend_account_view, name='admin_unsuspend_account'),
    # Admin password change
    path('admin/change-password/', admin_change_password_view, name='admin_change_password'),
    # Folder management endpoints
    path('folders/', FolderListView.as_view(), name='folder_list'),
    path('folders/create/', FolderCreateView.as_view(), name='folder_create'),
    path('folders/<int:folder_id>/update/', FolderUpdateView.as_view(), name='folder_update'),
    path('folders/<int:folder_id>/privacy/', views.update_folder_privacy_view, name='update_folder_privacy'),
    path('folders/<int:folder_id>/delete/', FolderDeleteView.as_view(), name='folder_delete'),
    path('subfolders/<int:subfolder_id>/privacy/', views.update_subfolder_privacy_view, name='update_subfolder_privacy'),
    # Search endpoints
    path('search/accounts/', search_accounts_view, name='search_accounts'),
    path('search/posts/', search_posts_view, name='search_posts'),
    # Agency talent management endpoints
    path('agency/talents/', agency_talents_list_view, name='agency_talents_list'),
    path('agency/talents/<int:talent_id>/content/', agency_talent_content_view, name='agency_talent_content'),
    path('agency/talents/<int:talent_id>/privacy/', agency_update_talent_privacy_view, name='agency_update_talent_privacy'),
    path('agency/talents/<int:talent_id>/subfolders/<int:subfolder_id>/privacy/', agency_update_talent_subfolder_privacy_view, name='agency_update_talent_subfolder_privacy'),
    path('agency/talents/<int:talent_id>/subfolders/create/', agency_create_talent_subfolder_view, name='agency_create_talent_subfolder'),
    # Stripe payment endpoints
    path('payments/create-checkout-session/', views.create_checkout_session_view, name='create_checkout_session'),
    path('payments/cancel-subscription/', views.cancel_subscription_view, name='cancel_subscription'),
    path('payments/subscription-status/', views.get_subscription_status_view, name='get_subscription_status'),
    path('payments/webhook/', views.stripe_webhook_view, name='stripe_webhook'),
]

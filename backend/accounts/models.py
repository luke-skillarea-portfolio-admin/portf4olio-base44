from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError


class User(AbstractUser):
    """User model with account types: user, talent, agency, agency_talent, admin"""
    ACCOUNT_TYPE_CHOICES = [
        ('user', 'User'),
        ('talent', 'Talent'),
        ('agency', 'Agency'),
        ('agency_talent', 'Agency Talent'),
        ('admin', 'Admin'),
    ]

    PRIVACY_CHOICES = [
        ('public', 'Public'),      # Visible to everyone
        ('private', 'Private'),    # Profile private, content requires access
        ('hidden', 'Hidden'),      # Profile not discoverable, but accessible via direct link
    ]

    AGENCY_TIER_CHOICES = [
        ('tier1', 'Tier 1'),  # $39.99/month
        ('tier2', 'Tier 2'),  # $69.99/month
    ]

    email = models.EmailField()  # Remove unique constraint to allow talent + agency_talent per email
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPE_CHOICES,
        default='talent'
    )
    privacy_setting = models.CharField(
        max_length=10,
        choices=PRIVACY_CHOICES,
        default='public'
    )
    # Invite code for private folder access
    private_folder_invite_code = models.CharField(max_length=32, unique=True, blank=True, null=True)
    # Invite code for agency talent registration (only for agency accounts)
    agency_invite_code = models.CharField(max_length=32, unique=True, blank=True, null=True)
    agency = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='agency_talents',
        limit_choices_to={'account_type': 'agency'}
    )
    # Account linking for switching between talent and agency_talent accounts
    linked_account = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_accounts'
    )
    bio = models.TextField(blank=True, default='')
    genre = models.CharField(max_length=100, blank=True, default='')
    profile_picture = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Agency tier (only for agency accounts)
    agency_tier = models.CharField(
        max_length=10,
        choices=AGENCY_TIER_CHOICES,
        null=True,
        blank=True
    )

    # Account type date tracking (when user became talent/agency)
    talent_date = models.DateTimeField(null=True, blank=True)  
    agency_date = models.DateTimeField(null=True, blank=True)  

    # Suspension fields
    is_suspended = models.BooleanField(default=False)
    suspended_date = models.DateTimeField(null=True, blank=True)
    suspension_note = models.TextField(blank=True, null=True)

    # Referral tracking
    referred_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals_made'
    )
    
    # Collaboration count
    collaboration_count = models.PositiveIntegerField(default=0)

    # Stripe fields
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    subscription_status = models.CharField(max_length=50, blank=True, null=True)  # active, past_due, canceled, etc.
    subscription_current_period_end = models.DateTimeField(null=True, blank=True)
    upgraded_at = models.DateTimeField(null=True, blank=True)  # When user upgraded to Talent/Agency via subscription
    
    class Meta:
        db_table = 'users'
        constraints = [
            # Only one admin account allowed
            models.UniqueConstraint(
                fields=['account_type'],
                condition=Q(account_type='admin'),
                name='unique_admin_account_type',
            ),
            # Each email can only have one user account
            models.UniqueConstraint(
                fields=['email'],
                condition=Q(account_type='user'),
                name='unique_email_user',
            ),
            # Each email can only have one agency account
            models.UniqueConstraint(
                fields=['email'],
                condition=Q(account_type='agency'),
                name='unique_email_agency',
            ),
            # Each email can only have one talent account
            models.UniqueConstraint(
                fields=['email'],
                condition=Q(account_type='talent'),
                name='unique_email_talent',
            ),
            # Each email can only have one agency_talent account
            models.UniqueConstraint(
                fields=['email'],
                condition=Q(account_type='agency_talent'),
                name='unique_email_agency_talent',
            ),
            # Username must be unique across all account types
            models.UniqueConstraint(
                fields=['username'],
                name='unique_username',
            ),
        ]
    
    def __str__(self):
        return self.username

    def generate_private_folder_invite_code(self):
        """Generate a unique invite code for private folder access"""
        import secrets
        self.private_folder_invite_code = secrets.token_urlsafe(16)
        self.save(update_fields=['private_folder_invite_code'])
        return self.private_folder_invite_code

    def generate_agency_invite_code(self):
        """Generate a unique invite code for agency talent registration (agencies only)"""
        if self.account_type != 'agency':
            raise ValueError("Only agency accounts can generate agency invite codes")
        import secrets
        self.agency_invite_code = secrets.token_urlsafe(16)
        self.save(update_fields=['agency_invite_code'])
        return self.agency_invite_code

    @classmethod
    def get_agency_from_invite_code(cls, invite_code):
        """Get agency from invite code"""
        try:
            return cls.objects.get(agency_invite_code=invite_code, account_type='agency')
        except cls.DoesNotExist:
            return None

    def get_linked_talent_accounts(self):
        """Get linked talent accounts for the same email (talent + agency_talent)"""
        if self.account_type not in ['talent', 'agency_talent']:
            return User.objects.none()
        
        return User.objects.filter(
            email=self.email,
            account_type__in=['talent', 'agency_talent']
        ).exclude(id=self.id)

    def can_switch_account_type(self):
        """Check if user can switch between talent and agency_talent"""
        if self.account_type not in ['talent', 'agency_talent']:
            return False
        
        # Check if there's a linked account
        return self.linked_account is not None

    def get_switchable_account(self):
        """Get the linked account for switching"""
        if not self.can_switch_account_type():
            return None
            
        return self.linked_account


class PrivateFolderAccess(models.Model):
    """Tracks which users have been granted access to a user's private folder"""
    owner = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='private_folder_access_granted'
    )
    granted_to = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='private_folder_access_received'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'private_folder_access'
        unique_together = ['owner', 'granted_to']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.granted_to.username} has access to {self.owner.username}'s private folder"


class PrivateFolderAccessRequest(models.Model):
    """Tracks access requests from users wanting to view someone's private folder"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    ]

    owner = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='private_folder_access_requests_received'
    )
    requester = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='private_folder_access_requests_sent'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'private_folder_access_requests'
        unique_together = ['owner', 'requester']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.requester.username} requested access to {self.owner.username}'s private folder ({self.status})"


class ProfileAccess(models.Model):
    """Tracks which users have been granted access to view a private profile"""
    profile_owner = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='profile_access_granted'
    )
    granted_to = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='profile_access_received'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profile_access'
        unique_together = ['profile_owner', 'granted_to']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.granted_to.username} can view {self.profile_owner.username}'s profile"


class ProfileAccessRequest(models.Model):
    """Tracks access requests from users wanting to view a private profile"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    ]

    profile_owner = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='profile_access_requests_received'
    )
    requester = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='profile_access_requests_sent'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profile_access_requests'
        unique_together = ['profile_owner', 'requester']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.requester.username} requested access to {self.profile_owner.username}'s profile ({self.status})"


class Conversation(models.Model):
    """Represents a conversation between two users"""
    participant1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_p1'
    )
    participant2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_p2'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'conversations'
        unique_together = ['participant1', 'participant2']
        ordering = ['-updated_at']
    
    def get_other_participant(self, user):
        """Helper to get the other participant"""
        return self.participant2 if self.participant1 == user else self.participant1
    
    def __str__(self):
        return f"Conversation between {self.participant1.username} and {self.participant2.username}"


class Message(models.Model):
    """Individual message within a conversation"""
    MAX_CONTENT_LENGTH = 2000  # Character limit

    ATTACHMENT_TYPE_CHOICES = [
        ('none', 'None'),
        ('photo', 'Photo'),
        ('video', 'Video'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField(max_length=MAX_CONTENT_LENGTH, blank=True, default='')
    attachment_type = models.CharField(
        max_length=10,
        choices=ATTACHMENT_TYPE_CHOICES,
        default='none'
    )
    attachment_url = models.URLField(blank=True, null=True)
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"


class Subfolder(models.Model):
    """Subfolder within a user's public or private section"""
    PRIVACY_CHOICES = [
        ('public', 'Public'),      # Visible to everyone
        ('private', 'Private'),    # Visible only with permission
        ('hidden', 'Hidden'),      # Unlisted, accessible only via direct link
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subfolders')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='public')
    privacy_type = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='public')  # Deprecated, keeping for migration
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subfolders'
        ordering = ['-created_at']
        unique_together = ['user', 'name', 'privacy_type']

    def __str__(self):
        return f"Subfolder '{self.name}' ({self.privacy_type}) by {self.user.username}"

    def can_view(self, viewing_user):
        """Check if a user can view this subfolder and its contents"""
        privacy = self.privacy or self.privacy_type  # Use new privacy field, fallback to old
        if privacy == 'public':
            return True
        if privacy == 'hidden':
            # Hidden folders are accessible if you have the link
            # For now, treat as accessible if you're the owner or have been granted access
            if not viewing_user:
                return False
            if viewing_user == self.user:
                return True
            return SubfolderAccessPermission.objects.filter(subfolder=self, granted_to=viewing_user).exists()
        # Private subfolder
        if not viewing_user:
            return False
        if viewing_user == self.user:
            return True
        # Check if user has been granted access
        return SubfolderAccessPermission.objects.filter(subfolder=self, granted_to=viewing_user).exists()


class Video(models.Model):
    """Video uploaded by a user"""
    PRIVACY_CHOICES = [
        ('public', 'Public'),      # In public folder
        ('private', 'Private'),    # In private folder
        ('hidden', 'Hidden'),      # In hidden folder (not discoverable)
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='videos')
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='public')
    subfolder = models.ForeignKey(Subfolder, on_delete=models.SET_NULL, null=True, blank=True, related_name='videos')
    folder = models.ForeignKey('PostFolder', on_delete=models.SET_NULL, null=True, blank=True, related_name='videos')
    video_url = models.URLField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    duration = models.FloatField(null=True, blank=True)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)

    is_suspended = models.BooleanField(default=False)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'videos'
        ordering = ['-created_at']

    def __str__(self):
        return f"Video by {self.user.username} at {self.created_at}"

    def can_view(self, viewing_user):
        """Check if a user can view this video"""
        if self.subfolder:
            return self.subfolder.can_view(viewing_user)
        if self.privacy == 'public':
            return True
        if not viewing_user:
            return False
        return viewing_user == self.user


class PhotoPost(models.Model):
    """A photo-based post that can contain up to 5 images"""
    PRIVACY_CHOICES = [
        ('public', 'Public'),
        ('private', 'Private'),
        ('hidden', 'Hidden'),      # In hidden folder (not discoverable)
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='photo_posts')
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='public')
    subfolder = models.ForeignKey(Subfolder, on_delete=models.SET_NULL, null=True, blank=True, related_name='photo_posts')
    folder = models.ForeignKey('PostFolder', on_delete=models.SET_NULL, null=True, blank=True, related_name='photo_posts')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Post suspension fields
    is_suspended = models.BooleanField(default=False)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'photo_posts'
        ordering = ['-created_at']

    def __str__(self):
        return f"PhotoPost by {self.user.username} at {self.created_at}"

    def can_view(self, viewing_user):
        """Check if a user can view this post"""
        if self.subfolder:
            return self.subfolder.can_view(viewing_user)
        if self.privacy == 'public':
            return True
        if not viewing_user:
            return False
        return viewing_user == self.user


class Photo(models.Model):
    """Individual photo belonging to a `PhotoPost`."""
    post = models.ForeignKey(PhotoPost, on_delete=models.CASCADE, related_name='photos')
    image_url = models.URLField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'photos'
        ordering = ['order', 'id']

    def clean(self):
        # Enforce max 5 photos per post at validation time if used manually
        if self.post and self.post.photos.count() >= 5 and not self.pk:
            raise ValidationError('A post can contain at most 5 photos.')

    def __str__(self):
        return f"Photo {self.id} for post {self.post_id}"


class PostReport(models.Model):
    """Report submitted by a user against a video or photo post"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
        ('suspended', 'Suspended'),
        ('dismissed', 'Dismissed'),
    ]

    REASON_CHOICES = [
        ('spam', 'Spam or misleading'),
        ('harassment', 'Harassment or bullying'),
        ('inappropriate', 'Inappropriate content'),
        ('violence', 'Violence or dangerous acts'),
        ('copyright', 'Copyright violation'),
        ('other', 'Other'),
    ]

    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='post_reports_submitted'
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='reports',
        null=True,
        blank=True
    )
    photo_post = models.ForeignKey(
        PhotoPost,
        on_delete=models.CASCADE,
        related_name='reports',
        null=True,
        blank=True
    )
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    note = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'post_reports'
        ordering = ['-created_at']

    def __str__(self):
        if self.video:
            return f"Report by {self.reporter.username} on video {self.video.id}"
        elif self.photo_post:
            return f"Report by {self.reporter.username} on photo post {self.photo_post.id}"
        return f"Report by {self.reporter.username}"


class SubfolderAccessPermission(models.Model):
    """Tracks which users have been granted access to private subfolders"""
    subfolder = models.ForeignKey(
        Subfolder,
        on_delete=models.CASCADE,
        related_name='access_permissions'
    )
    granted_to = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subfolder_access_granted'
    )
    granted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subfolder_access_given'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subfolder_access_permissions'
        unique_together = ['subfolder', 'granted_to']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.granted_to.username} has access to subfolder {self.subfolder.name}"


class SubfolderAccessRequest(models.Model):
    """Tracks access requests from users wanting to view private subfolders"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
    ]

    subfolder = models.ForeignKey(
        Subfolder,
        on_delete=models.CASCADE,
        related_name='access_requests'
    )
    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subfolder_access_requests'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subfolder_access_requests'
        unique_together = ['subfolder', 'requester']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.requester.username} requested access to subfolder {self.subfolder.name} ({self.status})"


class FavoriteVideo(models.Model):
    """User's favorited/saved videos"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorite_videos'
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'favorite_videos'
        ordering = ['-created_at']
        unique_together = ['user', 'video']
    
    def __str__(self):
        return f"{self.user.username} favorited video {self.video.id}"


class FavoriteTalent(models.Model):
    """User's favorited/saved talents/profiles"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorite_talents'
    )
    talent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorited_by_users'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorite_talents'
        ordering = ['-created_at']
        unique_together = ['user', 'talent']

    def __str__(self):
        return f"{self.user.username} favorited {self.talent.username}"


class GroupConversation(models.Model):
    """Group chat conversation"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_groups'
    )
    invite_code = models.CharField(max_length=32, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'group_conversations'
        ordering = ['-updated_at']
    
    def generate_invite_code(self):
        import secrets
        self.invite_code = secrets.token_urlsafe(16)
        self.save()
        return self.invite_code
    
    def __str__(self):
        return f"Group: {self.name}"


class GroupMember(models.Model):
    """Membership in a group conversation"""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('pending', 'Pending Approval'),
    ]
    
    group = models.ForeignKey(
        GroupConversation,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='group_memberships'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'group_members'
        unique_together = ['group', 'user']
        ordering = ['joined_at']
    
    def __str__(self):
        return f"{self.user.username} in {self.group.name} ({self.role})"


class GroupMessage(models.Model):
    """Message within a group conversation"""
    MAX_CONTENT_LENGTH = 2000

    ATTACHMENT_TYPE_CHOICES = [
        ('none', 'None'),
        ('photo', 'Photo'),
        ('video', 'Video'),
    ]

    group = models.ForeignKey(
        GroupConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='group_messages_sent'
    )
    content = models.TextField(max_length=MAX_CONTENT_LENGTH, blank=True, default='')
    attachment_type = models.CharField(
        max_length=10,
        choices=ATTACHMENT_TYPE_CHOICES,
        default='none'
    )
    attachment_url = models.URLField(blank=True, null=True)
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'group_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['group', 'created_at']),
        ]

    def __str__(self):
        return f"Group message from {self.sender.username} in {self.group.name}"


class MessageReport(models.Model):
    """Report submitted by a user against a message"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

    REASON_CHOICES = [
        ('inappropriate', 'Inappropriate Message'),
        ('bullying', 'Bullying and Harassment'),
        ('fraudulent', 'Fraudulent Activity'),
        ('impersonation', 'Impersonation'),
    ]

    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_reports_submitted'
    )
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='reports',
        null=True,
        blank=True
    )
    group_message = models.ForeignKey(
        GroupMessage,
        on_delete=models.CASCADE,
        related_name='reports',
        null=True,
        blank=True
    )
    reported_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='message_reports_against'
    )
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    note = models.TextField(blank=True, null=True)
    message_content = models.TextField(blank=True)  # Store message content for reference
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'message_reports'
        ordering = ['-created_at']

    def clean(self):
        if not self.message and not self.group_message:
            raise ValidationError('Either message or group_message must be set.')
        if self.message and self.group_message:
            raise ValidationError('Only one of message or group_message should be set.')

    def __str__(self):
        return f"Message report by {self.reporter.username} against {self.reported_user.username}"


class Collab(models.Model):
    """Collaboration between users"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='collabs_created'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'collabs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Collab: {self.title} by {self.creator.username}"


class CollabParticipant(models.Model):
    """Participant in a collaboration"""
    ROLE_CHOICES = [
        ('creator', 'Creator'),
        ('participant', 'Participant'),
    ]

    collab = models.ForeignKey(
        Collab,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='collab_participations'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'collab_participants'
        unique_together = ['collab', 'user']
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} in collab {self.collab.title}"


class Notification(models.Model):
    """In-app notifications for users"""
    NOTIFICATION_TYPES = [
        ('profile_access_request', 'Profile Access Request'),
        ('profile_access_granted', 'Profile Access Granted'),
        ('profile_access_denied', 'Profile Access Denied'),
        ('folder_access_request', 'Folder Access Request'),
        ('private_folder_access_granted', 'Private Folder Access Granted'),
        ('private_folder_access_denied', 'Private Folder Access Denied'),
        ('group_invite', 'Group Invite'),
        ('group_join_request', 'Group Join Request'),
        ('agency_talent_linked', 'Agency Talent Linked'),
        ('referral_added', 'Referral Added'),
        ('post_suspended', 'Post Suspended'),
        ('new_message', 'New Message'),
        ('new_group_message', 'New Group Message'),
        ('admin_new_talent', 'New Talent Signup'),
        ('admin_new_agency', 'New Agency Signup'),
        ('admin_post_report', 'New Post Report'),
        ('admin_message_report', 'New Message Report'),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    actor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications_sent'
    )
    message = models.TextField()
    # Store related object info for navigation
    related_object_type = models.CharField(max_length=50, null=True, blank=True)
    related_object_id = models.IntegerField(null=True, blank=True)
    extra_data = models.JSONField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.notification_type}"

    @classmethod
    def create_notification(cls, recipient, notification_type, message, actor=None,
                           related_object_type=None, related_object_id=None, extra_data=None):
        """Helper method to create notifications"""
        return cls.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            message=message,
            actor=actor,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            extra_data=extra_data
        )

    @classmethod
    def notify_admins(cls, notification_type, message, actor=None,
                     related_object_type=None, related_object_id=None, extra_data=None):
        """Helper method to create notifications for all admin users"""
        admins = User.objects.filter(account_type='admin')
        notifications = []
        for admin in admins:
            notifications.append(cls.objects.create(
                recipient=admin,
                notification_type=notification_type,
                message=message,
                actor=actor,
                related_object_type=related_object_type,
                related_object_id=related_object_id,
                extra_data=extra_data
            ))
        return notifications


class PostFolder(models.Model):
    """User's custom folder for organizing posts"""
    PRIVACY_CHOICES = [
        ('public', 'Public'),      # Visible to everyone
        ('private', 'Private'),    # Visible only with permission
        ('hidden', 'Hidden'),      # Unlisted, accessible only via direct link
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_folders')
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='public')
    is_default = models.BooleanField(default=False)  # For "Posts", "Videos", "Images" defaults
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'post_folders'
        unique_together = ['user', 'name', 'parent']  # No duplicate names in same parent
        ordering = ['name']
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name
    
    def get_full_path(self):
        """Get the full folder path like 'Posts > Videos'"""
        if self.parent:
            return f"{self.parent.get_full_path()} > {self.name}"
        return self.name
    
    def is_subfolder(self):
        """Check if this is a subfolder (has a parent)"""
        return self.parent is not None
    
    @classmethod
    def create_default_structure(cls, user):
        """Create default folder structure for a new user"""
        # Create root "Posts" folder
        posts_folder = cls.objects.create(
            user=user,
            name="Posts",
            is_default=True
        )
        
        # Create "Videos" subfolder
        cls.objects.create(
            user=user,
            name="Videos",
            parent=posts_folder,
            is_default=True
        )
        
        # Create "Images" subfolder
        cls.objects.create(
            user=user,
            name="Images", 
            parent=posts_folder,
            is_default=True
        )
        
        return posts_folder


# Signal to create default folders for new users
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_default_folders_for_new_user(sender, instance, created, **kwargs):
    """Create default folder structure when a new user is created"""
    if created:
        PostFolder.create_default_structure(instance)
        
# Signal to update User's collaboration_count
@receiver(post_save, sender=Message)
def update_collab_count(sender, instance, created, **kwargs):
    if created and instance.conversation.messages.count() == 1:
        
        conversation = instance.conversation
        
        # Get the Sender OBJECT
        sender_obj = instance.sender 
        
        # Get the Participant OBJECTS
        p1_obj = conversation.participant1
        p2_obj = conversation.participant2
        
        # Compare Objects to find the recipient
        if sender_obj == p1_obj:
            recipient = p2_obj
        else:
            recipient = p1_obj
            
        # Now 'recipient' is a User Object, so we can save it.
        recipient.collaboration_count += 1
        recipient.save(update_fields=['collaboration_count'])
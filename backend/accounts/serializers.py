from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    User, Conversation, Message, Video, PostReport, FavoriteVideo, FavoriteTalent,
    GroupConversation, GroupMember, GroupMessage, PhotoPost, Photo, MessageReport,
    Subfolder, SubfolderAccessPermission, SubfolderAccessRequest,
    PrivateFolderAccess, PrivateFolderAccessRequest, Notification, PostFolder,
    ProfileAccess, ProfileAccessRequest
)


class SubfolderSerializer(serializers.ModelSerializer):
    """Serializer for subfolders"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    video_count = serializers.SerializerMethodField()
    photo_post_count = serializers.SerializerMethodField()
    preview_images = serializers.SerializerMethodField()

    class Meta:
        model = Subfolder
        fields = ['id', 'user', 'user_username', 'name', 'description', 'privacy', 'privacy_type',
                  'video_count', 'photo_post_count', 'preview_images', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_video_count(self, obj):
        return obj.videos.count()

    def get_photo_post_count(self, obj):
        return obj.photo_posts.count()

    def get_preview_images(self, obj):
        """Return up to 3 image URLs for folder tile previews."""
        urls = []
        photo_posts = obj.photo_posts.order_by('-created_at')[:3]
        for post in photo_posts:
            first_photo = post.photos.order_by('order', 'id').first()
            if first_photo and first_photo.image_url:
                urls.append(first_photo.image_url)
        return urls


class SubfolderAccessPermissionSerializer(serializers.ModelSerializer):
    """Serializer for subfolder access permissions"""
    granted_to_username = serializers.CharField(source='granted_to.username', read_only=True)
    granted_by_username = serializers.CharField(source='granted_by.username', read_only=True)
    subfolder_name = serializers.CharField(source='subfolder.name', read_only=True)

    class Meta:
        model = SubfolderAccessPermission
        fields = ['id', 'subfolder', 'subfolder_name', 'granted_to', 'granted_to_username',
                  'granted_by', 'granted_by_username', 'created_at']
        read_only_fields = ['id', 'granted_by', 'created_at']


class SubfolderAccessRequestSerializer(serializers.ModelSerializer):
    """Serializer for subfolder access requests"""
    requester_username = serializers.CharField(source='requester.username', read_only=True)
    subfolder_name = serializers.CharField(source='subfolder.name', read_only=True)
    subfolder_owner = serializers.IntegerField(source='subfolder.user.id', read_only=True)

    class Meta:
        model = SubfolderAccessRequest
        fields = ['id', 'subfolder', 'subfolder_name', 'subfolder_owner', 'requester',
                  'requester_username', 'status', 'message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'requester', 'created_at', 'updated_at']


class PrivateFolderAccessSerializer(serializers.ModelSerializer):
    """Serializer for private folder access permissions"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    granted_to_username = serializers.CharField(source='granted_to.username', read_only=True)

    class Meta:
        model = PrivateFolderAccess
        fields = ['id', 'owner', 'owner_username', 'granted_to', 'granted_to_username', 'created_at']
        read_only_fields = ['id', 'owner', 'created_at']


class PrivateFolderAccessRequestSerializer(serializers.ModelSerializer):
    """Serializer for private folder access requests"""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    requester_username = serializers.CharField(source='requester.username', read_only=True)

    class Meta:
        model = PrivateFolderAccessRequest
        fields = ['id', 'owner', 'owner_username', 'requester', 'requester_username',
                  'status', 'message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner', 'requester', 'created_at', 'updated_at']


class ProfileAccessSerializer(serializers.ModelSerializer):
    """Serializer for profile access permissions"""
    profile_owner_username = serializers.CharField(source='profile_owner.username', read_only=True)
    granted_to_username = serializers.CharField(source='granted_to.username', read_only=True)

    class Meta:
        model = ProfileAccess
        fields = ['id', 'profile_owner', 'profile_owner_username', 'granted_to', 'granted_to_username', 'created_at']
        read_only_fields = ['id', 'profile_owner', 'created_at']


class ProfileAccessRequestSerializer(serializers.ModelSerializer):
    """Serializer for profile access requests"""
    profile_owner_username = serializers.CharField(source='profile_owner.username', read_only=True)
    requester_username = serializers.CharField(source='requester.username', read_only=True)

    class Meta:
        model = ProfileAccessRequest
        fields = ['id', 'profile_owner', 'profile_owner_username', 'requester', 'requester_username',
                  'status', 'message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'profile_owner', 'requester', 'created_at', 'updated_at']


class PostFolderSerializer(serializers.ModelSerializer):
    """Serializer for user post folders"""
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    is_subfolder = serializers.BooleanField(read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    
    class Meta:
        model = PostFolder
        fields = ['id', 'name', 'parent', 'parent_name', 'full_path', 'is_subfolder', 
                  'privacy', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_default']


class VideoSerializer(serializers.ModelSerializer):
    """Serializer for videos"""
    stream_url = serializers.SerializerMethodField()
    user_username = serializers.CharField(source='user.username', read_only=True)
    subfolder_name = serializers.CharField(source='subfolder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.get_full_path', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)

    class Meta:
        model = Video
        fields = ['id', 'user', 'user_username', 'privacy', 'subfolder', 'subfolder_name',
                  'folder', 'folder_name', 'folder_path', 'video_url', 'stream_url', 
                  'description', 'created_at', 'duration', 'width', 'height',
                  'is_suspended', 'suspended_at', 'suspension_reason']
        read_only_fields = ['id', 'user', 'created_at', 'duration', 'width', 'height',
                           'is_suspended', 'suspended_at', 'suspension_reason']

    def get_stream_url(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        return request.build_absolute_uri(f"/api/auth/videos/{obj.id}/stream/")


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = ['id', 'image_url', 'order']
        read_only_fields = ['id']


class PhotoPostSerializer(serializers.ModelSerializer):
    """Serializer for photo posts"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    subfolder_name = serializers.CharField(source='subfolder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.get_full_path', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    images = serializers.SerializerMethodField()

    class Meta:
        model = PhotoPost
        fields = ['id', 'user', 'user_username', 'privacy', 'subfolder', 'subfolder_name',
                  'folder', 'folder_name', 'folder_path', 'description', 'created_at', 'images',
                  'is_suspended', 'suspended_at', 'suspension_reason']
        read_only_fields = ['id', 'user', 'created_at',
                           'is_suspended', 'suspended_at', 'suspension_reason']

    def get_images(self, obj):
        photos = obj.photos.all().order_by('order', 'id')
        return PhotoSerializer(photos, many=True).data

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data"""
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    agency_tier_display = serializers.CharField(source='get_agency_tier_display', read_only=True)
    can_switch_account = serializers.SerializerMethodField()
    switchable_account_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'account_type', 'account_type_display', 'agency_tier', 'agency_tier_display', 'bio', 'genre', 'privacy_setting', 'profile_picture', 'date_joined', 'created_at', 'can_switch_account', 'switchable_account_type', 'stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_current_period_end', 'upgraded_at']
        read_only_fields = ['id', 'date_joined', 'created_at', 'stripe_customer_id', 'stripe_subscription_id', 'subscription_status', 'subscription_current_period_end', 'upgraded_at']

    def get_can_switch_account(self, obj):
        return obj.can_switch_account_type()

    def get_switchable_account_type(self, obj):
        if not obj.can_switch_account_type():
            return None
        other_account = obj.get_switchable_account()
        return other_account.account_type if other_account else None


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile with videos, photo posts and stats"""
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    post_count = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    photo_posts = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'account_type', 'account_type_display', 'bio', 'genre', 'profile_picture', 'post_count', 'videos', 'photo_posts', 'date_joined', 'created_at', 'collaboration_count']
        read_only_fields = ['id', 'date_joined', 'created_at']

    def _is_owner(self, obj):
        """Check if the request user is the profile owner"""
        request = self.context.get('request')
        return request and request.user.is_authenticated and request.user.id == obj.id

    def _has_profile_access(self, obj):
        """Check if the request user has been granted profile access to this user"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user.id == obj.id:
            return True  # Owner always has access
        # Check if user has been granted ProfileAccess
        return ProfileAccess.objects.filter(
            profile_owner=obj,
            granted_to=request.user
        ).exists()

    def get_post_count(self, obj):
        # Count posts for display
        from django.db.models import Q

        if self._is_owner(obj):
            video_count = obj.videos.count()
            photo_count = obj.photo_posts.count()
        elif self._has_profile_access(obj):
            # Users with profile access can see public and private folder posts
            video_count = obj.videos.filter(
                is_suspended=False
            ).filter(
                Q(subfolder__isnull=True, folder__isnull=True) |
                Q(subfolder__privacy__in=['public', 'private']) |
                Q(subfolder__isnull=True, folder__privacy__in=['public', 'private'])
            ).count()
            photo_count = obj.photo_posts.filter(
                is_suspended=False
            ).filter(
                Q(subfolder__isnull=True, folder__isnull=True) |
                Q(subfolder__privacy__in=['public', 'private']) |
                Q(subfolder__isnull=True, folder__privacy__in=['public', 'private'])
            ).count()
        else:
            video_count = obj.videos.filter(is_suspended=False, privacy='public').count()
            photo_count = obj.photo_posts.filter(is_suspended=False, privacy='public').count()
        return video_count + photo_count

    def get_videos(self, obj):
        request = self.context.get('request')
        from django.db.models import Q

        if self._is_owner(obj):
            # Owner sees all videos from public folders only (for posts view)
            from .models import Video

            # Agency accounts don't have their own posts - they view talents' posts individually
            if obj.account_type == 'agency':
                videos = Video.objects.none()  # Agency has no videos
            else:
                videos = obj.videos.filter(
                    Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
                    Q(subfolder__privacy='public') |  # In public subfolder
                    Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
                )
                videos = videos[:20]
        elif self._has_profile_access(obj):
            # Users with profile access can see public AND private folder content
            videos = obj.videos.filter(
                is_suspended=False
            ).filter(
                Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
                Q(subfolder__privacy__in=['public', 'private']) |  # In public or private subfolder
                Q(subfolder__isnull=True, folder__privacy__in=['public', 'private'])  # In public or private PostFolder
            )[:20]
        else:
            # Others only see public, non-suspended videos from public folders
            videos = obj.videos.filter(
                is_suspended=False,
                privacy='public'
            ).filter(
                Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
                Q(subfolder__privacy='public') |  # In public subfolder
                Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
            )[:20]
        return VideoSerializer(videos, many=True, context={'request': request}).data

    def get_photo_posts(self, obj):
        request = self.context.get('request')
        from django.db.models import Q

        if self._is_owner(obj):
            # Owner sees all photo posts from public folders only (for posts view)
            from .models import PhotoPost

            # Agency accounts don't have their own posts - they view talents' posts individually
            if obj.account_type == 'agency':
                photo_posts = PhotoPost.objects.none()  # Agency has no photo posts
            else:
                photo_posts = obj.photo_posts.filter(
                    Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
                    Q(subfolder__privacy='public') |  # In public subfolder
                    Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
                )
                photo_posts = photo_posts[:20]
        elif self._has_profile_access(obj):
            # Users with profile access can see public AND private folder content
            photo_posts = obj.photo_posts.filter(
                is_suspended=False
            ).filter(
                Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
                Q(subfolder__privacy__in=['public', 'private']) |  # In public or private subfolder
                Q(subfolder__isnull=True, folder__privacy__in=['public', 'private'])  # In public or private PostFolder
            )[:20]
        else:
            # Others only see public, non-suspended photo posts from public folders
            photo_posts = obj.photo_posts.filter(
                is_suspended=False,
                privacy='public'
            ).filter(
                Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
                Q(subfolder__privacy='public') |  # In public subfolder
                Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
            )[:20]
        return PhotoPostSerializer(photo_posts, many=True, context={'request': request}).data


class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for regular user account registration"""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        validated_data['account_type'] = 'user'
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class TalentRegisterSerializer(serializers.ModelSerializer):
    """Serializer for talent account registration"""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        email = attrs.get('email')
        password = attrs.get('password')
        
        # Check if user already has an agency_talent account with this email
        existing_agency_talent = User.objects.filter(email=email, account_type='agency_talent').first()
        if existing_agency_talent:
            # Verify password matches existing account
            if not existing_agency_talent.check_password(password):
                raise serializers.ValidationError({"password": "Password must match your existing agency talent account."})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        validated_data['account_type'] = 'talent'
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AgencyRegisterSerializer(serializers.ModelSerializer):
    """Serializer for agency account registration"""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        validated_data['account_type'] = 'agency'
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user



class AgencyTalentInviteRegisterSerializer(serializers.ModelSerializer):
    """Serializer for agency talent account registration via invite code"""
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    invite_code = serializers.CharField(write_only=True)
    username = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'invite_code']

    def validate_username(self, value):
        """Validate that the username is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')

        # Since this is now only called from authenticated talent accounts,
        # password validation is handled at the view level
        # We just need to validate the invite code

        # Validate invite code and get the associated agency
        invite_code = attrs.get('invite_code')
        agency = User.get_agency_from_invite_code(invite_code)
        if not agency:
            raise serializers.ValidationError({"invite_code": "Invalid invite code."})

        attrs['agency'] = agency
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        validated_data.pop('invite_code')  # Remove invite_code as it's not a model field
        agency = validated_data.pop('agency')

        validated_data['account_type'] = 'agency_talent'
        validated_data['agency'] = agency

        # Create user without password first
        user = User(**validated_data)

        # Set password directly (it's already hashed from the existing account)
        user.password = password
        user.save()
        return user


class AgencyTalentRegisterSerializer(serializers.ModelSerializer):
    """Serializer for direct agency talent account registration with invite code"""
    username = serializers.CharField(required=False, allow_blank=True)  # Optional, will be auto-generated
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    invite_code = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'invite_code']
    
    def validate(self, attrs):
        username = attrs.get('username', '')
        email = attrs.get('email')
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        invite_code = attrs.get('invite_code')
        
        # Validate passwords match
        if password != password_confirm:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Validate invite code and get the associated agency
        agency = User.get_agency_from_invite_code(invite_code)
        if not agency:
            raise serializers.ValidationError({"invite_code": "Invalid invite code."})
        
        # If username is provided, validate it's unique
        if username and User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "A user with that username already exists."})
        
        # Validate email is unique
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with that email already exists."})
        
        attrs['agency'] = agency
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        validated_data.pop('invite_code')  # Remove invite_code as it's not a model field
        agency = validated_data.pop('agency')
        
        # Auto-generate username if not provided
        username = validated_data.get('username')
        if not username:
            # Generate username: {AgencyName}Talent{N} where N is the count of agency talents for this agency + 1
            talent_count = User.objects.filter(agency=agency, account_type='agency_talent').count()
            base_username = f"{agency.username}Talent{talent_count + 1}"
            username = base_username
            
            # Ensure username is unique (in case of edge cases)
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
                
        validated_data['username'] = username
        validated_data['account_type'] = 'agency_talent'
        validated_data['agency'] = agency
        
        # Create user with password
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login - accepts username or email"""
    username_or_email = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username_or_email = attrs.get('username_or_email')
        password = attrs.get('password')
        
        if username_or_email and password:
            # Try to authenticate with username first
            user = authenticate(username=username_or_email, password=password)
            
            # If that fails, try to find user by email and authenticate
            if user is None:
                try:
                    # Handle multiple users with same email (talent + agency_talent)
                    user_objects = User.objects.filter(email=username_or_email)
                    
                    if user_objects.count() == 1:
                        user_obj = user_objects.first()
                        user = authenticate(username=user_obj.username, password=password)
                    elif user_objects.count() > 1:
                        # Try to authenticate with each account that has this email
                        for user_obj in user_objects:
                            temp_user = authenticate(username=user_obj.username, password=password)
                            if temp_user:
                                user = temp_user
                                break
                except User.DoesNotExist:
                    pass
            
            if not user:
                raise serializers.ValidationError('Invalid credentials.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include "username_or_email" and "password".')
        
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages"""
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    reply_to_data = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_id', 'sender_username', 'content',
                  'attachment_type', 'attachment_url', 'reply_to', 'reply_to_data', 'created_at', 'read_at']
        read_only_fields = ['id', 'sender', 'created_at', 'read_at']

    def get_reply_to_data(self, obj):
        """Get reply-to message data if exists"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender_id': obj.reply_to.sender.id,
                'sender_username': obj.reply_to.sender.username,
                'content': obj.reply_to.content[:100] if obj.reply_to.content else '',
                'attachment_type': obj.reply_to.attachment_type,
            }
        return None


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations"""
    participant1_data = UserSerializer(source='participant1', read_only=True)
    participant2_data = UserSerializer(source='participant2', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participant1', 'participant2', 'participant1_data', 'participant2_data', 
                  'created_at', 'updated_at', 'last_message', 'unread_count']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None
    
    def get_unread_count(self, obj):
        """Get count of unread messages for the current user"""
        request = self.context.get('request')
        if request and request.user:
            from django.db.models import Q
            return obj.messages.filter(
                ~Q(sender=request.user),
                read_at__isnull=True
            ).count()
        return 0


class CreateConversationSerializer(serializers.Serializer):
    """Serializer for creating a new conversation"""
    participant_id = serializers.IntegerField()
    
    def validate_participant_id(self, value):
        """Validate that participant exists and is not the current user"""
        request = self.context.get('request')
        if request and request.user:
            if value == request.user.id:
                raise serializers.ValidationError("Cannot create conversation with yourself.")
            try:
                User.objects.get(id=value)
            except User.DoesNotExist:
                raise serializers.ValidationError("User does not exist.")
        return value


# Group Messaging Serializers
class GroupMemberSerializer(serializers.ModelSerializer):
    """Serializer for group members"""
    user_data = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupMember
        fields = ['id', 'user', 'user_data', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']
    
    def get_user_data(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'account_type': obj.user.account_type,
            'profile_picture': obj.user.profile_picture,
        }


class GroupMessageSerializer(serializers.ModelSerializer):
    """Serializer for group messages"""
    sender_data = serializers.SerializerMethodField()
    reply_to_data = serializers.SerializerMethodField()

    class Meta:
        model = GroupMessage
        fields = ['id', 'group', 'sender', 'sender_data', 'content',
                  'attachment_type', 'attachment_url', 'reply_to', 'reply_to_data', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_data(self, obj):
        return {
            'id': obj.sender.id,
            'username': obj.sender.username,
            'profile_picture': obj.sender.profile_picture,
        }

    def get_reply_to_data(self, obj):
        """Get reply-to message data if exists"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender_id': obj.reply_to.sender.id,
                'sender_username': obj.reply_to.sender.username,
                'content': obj.reply_to.content[:100] if obj.reply_to.content else '',
                'attachment_type': obj.reply_to.attachment_type,
            }
        return None


class GroupConversationSerializer(serializers.ModelSerializer):
    """Serializer for group conversations"""
    members_data = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    created_by_data = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupConversation
        fields = ['id', 'name', 'description', 'invite_code', 'created_by', 'created_by_data', 
                  'members_data', 'member_count', 'last_message', 'my_role', 'created_at', 'updated_at']
        read_only_fields = ['id', 'invite_code', 'created_by', 'created_at', 'updated_at']
    
    def get_members_data(self, obj):
        members = obj.members.select_related('user').all()
        return GroupMemberSerializer(members, many=True).data
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content,
                'sender_username': last_msg.sender.username,
                'created_at': last_msg.created_at,
            }
        return None
    
    def get_created_by_data(self, obj):
        if obj.created_by:
            return {
                'id': obj.created_by.id,
                'username': obj.created_by.username,
            }
        return None
    
    def get_my_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.members.filter(user=request.user).first()
            if membership:
                return membership.role
        return None


class CreateGroupSerializer(serializers.ModelSerializer):
    """Serializer for creating a new group"""
    
    class Meta:
        model = GroupConversation
        fields = ['name', 'description']
    
    def create(self, validated_data):
        user = self.context['request'].user
        group = GroupConversation.objects.create(
            **validated_data,
            created_by=user
        )
        # Generate invite code
        group.generate_invite_code()
        # Add creator as admin
        GroupMember.objects.create(group=group, user=user, role='admin')
        return group


class FavoriteVideoSerializer(serializers.ModelSerializer):
    """Serializer for favorite videos"""
    video_data = VideoSerializer(source='video', read_only=True)

    class Meta:
        model = FavoriteVideo
        fields = ['id', 'user', 'video', 'video_data', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class FavoriteTalentSerializer(serializers.ModelSerializer):
    """Serializer for favorite talents/profiles"""
    talent_data = serializers.SerializerMethodField()

    class Meta:
        model = FavoriteTalent
        fields = ['id', 'user', 'talent', 'talent_data', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def get_talent_data(self, obj):
        return {
            'id': obj.talent.id,
            'username': obj.talent.username,
            'bio': obj.talent.bio,
            'genre': obj.talent.genre,
            'account_type': obj.talent.account_type,
            'post_count': obj.talent.videos.count(),
        }


class CreateMessageSerializer(serializers.ModelSerializer):
    """Serializer for creating a new message"""

    class Meta:
        model = Message
        fields = ['content', 'attachment_type', 'attachment_url']

    def validate(self, attrs):
        """Validate message - content is optional if there's an attachment"""
        content = attrs.get('content', '').strip()
        attachment_type = attrs.get('attachment_type', 'none')
        attachment_url = attrs.get('attachment_url')

        # If no attachment, content is required
        if attachment_type == 'none' and not content:
            raise serializers.ValidationError({"content": "Message content cannot be empty."})

        # If there's an attachment type, URL is required
        if attachment_type in ['photo', 'video'] and not attachment_url:
            raise serializers.ValidationError({"attachment_url": "Attachment URL is required."})

        if content and len(content) > Message.MAX_CONTENT_LENGTH:
            raise serializers.ValidationError(
                {"content": f"Message cannot exceed {Message.MAX_CONTENT_LENGTH} characters."}
            )

        attrs['content'] = content
        return attrs


class PostReportSerializer(serializers.ModelSerializer):
    """Serializer for post reports (videos and photo posts)"""
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    video_title = serializers.SerializerMethodField()
    video_owner_username = serializers.SerializerMethodField()
    photo_post_title = serializers.SerializerMethodField()
    photo_post_owner_username = serializers.SerializerMethodField()
    post_type = serializers.SerializerMethodField()
    post_title = serializers.SerializerMethodField()
    post_owner_username = serializers.SerializerMethodField()

    class Meta:
        model = PostReport
        fields = [
            'id', 'reporter', 'reporter_username',
            'video', 'video_title', 'video_owner_username',
            'photo_post', 'photo_post_title', 'photo_post_owner_username',
            'post_type', 'post_title', 'post_owner_username',
            'reason', 'reason_display', 'note', 'status', 'status_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reporter', 'created_at', 'updated_at']

    def get_video_title(self, obj):
        if obj.video:
            return obj.video.description[:50] if obj.video.description else f"Video #{obj.video.id}"
        return None

    def get_video_owner_username(self, obj):
        return obj.video.user.username if obj.video else None

    def get_photo_post_title(self, obj):
        if obj.photo_post:
            return obj.photo_post.description[:50] if obj.photo_post.description else f"Photo #{obj.photo_post.id}"
        return None

    def get_photo_post_owner_username(self, obj):
        return obj.photo_post.user.username if obj.photo_post else None

    def get_post_type(self, obj):
        if obj.video:
            return 'video'
        elif obj.photo_post:
            return 'photo'
        return None

    def get_post_title(self, obj):
        if obj.video:
            return obj.video.description[:50] if obj.video.description else f"Video #{obj.video.id}"
        elif obj.photo_post:
            return obj.photo_post.description[:50] if obj.photo_post.description else f"Photo #{obj.photo_post.id}"
        return None

    def get_post_owner_username(self, obj):
        if obj.video:
            return obj.video.user.username
        elif obj.photo_post:
            return obj.photo_post.user.username
        return None


class CreatePostReportSerializer(serializers.ModelSerializer):
    """Serializer for creating a post report (video or photo post)"""
    video_id = serializers.IntegerField(write_only=True, required=False)
    photo_post_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = PostReport
        fields = ['video_id', 'photo_post_id', 'reason', 'note']

    def validate(self, attrs):
        """Validate that exactly one of video_id or photo_post_id is provided"""
        video_id = attrs.get('video_id')
        photo_post_id = attrs.get('photo_post_id')

        if not video_id and not photo_post_id:
            raise serializers.ValidationError("Either video_id or photo_post_id is required.")
        if video_id and photo_post_id:
            raise serializers.ValidationError("Cannot report both video and photo post at once.")

        if video_id:
            try:
                Video.objects.get(id=video_id)
            except Video.DoesNotExist:
                raise serializers.ValidationError({"video_id": "Video does not exist."})

        if photo_post_id:
            try:
                PhotoPost.objects.get(id=photo_post_id)
            except PhotoPost.DoesNotExist:
                raise serializers.ValidationError({"photo_post_id": "Photo post does not exist."})

        return attrs

    def validate_reason(self, value):
        """Validate reason is one of the allowed choices"""
        valid_reasons = [choice[0] for choice in PostReport.REASON_CHOICES]
        if value not in valid_reasons:
            raise serializers.ValidationError(f"Invalid reason. Must be one of: {valid_reasons}")
        return value

    def create(self, validated_data):
        video_id = validated_data.pop('video_id', None)
        photo_post_id = validated_data.pop('photo_post_id', None)

        if video_id:
            validated_data['video'] = Video.objects.get(id=video_id)
        if photo_post_id:
            validated_data['photo_post'] = PhotoPost.objects.get(id=photo_post_id)

        validated_data['reporter'] = self.context['request'].user
        return super().create(validated_data)


class UpdatePostReportStatusSerializer(serializers.ModelSerializer):
    """Serializer for updating post report status (admin only)"""

    class Meta:
        model = PostReport
        fields = ['status']

    def validate_status(self, value):
        """Validate status is one of the allowed choices"""
        valid_statuses = [choice[0] for choice in PostReport.STATUS_CHOICES]
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Invalid status. Must be one of: {valid_statuses}")
        return value


class MessageReportSerializer(serializers.ModelSerializer):
    """Serializer for message reports"""
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reported_username = serializers.CharField(source='reported_user.username', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    message_type = serializers.SerializerMethodField()

    class Meta:
        model = MessageReport
        fields = [
            'id', 'reporter', 'reporter_username', 'reported_user', 'reported_username',
            'message', 'group_message', 'message_type', 'message_content',
            'reason', 'reason_display', 'note', 'status', 'status_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reporter', 'reported_user', 'message_content', 'created_at', 'updated_at']

    def get_message_type(self, obj):
        if obj.message:
            return 'dm'
        elif obj.group_message:
            return 'group'
        return 'unknown'


class CreateMessageReportSerializer(serializers.Serializer):
    """Serializer for creating a message report"""
    message_id = serializers.IntegerField(required=False)
    group_message_id = serializers.IntegerField(required=False)
    reason = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        message_id = attrs.get('message_id')
        group_message_id = attrs.get('group_message_id')

        if not message_id and not group_message_id:
            raise serializers.ValidationError("Either message_id or group_message_id is required.")
        if message_id and group_message_id:
            raise serializers.ValidationError("Only one of message_id or group_message_id should be provided.")

        return attrs

    def validate_reason(self, value):
        """Validate reason is one of the allowed choices"""
        valid_reasons = [choice[0] for choice in MessageReport.REASON_CHOICES]
        if value not in valid_reasons:
            raise serializers.ValidationError(f"Invalid reason. Must be one of: {valid_reasons}")
        return value


class UpdateMessageReportStatusSerializer(serializers.ModelSerializer):
    """Serializer for updating message report status (admin only)"""

    class Meta:
        model = MessageReport
        fields = ['status']

    def validate_status(self, value):
        """Validate status is one of the allowed choices"""
        valid_statuses = [choice[0] for choice in MessageReport.STATUS_CHOICES]
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Invalid status. Must be one of: {valid_statuses}")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for user notifications"""
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    actor_id = serializers.IntegerField(source='actor.id', read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'notification_type', 'notification_type_display',
            'actor', 'actor_id', 'actor_username', 'message',
            'related_object_type', 'related_object_id', 'extra_data',
            'is_read', 'created_at', 'read_at', 'time_ago'
        ]
        read_only_fields = ['id', 'recipient', 'created_at', 'read_at']

    def get_time_ago(self, obj):
        """Calculate human-readable time ago"""
        from django.utils import timezone
        now = timezone.now()
        diff = now - obj.created_at

        seconds = diff.total_seconds()
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            return f"{minutes}m ago"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            return f"{hours}h ago"
        elif seconds < 604800:
            days = int(seconds // 86400)
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d")


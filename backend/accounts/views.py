from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import login, logout
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Sum
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    User, Conversation, Message, Video, PostReport, FavoriteVideo, FavoriteTalent,
    GroupConversation, GroupMember, GroupMessage, PhotoPost, Photo, MessageReport,
    Subfolder, SubfolderAccessPermission, SubfolderAccessRequest,
    PrivateFolderAccess, PrivateFolderAccessRequest, Notification,
    ProfileAccess, ProfileAccessRequest
)
from .serializers import (
    UserRegisterSerializer,
    TalentRegisterSerializer,
    AgencyRegisterSerializer,
    AgencyTalentInviteRegisterSerializer,
    AgencyTalentRegisterSerializer,
    LoginSerializer,
    UserSerializer,
    UserProfileSerializer,
    ConversationSerializer,
    MessageSerializer,
    CreateConversationSerializer,
    CreateMessageSerializer,
    VideoSerializer,
    PhotoPostSerializer,
    PostReportSerializer,
    CreatePostReportSerializer,
    UpdatePostReportStatusSerializer,
    FavoriteVideoSerializer,
    FavoriteTalentSerializer,
    GroupConversationSerializer,
    GroupMemberSerializer,
    GroupMessageSerializer,
    CreateGroupSerializer,
    MessageReportSerializer,
    CreateMessageReportSerializer,
    UpdateMessageReportStatusSerializer,
    SubfolderSerializer,
    SubfolderAccessPermissionSerializer,
    SubfolderAccessRequestSerializer,
    PrivateFolderAccessSerializer,
    PrivateFolderAccessRequestSerializer,
    NotificationSerializer,
    ProfileAccessSerializer,
    ProfileAccessRequestSerializer,
)
import os
import uuid
import subprocess
import tempfile
import requests as http_requests
from rest_framework.parsers import MultiPartParser, FormParser
from google.cloud import storage
from google.api_core.exceptions import Forbidden
from google.api_core.exceptions import BadRequest
from google.api_core.exceptions import NotFound
from google.auth.exceptions import DefaultCredentialsError
from django.http import FileResponse
from urllib.parse import urlparse, unquote

# --- Video Upload & Listing ---
from rest_framework.views import APIView


def _is_admin(user):
    return (getattr(user, 'account_type', None) == 'admin' or
            getattr(user, 'is_staff', False) or
            getattr(user, 'is_superuser', False))


def _is_agency(user):
    return getattr(user, 'account_type', None) == 'agency'

def _is_user(user):
    return getattr(user, 'account_type', None) == 'user'

class VideoUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Only allow talent and agency_talent to post (not admin, agency, or user)
        if _is_admin(request.user):
            return Response({'error': 'Admin accounts cannot post content.'}, status=403)

        acct = getattr(request.user, 'account_type', None)
        if acct not in ('talent', 'agency_talent'):
            return Response({'error': 'Only Talent and Agency Talent accounts can post videos.'}, status=403)

        file_obj = request.FILES.get('video')
        folder_id = request.data.get('folder_id', None)
        description = request.data.get('description', '')
        if not file_obj:
            return Response({'error': 'No video file provided.'}, status=400)

        content_type = getattr(file_obj, 'content_type', '') or ''
        if not content_type.startswith('video/'):
            return Response({'error': 'Only video files are allowed.'}, status=400)

        bucket_name = getattr(settings, 'GCS_BUCKET', '') or os.environ.get('GCS_BUCKET', '')
        if not bucket_name:
            return Response({'error': 'GCS_BUCKET is not set in your environment/.env'}, status=500)

        try:
            project = getattr(settings, 'GCS_PROJECT', None)
            storage_client = storage.Client(project=project)
        except DefaultCredentialsError as e:
            return Response(
                {
                    'error': 'Google Cloud credentials not found for GCS upload.',
                    'details': str(e),
                    'hint': 'Local dev: run `gcloud auth application-default login` OR set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON. Cloud Run: use a service account with Storage permissions (no key file).',
                },
                status=500,
            )
        bucket = storage_client.bucket(bucket_name)

        ext = os.path.splitext(getattr(file_obj, 'name', '') or '')[1] or '.mp4'
        safe_name = f"{uuid.uuid4().hex}{ext}"
        blob_name = f'user_videos/{request.user.id}/{safe_name}'
        blob = bucket.blob(blob_name)

        # Ensure we are at the beginning of the uploaded stream
        try:
            file_obj.seek(0)
        except Exception:
            pass

        try:
            blob.upload_from_file(file_obj, content_type=content_type)

            is_public = False
            public_warning = None
            try:
                blob.make_public()
                is_public = True
            except BadRequest as e:
                # Common case: uniform bucket-level access enabled (ACLs disabled)
                public_warning = (
                    'Bucket has uniform bucket-level access enabled, so legacy ACLs are disabled and make_public() cannot be used. '
                    'If you need a publicly viewable URL, make the bucket public via IAM (allUsers:objectViewer) or switch to signed/proxied URLs.'
                )
            except Forbidden:
                public_warning = (
                    'Uploaded but could not set public ACL (forbidden). If you need public access, adjust bucket permissions or switch to signed/proxied URLs.'
                )

            video_url = blob.public_url
        except Forbidden as e:
            return Response(
                {
                    'error': 'GCS upload forbidden. This is usually bucket IAM permissions or billing is disabled for the bucket project.',
                    'details': str(e),
                    'bucket': bucket_name,
                },
                status=403,
            )

        # Handle folder assignment and privacy
        subfolder = None
        privacy = 'public'  # Default privacy
        
        if folder_id:
            try:
                from .models import Subfolder
                # All users (including agency_talent) upload to their own folders
                subfolder = Subfolder.objects.get(id=folder_id, user=request.user)
                # Inherit privacy from folder
                privacy = subfolder.privacy
            except Subfolder.DoesNotExist:
                return Response({'error': 'Invalid folder selected.'}, status=400)

        # Save Video model
        video = Video.objects.create(
            user=request.user,
            video_url=video_url,
            subfolder=subfolder,  # Use subfolder instead of folder
            description=description,
            privacy=privacy,
            duration=None,
            width=None,
            height=None
        )
        serializer = VideoSerializer(video)
        payload = serializer.data
        payload['is_public'] = is_public
        if not is_public:
            payload['warning'] = public_warning or 'Video uploaded but is not public.'

        return Response(payload, status=201)


class PhotoUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Only allow talent and agency_talent to post (not admin, agency, or user)
        if _is_admin(request.user):
            return Response({'error': 'Admin accounts cannot post content.'}, status=403)

        acct = getattr(request.user, 'account_type', None)
        if acct not in ('talent', 'agency_talent'):
            return Response({'error': 'Only Talent and Agency Talent accounts can post photos.'}, status=403)

        files = request.FILES.getlist('images')
        folder_id = request.data.get('folder_id', None)
        description = request.data.get('description', '')
        if not files:
            return Response({'error': 'No images provided.'}, status=400)
        if len(files) > 5:
            return Response({'error': 'You can upload at most 5 images.'}, status=400)

        bucket_name = getattr(settings, 'GCS_BUCKET', '') or os.environ.get('GCS_BUCKET', '')
        if not bucket_name:
            return Response({'error': 'GCS_BUCKET is not set in your environment/.env'}, status=500)

        try:
            storage_client = storage.Client()
        except DefaultCredentialsError as e:
            return Response({
                'error': 'Google Cloud credentials not found for GCS upload.',
                'details': str(e),
            }, status=500)

        bucket = storage_client.bucket(bucket_name)

        urls = []
        for idx, f in enumerate(files):
            content_type = getattr(f, 'content_type', '') or ''
            if not content_type.startswith('image/'):
                return Response({'error': 'Only image files are allowed.'}, status=400)

            ext = os.path.splitext(getattr(f, 'name', '') or '')[1] or '.jpg'
            safe_name = f"{uuid.uuid4().hex}{ext}"
            blob_name = f'user_photos/{request.user.id}/{safe_name}'
            blob = bucket.blob(blob_name)
            try:
                f.seek(0)
            except Exception:
                pass
            blob.upload_from_file(f, content_type=content_type)
            # Use public URL for simplicity; may be non-public depending on bucket settings
            urls.append(blob.public_url)

        # Handle folder assignment and privacy
        folder = None
        subfolder = None
        privacy = 'public'  # Default privacy
        
        if folder_id:
            try:
                from .models import Subfolder
                # All users (including agency_talent) upload to their own folders
                subfolder = Subfolder.objects.get(id=folder_id, user=request.user)
                # Inherit privacy from folder
                privacy = subfolder.privacy
            except Subfolder.DoesNotExist:
                return Response({'error': 'Invalid folder selected.'}, status=400)

        post = PhotoPost.objects.create(
            user=request.user,
            subfolder=subfolder,  # Use subfolder instead of folder
            description=description,
            privacy=privacy,
        )
        for order, url in enumerate(urls):
            Photo.objects.create(post=post, image_url=url, order=order)

        serializer = PhotoPostSerializer(post, context={'request': request})
        return Response(serializer.data, status=201)


class MessageAttachmentUploadView(APIView):
    """Upload a photo or video attachment for messages"""
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided.'}, status=400)

        # Check file size (300MB max)
        max_size = getattr(settings, 'MAX_MESSAGE_ATTACHMENT_SIZE', 314572800)  # 300MB default
        if file_obj.size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            file_size_mb = file_obj.size / (1024 * 1024)
            return Response({
                'error': f'File too large. Maximum size is {max_size_mb:.0f}MB. Your file is {file_size_mb:.1f}MB.'
            }, status=400)

        content_type = getattr(file_obj, 'content_type', '') or ''

        if content_type.startswith('image/'):
            attachment_type = 'photo'
            folder = 'message_photos'
        elif content_type.startswith('video/'):
            attachment_type = 'video'
            folder = 'message_videos'
        else:
            return Response({'error': 'Only image and video files are allowed.'}, status=400)

        bucket_name = getattr(settings, 'GCS_BUCKET', '') or os.environ.get('GCS_BUCKET', '')
        if not bucket_name:
            return Response({'error': 'GCS_BUCKET is not set'}, status=500)

        try:
            project = getattr(settings, 'GCS_PROJECT', None)
            storage_client = storage.Client(project=project)
        except DefaultCredentialsError as e:
            return Response({
                'error': 'Google Cloud credentials not found.',
                'details': str(e),
            }, status=500)

        bucket = storage_client.bucket(bucket_name)

        ext = os.path.splitext(getattr(file_obj, 'name', '') or '')[1] or ('.jpg' if attachment_type == 'photo' else '.mp4')
        safe_name = f"{uuid.uuid4().hex}{ext}"
        blob_name = f'{folder}/{request.user.id}/{safe_name}'
        blob = bucket.blob(blob_name)

        try:
            file_obj.seek(0)
        except Exception:
            pass

        try:
            blob.upload_from_file(file_obj, content_type=content_type)
            try:
                blob.make_public()
            except (BadRequest, Forbidden):
                pass  

            attachment_url = blob.public_url
        except Forbidden as e:
            return Response({
                'error': 'GCS upload forbidden.',
                'details': str(e),
            }, status=403)

        return Response({
            'attachment_type': attachment_type,
            'attachment_url': attachment_url,
            'message': 'File uploaded successfully'
        }, status=201)


class ProfilePictureUploadView(APIView):
    """Upload profile picture for authenticated user"""
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_obj = request.FILES.get('profile_picture')
        if not file_obj:
            return Response({'error': 'No file provided.'}, status=400)

        if not getattr(file_obj, 'content_type', '').startswith('image/'):
            return Response({'error': 'Only image files allowed.'}, status=400)

        if file_obj.size > 10485760:  # 10MB
            return Response({'error': 'Image must be less than 10MB.'}, status=400)

        bucket_name = getattr(settings, 'GCS_BUCKET', '') or os.environ.get('GCS_BUCKET', '')
        if not bucket_name:
            return Response({'error': 'GCS_BUCKET not configured'}, status=500)

        try:
            storage_client = storage.Client(project=getattr(settings, 'GCS_PROJECT', None))
        except DefaultCredentialsError as e:
            return Response({'error': 'GCS credentials not found', 'details': str(e)}, status=500)

        ext = os.path.splitext(getattr(file_obj, 'name', ''))[1] or '.jpg'
        blob_name = f'profile_pictures/{request.user.id}/{uuid.uuid4().hex}{ext}'
        blob = storage_client.bucket(bucket_name).blob(blob_name)

        try:
            file_obj.seek(0)
        except:
            pass

        try:
            blob.upload_from_file(file_obj, content_type=file_obj.content_type)
            try:
                blob.make_public()
            except:
                pass
            request.user.profile_picture = blob.public_url
            request.user.save(update_fields=['profile_picture'])
        except Forbidden as e:
            return Response({'error': 'GCS upload forbidden', 'details': str(e)}, status=403)

        return Response({'profile_picture': request.user.profile_picture}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_videos_view(request):
    """List videos visible to the current user"""
    from django.db.models import Q
    user = request.user
    
    # Define folder privacy filter for posts view
    public_folder_filter = (
        Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
        Q(subfolder__privacy='public') |  # In public subfolder
        Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
    )
    
    # Agency accounts see videos from all their agency talents (from public folders only for posts view)
    if user.account_type == 'agency':
        agency_talents = User.objects.filter(account_type='agency_talent', agency=user)
        videos = Video.objects.filter(user__in=agency_talents).filter(public_folder_filter).order_by('-created_at')
    
    # Agency talent accounts see only their own videos (like normal talent)
    elif user.account_type == 'agency_talent':
        videos = Video.objects.filter(user=user).filter(public_folder_filter).order_by('-created_at')

    # Admin sees all videos (no folder filtering for admin)
    elif user.account_type == 'admin':
        videos = Video.objects.all().order_by('-created_at')

    # Regular talent accounts see only their own videos from public folders
    else:
        from django.db.models import Q
        videos = Video.objects.filter(user=user).filter(
            Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
            Q(subfolder__privacy='public') |  # In public subfolder
            Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
        ).order_by('-created_at')
    
    serializer = VideoSerializer(videos, many=True, context={'request': request})
    return Response({'videos': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def feed_videos_view(request):
    """List all public videos for the main feed (most recent first)"""
    videos = Video.objects.filter(
        privacy='public',
        user__privacy_setting__in=['public', 'private'],
        is_suspended=False
    ).order_by('-created_at')[:100]
    serializer = VideoSerializer(videos, many=True, context={'request': request})
    return Response({'videos': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def posts_feed_view(request):
    """Unified feed: recent videos and photo posts ordered by created_at desc."""
    # Only show public posts in the main feed (private posts are only for specific viewers)
    # Filter out suspended posts - they should not appear in the feed
    # Also filter out posts in private/hidden folders
    from django.db.models import Q
    
    videos = Video.objects.filter(
        is_suspended=False, 
        privacy='public'
    ).filter(
        Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
        Q(subfolder__privacy='public') |  # In public subfolder
        Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
    ).order_by('-created_at')[:100]
    
    photos = PhotoPost.objects.filter(
        is_suspended=False, 
        privacy='public'
    ).filter(
        Q(subfolder__isnull=True, folder__isnull=True) |  # No folder at all
        Q(subfolder__privacy='public') |  # In public subfolder
        Q(subfolder__isnull=True, folder__privacy='public')  # In public PostFolder
    ).order_by('-created_at')[:100]

    v_items = []
    for v in videos:
        v_items.append({
            'type': 'video',
            **VideoSerializer(v, context={'request': request}).data,
        })

    p_items = []
    for p in photos:
        p_items.append({
            'type': 'photo',
            **PhotoPostSerializer(p, context={'request': request}).data,
        })

    # Merge and sort by created_at desc
    items = v_items + p_items
    items.sort(key=lambda x: x.get('created_at'), reverse=True)
    return Response({'posts': items})


@csrf_exempt
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_photo_post_view(request, post_id):
    """Delete a photo post (owner only)."""
    try:
        post = PhotoPost.objects.get(id=post_id)
    except PhotoPost.DoesNotExist:
        return Response({'error': 'Photo post not found'}, status=status.HTTP_404_NOT_FOUND)

    if post.user_id != request.user.id:
        return Response({'error': 'Not authorized to delete this post'}, status=status.HTTP_403_FORBIDDEN)

    # Deleting the PhotoPost will cascade delete related Photo records
    post.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_exempt
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_video_view(request, video_id):
    """Delete a video (owner only)."""
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)

    if video.user_id != request.user.id:
        return Response({'error': 'Not authorized to delete this video'}, status=status.HTTP_403_FORBIDDEN)

    video.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def video_stream_view(request, video_id):
    """Stream a video through the backend (works even if GCS object is not public)."""
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=404)

    video_url = getattr(video, 'video_url', '') or ''
    parsed = urlparse(video_url)
    # Expected: https://storage.googleapis.com/<bucket>/<object>
    # Path: /<bucket>/<object>
    path = unquote(parsed.path or '')
    path = path.lstrip('/')
    parts = path.split('/', 1)
    if len(parts) != 2:
        return Response({'error': 'Invalid stored video URL'}, status=500)

    bucket_name, object_name = parts[0], parts[1]

    try:
        project = getattr(settings, 'GCS_PROJECT', None)
        storage_client = storage.Client(project=project)
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        # Open a streaming reader
        file_like = blob.open('rb')
    except DefaultCredentialsError as e:
        return Response(
            {
                'error': 'Google Cloud credentials not found for GCS streaming.',
                'details': str(e),
            },
            status=500,
        )
    except NotFound:
        return Response({'error': 'Video file not found in storage'}, status=404)

    # Best-effort content type based on extension
    content_type = 'video/mp4' if object_name.lower().endswith('.mp4') else 'application/octet-stream'
    response = FileResponse(file_like, content_type=content_type)
    response['Content-Disposition'] = 'inline'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_content_view(request):
    """Get current user's content organized by public/private/hidden sections"""
    user = request.user

    # Agency accounts see content from all their agency talents
    if user.account_type == 'agency':
        agency_talents = User.objects.filter(account_type='agency_talent', agency=user)

        # Agency doesn't have subfolders - they manage talent's folders
        public_subfolders = Subfolder.objects.none()
        private_subfolders = Subfolder.objects.none()
        hidden_subfolders = Subfolder.objects.none()

        # Get videos/posts from all agency talents (for display purposes)
        public_videos = Video.objects.filter(user__in=agency_talents, privacy='public', subfolder__isnull=True)
        private_videos = Video.objects.filter(user__in=agency_talents, privacy='private', subfolder__isnull=True)
        hidden_videos = Video.objects.filter(user__in=agency_talents, privacy='hidden', subfolder__isnull=True)
        public_posts = PhotoPost.objects.filter(user__in=agency_talents, privacy='public', subfolder__isnull=True)
        private_posts = PhotoPost.objects.filter(user__in=agency_talents, privacy='private', subfolder__isnull=True)
        hidden_posts = PhotoPost.objects.filter(user__in=agency_talents, privacy='hidden', subfolder__isnull=True)

    # Agency talent accounts see only their own content (like normal talent)
    elif user.account_type == 'agency_talent':
        public_subfolders = Subfolder.objects.filter(user=user, privacy_type='public')
        private_subfolders = Subfolder.objects.filter(user=user, privacy_type='private')
        hidden_subfolders = Subfolder.objects.filter(user=user, privacy_type='hidden')

        public_videos = Video.objects.filter(user=user, privacy='public', subfolder__isnull=True)
        private_videos = Video.objects.filter(user=user, privacy='private', subfolder__isnull=True)
        hidden_videos = Video.objects.filter(user=user, privacy='hidden', subfolder__isnull=True)
        public_posts = PhotoPost.objects.filter(user=user, privacy='public', subfolder__isnull=True)
        private_posts = PhotoPost.objects.filter(user=user, privacy='private', subfolder__isnull=True)
        hidden_posts = PhotoPost.objects.filter(user=user, privacy='hidden', subfolder__isnull=True)

    # Admin sees all content
    elif user.account_type == 'admin':
        public_subfolders = Subfolder.objects.filter(privacy_type='public')
        private_subfolders = Subfolder.objects.filter(privacy_type='private')
        hidden_subfolders = Subfolder.objects.filter(privacy_type='hidden')
        public_videos = Video.objects.filter(privacy='public', subfolder__isnull=True)
        private_videos = Video.objects.filter(privacy='private', subfolder__isnull=True)
        hidden_videos = Video.objects.filter(privacy='hidden', subfolder__isnull=True)
        public_posts = PhotoPost.objects.filter(privacy='public', subfolder__isnull=True)
        private_posts = PhotoPost.objects.filter(privacy='private', subfolder__isnull=True)
        hidden_posts = PhotoPost.objects.filter(privacy='hidden', subfolder__isnull=True)

    # Regular talent accounts see only their own content
    else:
        public_subfolders = Subfolder.objects.filter(user=user, privacy_type='public')
        private_subfolders = Subfolder.objects.filter(user=user, privacy_type='private')
        hidden_subfolders = Subfolder.objects.filter(user=user, privacy_type='hidden')
        public_videos = Video.objects.filter(user=user, privacy='public', subfolder__isnull=True)
        private_videos = Video.objects.filter(user=user, privacy='private', subfolder__isnull=True)
        hidden_videos = Video.objects.filter(user=user, privacy='hidden', subfolder__isnull=True)
        public_posts = PhotoPost.objects.filter(user=user, privacy='public', subfolder__isnull=True)
        private_posts = PhotoPost.objects.filter(user=user, privacy='private', subfolder__isnull=True)
        hidden_posts = PhotoPost.objects.filter(user=user, privacy='hidden', subfolder__isnull=True)

    return Response({
        'public': {
            'subfolders': SubfolderSerializer(public_subfolders, many=True).data,
            'videos': VideoSerializer(public_videos, many=True, context={'request': request}).data,
            'photo_posts': PhotoPostSerializer(public_posts, many=True, context={'request': request}).data,
        },
        'private': {
            'subfolders': SubfolderSerializer(private_subfolders, many=True).data,
            'videos': VideoSerializer(private_videos, many=True, context={'request': request}).data,
            'photo_posts': PhotoPostSerializer(private_posts, many=True, context={'request': request}).data,
        },
        'hidden': {
            'subfolders': SubfolderSerializer(hidden_subfolders, many=True).data,
            'videos': VideoSerializer(hidden_videos, many=True, context={'request': request}).data,
            'photo_posts': PhotoPostSerializer(hidden_posts, many=True, context={'request': request}).data,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subfolder_view(request):
    """Create a subfolder in public, private, or hidden section"""
    name = request.data.get('name', '').strip()
    description = request.data.get('description', '').strip()
    privacy_type = request.data.get('privacy_type', 'public')

    if not name:
        return Response({'error': 'Subfolder name is required'}, status=400)

    if privacy_type not in ['public', 'private', 'hidden']:
        return Response({'error': 'privacy_type must be public, private, or hidden'}, status=400)

    # Check for duplicate name within same privacy type
    if Subfolder.objects.filter(user=request.user, name=name, privacy_type=privacy_type).exists():
        return Response({'error': f'A subfolder with this name already exists in your {privacy_type} section'}, status=400)

    subfolder = Subfolder.objects.create(
        user=request.user,
        name=name,
        description=description,
        privacy_type=privacy_type
    )
    serializer = SubfolderSerializer(subfolder)
    return Response({'subfolder': serializer.data, 'message': 'Subfolder created'}, status=201)


@api_view(['GET'])
@permission_classes([AllowAny])
def subfolder_detail_view(request, subfolder_id):
    """Get subfolder details with its contents"""
    try:
        subfolder = Subfolder.objects.get(id=subfolder_id)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found'}, status=404)

    if not subfolder.can_view(request.user if request.user.is_authenticated else None):
        return Response({'error': 'You do not have access to this subfolder'}, status=403)

    videos = Video.objects.filter(subfolder=subfolder)
    photo_posts = PhotoPost.objects.filter(subfolder=subfolder)

    return Response({
        'subfolder': SubfolderSerializer(subfolder).data,
        'videos': VideoSerializer(videos, many=True, context={'request': request}).data,
        'photo_posts': PhotoPostSerializer(photo_posts, many=True, context={'request': request}).data,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_subfolder_view(request, subfolder_id):
    """Update subfolder details"""
    try:
        subfolder = Subfolder.objects.get(id=subfolder_id)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found'}, status=404)

    # Check permissions: owner or agency managing their talent's folder
    user = request.user
    if subfolder.user == user:
        # Owner can update their own folder
        pass
    elif user.account_type == 'agency' and subfolder.user.account_type == 'agency_talent' and subfolder.user.agency == user:
        # Agency can update their talent's folder
        pass
    else:
        return Response({'error': 'Not authorized to update this subfolder'}, status=403)

    update_fields = []

    new_name = request.data.get('name')
    if new_name is not None:
        new_name = new_name.strip()
        if new_name and new_name != subfolder.name:
            if Subfolder.objects.filter(user=subfolder.user, name=new_name, privacy_type=subfolder.privacy_type).exclude(id=subfolder_id).exists():
                return Response({'error': 'A subfolder with this name already exists'}, status=400)
            subfolder.name = new_name
            update_fields.append('name')

    new_description = request.data.get('description')
    if new_description is not None:
        subfolder.description = new_description.strip()
        update_fields.append('description')

    if update_fields:
        subfolder.save(update_fields=update_fields + ['updated_at'])

    return Response({
        'message': 'Subfolder updated successfully',
        'subfolder': SubfolderSerializer(subfolder).data
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_subfolder_view(request, subfolder_id):
    """Delete a subfolder and all its contents"""
    try:
        subfolder = Subfolder.objects.get(id=subfolder_id)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found'}, status=404)
    
    # Check permissions: owner or agency managing their talent's folder
    user = request.user
    if subfolder.user == user:
        # Owner can delete their own folder
        pass
    elif user.account_type == 'agency' and subfolder.user.account_type == 'agency_talent' and subfolder.user.agency == user:
        # Agency can delete their talent's folder
        pass
    else:
        return Response({'error': 'Not authorized to delete this subfolder'}, status=403)

    # Delete all videos and photo posts in this subfolder
    Video.objects.filter(subfolder=subfolder).delete()
    PhotoPost.objects.filter(subfolder=subfolder).delete()

    # Delete the subfolder
    subfolder.delete()
    return Response({'message': 'Subfolder and its contents deleted successfully'}, status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_video_view(request, video_id):
    """Move a video to a different privacy section, subfolder, and/or folder"""
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=404)

    # Check permissions based on account type
    user = request.user
    
    # Admin can edit any video
    if user.account_type == 'admin':
        pass
    # Video owner can edit their video
    elif video.user == user:
        pass
    # Agency can edit videos from their agency talents
    elif user.account_type == 'agency' and video.user.account_type == 'agency_talent' and video.user.agency == user:
        pass
    else:
        return Response({'error': 'Video not found or not owned by you'}, status=404)

    # Handle folder update
    folder_id = request.data.get('folder_id')
    if folder_id is not None:
        if folder_id:
            try:
                from .models import PostFolder
                folder = PostFolder.objects.get(id=folder_id, user=video.user)
                video.folder = folder
            except PostFolder.DoesNotExist:
                return Response({'error': 'Folder not found'}, status=404)
        else:
            # No folder selected, use default Videos folder
            try:
                from .models import PostFolder
                folder = PostFolder.objects.get(
                    user=video.user,
                    name="Videos",
                    parent__name="Posts",
                    is_default=True
                )
                video.folder = folder
            except PostFolder.DoesNotExist:
                return Response({'error': 'Default Videos folder not found'}, status=404)

    privacy = request.data.get('privacy')

    if privacy is not None:
        if privacy not in ['public', 'private', 'hidden']:
            return Response({'error': 'Privacy must be public, private, or hidden'}, status=400)

        video.privacy = privacy
        # When changing privacy directly, remove from any subfolder
        video.subfolder = None

    # Check if subfolder_id key exists in request (not just if value is truthy)
    if 'subfolder_id' in request.data:
        subfolder_id = request.data.get('subfolder_id')
        if subfolder_id:
            # For subfolder operations, only the owner can move videos to their subfolders
            if video.user != user:
                return Response({'error': 'Only video owner can move to subfolders'}, status=403)
            try:
                subfolder = Subfolder.objects.get(id=subfolder_id, user=request.user)
            except Subfolder.DoesNotExist:
                return Response({'error': 'Subfolder not found'}, status=404)
            video.subfolder = subfolder
            video.privacy = subfolder.privacy_type  # Match subfolder's privacy type
        else:
            # subfolder_id is null/None, move to root
            video.subfolder = None

    video.save()
    return Response({
        'message': 'Video updated successfully',
        'video': VideoSerializer(video, context={'request': request}).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_photo_post_view(request, post_id):
    """Move a photo post to a different privacy section or subfolder"""
    try:
        post = PhotoPost.objects.get(id=post_id)
    except PhotoPost.DoesNotExist:
        return Response({'error': 'Photo post not found'}, status=404)

    # Check permissions based on account type
    user = request.user
    
    # Admin can edit any post
    if user.account_type == 'admin':
        pass
    # Post owner can edit their post
    elif post.user == user:
        pass
    # Agency can edit posts from their agency talents
    elif user.account_type == 'agency' and post.user.account_type == 'agency_talent' and post.user.agency == user:
        pass
    else:
        return Response({'error': 'Photo post not found or not owned by you'}, status=404)

    # Handle folder update
    folder_id = request.data.get('folder_id')
    if folder_id is not None:
        if folder_id:
            try:
                from .models import PostFolder
                folder = PostFolder.objects.get(id=folder_id, user=post.user)
                post.folder = folder
            except PostFolder.DoesNotExist:
                return Response({'error': 'Folder not found'}, status=404)
        else:
            # No folder selected, use default Images folder
            try:
                from .models import PostFolder
                folder = PostFolder.objects.get(
                    user=post.user,
                    name="Images",
                    parent__name="Posts",
                    is_default=True
                )
                post.folder = folder
            except PostFolder.DoesNotExist:
                return Response({'error': 'Default Images folder not found'}, status=404)

    privacy = request.data.get('privacy')

    if privacy is not None:
        if privacy not in ['public', 'private', 'hidden']:
            return Response({'error': 'Privacy must be public, private, or hidden'}, status=400)

        post.privacy = privacy

    # Check if subfolder_id key exists in request (not just if value is truthy)
    if 'subfolder_id' in request.data:
        subfolder_id = request.data.get('subfolder_id')
        if subfolder_id:
            # For subfolder operations, only the owner can move posts to their subfolders
            if post.user != user:
                return Response({'error': 'Only post owner can move to subfolders'}, status=403)
            try:
                subfolder = Subfolder.objects.get(id=subfolder_id, user=request.user)
            except Subfolder.DoesNotExist:
                return Response({'error': 'Subfolder not found'}, status=404)
            post.subfolder = subfolder
            post.privacy = subfolder.privacy_type
        else:
            # subfolder_id is null/None, move to root
            post.subfolder = None

    post.save()
    return Response({
        'message': 'Photo post moved successfully',
        'post': PhotoPostSerializer(post, context={'request': request}).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_video_privacy_view(request, video_id):
    """Toggle video privacy between public and private"""
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=404)

    # Check permissions based on account type
    user = request.user
    
    # Admin can change any video's privacy
    if user.account_type == 'admin':
        pass
    # Video owner can change their own video privacy
    elif video.user == user:
        pass
    # Agency can change privacy of videos from their agency talents
    elif user.account_type == 'agency' and video.user.account_type == 'agency_talent' and video.user.agency == user:
        pass
    else:
        return Response({'error': 'You do not have permission to change this video\'s privacy'}, status=403)

    # Set privacy
    new_privacy = request.data.get('privacy')
    if new_privacy not in ['public', 'private']:
        return Response({'error': 'Privacy must be either public or private'}, status=400)

    video.privacy = new_privacy
    video.save()

    return Response({
        'message': f'Video privacy changed to {new_privacy}',
        'video': VideoSerializer(video, context={'request': request}).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_photo_privacy_view(request, post_id):
    """Toggle photo post privacy between public and private"""
    try:
        post = PhotoPost.objects.get(id=post_id)
    except PhotoPost.DoesNotExist:
        return Response({'error': 'Photo post not found'}, status=404)

    # Check permissions based on account type
    user = request.user
    
    # Admin can change any post's privacy
    if user.account_type == 'admin':
        pass
    # Post owner can change their own post privacy
    elif post.user == user:
        pass
    # Agency can change privacy of posts from their agency talents
    elif user.account_type == 'agency' and post.user.account_type == 'agency_talent' and post.user.agency == user:
        pass
    else:
        return Response({'error': 'You do not have permission to change this post\'s privacy'}, status=403)

    # Set privacy
    new_privacy = request.data.get('privacy')
    if new_privacy not in ['public', 'private']:
        return Response({'error': 'Privacy must be either public or private'}, status=400)

    post.privacy = new_privacy
    post.save()

    return Response({
        'message': f'Photo post privacy changed to {new_privacy}',
        'post': PhotoPostSerializer(post, context={'request': request}).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def grant_subfolder_access_view(request):
    """Grant a user access to a private subfolder"""
    subfolder_id = request.data.get('subfolder_id')
    user_id = request.data.get('user_id')

    if not subfolder_id or not user_id:
        return Response({'error': 'subfolder_id and user_id are required'}, status=400)

    try:
        subfolder = Subfolder.objects.get(id=subfolder_id, user=request.user)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found or not owned by you'}, status=404)

    try:
        granted_to = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    if granted_to == request.user:
        return Response({'error': 'Cannot grant access to yourself'}, status=400)

    permission, created = SubfolderAccessPermission.objects.get_or_create(
        subfolder=subfolder,
        granted_to=granted_to,
        defaults={'granted_by': request.user}
    )

    SubfolderAccessRequest.objects.filter(subfolder=subfolder, requester=granted_to, status='pending').update(status='approved')

    return Response({
        'message': f'Access granted to {granted_to.username}',
        'created': created
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_subfolder_access_view(request, subfolder_id, user_id):
    """Revoke a user's access to a private subfolder"""
    try:
        subfolder = Subfolder.objects.get(id=subfolder_id, user=request.user)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found or not owned by you'}, status=404)

    deleted, _ = SubfolderAccessPermission.objects.filter(subfolder=subfolder, granted_to_id=user_id).delete()

    if deleted:
        return Response({'message': 'Access revoked successfully'})
    else:
        return Response({'error': 'No access permission found for this user'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subfolder_access_list_view(request, subfolder_id):
    """Get list of users who have access to a private subfolder"""
    try:
        subfolder = Subfolder.objects.get(id=subfolder_id, user=request.user)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found or not owned by you'}, status=404)

    permissions = SubfolderAccessPermission.objects.filter(subfolder=subfolder).select_related('granted_to')
    users_with_access = [{
        'id': p.granted_to.id,
        'username': p.granted_to.username,
        'granted_at': p.created_at
    } for p in permissions]

    return Response({
        'subfolder_id': subfolder_id,
        'users_with_access': users_with_access
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_subfolder_access_view(request):
    """Request access to a private subfolder"""
    subfolder_id = request.data.get('subfolder_id')
    message = request.data.get('message', '')

    if not subfolder_id:
        return Response({'error': 'subfolder_id is required'}, status=400)

    try:
        subfolder = Subfolder.objects.get(id=subfolder_id)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found'}, status=404)

    if subfolder.user == request.user:
        return Response({'error': 'Cannot request access to your own subfolder'}, status=400)

    if subfolder.privacy_type != 'private':
        return Response({'error': 'This subfolder does not require access permission'}, status=400)

    if SubfolderAccessPermission.objects.filter(subfolder=subfolder, granted_to=request.user).exists():
        return Response({'error': 'You already have access to this subfolder'}, status=400)

    access_request, created = SubfolderAccessRequest.objects.get_or_create(
        subfolder=subfolder,
        requester=request.user,
        defaults={'message': message}
    )

    if not created:
        if access_request.status == 'pending':
            return Response({'message': 'Access request already pending'})
        elif access_request.status == 'approved':
            return Response({'error': 'Your request was already approved'}, status=400)
        elif access_request.status == 'denied':
            access_request.status = 'pending'
            access_request.message = message
            access_request.save()
            # Create notification for re-submitted request
            Notification.create_notification(
                recipient=subfolder.user,
                notification_type='folder_access_request',
                message=f'{request.user.username} re-requested access to your folder "{subfolder.name}"',
                actor=request.user,
                related_object_type='subfolder_access_request',
                related_object_id=access_request.id
            )
            return Response({'message': 'Access request resubmitted'})

    # Create notification for the subfolder owner
    Notification.create_notification(
        recipient=subfolder.user,
        notification_type='folder_access_request',
        message=f'{request.user.username} requested access to your folder "{subfolder.name}"',
        actor=request.user,
        related_object_type='subfolder_access_request',
        related_object_id=access_request.id
    )

    return Response({
        'message': 'Access request sent',
        'request_id': access_request.id
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_subfolder_access_requests_view(request):
    """Get all pending access requests for the current user's subfolders"""
    pending_requests = SubfolderAccessRequest.objects.filter(
        subfolder__user=request.user,
        status='pending'
    ).select_related('subfolder', 'requester').order_by('-created_at')

    serializer = SubfolderAccessRequestSerializer(pending_requests, many=True)
    return Response({
        'pending_requests': serializer.data,
        'count': pending_requests.count()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_subfolder_access_request_view(request, request_id):
    """Approve or deny a subfolder access request"""
    action = request.data.get('action')

    if action not in ['approve', 'deny']:
        return Response({'error': 'action must be "approve" or "deny"'}, status=400)

    try:
        access_request = SubfolderAccessRequest.objects.get(id=request_id, subfolder__user=request.user)
    except SubfolderAccessRequest.DoesNotExist:
        return Response({'error': 'Access request not found'}, status=404)

    if access_request.status != 'pending':
        return Response({'error': f'Request already {access_request.status}'}, status=400)

    if action == 'approve':
        access_request.status = 'approved'
        access_request.save()
        SubfolderAccessPermission.objects.get_or_create(
            subfolder=access_request.subfolder,
            granted_to=access_request.requester,
            defaults={'granted_by': request.user}
        )
        return Response({'message': f'Access granted to {access_request.requester.username}'})
    else:
        access_request.status = 'denied'
        access_request.save()
        return Response({'message': 'Access request denied'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def private_folder_invite_link_view(request):
    """Get or generate invite link for user's private folder"""
    if request.method == 'POST':
        # Generate a new invite code
        invite_code = request.user.generate_private_folder_invite_code()
    else:
        # Get existing or generate if none exists
        if not request.user.private_folder_invite_code:
            invite_code = request.user.generate_private_folder_invite_code()
        else:
            invite_code = request.user.private_folder_invite_code

    return Response({
        'invite_code': invite_code,
        'invite_url': f'/private-folder/join/{invite_code}'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_private_folder_access_view(request):
    """Request access to a user's private folder via invite code"""
    invite_code = request.data.get('invite_code')
    message = request.data.get('message', '')

    if not invite_code:
        return Response({'error': 'invite_code is required'}, status=400)

    try:
        owner = User.objects.get(private_folder_invite_code=invite_code)
    except User.DoesNotExist:
        return Response({'error': 'Invalid invite code'}, status=404)

    if owner == request.user:
        return Response({'error': 'You cannot request access to your own private folder'}, status=400)

    # Check if already has access
    if PrivateFolderAccess.objects.filter(owner=owner, granted_to=request.user).exists():
        return Response({'error': 'You already have access to this private folder'}, status=400)

    # Check if already requested
    existing_request = PrivateFolderAccessRequest.objects.filter(owner=owner, requester=request.user).first()
    if existing_request:
        if existing_request.status == 'pending':
            return Response({'error': 'You already have a pending request'}, status=400)
        elif existing_request.status == 'denied':
            # Allow re-request if previously denied
            existing_request.status = 'pending'
            existing_request.message = message
            existing_request.save()
            return Response({
                'message': 'Access request re-submitted',
                'request': PrivateFolderAccessRequestSerializer(existing_request).data
            })

    # Create new request
    access_request = PrivateFolderAccessRequest.objects.create(
        owner=owner,
        requester=request.user,
        message=message
    )

    # Create notification for the profile owner
    Notification.create_notification(
        recipient=owner,
        notification_type='profile_access_request',
        message=f'{request.user.username} requested access to your private folder',
        actor=request.user,
        related_object_type='private_folder_access_request',
        related_object_id=access_request.id
    )

    return Response({
        'message': f'Access request sent to {owner.username}',
        'request': PrivateFolderAccessRequestSerializer(access_request).data
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_private_folder_access_requests_view(request):
    """Get all pending access requests for user's private folder (as owner)"""
    requests = PrivateFolderAccessRequest.objects.filter(owner=request.user, status='pending')
    return Response({
        'requests': PrivateFolderAccessRequestSerializer(requests, many=True).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_private_folder_access_request_view(request, request_id):
    """Approve or deny a private folder access request"""
    action = request.data.get('action')

    if action not in ['approve', 'deny']:
        return Response({'error': 'action must be "approve" or "deny"'}, status=400)

    try:
        access_request = PrivateFolderAccessRequest.objects.get(id=request_id, owner=request.user)
    except PrivateFolderAccessRequest.DoesNotExist:
        return Response({'error': 'Access request not found'}, status=404)

    if access_request.status != 'pending':
        return Response({'error': f'Request already {access_request.status}'}, status=400)

    if action == 'approve':
        access_request.status = 'approved'
        access_request.save()
        PrivateFolderAccess.objects.get_or_create(
            owner=request.user,
            granted_to=access_request.requester
        )
        # Notify requester that access was granted
        Notification.create_notification(
            recipient=access_request.requester,
            notification_type='private_folder_access_granted',
            message=f'{request.user.username} approved your private folder access request',
            actor=request.user,
            related_object_type='private_folder_access',
            related_object_id=access_request.id
        )
        return Response({'message': f'Access granted to {access_request.requester.username}'})
    else:
        access_request.status = 'denied'
        access_request.save()
        # Notify requester that access was denied
        Notification.create_notification(
            recipient=access_request.requester,
            notification_type='private_folder_access_denied',
            message=f'{request.user.username} denied your private folder access request',
            actor=request.user,
            related_object_type='private_folder_access_request',
            related_object_id=access_request.id
        )
        return Response({'message': 'Access request denied'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def private_folder_access_list_view(request):
    """Get list of users who have access to current user's private folder"""
    access_list = PrivateFolderAccess.objects.filter(owner=request.user)
    return Response({
        'access_list': PrivateFolderAccessSerializer(access_list, many=True).data
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_private_folder_access_view(request, user_id):
    """Revoke a user's access to current user's private folder"""
    try:
        access = PrivateFolderAccess.objects.get(owner=request.user, granted_to_id=user_id)
        access.delete()
        return Response({'message': 'Access revoked successfully'})
    except PrivateFolderAccess.DoesNotExist:
        return Response({'error': 'Access not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_private_folder_access_view(request, username):
    """Check if current user has access to another user's private folder"""
    try:
        owner = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    # Owner always has access to their own folder
    if owner == request.user:
        return Response({'has_access': True, 'is_owner': True})

    # Check if public profile
    if owner.privacy_setting == 'public':
        return Response({'has_access': True, 'is_public': True})

    # Check if granted access
    has_access = PrivateFolderAccess.objects.filter(owner=owner, granted_to=request.user).exists()

    # Check for pending request
    pending_request = PrivateFolderAccessRequest.objects.filter(
        owner=owner, requester=request.user, status='pending'
    ).exists()

    return Response({
        'has_access': has_access,
        'pending_request': pending_request
    })


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_talent_view(request):
    """Register a new talent account"""
    serializer = TalentRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Notify admins of new talent signup
        Notification.notify_admins(
            notification_type='admin_new_talent',
            message=f'New talent signed up: @{user.username}',
            actor=user,
            related_object_type='user',
            related_object_id=user.id
        )
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Group Messaging Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_groups_view(request):
    """Get all groups the current user is a member of"""
    user = request.user
    memberships = GroupMember.objects.filter(user=user).exclude(role='pending')
    group_ids = memberships.values_list('group_id', flat=True)
    groups = GroupConversation.objects.filter(id__in=group_ids)
    serializer = GroupConversationSerializer(groups, many=True, context={'request': request})
    return Response({
        'groups': serializer.data
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_group_view(request):
    """Create a new group"""
    serializer = CreateGroupSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        group = serializer.save()
        response_serializer = GroupConversationSerializer(group, context={'request': request})
        return Response({
            'group': response_serializer.data,
            'message': 'Group created successfully'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_detail_view(request, group_id):
    """Get group details"""
    user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is a member
    if not group.members.filter(user=user).exclude(role='pending').exists():
        return Response({'error': 'Not a member of this group'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = GroupConversationSerializer(group, context={'request': request})
    return Response({
        'group': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_messages_view(request, group_id):
    """Get all messages in a group"""
    user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is a member
    if not group.members.filter(user=user).exclude(role='pending').exists():
        return Response({'error': 'Not a member of this group'}, status=status.HTTP_403_FORBIDDEN)
    
    messages = group.messages.all().select_related('sender')
    serializer = GroupMessageSerializer(messages, many=True)
    return Response({
        'messages': serializer.data
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_group_message_view(request, group_id):
    """Send a message to a group (with optional attachment)"""
    user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if user is a member
    if not group.members.filter(user=user).exclude(role='pending').exists():
        return Response({'error': 'Not a member of this group'}, status=status.HTTP_403_FORBIDDEN)

    content = request.data.get('content', '').strip()
    attachment_type = request.data.get('attachment_type', 'none')
    attachment_url = request.data.get('attachment_url')

    if attachment_type == 'none' and not content:
        return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)

    if attachment_type in ['photo', 'video'] and not attachment_url:
        return Response({'error': 'Attachment URL is required'}, status=status.HTTP_400_BAD_REQUEST)

    if content and len(content) > GroupMessage.MAX_CONTENT_LENGTH:
        return Response({'error': f'Message exceeds {GroupMessage.MAX_CONTENT_LENGTH} characters'}, status=status.HTTP_400_BAD_REQUEST)

    # Handle reply_to
    reply_to_id = request.data.get('reply_to')
    reply_to_message = None
    if reply_to_id:
        try:
            reply_to_message = GroupMessage.objects.get(id=reply_to_id, group=group)
        except GroupMessage.DoesNotExist:
            pass  # Ignore invalid reply_to

    message = GroupMessage.objects.create(
        group=group,
        sender=user,
        content=content,
        attachment_type=attachment_type,
        attachment_url=attachment_url,
        reply_to=reply_to_message,
    )
    # Update group's updated_at
    group.save()

    serializer = GroupMessageSerializer(message)
    return Response({
        'message': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_invite_link_view(request, group_id):
    """Get or generate invite link for a group (admin only)"""
    user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is an admin of the group
    membership = group.members.filter(user=user, role='admin').first()
    if not membership:
        return Response({'error': 'Only group admins can get invite links'}, status=status.HTTP_403_FORBIDDEN)
    
    if not group.invite_code:
        group.generate_invite_code()
    
    return Response({
        'invite_code': group.invite_code,
        'invite_link': f'/group/join/{group.invite_code}'
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_group_by_invite_view(request):
    """Join a group using invite code (creates pending membership)"""
    user = request.user
    invite_code = request.data.get('invite_code', '').strip()
    
    if not invite_code:
        return Response({'error': 'Invite code is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        group = GroupConversation.objects.get(invite_code=invite_code)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Invalid invite code'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if already a member
    existing = group.members.filter(user=user).first()
    if existing:
        if existing.role == 'pending':
            return Response({'error': 'Your request is pending approval'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'error': 'Already a member of this group'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create pending membership
    membership = GroupMember.objects.create(
        group=group,
        user=user,
        role='pending'
    )

    # Notify group admins about the join request
    admin_members = group.members.filter(role='admin')
    for admin_member in admin_members:
        Notification.create_notification(
            recipient=admin_member.user,
            notification_type='group_join_request',
            message=f'{user.username} requested to join "{group.name}"',
            actor=user,
            related_object_type='group',
            related_object_id=group.id
        )

    return Response({
        'message': 'Join request submitted. Waiting for admin approval.',
        'group_name': group.name
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_members_view(request, group_id):
    """Get pending members for a group (admin only)"""
    user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is an admin
    if not group.members.filter(user=user, role='admin').exists():
        return Response({'error': 'Only group admins can view pending members'}, status=status.HTTP_403_FORBIDDEN)
    
    pending = group.members.filter(role='pending').select_related('user')
    serializer = GroupMemberSerializer(pending, many=True)
    return Response({
        'pending_members': serializer.data
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admit_member_view(request, group_id, user_id):
    """Approve a pending member (admin only)"""
    admin_user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if requester is an admin
    if not group.members.filter(user=admin_user, role='admin').exists():
        return Response({'error': 'Only group admins can approve members'}, status=status.HTTP_403_FORBIDDEN)
    
    # Find the pending membership
    try:
        membership = group.members.get(user_id=user_id, role='pending')
    except GroupMember.DoesNotExist:
        return Response({'error': 'Pending member not found'}, status=status.HTTP_404_NOT_FOUND)
    
    membership.role = 'member'
    membership.save()

    # Notify the user that their request was approved
    Notification.create_notification(
        recipient=membership.user,
        notification_type='group_invite',
        message=f'Your request to join "{group.name}" was approved!',
        actor=admin_user,
        related_object_type='group',
        related_object_id=group.id
    )

    return Response({
        'message': f'{membership.user.username} has been admitted to the group'
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_member_view(request, group_id, user_id):
    """Remove a member from the group (admin only)"""
    admin_user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if requester is an admin
    if not group.members.filter(user=admin_user, role='admin').exists():
        return Response({'error': 'Only group admins can remove members'}, status=status.HTTP_403_FORBIDDEN)
    
    # Can't remove yourself if you are the only admin
    if user_id == admin_user.id:
        admin_count = group.members.filter(role='admin').count()
        if admin_count <= 1:
            return Response({'error': 'Cannot remove the only admin. Promote another admin first.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        membership = group.members.get(user_id=user_id)
    except GroupMember.DoesNotExist:
        return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
    
    username = membership.user.username
    membership.delete()
    
    return Response({
        'message': f'{username} has been removed from the group'
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_admin_view(request, group_id, user_id):
    """Promote a member to admin (admin only)"""
    admin_user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if requester is an admin
    if not group.members.filter(user=admin_user, role='admin').exists():
        return Response({'error': 'Only group admins can promote members'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        membership = group.members.get(user_id=user_id)
    except GroupMember.DoesNotExist:
        return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if membership.role == 'admin':
        return Response({'error': 'User is already an admin'}, status=status.HTTP_400_BAD_REQUEST)
    
    if membership.role == 'pending':
        return Response({'error': 'Cannot promote pending members. Admit them first.'}, status=status.HTTP_400_BAD_REQUEST)
    
    membership.role = 'admin'
    membership.save()
    
    return Response({
        'message': f'{membership.user.username} is now an admin'
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_group_view(request, group_id):
    """Leave a group"""
    user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        membership = group.members.get(user=user)
    except GroupMember.DoesNotExist:
        return Response({'error': 'Not a member of this group'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is the only admin
    if membership.role == 'admin':
        admin_count = group.members.filter(role='admin').count()
        if admin_count <= 1:
            # Check if there are other members to promote
            other_members = group.members.filter(role='member').first()
            if other_members:
                return Response({
                    'error': 'You are the only admin. Promote another member to admin before leaving.'
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # No other members, delete the group
                group.delete()
                return Response({
                    'message': 'You left and the group was deleted (no other members)'
                }, status=status.HTTP_200_OK)
    
    membership.delete()
    return Response({
        'message': 'You have left the group'
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_members_to_group_view(request, group_id):
    """Directly add members to a group (admin only)"""
    admin_user = request.user
    try:
        group = GroupConversation.objects.get(id=group_id)
    except GroupConversation.DoesNotExist:
        return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if requester is an admin
    if not group.members.filter(user=admin_user, role='admin').exists():
        return Response({'error': 'Only group admins can add members'}, status=status.HTTP_403_FORBIDDEN)
    
    user_ids = request.data.get('user_ids', [])
    if not user_ids:
        return Response({'error': 'No users specified'}, status=status.HTTP_400_BAD_REQUEST)
    
    added_users = []
    already_members = []
    not_found = []
    
    for user_id in user_ids:
        try:
            user_to_add = User.objects.get(id=user_id)
        except User.DoesNotExist:
            not_found.append(user_id)
            continue
        
        # Check if already a member
        existing = group.members.filter(user=user_to_add).first()
        if existing:
            already_members.append(user_to_add.username)
            continue
        
        # Add as member directly (no pending status when admin adds directly)
        GroupMember.objects.create(
            group=group,
            user=user_to_add,
            role='member'
        )
        added_users.append(user_to_add.username)

        # Send notification to the added user
        Notification.create_notification(
            recipient=user_to_add,
            notification_type='group_invite',
            message=f'{admin_user.username} added you to the group "{group.name}"',
            actor=admin_user,
            related_object_type='group',
            related_object_id=group.id
        )
    
    return Response({
        'message': f'Added {len(added_users)} member(s) to the group',
        'added': added_users,
        'already_members': already_members,
        'not_found': not_found
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_video_with_watermark(request, video_id):
    """Download a video with SkillArea watermark using ffmpeg"""
    from django.http import FileResponse
    
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    video_url = video.video_url
    if not video_url:
        return Response({'error': 'No video URL available'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create temp directory for processing
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, f'input_{video_id}.mp4')
    output_path = os.path.join(temp_dir, f'skillarea_{video_id}.mp4')
    
    try:
        # Download the video
        response = http_requests.get(video_url, stream=True, timeout=60)
        response.raise_for_status()
        
        with open(input_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Add watermark using ffmpeg
        # Text watermark in bottom-right corner with semi-transparent background
        watermark_text = "SkillArea"
        
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', input_path,
            '-vf', f"drawtext=text='{watermark_text}':fontsize=24:fontcolor=white@0.8:x=w-tw-20:y=h-th-20:shadowcolor=black@0.5:shadowx=2:shadowy=2",
            '-codec:a', 'copy',
            '-y',
            output_path
        ]
        
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            print(f"ffmpeg error: {result.stderr}")
            return Response(
                {'error': 'Failed to process video', 'details': result.stderr},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Return the watermarked video
        response = FileResponse(
            open(output_path, 'rb'),
            content_type='video/mp4',
            as_attachment=True,
            filename=f'skillarea_{video_id}.mp4'
        )
        
        # Clean up temp files after response is sent
        # Note: FileResponse handles closing the file
        # clean up input file now, output file stays until response completes
        if os.path.exists(input_path):
            os.remove(input_path)
        
        return response
        
    except http_requests.RequestException as e:
        return Response(
            {'error': 'Failed to download video', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except subprocess.TimeoutExpired:
        return Response(
            {'error': 'Video processing timed out'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': 'An error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        # Clean up temp directory on error
        import shutil
        if os.path.exists(temp_dir) and not os.path.exists(output_path):
            shutil.rmtree(temp_dir, ignore_errors=True)


# Favorite Video views
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite_view(request):
    """Add or remove a video from favorites"""
    video_id = request.data.get('video_id')
    
    if not video_id:
        return Response({'error': 'video_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if already favorited
    existing = FavoriteVideo.objects.filter(user=request.user, video=video).first()
    
    if existing:
        # Remove from favorites
        existing.delete()
        return Response({
            'favorited': False,
            'message': 'Removed from favorites'
        }, status=status.HTTP_200_OK)
    else:
        # Add to favorites
        favorite = FavoriteVideo.objects.create(user=request.user, video=video)
        return Response({
            'favorited': True,
            'message': 'Added to favorites',
            'favorite_id': favorite.id
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_favorites_view(request):
    """Get all favorited videos for the current user"""
    favorites = FavoriteVideo.objects.filter(user=request.user).select_related('video', 'video__user')
    serializer = FavoriteVideoSerializer(favorites, many=True, context={'request': request})
    return Response({
        'favorites': serializer.data,
        'count': favorites.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_favorite_view(request, video_id):
    """Check if a video is favorited by the current user"""
    is_favorited = FavoriteVideo.objects.filter(user=request.user, video_id=video_id).exists()
    return Response({
        'is_favorited': is_favorited
    }, status=status.HTTP_200_OK)


# Talent Favorites Views
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_talent_favorite_view(request):
    """Add or remove a talent/profile from favorites"""
    talent_id = request.data.get('talent_id')

    if not talent_id:
        return Response({'error': 'talent_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    if int(talent_id) == request.user.id:
        return Response({'error': 'Cannot favorite yourself'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        talent = User.objects.get(id=talent_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = FavoriteTalent.objects.filter(user=request.user, talent=talent).first()

    if existing:
        existing.delete()
        return Response({
            'favorited': False,
            'message': 'Removed from favorites'
        }, status=status.HTTP_200_OK)
    else:
        favorite = FavoriteTalent.objects.create(user=request.user, talent=talent)
        return Response({
            'favorited': True,
            'message': 'Added to favorites',
            'favorite_id': favorite.id
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_favorite_talents_view(request):
    """Get all favorited talents for the current user"""
    favorites = FavoriteTalent.objects.filter(user=request.user).select_related('talent')
    serializer = FavoriteTalentSerializer(favorites, many=True, context={'request': request})
    return Response({
        'favorites': serializer.data,
        'count': favorites.count()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_talent_favorite_view(request, talent_id):
    """Check if a talent is favorited by the current user"""
    is_favorited = FavoriteTalent.objects.filter(user=request.user, talent_id=talent_id).exists()
    return Response({
        'is_favorited': is_favorited
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user_view(request):
    """Register a new regular user account"""
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_agency_view(request):
    """Register a new agency account"""
    serializer = AgencyRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Notify admins of new agency signup
        Notification.notify_admins(
            notification_type='admin_new_agency',
            message=f'New agency signed up: @{user.username}',
            actor=user,
            related_object_type='user',
            related_object_id=user.id
        )
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_agency_talent_view(request):
    """Register a new agency talent account directly with invite code"""
    serializer = AgencyTalentRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Notify the agency that a new talent has been created
        if user.agency:
            Notification.create_notification(
                recipient=user.agency,
                notification_type='agency_talent_linked',
                message=f'New talent account "{user.username}" has been created via invite link',
                actor=user,
                related_object_type='user',
                related_object_id=user.id
            )
        
        # Notify admins of new agency talent signup
        Notification.notify_admins(
            notification_type='admin_new_agency_talent',
            message=f'New agency talent signed up: @{user.username}',
            actor=user,
            related_object_type='user',
            related_object_id=user.id
        )
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Agency talent registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def agencies_list_view(request):
    """Get list of all agencies for dropdown"""
    agencies = User.objects.filter(account_type='agency').values('id', 'username', 'email')
    return Response({
        'agencies': list(agencies)
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def agency_invite_link_view(request):
    """Get or generate agency invite link for talent registration"""
    # Only agency accounts can access this
    if not _is_agency(request.user):
        return Response({'error': 'Only agency accounts can manage invite links.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        # Return existing invite code or None
        return Response({
            'invite_code': request.user.agency_invite_code,
            'invite_link': f"{request.build_absolute_uri('/auth/register/agency-talent-invite/')}?invite_code={request.user.agency_invite_code}" if request.user.agency_invite_code else None
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Generate new invite code
        invite_code = request.user.generate_agency_invite_code()
        return Response({
            'invite_code': invite_code,
            'invite_link': f"{request.build_absolute_uri('/auth/register/agency-talent-invite/')}?invite_code={invite_code}"
        }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_agency_talent_invite_view(request):
    """Register a new agency talent account via invite code - requires existing talent account"""
    
    # Check if user has a talent account
    if request.user.account_type != 'talent':
        return Response({
            'error': 'You must have a talent account to create an agency talent account'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if user already has an agency talent account
    existing_agency_talent = User.objects.filter(
        email=request.user.email, 
        account_type='agency_talent'
    ).first()
    
    if existing_agency_talent:
        return Response({
            'error': 'You already have an agency talent account'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Add user's email and password to the request data
    data = request.data.copy()
    data['email'] = request.user.email
    data['password'] = request.user.password  # Use existing hashed password
    data['password_confirm'] = request.user.password
    
    serializer = AgencyTalentInviteRegisterSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()

        # Notify the agency that a new talent has been linked
        if user.agency:
            Notification.create_notification(
                recipient=user.agency,
                notification_type='agency_talent_linked',
                message=f'New talent account "{user.username}" has been created via invite link',
                actor=user,
                related_object_type='user',
                related_object_id=user.id
            )

        return Response({
            'user': UserSerializer(user).data,
            'message': 'Agency talent registration successful'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_list_view(request):
    """Get list of all users (excluding current user) for messaging"""
    current_user = request.user
    users = User.objects.exclude(id=current_user.id).values('id', 'username', 'email', 'account_type', 'profile_picture')
    return Response({
        'users': list(users)
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_account_view(request):
    """Link two accounts for switching between talent and agency_talent"""
    username_or_email = request.data.get('username_or_email')
    password = request.data.get('password')
    
    if not username_or_email or not password:
        return Response({'error': 'Username/email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Authenticate the account to be linked
    try:
        # Try to find user by username first
        target_user = User.objects.filter(username=username_or_email).first()
        
        # If not found by username, try by email
        if not target_user:
            target_user = User.objects.filter(email=username_or_email).first()
        
        if not target_user:
            return Response({'error': 'Account not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check password
        if not target_user.check_password(password):
            return Response({'error': 'Invalid password'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate that accounts can be linked
        current_user = request.user
        
        # Check account types are compatible (talent <-> agency_talent)
        valid_combinations = [
            (current_user.account_type == 'talent' and target_user.account_type == 'agency_talent'),
            (current_user.account_type == 'agency_talent' and target_user.account_type == 'talent')
        ]
        
        if not any(valid_combinations):
            return Response({
                'error': 'Can only link talent and agency_talent accounts'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if either account is already linked
        if current_user.linked_account or target_user.linked_account:
            return Response({'error': 'One or both accounts are already linked to another account'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create bidirectional link
        current_user.linked_account = target_user
        target_user.linked_account = current_user
        current_user.save()
        target_user.save()
        
        return Response({
            'message': f'Successfully linked accounts: {current_user.username} <-> {target_user.username}',
            'linked_account': UserSerializer(target_user).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_account_type_view(request):
    """Switch between 'talent' and 'agency_talent' account types for the current user."""
    # Check if user can switch accounts
    if not request.user.can_switch_account_type():
        return Response({'error': 'No linked account found. Use the link account feature to connect your talent and agency talent accounts.'}, status=status.HTTP_400_BAD_REQUEST)

    # Get the other account to switch to
    other_account = request.user.get_switchable_account()
    if not other_account:
        return Response({'error': 'Unable to find switchable account.'}, status=status.HTTP_400_BAD_REQUEST)

    # Log the user into the other account
    from django.contrib.auth import login
    login(request, other_account)
    
    return Response({
        'message': f'Switched from {request.user.account_type} to {other_account.account_type}', 
        'user': UserSerializer(other_account).data
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login a user with username or email"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        # Disallow admin accounts via regular login endpoint
        if getattr(user, 'account_type', None) == 'admin':
            return Response({
                'error': 'Admin accounts must use the admin login endpoint.'
            }, status=status.HTTP_403_FORBIDDEN)
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_admin_view(request):
    """Login for admin accounts only."""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        if getattr(user, 'account_type', None) != 'admin':
            return Response({
                'error': 'Only admin accounts can log in here.'
            }, status=status.HTTP_403_FORBIDDEN)
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Admin login successful'
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout current user"""
    logout(request)
    return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current authenticated user"""
    return Response({
        'user': UserSerializer(request.user).data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def user_profile_view(request, username):
    """Get user profile by username"""
    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    viewing_user = request.user if request.user.is_authenticated else None
    is_own_profile = viewing_user and viewing_user.id == user.id

    # Check profile privacy
    if user.privacy_setting == 'private' and not is_own_profile:
        # Check if viewer has access
        has_access = False
        access_status = None

        if viewing_user:
            # Check if granted access
            has_access = ProfileAccess.objects.filter(
                profile_owner=user, granted_to=viewing_user
            ).exists()

            if not has_access:
                # Check if there's a pending request
                access_request = ProfileAccessRequest.objects.filter(
                    profile_owner=user, requester=viewing_user
                ).first()
                if access_request:
                    access_status = access_request.status

        if not has_access:
            # Return limited profile info for private profiles
            return Response({
                'profile': {
                    'id': user.id,
                    'username': user.username,
                    'account_type': user.account_type,
                    'privacy_setting': user.privacy_setting,
                    'is_private': True,
                    'has_access': False,
                    'access_status': access_status,  # 'pending', 'denied', or None
                },
                'message': 'This profile is private. Request access to view.'
            }, status=status.HTTP_200_OK)

    # Full profile access (owner, public profile, or has access)
    from .models import Subfolder
    all_subfolders = Subfolder.objects.filter(user=user)

    serializer = UserProfileSerializer(user, context={'request': request})
    profile_data = serializer.data

    # Add public subfolders to the profile data
    public_subfolders = all_subfolders.filter(privacy_type='public')
    subfolder_data = []
    for folder in public_subfolders:
        # Count posts in this subfolder
        video_count = user.videos.filter(subfolder=folder, privacy='public').count()
        photo_count = user.photo_posts.filter(subfolder=folder, privacy='public').count()

        subfolder_data.append({
            'id': folder.id,
            'name': folder.name,
            'privacy_type': folder.privacy_type,
            'video_count': video_count,
            'photo_post_count': photo_count
        })

    profile_data['public_subfolders'] = subfolder_data
    profile_data['is_private'] = user.privacy_setting == 'private'
    profile_data['has_access'] = True

    return Response({
        'profile': profile_data
    }, status=status.HTTP_200_OK)


# Privacy Settings views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_privacy_settings_view(request):
    """Get current user's privacy settings"""
    return Response({
        'privacy_setting': request.user.privacy_setting,
        'choices': [
            {'value': 'public', 'label': 'Public', 'description': 'Your profile and public folder are visible to everyone'},
            {'value': 'private', 'label': 'Private', 'description': 'All content moves to private folder. Users need to request access.'},
            {'value': 'hidden', 'label': 'Hidden', 'description': 'Profile not discoverable in search, but accessible via direct link.'},
        ]
    }, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_privacy_settings_view(request):
    """Update current user's privacy settings and bulk-move all content"""
    privacy_setting = request.data.get('privacy_setting')

    valid_choices = ['public', 'private', 'hidden']
    if privacy_setting not in valid_choices:
        return Response({
            'error': f'Invalid privacy setting. Must be one of: {valid_choices}'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Agency talents can only use public or hidden (not private)
    if request.user.account_type == 'agency_talent' and privacy_setting == 'private':
        return Response({
            'error': 'Agency talents can only use public or hidden privacy settings'
        }, status=status.HTTP_400_BAD_REQUEST)

    old_setting = request.user.privacy_setting
    request.user.privacy_setting = privacy_setting
    request.user.save(update_fields=['privacy_setting'])

    if old_setting != privacy_setting:
        # Move all videos to the appropriate privacy folder
        Video.objects.filter(user=request.user).update(privacy=privacy_setting, subfolder=None)
        # Move all photo posts to the appropriate privacy folder
        PhotoPost.objects.filter(user=request.user).update(privacy=privacy_setting, subfolder=None)
        # Update all subfolders to match the new privacy type
        Subfolder.objects.filter(user=request.user).update(privacy_type=privacy_setting)

    return Response({
        'message': 'Privacy settings updated successfully.',
        'privacy_setting': request.user.privacy_setting
    }, status=status.HTTP_200_OK)


# Messaging views

@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversations_list_view(request):
    """Get all conversations for the current user"""
    user = request.user
    conversations = Conversation.objects.filter(
        Q(participant1=user) | Q(participant2=user)
    ).select_related('participant1', 'participant2').prefetch_related('messages')
    
    serializer = ConversationSerializer(conversations, many=True, context={'request': request})
    return Response({
        'conversations': serializer.data
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_or_get_conversation_view(request):
    """Create a new conversation or get existing one"""
    user = request.user
    serializer = CreateConversationSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        participant_id = serializer.validated_data['participant_id']
        other_user = User.objects.get(id=participant_id)
        
        # Check if conversation already exists
        conversation = Conversation.objects.filter(
            (Q(participant1=user) & Q(participant2=other_user)) |
            (Q(participant1=other_user) & Q(participant2=user))
        ).first()
        
        if not conversation:
            # Create new conversation
            conversation = Conversation.objects.create(
                participant1=user,
                participant2=other_user
            )
        
        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response({
            'conversation': serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_messages_view(request, conversation_id):
    """Get all messages in a conversation"""
    user = request.user
    
    try:
        conversation = Conversation.objects.filter(
            id=conversation_id
        ).filter(
            Q(participant1=user) | Q(participant2=user)
        ).first()
        
        if not conversation:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    messages = conversation.messages.all()
    serializer = MessageSerializer(messages, many=True)
    return Response({
        'messages': serializer.data
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message_view(request, conversation_id):
    """Send a message in a conversation (with optional attachment)"""
    user = request.user

    conversation = Conversation.objects.filter(
        id=conversation_id
    ).filter(
        Q(participant1=user) | Q(participant2=user)
    ).first()

    if not conversation:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = CreateMessageSerializer(data=request.data)
    if serializer.is_valid():
        # Handle reply_to
        reply_to_id = request.data.get('reply_to')
        reply_to_message = None
        if reply_to_id:
            try:
                reply_to_message = Message.objects.get(id=reply_to_id, conversation=conversation)
            except Message.DoesNotExist:
                pass  # Ignore invalid reply_to

        message = Message.objects.create(
            conversation=conversation,
            sender=user,
            content=serializer.validated_data.get('content', ''),
            attachment_type=serializer.validated_data.get('attachment_type', 'none'),
            attachment_url=serializer.validated_data.get('attachment_url'),
            reply_to=reply_to_message,
        )
        # Update conversation's updated_at
        conversation.save()

        response_serializer = MessageSerializer(message)
        return Response({
            'message': response_serializer.data
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_message_read_view(request, message_id):
    """Mark a message as read"""
    user = request.user
    
    try:
        message = Message.objects.select_related('conversation').get(id=message_id)
        # Verify user is a participant in the conversation
        conversation = message.conversation
        if conversation.participant1 != user and conversation.participant2 != user:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Only mark as read if user is not the sender
        if message.sender != user and not message.read_at:
            from django.utils import timezone
            message.read_at = timezone.now()
            message.save()
        
        serializer = MessageSerializer(message)
        return Response({
            'message': serializer.data
        }, status=status.HTTP_200_OK)
    except Message.DoesNotExist:
        return Response(
            {'error': 'Message not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# Post Report views
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_post_report_view(request):
    """Submit a post report (video or photo) and send email notification to admin"""
    import pytz

    serializer = CreatePostReportSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        report = serializer.save()

        # Determine post type and get relevant info
        if report.video:
            post_type = 'Video'
            post_id = report.video.id
            post_title = report.video.description[:50] if report.video.description else f'Video #{report.video.id}'
            post_owner = report.video.user
        else:
            post_type = 'Photo Post'
            post_id = report.photo_post.id
            post_title = report.photo_post.description[:50] if report.photo_post.description else f'Photo #{report.photo_post.id}'
            post_owner = report.photo_post.user

        try:
            mountain_tz = pytz.timezone('America/Edmonton')
            local_time = report.created_at.astimezone(mountain_tz)
            formatted_date = local_time.strftime('%B %d, %Y at %I:%M %p %Z')

            subject = f"Post Report: {post_type} by @{post_owner.username} - {report.get_reason_display()}"
            message = f"""Post Report Details

Reporter: @{report.reporter.username} (ID: {report.reporter.id})
Post Type: {post_type}
Post ID: {post_id}
Post Title: {post_title}
Post Owner: @{post_owner.username} (ID: {post_owner.id})
Reason: {report.get_reason_display()}
Additional Details: {report.note or 'None provided'}
Date: {formatted_date}
Report ID: {report.id}

---
SkillArea Admin Panel
"""
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.ADMIN_EMAIL],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send report email: {e}")

        extra_data = {'reason': report.reason}
        if report.video:
            extra_data['video_id'] = report.video.id
        else:
            extra_data['photo_post_id'] = report.photo_post.id

        Notification.notify_admins(
            notification_type='admin_post_report',
            message=f'New post report: {report.get_reason_display()} - {post_type} by @{post_owner.username}',
            actor=request.user,
            related_object_type='post_report',
            related_object_id=report.id,
            extra_data=extra_data
        )

        response_serializer = PostReportSerializer(report)
        return Response({
            'report': response_serializer.data,
            'message': 'Report submitted successfully'
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_post_reports_view(request):
    """Get all post reports for admin panel (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    reports = PostReport.objects.all().select_related(
        'reporter', 'video', 'video__user', 'photo_post', 'photo_post__user'
    )

    reporter_type = request.query_params.get('reporter_type')
    if reporter_type and reporter_type != 'all':
        reports = reports.filter(reporter__account_type=reporter_type)

    serializer = PostReportSerializer(reports, many=True)
    return Response({
        'reports': serializer.data,
        'total_count': reports.count(),
        'pending_count': reports.filter(status='pending').count(),
        'resolved_count': reports.filter(status='resolved').count()
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_post_report_status_view(request, report_id):
    """Update a post report's status (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    try:
        report = PostReport.objects.get(id=report_id)
    except PostReport.DoesNotExist:
        return Response(
            {'error': 'Report not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = UpdatePostReportStatusSerializer(report, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        response_serializer = PostReportSerializer(report)
        return Response({
            'report': response_serializer.data,
            'message': 'Report status updated successfully'
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_message_report_view(request):
    """Submit a message report and send email notification to admin"""
    import pytz

    serializer = CreateMessageReportSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    message_id = data.get('message_id')
    group_message_id = data.get('group_message_id')
    reason = data.get('reason')
    note = data.get('note', '')

    message_obj = None
    group_message_obj = None
    reported_user = None
    message_content = ''

    if message_id:
        try:
            message_obj = Message.objects.select_related('sender', 'conversation').get(id=message_id)
            reported_user = message_obj.sender
            message_content = message_obj.content or '[Attachment]'
            conv = message_obj.conversation
            if request.user != conv.participant1 and request.user != conv.participant2:
                return Response({'error': 'You cannot report messages from conversations you are not part of'},
                                status=status.HTTP_403_FORBIDDEN)
        except Message.DoesNotExist:
            return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        try:
            group_message_obj = GroupMessage.objects.select_related('sender', 'group').get(id=group_message_id)
            reported_user = group_message_obj.sender
            message_content = group_message_obj.content or '[Attachment]'
            if not group_message_obj.group.members.filter(user=request.user).exclude(role='pending').exists():
                return Response({'error': 'You cannot report messages from groups you are not part of'},
                                status=status.HTTP_403_FORBIDDEN)
        except GroupMessage.DoesNotExist:
            return Response({'error': 'Group message not found'}, status=status.HTTP_404_NOT_FOUND)

    if reported_user == request.user:
        return Response({'error': 'You cannot report your own message'}, status=status.HTTP_400_BAD_REQUEST)

    report = MessageReport.objects.create(
        reporter=request.user,
        message=message_obj,
        group_message=group_message_obj,
        reported_user=reported_user,
        reason=reason,
        note=note,
        message_content=message_content,
    )

    try:
        mountain_tz = pytz.timezone('America/Edmonton')
        local_time = report.created_at.astimezone(mountain_tz)
        formatted_date = local_time.strftime('%B %d, %Y at %I:%M %p %Z')

        msg_type = 'Direct Message' if message_obj else 'Group Message'
        subject = f"Message Report: @{reported_user.username} - {report.get_reason_display()}"
        email_message = f"""Message Report Details

Reporter: @{report.reporter.username} (ID: {report.reporter.id})
Reported User: @{reported_user.username} (ID: {reported_user.id})
Message Type: {msg_type}
Reason: {report.get_reason_display()}
Additional Details: {note or 'None provided'}
Date: {formatted_date}
Report ID: {report.id}

Message Content:
"{message_content}"

---
SkillArea Admin Panel
"""
        send_mail(
            subject=subject,
            message=email_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.ADMIN_EMAIL],
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send message report email: {e}")

    msg_type = 'DM' if message_obj else 'Group'
    Notification.notify_admins(
        notification_type='admin_message_report',
        message=f'New message report: {report.get_reason_display()} - {msg_type} from @{reported_user.username}',
        actor=request.user,
        related_object_type='message_report',
        related_object_id=report.id,
        extra_data={'reported_user_id': reported_user.id, 'reason': reason}
    )

    response_serializer = MessageReportSerializer(report)
    return Response({
        'report': response_serializer.data,
        'message': 'Report submitted successfully'
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_message_reports_view(request):
    """Get all message reports for admin panel (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    reports = MessageReport.objects.all().select_related('reporter', 'reported_user', 'message', 'group_message')

    reporter_type = request.query_params.get('reporter_type')
    if reporter_type and reporter_type != 'all':
        reports = reports.filter(reporter__account_type=reporter_type)

    serializer = MessageReportSerializer(reports, many=True)
    return Response({
        'reports': serializer.data,
        'total_count': reports.count(),
        'pending_count': reports.filter(status='pending').count(),
        'resolved_count': reports.filter(status='resolved').count()
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_message_report_status_view(request, report_id):
    """Update a message report's status (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        report = MessageReport.objects.get(id=report_id)
    except MessageReport.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = UpdateMessageReportStatusSerializer(report, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        response_serializer = MessageReportSerializer(report)
        return Response({
            'report': response_serializer.data,
            'message': 'Report status updated successfully'
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def get_total_collaborations():
    User = get_user_model() # Get your User model class
    result = User.objects.aggregate(total_sum=Sum('collaboration_count'))
    final_number = result['total_sum'] or 0
    
    return final_number

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_analytics_stats_view(request):
    """Get overview statistics for admin dashboard (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    # Count users by account type
    total_users = User.objects.filter(account_type='user').count()
    total_talents = User.objects.filter(account_type='talent').count()
    total_agencies = User.objects.filter(account_type='agency').count()
    total_groups = GroupConversation.objects.count()

    # Referrals - count users who were referred (have referred_by set)
    total_referrals = User.objects.filter(referred_by__isnull=False).count()
    user_referrals = User.objects.filter(referred_by__isnull=False, account_type='user').count()
    talent_referrals = User.objects.filter(referred_by__isnull=False, account_type='talent').count()
    agency_referrals = User.objects.filter(referred_by__isnull=False, account_type='agency').count()

    # Collabs
    total_collabs = get_total_collaborations()

    # Suspended accounts - count users with is_suspended=True
    total_suspended = User.objects.filter(is_suspended=True).count()

    # Suspended posts - count videos and photos with is_suspended=True
    suspended_videos = Video.objects.filter(is_suspended=True).count()
    suspended_photos = PhotoPost.objects.filter(is_suspended=True).count()
    total_suspended_posts = suspended_videos + suspended_photos

    return Response({
        'stats': {
            'total_users': total_users,
            'total_talents': total_talents,
            'total_agencies': total_agencies,
            'total_referrals': total_referrals,
            'total_collabs': total_collabs,
            'total_groups': total_groups,
            'total_suspended': total_suspended,
            'total_suspended_posts': total_suspended_posts,
        },
        'referral_breakdown': {
            'user_referrals': user_referrals,
            'talent_referrals': talent_referrals,
            'agency_referrals': agency_referrals,
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users_list_view(request):
    """Get list of all regular users with their stats (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    from django.db.models import Count

    users = User.objects.filter(account_type='user').annotate(
        message_reports_count=Count('message_reports_against')
    ).order_by('-date_joined')

    users_data = []
    for idx, user in enumerate(users, 1):
        users_data.append({
            'no': idx,
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'join_date': user.date_joined.isoformat(),
            'message_reports': user.message_reports_count,
        })

    return Response({
        'users': users_data,
        'total': len(users_data)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_talents_list_view(request):
    """Get list of all talents with their stats (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    from django.db.models import Count, Q

    talents = User.objects.filter(account_type='talent').annotate(
        message_reports_count=Count('message_reports_against'),
        post_reports_count=Count('videos__reports'),
        post_suspends_count=Count('videos', filter=Q(videos__is_suspended=True))
    ).order_by('-date_joined')

    talents_data = []
    for idx, talent in enumerate(talents, 1):
        talents_data.append({
            'no': idx,
            'id': talent.id,
            'username': talent.username,
            'email': talent.email,
            'join_date': talent.date_joined.isoformat(),
            'talent_date': talent.upgraded_at.isoformat() if talent.upgraded_at else None,
            'message_reports': talent.message_reports_count,
            'post_reports': talent.post_reports_count,
            'post_suspends': talent.post_suspends_count,
            'is_suspended': talent.is_suspended,
        })

    return Response({
        'talents': talents_data,
        'total': len(talents_data)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_agencies_list_view(request):
    """Get list of all agencies with their stats (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    from django.db.models import Count, Q

    agencies = User.objects.filter(account_type='agency').annotate(
        message_reports_count=Count('message_reports_against'),
        post_reports_count=Count('videos__reports'),
        post_suspends_count=Count('videos', filter=Q(videos__is_suspended=True))
    ).order_by('-date_joined')

    agencies_data = []
    for idx, agency in enumerate(agencies, 1):
        agencies_data.append({
            'no': idx,
            'id': agency.id,
            'username': agency.username,
            'email': agency.email,
            'join_date': agency.date_joined.isoformat(),
            'agency_date': agency.upgraded_at.isoformat() if agency.upgraded_at else None,
            'message_reports': agency.message_reports_count,
            'post_reports': agency.post_reports_count,
            'post_suspends': agency.post_suspends_count,
            'is_suspended': agency.is_suspended,
        })

    return Response({
        'agencies': agencies_data,
        'total': len(agencies_data)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_suspended_accounts_view(request):
    """Get list of suspended accounts (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    # Filter by account type if provided
    account_type = request.query_params.get('type', None)

    suspended_users = User.objects.filter(is_suspended=True)

    if account_type and account_type in ['user', 'talent', 'agency', 'agency_talent']:
        suspended_users = suspended_users.filter(account_type=account_type)

    suspended_users = suspended_users.order_by('-suspended_date')

    suspended_data = []
    for idx, user in enumerate(suspended_users, 1):
        suspended_data.append({
            'no': idx,
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'account_type': user.account_type,
            'suspended_date': user.suspended_date.isoformat() if user.suspended_date else None,
            'suspension_note': user.suspension_note or '',
        })

    return Response({
        'suspended_accounts': suspended_data,
        'total': len(suspended_data)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_suspended_posts_view(request):
    """Get list of all suspended posts (videos and photos) - admin only"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    # Filter by post type if provided
    post_type = request.query_params.get('type', None)

    suspended_posts = []

    # Get suspended videos
    if post_type is None or post_type == 'video':
        suspended_videos = Video.objects.filter(is_suspended=True).select_related('user').order_by('-suspended_at')
        for video in suspended_videos:
            suspended_posts.append({
                'id': video.id,
                'post_type': 'video',
                'owner_id': video.user.id,
                'owner_username': video.user.username,
                'description': video.description[:100] + '...' if len(video.description) > 100 else video.description,
                'suspended_at': video.suspended_at.isoformat() if video.suspended_at else None,
                'suspension_reason': video.suspension_reason or '',
                'video_url': video.video_url,
            })

    # Get suspended photo posts
    if post_type is None or post_type == 'photo':
        suspended_photos = PhotoPost.objects.filter(is_suspended=True).select_related('user').order_by('-suspended_at')
        for photo in suspended_photos:
            # Get the first image URL for preview
            first_image = photo.images.first()
            suspended_posts.append({
                'id': photo.id,
                'post_type': 'photo',
                'owner_id': photo.user.id,
                'owner_username': photo.user.username,
                'description': photo.description[:100] + '...' if len(photo.description) > 100 else photo.description,
                'suspended_at': photo.suspended_at.isoformat() if photo.suspended_at else None,
                'suspension_reason': photo.suspension_reason or '',
                'image_url': first_image.image_url if first_image else None,
            })

    # Sort by suspended_at date descending
    suspended_posts.sort(key=lambda x: x['suspended_at'] or '', reverse=True)

    return Response({
        'suspended_posts': suspended_posts,
        'total': len(suspended_posts)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_recent_signups_view(request):
    """Get recent signups as notifications (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    # Get recent talents and agencies (last 20)
    recent_talents = User.objects.filter(
        account_type='talent'
    ).order_by('-date_joined')[:10]

    recent_agencies = User.objects.filter(
        account_type='agency'
    ).order_by('-date_joined')[:10]

    notifications = []

    for talent in recent_talents:
        notifications.append({
            'id': f'talent_{talent.id}',
            'type': 'new_talent',
            'message': f'{talent.username} joined as a {talent.genre} creator' if talent.genre else f'{talent.username} joined as a talent',
            'timestamp': talent.date_joined.isoformat(),
            'read': True,  # Mark as read by default
        })

    for agency in recent_agencies:
        notifications.append({
            'id': f'agency_{agency.id}',
            'type': 'new_agency',
            'message': f'{agency.username} registered as an agency',
            'timestamp': agency.date_joined.isoformat(),
            'read': True,
        })

    # Sort by timestamp descending
    notifications.sort(key=lambda x: x['timestamp'], reverse=True)

    return Response({
        'notifications': notifications[:20]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_notifications_view(request):
    """Get all notifications for the authenticated user"""
    notifications = Notification.objects.filter(recipient=request.user)

    # Filter by type if provided (supports comma-separated types)
    notification_type = request.query_params.get('type')
    if notification_type:
        types = [t.strip() for t in notification_type.split(',')]
        notifications = notifications.filter(notification_type__in=types)

    # Filter by category if provided (admin = all admin notification types)
    category = request.query_params.get('category')
    if category == 'admin':
        admin_types = ['admin_new_talent', 'admin_new_agency', 'admin_post_report', 'admin_message_report']
        notifications = notifications.filter(notification_type__in=admin_types)

    # Filter by read status if provided
    is_read = request.query_params.get('is_read')
    if is_read is not None:
        notifications = notifications.filter(is_read=is_read.lower() == 'true')

    serializer = NotificationSerializer(notifications, many=True)

    # Also return unread count
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

    return Response({
        'notifications': serializer.data,
        'unread_count': unread_count
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_detail_view(request, notification_id):
    """Get a single notification"""
    try:
        notification = Notification.objects.get(id=notification_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = NotificationSerializer(notification)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read_view(request, notification_id):
    """Mark a notification as read"""
    from django.utils import timezone

    try:
        notification = Notification.objects.get(id=notification_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save()

    serializer = NotificationSerializer(notification)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read_view(request):
    """Mark all notifications as read for the authenticated user"""
    from django.utils import timezone

    updated_count = Notification.objects.filter(
        recipient=request.user,
        is_read=False
    ).update(is_read=True, read_at=timezone.now())

    return Response({
        'message': f'Marked {updated_count} notifications as read',
        'updated_count': updated_count
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification_view(request, notification_id):
    """Delete a notification"""
    try:
        notification = Notification.objects.get(id=notification_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    notification.delete()
    return Response({'message': 'Notification deleted'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_all_notifications_view(request):
    """Delete all notifications for the authenticated user"""
    deleted_count, _ = Notification.objects.filter(recipient=request.user).delete()
    return Response({
        'message': f'Deleted {deleted_count} notifications',
        'deleted_count': deleted_count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_suspend_post_view(request):
    """Suspend a video or photo post (admin only)"""
    from django.utils import timezone

    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    post_type = request.data.get('post_type')  # 'video' or 'photo'
    post_id = request.data.get('post_id')
    reason = request.data.get('reason', '')

    if not post_type or not post_id:
        return Response(
            {'error': 'post_type and post_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if post_type not in ['video', 'photo']:
        return Response(
            {'error': 'post_type must be "video" or "photo"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the post
    if post_type == 'video':
        try:
            post = Video.objects.get(id=post_id)
        except Video.DoesNotExist:
            return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        try:
            post = PhotoPost.objects.get(id=post_id)
        except PhotoPost.DoesNotExist:
            return Response({'error': 'Photo post not found'}, status=status.HTTP_404_NOT_FOUND)

    # Suspend the post
    post.is_suspended = True
    post.suspended_at = timezone.now()
    post.suspension_reason = reason
    post.save()

    # Send notification to post owner
    post_type_display = 'video' if post_type == 'video' else 'photo post'
    Notification.create_notification(
        recipient=post.user,
        notification_type='post_suspended',
        message=f'Your {post_type_display} has been suspended.' + (f' Reason: {reason}' if reason else ''),
        actor=request.user,
        related_object_type=post_type,
        related_object_id=post.id,
        extra_data={'reason': reason} if reason else None
    )

    return Response({
        'message': f'{post_type.capitalize()} suspended successfully',
        'post_id': post.id,
        'post_type': post_type,
        'suspended_at': post.suspended_at.isoformat(),
        'reason': reason
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_unsuspend_post_view(request):
    """Unsuspend a video or photo post (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    post_type = request.data.get('post_type')
    post_id = request.data.get('post_id')

    if not post_type or not post_id:
        return Response(
            {'error': 'post_type and post_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if post_type not in ['video', 'photo']:
        return Response(
            {'error': 'post_type must be "video" or "photo"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the post
    if post_type == 'video':
        try:
            post = Video.objects.get(id=post_id)
        except Video.DoesNotExist:
            return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        try:
            post = PhotoPost.objects.get(id=post_id)
        except PhotoPost.DoesNotExist:
            return Response({'error': 'Photo post not found'}, status=status.HTTP_404_NOT_FOUND)

    # Unsuspend the post
    post.is_suspended = False
    post.suspended_at = None
    post.suspension_reason = None
    post.save()

    return Response({
        'message': f'{post_type.capitalize()} unsuspended successfully',
        'post_id': post.id,
        'post_type': post_type
    })


# Account Suspension Views 

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_suspend_account_view(request):
    """Suspend a user account (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    reason = request.data.get('reason', '')

    if not user_id:
        return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Don't allow suspending admin accounts
    if user.account_type == 'admin':
        return Response({'error': 'Cannot suspend admin accounts'}, status=status.HTTP_400_BAD_REQUEST)

    # Already suspended check
    if user.is_suspended:
        return Response({'error': 'Account is already suspended'}, status=status.HTTP_400_BAD_REQUEST)

    # Suspend the account
    from django.utils import timezone
    user.is_suspended = True
    user.suspended_date = timezone.now()
    user.suspension_note = reason
    user.save()

    return Response({
        'message': 'Account suspended successfully',
        'user_id': user.id,
        'username': user.username
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_unsuspend_account_view(request):
    """Unsuspend a user account (admin only)"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')

    if not user_id:
        return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Not suspended check
    if not user.is_suspended:
        return Response({'error': 'Account is not suspended'}, status=status.HTTP_400_BAD_REQUEST)

    # Unsuspend the account
    user.is_suspended = False
    user.suspended_date = None
    user.suspension_note = None
    user.save()

    return Response({
        'message': 'Account unsuspended successfully',
        'user_id': user.id,
        'username': user.username
    })


# --- Folder Management Views ---

class FolderListView(APIView):
    """List all folders for the current user"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import PostFolder
        from .serializers import PostFolderSerializer
        
        user = request.user
        
        # Agency talent sees folders created by their agency
        if user.account_type == 'agency_talent' and user.agency:
            folders = PostFolder.objects.filter(user=user.agency).order_by('parent_id', 'name')
        # Agency and others see their own folders
        else:
            folders = PostFolder.objects.filter(user=user).order_by('parent_id', 'name')
        
        serializer = PostFolderSerializer(folders, many=True)
        return Response(serializer.data)


class FolderCreateView(APIView):
    """Create a new folder or subfolder"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import PostFolder
        from .serializers import PostFolderSerializer
        
        name = request.data.get('name', '').strip()
        parent_id = request.data.get('parent_id', None)
        privacy = request.data.get('privacy', 'public')
        
        if not name:
            return Response({'error': 'Folder name is required.'}, status=400)
        
        if len(name) > 100:
            return Response({'error': 'Folder name too long (max 100 characters).'}, status=400)
        
        if privacy not in ['public', 'private', 'hidden']:
            return Response({'error': 'Invalid privacy setting.'}, status=400)
        
        # Get parent if specified
        parent = None
        if parent_id:
            try:
                parent = PostFolder.objects.get(id=parent_id, user=request.user)
                # Don't allow subsubfolders (max 2 levels)
                if parent.parent:
                    return Response({'error': 'Cannot create subfolders more than 2 levels deep.'}, status=400)
            except PostFolder.DoesNotExist:
                return Response({'error': 'Parent folder not found.'}, status=400)
        
        # Check for duplicate names in same parent
        existing = PostFolder.objects.filter(
            user=request.user,
            name=name,
            parent=parent
        ).exists()
        
        if existing:
            parent_name = parent.name if parent else 'root'
            return Response({'error': f'A folder named "{name}" already exists in {parent_name}.'}, status=400)
        
        folder = PostFolder.objects.create(
            user=request.user,
            name=name,
            parent=parent,
            privacy=privacy
        )
        
        serializer = PostFolderSerializer(folder)
        return Response(serializer.data, status=201)


class FolderUpdateView(APIView):
    """Update folder name"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, folder_id):
        from .models import PostFolder
        from .serializers import PostFolderSerializer
        
        try:
            folder = PostFolder.objects.get(id=folder_id)
        except PostFolder.DoesNotExist:
            return Response({'error': 'Folder not found.'}, status=404)
        
        # Check permissions: owner or agency managing their talent's folder
        user = request.user
        if folder.user == user:
            # Owner can update their own folder
            pass
        elif user.account_type == 'agency' and folder.user.account_type == 'agency_talent' and folder.user.agency == user:
            # Agency can update their talent's folder
            pass
        else:
            return Response({'error': 'Not authorized to update this folder'}, status=403)
        
        if folder.is_default:
            return Response({'error': 'Cannot modify default folders.'}, status=400)
        
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Folder name is required.'}, status=400)
        
        if len(name) > 100:
            return Response({'error': 'Folder name too long (max 100 characters).'}, status=400)
        
        # Check for duplicate names in same parent
        existing = PostFolder.objects.filter(
            user=folder.user,
            name=name,
            parent=folder.parent
        ).exclude(id=folder.id).exists()
        
        if existing:
            parent_name = folder.parent.name if folder.parent else 'root'
            return Response({'error': f'A folder named "{name}" already exists in {parent_name}.'}, status=400)
        
        folder.name = name
        folder.save()
        
        serializer = PostFolderSerializer(folder)
        return Response(serializer.data)


class FolderDeleteView(APIView):
    """Delete a folder"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, folder_id):
        from .models import PostFolder
        
        try:
            folder = PostFolder.objects.get(id=folder_id)
        except PostFolder.DoesNotExist:
            return Response({'error': 'Folder not found.'}, status=404)
        
        # Check permissions: owner or agency managing their talent's folder
        user = request.user
        if folder.user == user:
            # Owner can delete their own folder
            pass
        elif user.account_type == 'agency' and folder.user.account_type == 'agency_talent' and folder.user.agency == user:
            # Agency can delete their talent's folder
            pass
        else:
            return Response({'error': 'Not authorized to delete this folder'}, status=403)
        
        if folder.is_default:
            return Response({'error': 'Cannot delete default folders.'}, status=400)
        
        # Check if this is a root folder (parent=None) with subfolders
        if folder.parent is None:
            subfolder_count = PostFolder.objects.filter(parent=folder).count()
            if subfolder_count > 0:
                return Response({'error': 'Cannot delete root folders that contain subfolders. Delete the subfolders first.'}, status=400)
        
        # Delete all videos and photo posts in this folder
        folder.videos.all().delete()
        folder.photo_posts.all().delete()
        
        # Delete the folder
        folder.delete()
        return Response({'message': 'Folder and its contents deleted successfully.'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_folder_privacy_view(request, folder_id):
    """Update privacy setting for a PostFolder"""
    from .models import PostFolder
    from .serializers import PostFolderSerializer
    
    try:
        folder = PostFolder.objects.get(id=folder_id)
    except PostFolder.DoesNotExist:
        return Response({'error': 'Folder not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions: owner or agency managing their talent's folder
    user = request.user
    if folder.user == user:
        # Owner can update their own folder privacy
        pass
    elif user.account_type == 'agency' and folder.user.account_type == 'agency_talent' and folder.user.agency == user:
        # Agency can update their talent's folder privacy
        pass
    else:
        return Response({'error': 'Not authorized to update this folder'}, status=status.HTTP_403_FORBIDDEN)
    
    privacy = request.data.get('privacy')
    if privacy not in ['public', 'private', 'hidden']:
        return Response({'error': 'Invalid privacy setting. Must be public, private, or hidden.'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    folder.privacy = privacy
    folder.save()
    
    serializer = PostFolderSerializer(folder)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_subfolder_privacy_view(request, subfolder_id):
    """Update privacy setting for a Subfolder"""
    from .models import Subfolder
    from .serializers import SubfolderSerializer
    
    try:
        subfolder = Subfolder.objects.get(id=subfolder_id)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions: owner or agency managing their talent's folder
    user = request.user
    if subfolder.user == user:
        # Owner can update their own subfolder privacy
        pass
    elif user.account_type == 'agency' and subfolder.user.account_type == 'agency_talent' and subfolder.user.agency == user:
        # Agency can update their talent's subfolder privacy
        pass
    else:
        return Response({'error': 'Not authorized to update this subfolder'}, status=status.HTTP_403_FORBIDDEN)
    
    privacy = request.data.get('privacy')
    if privacy not in ['public', 'private', 'hidden']:
        return Response({'error': 'Invalid privacy setting. Must be public, private, or hidden.'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    subfolder.privacy = privacy
    subfolder.privacy_type = privacy  # Keep old field in sync for now
    subfolder.save()
    
    serializer = SubfolderSerializer(subfolder)
    return Response(serializer.data)


# Admin Password Change

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_change_password_view(request):
    """Allow admin to change their password"""
    if not _is_admin(request.user):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    # Validate inputs
    if not current_password or not new_password or not confirm_password:
        return Response(
            {'error': 'All fields are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if new_password != confirm_password:
        return Response(
            {'error': 'New passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 6:
        return Response(
            {'error': 'Password must be at least 6 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check current password
    if not request.user.check_password(current_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set new password
    request.user.set_password(new_password)
    request.user.save()

    return Response({'message': 'Password changed successfully'})


# Profile Access Views
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_profile_access_view(request):
    """Request access to view a private profile"""
    username = request.data.get('username')
    message = request.data.get('message', '')

    if not username:
        return Response({'error': 'username is required'}, status=400)

    try:
        profile_owner = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    if profile_owner == request.user:
        return Response({'error': 'You cannot request access to your own profile'}, status=400)

    # Check if profile is public (no need to request)
    if profile_owner.privacy_setting == 'public':
        return Response({'error': 'This profile is public, no access request needed'}, status=400)

    # Check if already has access
    if ProfileAccess.objects.filter(profile_owner=profile_owner, granted_to=request.user).exists():
        return Response({'error': 'You already have access to this profile'}, status=400)

    # Check if already requested
    existing_request = ProfileAccessRequest.objects.filter(profile_owner=profile_owner, requester=request.user).first()
    if existing_request:
        if existing_request.status == 'pending':
            return Response({'error': 'You already have a pending request'}, status=400)
        elif existing_request.status == 'denied':
            # Allow re-request if previously denied
            existing_request.status = 'pending'
            existing_request.message = message
            existing_request.save()
            return Response({
                'message': 'Access request re-submitted',
                'request': ProfileAccessRequestSerializer(existing_request).data
            })

    # Create new request
    access_request = ProfileAccessRequest.objects.create(
        profile_owner=profile_owner,
        requester=request.user,
        message=message
    )

    # Create notification for the profile owner
    Notification.create_notification(
        recipient=profile_owner,
        notification_type='profile_access_request',
        message=f'{request.user.username} requested access to view your profile',
        actor=request.user,
        related_object_type='profile_access_request',
        related_object_id=access_request.id
    )

    return Response({
        'message': f'Access request sent to {profile_owner.username}',
        'request': ProfileAccessRequestSerializer(access_request).data
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_profile_access_requests_view(request):
    """Get all pending access requests for user's profile (as owner)"""
    requests = ProfileAccessRequest.objects.filter(profile_owner=request.user, status='pending')
    return Response({
        'requests': ProfileAccessRequestSerializer(requests, many=True).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_profile_access_request_view(request, request_id):
    """Approve or deny a profile access request"""
    action = request.data.get('action')

    if action not in ['approve', 'deny']:
        return Response({'error': 'action must be "approve" or "deny"'}, status=400)

    try:
        access_request = ProfileAccessRequest.objects.get(id=request_id, profile_owner=request.user)
    except ProfileAccessRequest.DoesNotExist:
        return Response({'error': 'Access request not found'}, status=404)

    if access_request.status != 'pending':
        return Response({'error': f'Request already {access_request.status}'}, status=400)

    if action == 'approve':
        access_request.status = 'approved'
        access_request.save()
        ProfileAccess.objects.get_or_create(
            profile_owner=request.user,
            granted_to=access_request.requester
        )
        # Notify requester that access was granted
        Notification.create_notification(
            recipient=access_request.requester,
            notification_type='profile_access_granted',
            message=f'{request.user.username} approved your profile access request',
            actor=request.user,
            related_object_type='profile_access',
            related_object_id=access_request.id
        )
        return Response({'message': f'Access granted to {access_request.requester.username}'})
    else:
        access_request.status = 'denied'
        access_request.save()
        # Notify requester that access was denied
        Notification.create_notification(
            recipient=access_request.requester,
            notification_type='profile_access_denied',
            message=f'{request.user.username} denied your profile access request',
            actor=request.user,
            related_object_type='profile_access_request',
            related_object_id=access_request.id
        )
        return Response({'message': 'Access request denied'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_access_list_view(request):
    """Get list of users who have access to view current user's profile"""
    access_list = ProfileAccess.objects.filter(profile_owner=request.user)
    return Response({
        'access_list': ProfileAccessSerializer(access_list, many=True).data
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_profile_access_view(request, user_id):
    """Revoke a user's access to view current user's profile"""
    try:
        access = ProfileAccess.objects.get(profile_owner=request.user, granted_to_id=user_id)
        access.delete()
        # Also delete any existing access request
        ProfileAccessRequest.objects.filter(profile_owner=request.user, requester_id=user_id).delete()
        return Response({'message': 'Access revoked successfully'})
    except ProfileAccess.DoesNotExist:
        return Response({'error': 'Access not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_profile_access_view(request, username):
    """Check if current user has access to view another user's profile"""
    try:
        profile_owner = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    # Owner always has access to their own profile
    if profile_owner == request.user:
        return Response({'has_access': True, 'is_owner': True})

    # Check if public profile
    if profile_owner.privacy_setting == 'public':
        return Response({'has_access': True, 'is_public': True})

    # Check if hidden profile - accessible via direct link but not in search
    if profile_owner.privacy_setting == 'hidden':
        return Response({'has_access': True, 'is_hidden': True})

    # For private profiles, check if granted access
    has_access = ProfileAccess.objects.filter(profile_owner=profile_owner, granted_to=request.user).exists()

    # Check for pending request
    pending_request = ProfileAccessRequest.objects.filter(
        profile_owner=profile_owner, requester=request.user, status='pending'
    ).exists()

    # Check if denied
    denied_request = ProfileAccessRequest.objects.filter(
        profile_owner=profile_owner, requester=request.user, status='denied'
    ).exists()

    return Response({
        'has_access': has_access,
        'is_private': True,
        'pending_request': pending_request,
        'denied_request': denied_request
    })


@api_view(['GET'])
def search_accounts_view(request):
    """
    Search for user accounts by username.
    Query params:
    - q: search query (@ prefix is stripped automatically)
    - limit: max results (default 20)
    """
    query = request.GET.get('q', '').strip()
    limit = min(int(request.GET.get('limit', 20)), 50)  # Max 50 results

    if not query:
        return Response({'accounts': [], 'query': ''})

    # Strip @ prefix if present
    if query.startswith('@'):
        query = query[1:]

    if not query:
        return Response({'accounts': [], 'query': ''})

    # Search for accounts (talents, agencies, users) - exclude admins, suspended, and hidden profiles
    accounts = User.objects.filter(
        username__icontains=query,
    ).exclude(
        account_type='admin'
    ).exclude(
        is_suspended=True
    ).exclude(
        privacy_setting='hidden'  # Hidden profiles are not discoverable in search
    ).order_by('username')[:limit]

    print(f"Search query: {query}, Found {accounts.count()} accounts")

    results = []
    for account in accounts:
        results.append({
            'id': account.id,
            'username': account.username,
            'account_type': account.account_type,
            'account_type_display': dict(User.ACCOUNT_TYPE_CHOICES).get(account.account_type, account.account_type),
            'bio': account.bio[:100] if account.bio else None,
            'genre': account.genre if account.genre else None,
            'is_private': account.privacy_setting == 'private',
            'is_hidden': account.privacy_setting == 'hidden',
            'profile_picture': account.profile_picture if account.profile_picture else None,
        })

    return Response({
        'accounts': results,
        'query': query,
        'count': len(results)
    })


@api_view(['GET'])
def search_posts_view(request):
    """
    Search for posts (videos and photos) by description.
    Query params:
    - q: search query (# prefix searches hashtags in description)
    - limit: max results (default 20)
    - type: 'all', 'videos', 'photos' (default 'all')
    """
    query = request.GET.get('q', '').strip()
    post_type = request.GET.get('type', 'all')
    limit = min(int(request.GET.get('limit', 20)), 50)  # Max 50 results

    if not query:
        return Response({'posts': [], 'query': ''})

    # Check if searching for hashtag
    is_hashtag_search = query.startswith('#')
    if is_hashtag_search:
        query = query[1:]  # Remove # prefix

    if not query:
        return Response({'posts': [], 'query': ''})

    results = []

    # Search videos
    if post_type in ['all', 'videos']:
        video_query = Video.objects.filter(
            is_suspended=False,
            privacy='public',
            user__is_active=True,
            user__is_suspended=False
        ).exclude(
            user__account_type='admin'
        ).exclude(
            user__privacy_setting='hidden'  # Exclude posts from hidden profiles
        )

        if is_hashtag_search:
            # Search for hashtag pattern in description
            video_query = video_query.filter(description__icontains=f'#{query}')
        else:
            video_query = video_query.filter(description__icontains=query)

        videos = video_query.select_related('user').order_by('-created_at')[:limit]

        for video in videos:
            results.append({
                'id': video.id,
                'type': 'video',
                'description': video.description[:150] if video.description else '',
                'video_url': video.video_url,
                'thumbnail_url': getattr(video, 'thumbnail_url', None),
                'created_at': video.created_at.isoformat(),
                'user': {
                    'id': video.user.id,
                    'username': video.user.username,
                }
            })

    # Search photo posts
    if post_type in ['all', 'photos']:
        photo_query = PhotoPost.objects.filter(
            is_suspended=False,
            privacy='public',
            user__is_active=True,
            user__is_suspended=False
        ).exclude(
            user__account_type='admin'
        ).exclude(
            user__privacy_setting='hidden'  # Exclude posts from hidden profiles
        )

        if is_hashtag_search:
            photo_query = photo_query.filter(description__icontains=f'#{query}')
        else:
            photo_query = photo_query.filter(description__icontains=query)

        photos = photo_query.select_related('user').prefetch_related('photos').order_by('-created_at')[:limit]

        for photo_post in photos:
            first_photo = photo_post.photos.first()
            results.append({
                'id': photo_post.id,
                'type': 'photo',
                'description': photo_post.description[:150] if photo_post.description else '',
                'thumbnail_url': first_photo.image_url if first_photo else None,
                'photo_count': photo_post.photos.count(),
                'created_at': photo_post.created_at.isoformat(),
                'user': {
                    'id': photo_post.user.id,
                    'username': photo_post.user.username,
                }
            })

    # Sort combined results by created_at
    results.sort(key=lambda x: x['created_at'], reverse=True)
    results = results[:limit]

    return Response({
        'posts': results,
        'query': query,
        'count': len(results),
        'is_hashtag_search': is_hashtag_search
    })


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_account_view(request):
    """Upgrade a user account to talent or agency"""
    user = request.user
    
    # Only allow user accounts to upgrade
    if user.account_type != 'user':
        return Response({
            'error': 'Only user accounts can be upgraded. Your current account type is already set.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the new account type from request
    new_account_type = request.data.get('account_type')
    agency_tier = request.data.get('agency_tier', None)
    
    if new_account_type not in ['talent', 'agency']:
        return Response({
            'error': 'Invalid account type. Choose either "talent" or "agency".'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate agency tier if upgrading to agency
    if new_account_type == 'agency':
        if not agency_tier or agency_tier not in ['tier1', 'tier2']:
            return Response({
                'error': 'Invalid or missing agency tier. Choose either "tier1" or "tier2".'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update account type
    user.account_type = new_account_type

    # Set the upgrade date
    from django.utils import timezone
    user.upgraded_at = timezone.now()

    if new_account_type == 'talent':
        user.agency_tier = None  # Clear agency tier for talent accounts
    elif new_account_type == 'agency':
        user.agency_tier = agency_tier
        # Generate agency invite code
        if not user.agency_invite_code:
            user.agency_invite_code = uuid.uuid4().hex[:32]

    user.save()
    
    return Response({
        'message': f'Account successfully upgraded to {new_account_type}',
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)


# ===== Stripe Payment Views =====

import stripe
from django.conf import settings
from django.http import HttpResponse

stripe.api_key = settings.STRIPE_SECRET_KEY

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session_view(request):
    """Create a Stripe Checkout Session for subscription payment"""
    user = request.user
    
    # Only allow talent, agency, and agency_talent accounts to create checkout sessions
    if user.account_type not in ['talent', 'agency', 'agency_talent']:
        return Response({
            'error': 'Only talent, agency, and agency_talent accounts can create checkout sessions.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Determine price based on account type and tier
        if user.account_type == 'talent' or user.account_type == 'agency_talent':
            # Talent subscription: $10.99 CAD
            price_amount = 1099  # in cents
            subscription_name = 'Talent Subscription'
        elif user.account_type == 'agency':
            tier = user.agency_tier or 'tier1'
            if tier == 'tier1':
                price_amount = 3999  # $39.99 CAD in cents
                subscription_name = 'Agency Subscription - Tier 1'
            else:  # tier2
                price_amount = 6999  # $69.99 CAD in cents
                subscription_name = 'Agency Subscription - Tier 2'
        
        # Create or retrieve Stripe customer
        if user.stripe_customer_id:
            customer_id = user.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={
                    'user_id': user.id,
                    'username': user.username,
                    'account_type': user.account_type,
                }
            )
            user.stripe_customer_id = customer.id
            user.save()
            customer_id = customer.id
        
        # Get the frontend URL for success/cancel redirects
        frontend_url = request.headers.get('Origin', 'http://localhost:5173')
        
        # Create Checkout Session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'cad',
                    'product_data': {
                        'name': subscription_name,
                        'description': f'Monthly subscription for {user.username}',
                    },
                    'unit_amount': price_amount,
                    'recurring': {
                        'interval': 'month',
                    },
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f'{frontend_url}/?payment=success',
            cancel_url=f'{frontend_url}/?payment=canceled',
            metadata={
                'user_id': user.id,
                'account_type': user.account_type,
                'agency_tier': user.agency_tier if user.account_type == 'agency' else '',
            }
        )
        
        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to create checkout session: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription_view(request):
    """Cancel a user's Stripe subscription"""
    user = request.user
    
    if not user.stripe_subscription_id:
        return Response({
            'error': 'No active subscription found.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Cancel the subscription at period end
        subscription = stripe.Subscription.modify(
            user.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        return Response({
            'message': 'Subscription will be canceled at the end of the current billing period.',
            'cancel_at': subscription.cancel_at
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to cancel subscription: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_status_view(request):
    """Get the current subscription status from Stripe"""
    user = request.user
    
    if not user.stripe_subscription_id:
        return Response({
            'status': 'none',
            'message': 'No subscription found'
        }, status=status.HTTP_200_OK)
    
    try:
        subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
        
        return Response({
            'status': subscription.status,
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end,
            'canceled_at': subscription.canceled_at,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to retrieve subscription: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook_view(request):
    """Handle Stripe webhook events"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET
    
    if not webhook_secret:
        # If no webhook secret is set, we can't verify the webhook
        # In development, you might want to skip verification
        return HttpResponse(status=400)
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        # Invalid payload
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return HttpResponse(status=400)
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        handle_checkout_session_completed(session)
        
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        handle_subscription_updated(subscription)
        
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_deleted(subscription)
        
    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        handle_invoice_payment_succeeded(invoice)
        
    elif event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        handle_invoice_payment_failed(invoice)
    
    return HttpResponse(status=200)


def handle_checkout_session_completed(session):
    """Handle successful checkout session completion"""
    user_id = session['metadata'].get('user_id')
    if not user_id:
        return

    try:
        user = User.objects.get(id=user_id)
        subscription_id = session.get('subscription')

        if subscription_id:
            subscription = stripe.Subscription.retrieve(subscription_id)
            user.stripe_subscription_id = subscription_id
            user.subscription_status = subscription.status
            user.subscription_current_period_end = timezone.datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            )
            # Set upgraded_at if not already set (first subscription)
            if not user.upgraded_at:
                user.upgraded_at = timezone.now()
            user.save()
    except User.DoesNotExist:
        pass


def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    customer_id = subscription['customer']
    
    try:
        user = User.objects.get(stripe_customer_id=customer_id)
        user.subscription_status = subscription['status']
        user.subscription_current_period_end = timezone.datetime.fromtimestamp(
            subscription['current_period_end'], tz=timezone.utc
        )
        user.save()
    except User.DoesNotExist:
        pass


def handle_subscription_deleted(subscription):
    """Handle subscription deletion"""
    customer_id = subscription['customer']
    
    try:
        user = User.objects.get(stripe_customer_id=customer_id)
        user.stripe_subscription_id = None
        user.subscription_status = 'canceled'
        user.subscription_current_period_end = None
        user.save()
    except User.DoesNotExist:
        pass


def handle_invoice_payment_succeeded(invoice):
    """Handle successful invoice payment"""
    customer_id = invoice['customer']
    
    try:
        user = User.objects.get(stripe_customer_id=customer_id)
        # Update subscription status
        if user.stripe_subscription_id:
            subscription = stripe.Subscription.retrieve(user.stripe_subscription_id)
            user.subscription_status = subscription.status
            user.subscription_current_period_end = timezone.datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            )
            user.save()
    except User.DoesNotExist:
        pass


def handle_invoice_payment_failed(invoice):
    """Handle failed invoice payment"""
    customer_id = invoice['customer']

    try:
        user = User.objects.get(stripe_customer_id=customer_id)
        user.subscription_status = 'past_due'
        user.save()
        # Here you could send an email notification to the user
    except User.DoesNotExist:
        pass


# ============================================
# Agency Talent Management Views
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agency_talents_list_view(request):
    """
    Get list of all agency talents under the current agency.
    Only accessible by agency accounts.
    """
    user = request.user

    if user.account_type != 'agency':
        return Response({'error': 'Only agency accounts can access this endpoint'}, status=403)

    agency_talents = User.objects.filter(
        account_type='agency_talent',
        agency=user
    ).order_by('username')

    talents = []
    for talent in agency_talents:
        # Count videos and photos
        video_count = Video.objects.filter(user=talent).count()
        photo_count = PhotoPost.objects.filter(user=talent).count()

        talents.append({
            'id': talent.id,
            'username': talent.username,
            'email': talent.email,
            'bio': talent.bio,
            'genre': talent.genre,
            'privacy_setting': talent.privacy_setting,
            'created_at': talent.created_at.isoformat(),
            'video_count': video_count,
            'photo_count': photo_count,
            'total_posts': video_count + photo_count,
        })

    return Response({
        'agency_talents': talents,
        'count': len(talents)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agency_talent_content_view(request, talent_id):
    """
    Get content (folders and posts) for a specific agency talent.
    Only accessible by the agency that owns the talent.
    """
    user = request.user

    if user.account_type != 'agency':
        return Response({'error': 'Only agency accounts can access this endpoint'}, status=403)

    try:
        talent = User.objects.get(id=talent_id, account_type='agency_talent', agency=user)
    except User.DoesNotExist:
        return Response({'error': 'Agency talent not found or not under your agency'}, status=404)

    # Get subfolders for this talent
    public_subfolders = Subfolder.objects.filter(user=talent, privacy_type='public')
    private_subfolders = Subfolder.objects.filter(user=talent, privacy_type='private')
    hidden_subfolders = Subfolder.objects.filter(user=talent, privacy_type='hidden')

    # Get root videos/photos (not in any subfolder)
    public_videos = Video.objects.filter(user=talent, privacy='public', subfolder__isnull=True)
    private_videos = Video.objects.filter(user=talent, privacy='private', subfolder__isnull=True)
    hidden_videos = Video.objects.filter(user=talent, privacy='hidden', subfolder__isnull=True)
    public_photos = PhotoPost.objects.filter(user=talent, privacy='public', subfolder__isnull=True)
    private_photos = PhotoPost.objects.filter(user=talent, privacy='private', subfolder__isnull=True)
    hidden_photos = PhotoPost.objects.filter(user=talent, privacy='hidden', subfolder__isnull=True)

    def serialize_subfolder(sf):
        return {
            'id': sf.id,
            'name': sf.name,
            'privacy_type': sf.privacy_type,
            'video_count': sf.videos.count(),
            'photo_post_count': sf.photo_posts.count(),
            'created_at': sf.created_at.isoformat(),
        }

    def serialize_video(v):
        return {
            'id': v.id,
            'video_url': v.video_url,
            'stream_url': v.stream_url,
            'description': v.description,
            'privacy': v.privacy,
            'created_at': v.created_at.isoformat(),
        }

    def serialize_photo(p):
        return {
            'id': p.id,
            'description': p.description,
            'privacy': p.privacy,
            'created_at': p.created_at.isoformat(),
            'images': [{'id': img.id, 'image_url': img.image_url} for img in p.photos.all()[:1]],
        }

    return Response({
        'talent': {
            'id': talent.id,
            'username': talent.username,
            'privacy_setting': talent.privacy_setting,
        },
        'public': {
            'subfolders': [serialize_subfolder(sf) for sf in public_subfolders],
            'videos': [serialize_video(v) for v in public_videos],
            'photo_posts': [serialize_photo(p) for p in public_photos],
        },
        'private': {
            'subfolders': [serialize_subfolder(sf) for sf in private_subfolders],
            'videos': [serialize_video(v) for v in private_videos],
            'photo_posts': [serialize_photo(p) for p in private_photos],
        },
        'hidden': {
            'subfolders': [serialize_subfolder(sf) for sf in hidden_subfolders],
            'videos': [serialize_video(v) for v in hidden_videos],
            'photo_posts': [serialize_photo(p) for p in hidden_photos],
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agency_update_talent_privacy_view(request, talent_id):
    """
    Update the privacy setting for an agency talent's profile.
    Only accessible by the agency that owns the talent.
    """
    user = request.user

    if user.account_type != 'agency':
        return Response({'error': 'Only agency accounts can access this endpoint'}, status=403)

    try:
        talent = User.objects.get(id=talent_id, account_type='agency_talent', agency=user)
    except User.DoesNotExist:
        return Response({'error': 'Agency talent not found or not under your agency'}, status=404)

    new_setting = request.data.get('privacy_setting')

    # Agency talents can only be public or hidden (not private)
    if new_setting not in ['public', 'hidden']:
        return Response({'error': 'Agency talents can only have public or hidden privacy'}, status=400)

    talent.privacy_setting = new_setting
    talent.save()

    return Response({
        'message': f'Privacy updated to {new_setting}',
        'privacy_setting': talent.privacy_setting
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agency_update_talent_subfolder_privacy_view(request, talent_id, subfolder_id):
    """
    Update the privacy setting for a subfolder belonging to an agency talent.
    Only accessible by the agency that owns the talent.
    """
    user = request.user

    if user.account_type != 'agency':
        return Response({'error': 'Only agency accounts can access this endpoint'}, status=403)

    try:
        talent = User.objects.get(id=talent_id, account_type='agency_talent', agency=user)
    except User.DoesNotExist:
        return Response({'error': 'Agency talent not found or not under your agency'}, status=404)

    try:
        subfolder = Subfolder.objects.get(id=subfolder_id, user=talent)
    except Subfolder.DoesNotExist:
        return Response({'error': 'Subfolder not found'}, status=404)

    new_privacy = request.data.get('privacy_type')

    if new_privacy not in ['public', 'private', 'hidden']:
        return Response({'error': 'Invalid privacy type'}, status=400)

    subfolder.privacy_type = new_privacy
    subfolder.save()

    return Response({
        'message': f'Subfolder privacy updated to {new_privacy}',
        'subfolder': {
            'id': subfolder.id,
            'name': subfolder.name,
            'privacy_type': subfolder.privacy_type
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agency_create_talent_subfolder_view(request, talent_id):
    """
    Create a subfolder for an agency talent.
    Only accessible by the agency that owns the talent.
    """
    user = request.user

    if user.account_type != 'agency':
        return Response({'error': 'Only agency accounts can access this endpoint'}, status=403)

    try:
        talent = User.objects.get(id=talent_id, account_type='agency_talent', agency=user)
    except User.DoesNotExist:
        return Response({'error': 'Agency talent not found or not under your agency'}, status=404)

    name = request.data.get('name', '').strip()
    description = request.data.get('description', '').strip()
    privacy_type = request.data.get('privacy_type', 'public')

    if not name:
        return Response({'error': 'Subfolder name is required'}, status=400)

    if privacy_type not in ['public', 'private', 'hidden']:
        return Response({'error': 'privacy_type must be public, private, or hidden'}, status=400)

    # Check for duplicate name within same privacy type for this talent
    if Subfolder.objects.filter(user=talent, name=name, privacy_type=privacy_type).exists():
        return Response({'error': f'A subfolder with this name already exists in the talent\'s {privacy_type} section'}, status=400)

    # Create the subfolder for the talent
    subfolder = Subfolder.objects.create(
        user=talent,
        name=name,
        description=description,
        privacy_type=privacy_type
    )

    return Response({
        'message': 'Subfolder created successfully',
        'subfolder': {
            'id': subfolder.id,
            'name': subfolder.name,
            'description': subfolder.description,
            'privacy_type': subfolder.privacy_type,
            'video_count': 0,
            'photo_post_count': 0,
            'created_at': subfolder.created_at.isoformat(),
        }
    }, status=201)


#!/usr/bin/env python
"""
Script to assign existing videos and photos to their default folders
"""

import os
import sys
import django

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from accounts.models import Video, PhotoPost, PostFolder

def main():
    print("Assigning existing content to default folders...")
    
    # Assign existing videos to default Videos folder
    print('\nAssigning existing videos to default Videos folder...')
    videos_assigned = 0
    for video in Video.objects.filter(folder__isnull=True):
        try:
            videos_folder = PostFolder.objects.get(
                user=video.user,
                name='Videos',
                parent__name='Posts',
                is_default=True
            )
            video.folder = videos_folder
            video.save()
            print(f'✓ Assigned video {video.id} by {video.user.username} to Videos folder')
            videos_assigned += 1
        except PostFolder.DoesNotExist:
            print(f'✗ No default Videos folder found for user {video.user.username}')
    
    # Assign existing photo posts to default Images folder  
    print('\nAssigning existing photo posts to default Images folder...')
    photos_assigned = 0
    for photo in PhotoPost.objects.filter(folder__isnull=True):
        try:
            images_folder = PostFolder.objects.get(
                user=photo.user,
                name='Images',
                parent__name='Posts',
                is_default=True
            )
            photo.folder = images_folder
            photo.save()
            print(f'✓ Assigned photo {photo.id} by {photo.user.username} to Images folder')
            photos_assigned += 1
        except PostFolder.DoesNotExist:
            print(f'✗ No default Images folder found for user {photo.user.username}')
    
    print(f'\nAssignment complete!')
    print(f'Videos assigned: {videos_assigned}')
    print(f'Photos assigned: {photos_assigned}')

if __name__ == '__main__':
    main()
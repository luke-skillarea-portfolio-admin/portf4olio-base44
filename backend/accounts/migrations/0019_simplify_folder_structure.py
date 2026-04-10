# Generated migration to simplify folder structure
# Remove Folder model, update Subfolder to have user and privacy_type

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0018_folder_folderaccesspermission_folderaccessrequest_and_more'),
    ]

    operations = [
        # First, alter unique_together on Subfolder to remove it (since it references 'folder')
        migrations.AlterUniqueTogether(
            name='subfolder',
            unique_together=set(),
        ),

        # Remove folder FK from Video and PhotoPost first
        migrations.RemoveField(
            model_name='video',
            name='folder',
        ),
        migrations.RemoveField(
            model_name='photopost',
            name='folder',
        ),

        # Add privacy field back to Video and PhotoPost
        migrations.AddField(
            model_name='video',
            name='privacy',
            field=models.CharField(choices=[('public', 'Public'), ('private', 'Private')], default='public', max_length=10),
        ),
        migrations.AddField(
            model_name='photopost',
            name='privacy',
            field=models.CharField(choices=[('public', 'Public'), ('private', 'Private')], default='public', max_length=10),
        ),

        # Remove subfolder FK from Subfolder (to Folder) - we'll add user FK instead
        migrations.RemoveField(
            model_name='subfolder',
            name='folder',
        ),

        # Remove old privacy field from Subfolder
        migrations.RemoveField(
            model_name='subfolder',
            name='privacy',
        ),

        # Add user FK to Subfolder
        migrations.AddField(
            model_name='subfolder',
            name='user',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='subfolders', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),

        # Add privacy_type field to Subfolder
        migrations.AddField(
            model_name='subfolder',
            name='privacy_type',
            field=models.CharField(choices=[('public', 'Public'), ('private', 'Private')], default='public', max_length=10),
        ),

        # Update unique_together for Subfolder
        migrations.AlterUniqueTogether(
            name='subfolder',
            unique_together={('user', 'name', 'privacy_type')},
        ),

        # Delete FolderAccessPermission model
        migrations.AlterUniqueTogether(
            name='folderaccesspermission',
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name='folderaccesspermission',
            name='folder',
        ),
        migrations.RemoveField(
            model_name='folderaccesspermission',
            name='granted_by',
        ),
        migrations.RemoveField(
            model_name='folderaccesspermission',
            name='granted_to',
        ),
        migrations.DeleteModel(
            name='FolderAccessPermission',
        ),

        # Delete FolderAccessRequest model
        migrations.AlterUniqueTogether(
            name='folderaccessrequest',
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name='folderaccessrequest',
            name='folder',
        ),
        migrations.RemoveField(
            model_name='folderaccessrequest',
            name='requester',
        ),
        migrations.DeleteModel(
            name='FolderAccessRequest',
        ),

        # Delete Folder model
        migrations.AlterUniqueTogether(
            name='folder',
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name='folder',
            name='user',
        ),
        migrations.DeleteModel(
            name='Folder',
        ),
    ]

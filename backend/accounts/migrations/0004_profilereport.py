from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_conversation_message'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProfileReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(choices=[('spam', 'Spam or misleading'), ('harassment', 'Harassment or bullying'), ('inappropriate', 'Inappropriate content'), ('impersonation', 'Impersonation'), ('copyright', 'Copyright violation'), ('other', 'Other')], max_length=50)),
                ('note', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('reviewed', 'Reviewed'), ('resolved', 'Resolved'), ('dismissed', 'Dismissed')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('reporter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports_submitted', to=settings.AUTH_USER_MODEL)),
                ('reported_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports_received', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'profile_reports',
                'ordering': ['-created_at'],
            },
        ),
    ]

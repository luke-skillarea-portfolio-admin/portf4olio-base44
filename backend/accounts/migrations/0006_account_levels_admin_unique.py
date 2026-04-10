from django.db import migrations, models
from django.contrib.auth.hashers import make_password


def ensure_single_hardcoded_admin(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    # Prevent unique email conflicts when forcing admin@gmail.com.
    User.objects.filter(email='admin@gmail.com').exclude(username='admin').update(email='admin+conflict@gmail.com')

    # Demote any existing admin-type rows that are not the hardcoded admin user.
    # This prevents the conditional unique constraint from failing.
    User.objects.filter(account_type='admin').exclude(username='admin').update(account_type='talent')

    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@gmail.com',
            'account_type': 'admin',
            'is_staff': True,
            'is_superuser': True,
        },
    )

    changed = False
    if admin_user.account_type != 'admin':
        admin_user.account_type = 'admin'
        changed = True
    if not admin_user.is_staff:
        admin_user.is_staff = True
        changed = True
    if not admin_user.is_superuser:
        admin_user.is_superuser = True
        changed = True

    # Force the initial password once when the migration runs.
    # This is intentionally hardcoded per current requirement.
    admin_user.password = make_password('password')
    changed = True

    if not admin_user.email:
        # Email is unique+required in this project; ensure it's set.
        admin_user.email = 'admin@gmail.com'
        changed = True

    if changed:
        admin_user.save()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_video'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='account_type',
            field=models.CharField(
                choices=[
                    ('user', 'User'),
                    ('talent', 'Talent'),
                    ('agency', 'Agency'),
                    ('agency_talent', 'Agency Talent'),
                    ('admin', 'Admin'),
                ],
                default='talent',
                max_length=20,
            ),
        ),
        migrations.RunPython(ensure_single_hardcoded_admin, noop_reverse),
        # Note: The unique admin constraint will be added in a later migration
        # to avoid PostgreSQL trigger event conflicts during initial setup
    ]

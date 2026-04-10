from django.db import migrations
from django.contrib.auth.hashers import make_password


def ensure_hardcoded_admin(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    # Prevent unique email conflicts when forcing admin@gmail.com.
    User.objects.filter(email='admin@gmail.com').exclude(username='admin').update(email='admin+conflict@gmail.com')

    # Best-effort: ensure there is only one admin account type and it's the hardcoded user.
    User.objects.filter(account_type='admin').exclude(username='admin').update(account_type='talent')

    admin_user, _created = User.objects.get_or_create(
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

    if admin_user.email != 'admin@gmail.com':
        # Email is unique in this project; hardcode it per requirement.
        admin_user.email = 'admin@gmail.com'
        changed = True

    if not admin_user.is_staff:
        admin_user.is_staff = True
        changed = True

    if not admin_user.is_superuser:
        admin_user.is_superuser = True
        changed = True

    # Force hardcoded password per requirement.
    admin_user.password = make_password('password')
    changed = True

    if changed:
        admin_user.save()


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_account_levels_admin_unique'),
    ]

    operations = [
        migrations.RunPython(ensure_hardcoded_admin, noop_reverse),
    ]

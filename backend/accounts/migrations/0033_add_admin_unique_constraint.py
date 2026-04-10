# Generated migration to add the unique admin constraint
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0032_user_linked_account'),
    ]

    operations = [
        # Add the unique admin constraint that was deferred from migration 0006
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                fields=('account_type',),
                condition=Q(account_type='admin'),
                name='unique_admin_account_type',
            ),
        ),
    ]
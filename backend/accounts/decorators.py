from functools import wraps
from django.views.decorators.csrf import csrf_exempt

def csrf_exempt_api_view(view_func):
    """
    Decorator to exempt API views from CSRF protection.
    Works with @api_view decorator.
    """
    wrapped = csrf_exempt(view_func)
    wrapped.csrf_exempt = True
    return wrapped

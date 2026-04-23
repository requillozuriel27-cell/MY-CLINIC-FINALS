import time
import json
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings


class RateLimitMiddleware:
    """
    Rate limiting middleware.
    - Identifies users by user ID if authenticated, or by IP if not
    - Limits to 100 requests per 60 seconds by default
    - Returns HTTP 429 if limit exceeded
    - Stores counters in file-based cache (no Redis needed)
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.max_requests = getattr(settings, 'RATE_LIMIT_REQUESTS', 100)
        self.window = getattr(settings, 'RATE_LIMIT_WINDOW', 60)

        # These paths are excluded from rate limiting
        self.excluded_paths = [
            '/admin/',
        ]

    def __call__(self, request):
        # Skip rate limiting for excluded paths
        for path in self.excluded_paths:
            if request.path.startswith(path):
                return self.get_response(request)

        # Get identifier — user ID if authenticated else IP
        identifier = self.get_identifier(request)

        # Check and increment rate limit
        is_limited, remaining, retry_after = self.check_rate_limit(identifier)

        if is_limited:
            return JsonResponse(
                {
                    'error': 'Too many requests. Please slow down.',
                    'retry_after_seconds': retry_after,
                    'limit': self.max_requests,
                    'window_seconds': self.window,
                },
                status=429,
                headers={
                    'Retry-After': str(retry_after),
                    'X-RateLimit-Limit': str(self.max_requests),
                    'X-RateLimit-Remaining': '0',
                }
            )

        response = self.get_response(request)

        # Add rate limit headers to response
        response['X-RateLimit-Limit'] = str(self.max_requests)
        response['X-RateLimit-Remaining'] = str(max(0, remaining))
        response['X-RateLimit-Window'] = str(self.window)

        return response

    def get_identifier(self, request):
        """Get unique identifier for this requester."""
        # Try to get user ID from JWT token
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            auth = JWTAuthentication()
            result = auth.authenticate(request)
            if result is not None:
                user, token = result
                return f'user_{user.id}'
        except Exception:
            pass

        # Fall back to IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '0.0.0.0')

        return f'ip_{ip}'

    def check_rate_limit(self, identifier):
        """
        Check if identifier has exceeded rate limit.
        Returns (is_limited, remaining, retry_after)
        """
        cache_key = f'ratelimit_{identifier}'
        window_key = f'ratelimit_window_{identifier}'

        current_time = int(time.time())

        # Get or create window start time
        window_start = cache.get(window_key)
        if window_start is None:
            window_start = current_time
            cache.set(window_key, window_start, self.window)

        # Get current count
        count = cache.get(cache_key, 0)

        # Check if window has expired
        if current_time - window_start >= self.window:
            # Reset window
            window_start = current_time
            count = 0
            cache.set(window_key, window_start, self.window)
            cache.set(cache_key, 0, self.window)

        # Increment count
        count += 1
        cache.set(cache_key, count, self.window)

        remaining = self.max_requests - count
        retry_after = self.window - (current_time - window_start)

        if count > self.max_requests:
            return True, 0, max(0, retry_after)

        return False, remaining, 0
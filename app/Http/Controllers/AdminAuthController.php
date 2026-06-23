<?php

namespace App\Http\Controllers;

use App\Services\SupabaseAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class AdminAuthController extends Controller
{
    private SupabaseAuthService $authService;

    public function __construct(SupabaseAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Show admin login page.
     */
    public function showLogin()
    {
        return inertia('Admin/Login');
    }

    /**
     * Handle admin login using Supabase Auth.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:6|max:255',
        ]);

        $throttleKey = 'login_attempts_' . strtolower($request->input('email'));
        
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return back()->withErrors([
                'email' => "Too many login attempts. Please try again in {$seconds} seconds."
            ]);
        }

        try {
            // Authenticate with Supabase Auth ONLY
            $authResult = $this->authService->authenticate(
                $request->email,
                $request->password
            );

            if (!$authResult) {
                RateLimiter::hit($throttleKey, 300);
                return back()->withErrors([
                    'email' => 'Invalid credentials.'
                ]);
            }

            // Get user from Supabase Auth
            $user = $authResult['user'] ?? null;

            if (!$user) {
                Log::warning('User not found in Supabase Auth', [
                    'email' => $request->email
                ]);
                return back()->withErrors([
                    'email' => 'Invalid credentials.'
                ]);
            }

            // Clear rate limiter on success
            RateLimiter::clear($throttleKey);

            // Store user and tokens in session
            session([
                'admin_user' => [
                    'id' => $user['id'] ?? null,
                    'email' => $user['email'] ?? null,
                    'email_verified' => $user['email_confirmed_at'] ?? null,
                    'created_at' => $user['created_at'] ?? null,
                    'user_metadata' => $user['user_metadata'] ?? [],
                ],
                'admin_login_at' => now()->toIso8601String(),
                'admin_login_ip' => $request->ip(),
                'admin_access_token' => $authResult['access_token'] ?? null,
                'admin_refresh_token' => $authResult['refresh_token'] ?? null,
            ]);

            Log::info('Admin login successful', [
                'user_id' => $user['id'] ?? null,
                'email' => $user['email'] ?? null
            ]);

            return redirect()->route('admin.dashboard');
            
        } catch (\Exception $e) {
            Log::error('Admin login error', [
                'email' => $request->email,
                'error' => $e->getMessage()
            ]);
            return back()->withErrors([
                'email' => 'An error occurred. Please try again.'
            ]);
        }
    }

    /**
     * Handle admin logout.
     */
    public function logout(Request $request)
    {
        // Revoke Supabase token if exists
        if ($token = session('admin_access_token')) {
            $this->authService->logout($token);
        }

        // Clear session
        session()->forget([
            'admin_user', 
            'admin_login_at', 
            'admin_login_ip', 
            'admin_access_token',
            'admin_refresh_token'
        ]);
        
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login')->with('success', 'Logged out successfully.');
    }

    /**
     * Check if admin session is valid.
     */
    public function checkSession(Request $request)
    {
        $user = session('admin_user');
        $token = session('admin_access_token');

        if (!$user || !$token) {
            return response()->json(['authenticated' => false], 401);
        }

        // Validate token with Supabase
        $supabaseUser = $this->authService->getUser($token);
        
        if (!$supabaseUser) {
            // Token expired, try to refresh
            $refreshToken = session('admin_refresh_token');
            if ($refreshToken) {
                $newTokens = $this->authService->refreshToken($refreshToken);
                if ($newTokens) {
                    session(['admin_access_token' => $newTokens['access_token']]);
                    return response()->json(['authenticated' => true]);
                }
            }
            
            // Logout if token invalid
            $this->logout($request);
            return response()->json(['authenticated' => false], 401);
        }

        return response()->json([
            'authenticated' => true,
            'user' => $user
        ]);
    }
}
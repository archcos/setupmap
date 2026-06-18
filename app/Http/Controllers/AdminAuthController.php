<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminAuthController extends Controller
{
    private SupabaseService $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    /**
     * Show admin login page.
     */
    public function showLogin()
    {
        return inertia('Admin/Login');
    }

    /**
     * Handle admin login.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string',
            'password' => 'required|string',
        ]);

        try {
            $user = $this->supabase->authenticateUser(
                $request->email,
                $request->password
            );

            if (!$user) {
                return back()->withErrors([
                    'email' => 'Invalid email/username or password.'
                ]);
            }

            // Store user in session
            session(['admin_user' => $user]);

            Log::info('Admin login successful', [
                'user_id' => $user['user_id']
            ]);

            return redirect()->route('admin.dashboard');
        } catch (\Exception $e) {
            Log::error('Admin login error', ['error' => $e->getMessage()]);
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
        session()->forget('admin_user');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
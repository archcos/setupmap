<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminAuth
{
    public function handle(Request $request, Closure $next)
    {
        if (!session()->has('admin_user')) {
            return redirect()->route('admin.login');
        }

        // Share admin user data with all views
        $adminUser = session('admin_user');
        inertia()->share('adminUser', $adminUser);

        return $next($request);
    }
}
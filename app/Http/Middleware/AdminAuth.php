<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminAuth
{
    public function handle(Request $request, Closure $next)
    {
        if (!session('admin_user') || !session('admin_access_token')) {
            return redirect()->route('admin.login');
        }

        // Optional: Check if token is still valid
        // You can call the checkSession endpoint here

        return $next($request);
    }
}
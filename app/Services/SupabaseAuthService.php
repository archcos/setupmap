<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupabaseAuthService extends BaseSupabaseService
{
    /**
     * Authenticate user using Supabase Auth
     * This uses Supabase's built-in authentication with JWT tokens
     */
    public function authenticate(string $email, string $password): ?array
    {
        try {
            Log::info('Authenticating with Supabase Auth', ['email' => $email]);

            // Call Supabase Auth API
            $response = Http::withHeaders($this->getAuthHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
                ->post($this->url . '/auth/v1/token?grant_type=password', [
                    'email' => $email,
                    'password' => $password,
                ]);

            if ($response->failed()) {
                Log::warning('Supabase auth failed', [
                    'email' => $email,
                    'status' => $response->status(),
                    'error' => $response->json()['error_description'] ?? 'Unknown error'
                ]);
                return null;
            }

            $authData = $response->json();
            
            Log::info('User authenticated with Supabase Auth', [
                'user_id' => $authData['user']['id'] ?? null,
                'email' => $email
            ]);

            return [
                'access_token' => $authData['access_token'] ?? null,
                'refresh_token' => $authData['refresh_token'] ?? null,
                'expires_in' => $authData['expires_in'] ?? null,
                'token_type' => $authData['token_type'] ?? 'bearer',
                'user' => $authData['user'] ?? null,
            ];
        } catch (\Exception $e) {
            Log::error('Supabase authentication error', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Refresh the access token
     */
    public function refreshToken(string $refreshToken): ?array
    {
        try {
            $response = Http::withHeaders($this->getAuthHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
                ->post($this->url . '/auth/v1/token?grant_type=refresh_token', [
                    'refresh_token' => $refreshToken,
                ]);

            if ($response->failed()) {
                Log::warning('Token refresh failed', [
                    'status' => $response->status()
                ]);
                return null;
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Token refresh error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Logout from Supabase Auth
     */
    public function logout(string $accessToken): bool
    {
        try {
            $response = Http::withHeaders($this->getAuthHeaders($accessToken))
                ->timeout($this->httpTimeout)
                ->post($this->url . '/auth/v1/logout');

            if ($response->successful()) {
                Log::info('User logged out from Supabase');
                return true;
            }

            Log::warning('Logout failed', ['status' => $response->status()]);
            return false;
        } catch (\Exception $e) {
            Log::error('Logout error', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Get user from Supabase Auth
     */
    public function getUser(string $accessToken): ?array
    {
        try {
            $response = Http::withHeaders($this->getAuthHeaders($accessToken))
                ->timeout($this->httpTimeout)
                ->get($this->url . '/auth/v1/user');

            if ($response->failed()) {
                Log::warning('Failed to get Supabase user', [
                    'status' => $response->status()
                ]);
                return null;
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Get user error', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
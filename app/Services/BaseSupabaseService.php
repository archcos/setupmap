<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

abstract class BaseSupabaseService
{
    protected string $url;
    protected string $key;
    protected string $anonKey;
    protected int $cacheTtl = 300; // 5 minutes
    protected bool $cacheEnabled = true;
    protected int $httpTimeout = 30;
    protected int $maxRetries = 3;
    protected int $retryDelay = 1000;

    public function __construct()
    {
        $this->url = config('supabase.url');
        $this->key = config('supabase.key');
        $this->anonKey = config('supabase.public_key');

        // Check if cache is available
        try {
            Cache::put('test_cache_key', 'test', 1);
            Cache::forget('test_cache_key');
        } catch (\Exception $e) {
            $this->cacheEnabled = false;
            Log::warning('Cache disabled - using fallback', [
                'error' => $e->getMessage(),
                'driver' => config('cache.default')
            ]);
        }

        if (empty($this->url) || empty($this->key)) {
            Log::error('Supabase configuration missing', [
                'url_set' => !empty($this->url),
                'key_set' => !empty($this->key)
            ]);
        }
    }

    /**
     * Get headers required for Supabase API.
     */
    protected function getHeaders(): array
    {
        if (empty($this->key)) {
            Log::error('Supabase API key is empty');
        }

        return [
            'apikey' => $this->key,
            'Authorization' => 'Bearer ' . $this->key,
            'Content-Type' => 'application/json',
            'Prefer' => 'return=representation',
        ];
    }

    /**
     * Get headers for Supabase Auth.
     */
    protected function getAuthHeaders(string $accessToken = null): array
    {
        $headers = [
            'apikey' => $this->anonKey,
            'Content-Type' => 'application/json',
        ];

        if ($accessToken) {
            $headers['Authorization'] = 'Bearer ' . $accessToken;
        }

        return $headers;
    }

    /**
     * Get admin headers (uses service role key).
     */
    protected function getAdminHeaders(): array
    {
        return [
            'apikey' => $this->key,
            'Authorization' => 'Bearer ' . $this->key,
            'Content-Type' => 'application/json',
        ];
    }

    /**
     * Handle API response.
     */
    protected function handleResponse(Response $response): array
    {
        if ($response->failed()) {
            Log::error('Supabase API Error', [
                'status' => $response->status(),
                'body' => $response->body(),
                'url' => $response->effectiveUri() ?? 'unknown',
            ]);

            if ($response->status() === 404) {
                Log::warning('Supabase API returned 404 - resource not found', [
                    'url' => $response->effectiveUri() ?? 'unknown'
                ]);
                return [];
            }

            if ($response->status() === 401) {
                Log::error('Supabase API authentication failed - invalid API key', [
                    'status' => $response->status()
                ]);
                throw new \Exception('Authentication failed with Supabase');
            }

            if ($response->status() === 429) {
                Log::warning('Supabase API rate limit exceeded');
                throw new \Exception('Rate limit exceeded. Please try again later.');
            }

            if ($response->status() >= 500) {
                Log::error('Supabase API server error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                throw new \Exception('Supabase service unavailable. Please try again later.');
            }

            $errorMessage = 'Supabase API Error: ' . $response->body();
            throw new \Exception($errorMessage);
        }

        $data = $response->json() ?? [];
        
        Log::debug('Supabase API response handled successfully', [
            'status' => $response->status(),
            'data_count' => count($data)
        ]);

        return $data;
    }

    /**
     * Safe cache remember with fallback.
     */
    protected function cacheRemember(string $key, int $ttl, callable $callback)
    {
        if (!$this->cacheEnabled) {
            Log::info('Cache bypassed - disabled', ['key' => $key]);
            return $callback();
        }

        try {
            if (Cache::has($key)) {
                $cachedData = Cache::get($key);
                Log::info('Cache HIT', [
                    'key' => $key,
                    'data_count' => is_array($cachedData) ? count($cachedData) : 'scalar'
                ]);
                return $cachedData;
            }

            Log::info('Cache MISS - fetching fresh data', ['key' => $key]);
            
            $data = $callback();
            Cache::put($key, $data, $ttl);
            
            return $data;
        } catch (\Exception $e) {
            Log::error('Cache operation failed, using fallback', [
                'key' => $key,
                'error' => $e->getMessage()
            ]);
            return $callback();
        }
    }

    /**
     * Clear all caches.
     */
    public function clearAllCache(): void
    {
        Log::info('Clearing all caches');
        
        try {
            Cache::forget('complete_equipment_data');
            Cache::forget('all_equipments');
            Cache::forget('equipments_with_locations');
            Cache::forget('all_projects');
            Cache::forget('all_locations');
            Cache::forget('all_power_consumptions_limit_1000');
            Cache::forget('all_utilizations_limit_1000');
            Log::info('All caches cleared successfully');
        } catch (\Exception $e) {
            Log::error('Failed to clear all caches', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}
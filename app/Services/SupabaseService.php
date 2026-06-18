<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupabaseService
{
    private string $url;
    private string $key;
    private int $cacheTtl = 300; // 5 minutes
    private bool $cacheEnabled = true;
private int $httpTimeout = 30;

    public function __construct()
    {
        $this->url = config('supabase.url');
        $this->key = config('supabase.key');

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
     * Safe cache remember with fallback.
     */
private function cacheRemember(string $key, int $ttl, callable $callback)
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

    // ==================== EQUIPMENT METHODS ====================

    /**
     * Get all equipment.
     */
    public function getAllEquipments(): array
    {
        Log::info('Fetching all equipments from cache/API');

        return $this->cacheRemember('all_equipments', $this->cacheTtl, function () {
            Log::info('Cache miss - fetching all equipments from Supabase API');
            
            $response = Http::withHeaders($this->getHeaders())
            ->timeout($this->httpTimeout)
            ->get($this->url.'/rest/v1/tbl_equipments');


            $result = $this->handleResponse($response);
            
            Log::info('Successfully fetched all equipments', [
                'count' => count($result)
            ]);

            return $result;
        });
    }

    /**
     * Get equipment by ID.
     */
    public function getEquipmentById(int $equipmentId): ?array
    {
        Log::info('Fetching equipment by ID', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_equipments?equipment_id=eq.'.$equipmentId);

            $data = $this->handleResponse($response);
            $result = $data[0] ?? null;

            if ($result) {
                Log::info('Successfully fetched equipment', ['equipment_id' => $equipmentId]);
            } else {
                Log::warning('Equipment not found', ['equipment_id' => $equipmentId]);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch equipment by ID', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get complete equipment data with locations, power, and utilization
     * SINGLE API CALL - Most efficient!
     */
/**
 * Get complete equipment data with locations, power, and utilization
 * SINGLE API CALL - Most efficient!
 */
public function getCompleteEquipmentData(): array
{
    $cacheKey = 'complete_equipment_data';
    
    Log::info('Fetching complete equipment data with relations');

    return $this->cacheRemember($cacheKey, $this->cacheTtl, function () {
        Log::info('Executing Supabase API call for complete equipment data');

        try {
            $select = '*,locations:tbl_locations(*),power_consumptions:tbl_powerconsumptions(consumption,created_at),utilizations:tbl_utilizations(type,created_at)';
            
            $startTime = microtime(true);
            
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->retry(2, 1000)
                ->get($this->url.'/rest/v1/tbl_equipments', [
                    'select' => $select,
                ]);

            $duration = round((microtime(true) - $startTime) * 1000, 2);
            
            Log::info('Supabase API call completed', [
                'duration_ms' => $duration,
                'status' => $response->status()
            ]);

            $result = $this->handleResponse($response);
            
            // Sort nested arrays in PHP
            foreach ($result as &$equipment) {
                if (isset($equipment['power_consumptions']) && is_array($equipment['power_consumptions'])) {
                    usort($equipment['power_consumptions'], function($a, $b) {
                        return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                    });
                }
                
                if (isset($equipment['utilizations']) && is_array($equipment['utilizations'])) {
                    usort($equipment['utilizations'], function($a, $b) {
                        return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                    });
                }
            }
            
            Log::info('Successfully fetched complete equipment data', [
                'equipment_count' => count($result),
                'duration_ms' => $duration
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch complete equipment data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    });
}

    /**
     * Get all equipment with locations only.
     */
    public function getAllEquipmentsWithLocations(): array
    {
        Log::info('Fetching equipments with locations');

        return $this->cacheRemember('equipments_with_locations', $this->cacheTtl, function () {
            Log::info('Cache miss - fetching equipments with locations from Supabase API');

            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->url.'/rest/v1/tbl_equipments', [
                        'select' => '*, locations:equipment_id(*)',
                    ]);

                $result = $this->handleResponse($response);
                
                Log::info('Successfully fetched equipments with locations', [
                    'equipment_count' => count($result)
                ]);

                return $result;
            } catch (\Exception $e) {
                Log::error('Failed to fetch equipments with locations', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
        });
    }

    // ==================== LOCATION METHODS ====================

    /**
     * Get all locations.
     */
    public function getAllLocations(): array
    {
        Log::info('Fetching all locations');

        return $this->cacheRemember('all_locations', $this->cacheTtl, function () {
            Log::info('Cache miss - fetching all locations from Supabase API');

            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->url.'/rest/v1/tbl_locations');

                $result = $this->handleResponse($response);
                
                Log::info('Successfully fetched all locations', [
                    'location_count' => count($result)
                ]);

                return $result;
            } catch (\Exception $e) {
                Log::error('Failed to fetch all locations', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
        });
    }

    /**
     * Get locations by equipment ID.
     */
    public function getLocationsByEquipmentId(int $equipmentId): array
    {
        Log::info('Fetching locations for equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_locations?equipment_id=eq.'.$equipmentId);

            $result = $this->handleResponse($response);
            
            Log::info('Successfully fetched locations for equipment', [
                'equipment_id' => $equipmentId,
                'location_count' => count($result)
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch locations for equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get equipment with its latest location.
     */
    public function getEquipmentWithLocation(int $equipmentId): ?array
    {
        Log::info('Fetching equipment with latest location', ['equipment_id' => $equipmentId]);

        try {
            $equipment = $this->getEquipmentById($equipmentId);

            if (!$equipment) {
                Log::warning('Equipment not found for location fetch', ['equipment_id' => $equipmentId]);
                return null;
            }

            $locations = $this->getLocationsByEquipmentId($equipmentId);
            $equipment['latest_location'] = $locations[0] ?? null;

            Log::info('Successfully fetched equipment with location', [
                'equipment_id' => $equipmentId,
                'has_location' => !is_null($equipment['latest_location'])
            ]);

            return $equipment;
        } catch (\Exception $e) {
            Log::error('Failed to fetch equipment with location', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get all equipment with their latest locations.
     */
    public function getAllEquipmentsWithLocationsOptimized(): array
    {
        Log::info('Fetching all equipments with latest locations (optimized)');

        try {
            $equipments = $this->getAllEquipments();

            foreach ($equipments as &$equipment) {
                $locations = $this->getLocationsByEquipmentId($equipment['equipment_id']);
                $equipment['latest_location'] = $locations[0] ?? null;
            }

            Log::info('Successfully fetched all equipments with locations', [
                'equipment_count' => count($equipments)
            ]);

            return $equipments;
        } catch (\Exception $e) {
            Log::error('Failed to fetch equipments with locations (optimized)', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    // ==================== POWER CONSUMPTION METHODS ====================

    /**
     * Get all power consumption records.
     */
    public function getAllPowerConsumptions(int $limit = 1000): array
    {
        $cacheKey = "all_power_consumptions_limit_{$limit}";
        Log::info('Fetching all power consumptions', ['limit' => $limit]);

        return $this->cacheRemember($cacheKey, $this->cacheTtl, function () use ($limit) {
            Log::info('Cache miss - fetching power consumptions from Supabase API');

            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->url.'/rest/v1/tbl_powerconsumptions', [
                        'order' => 'created_at.desc',
                        'limit' => $limit,
                    ]);

                $result = $this->handleResponse($response);
                
                Log::info('Successfully fetched power consumptions', [
                    'limit' => $limit,
                    'count' => count($result)
                ]);

                return $result;
            } catch (\Exception $e) {
                Log::error('Failed to fetch power consumptions', [
                    'limit' => $limit,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
        });
    }

    /**
     * Get power consumption by equipment ID.
     */
    public function getPowerConsumptionByEquipmentId(int $equipmentId): array
    {
        Log::info('Fetching power consumption for equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_powerconsumptions?equipment_id=eq.'.$equipmentId.'&order=created_at.desc');

            $result = $this->handleResponse($response);
            
            Log::info('Successfully fetched power consumption for equipment', [
                'equipment_id' => $equipmentId,
                'record_count' => count($result)
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch power consumption for equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get latest power consumption for equipment.
     */
    public function getLatestPowerConsumption(int $equipmentId): ?array
    {
        Log::info('Fetching latest power consumption for equipment', ['equipment_id' => $equipmentId]);

        try {
            $data = $this->getPowerConsumptionByEquipmentId($equipmentId);
            $result = $data[0] ?? null;

            if ($result) {
                Log::info('Successfully fetched latest power consumption', [
                    'equipment_id' => $equipmentId,
                    'consumption' => $result['consumption'] ?? null
                ]);
            } else {
                Log::warning('No power consumption found for equipment', ['equipment_id' => $equipmentId]);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch latest power consumption for equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

/**
 * Get equipment with all relations in a SINGLE query
 * This is much faster than making 4 separate API calls
 */
public function getEquipmentWithAllRelations(int $equipmentId): ?array
{
    Log::info('Fetching equipment with all relations (single query)', ['equipment_id' => $equipmentId]);

    try {
        // Single query with all joins
        $response = Http::withHeaders($this->getHeaders())
            ->timeout($this->httpTimeout)
            ->get($this->url . '/rest/v1/tbl_equipments', [
                'equipment_id' => 'eq.' . $equipmentId,
                'select' => '*,locations:tbl_locations(*),power_consumptions:tbl_powerconsumptions(consumption,created_at),utilizations:tbl_utilizations(type,created_at)',
                'limit' => 1,
            ]);

        $data = $this->handleResponse($response);
        $result = $data[0] ?? null;

        if ($result) {
            // Sort nested arrays in PHP (Supabase returns them unsorted)
            if (isset($result['power_consumptions']) && is_array($result['power_consumptions'])) {
                usort($result['power_consumptions'], function($a, $b) {
                    return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                });
            }
            
            if (isset($result['utilizations']) && is_array($result['utilizations'])) {
                usort($result['utilizations'], function($a, $b) {
                    return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                });
            }

            Log::info('Successfully fetched equipment with all relations', [
                'equipment_id' => $equipmentId,
                'locations_count' => count($result['locations'] ?? []),
                'power_count' => count($result['power_consumptions'] ?? []),
                'util_count' => count($result['utilizations'] ?? [])
            ]);
        } else {
            Log::warning('Equipment not found with relations', ['equipment_id' => $equipmentId]);
        }

        return $result;
    } catch (\Exception $e) {
        Log::error('Failed to fetch equipment with relations', [
            'equipment_id' => $equipmentId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }
}

/**
 * Get average power consumption for equipment over time period (in hours).
 */
public function getAveragePowerConsumption(int $equipmentId, int $hours = 24): float
{
    Log::info('Calculating average power consumption', [
        'equipment_id' => $equipmentId,
        'hours' => $hours
    ]);

    try {
        // Fix: Use proper PostgreSQL interval syntax
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url.'/rest/v1/tbl_powerconsumptions', [
                'equipment_id' => 'eq.'.$equipmentId,
                'created_at' => 'gte.' . now()->subHours($hours)->toIso8601String(),
                'select' => 'consumption'
            ]);

        $data = $this->handleResponse($response);

        if (empty($data)) {
            Log::warning('No power consumption data for average calculation', [
                'equipment_id' => $equipmentId,
                'hours' => $hours
            ]);
            return 0;
        }

        $total = array_sum(array_column($data, 'consumption'));
        $average = $total / count($data);

        Log::info('Calculated average power consumption', [
            'equipment_id' => $equipmentId,
            'hours' => $hours,
            'average' => $average,
            'record_count' => count($data)
        ]);

        return $average;
    } catch (\Exception $e) {
        Log::error('Failed to calculate average power consumption', [
            'equipment_id' => $equipmentId,
            'hours' => $hours,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }
}

    /**
     * Create power consumption record.
     */
    public function createPowerConsumption(int $equipmentId, float $consumption): ?array
    {
        Log::info('Creating power consumption record', [
            'equipment_id' => $equipmentId,
            'consumption' => $consumption
        ]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->post($this->url.'/rest/v1/tbl_powerconsumptions', [
                    'equipment_id' => $equipmentId,
                    'consumption' => $consumption,
                    'created_at' => now()->toIso8601String(),
                ]);

            if ($response->successful()) {
                // Clear relevant caches
                $this->clearPowerConsumptionCache($equipmentId);
                Log::info('Successfully created power consumption record', [
                    'equipment_id' => $equipmentId,
                    'consumption' => $consumption
                ]);
            } else {
                Log::error('Failed to create power consumption record', [
                    'equipment_id' => $equipmentId,
                    'consumption' => $consumption,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }

            return $this->handleResponse($response)[0] ?? null;
        } catch (\Exception $e) {
            Log::error('Exception creating power consumption record', [
                'equipment_id' => $equipmentId,
                'consumption' => $consumption,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    // ==================== UTILIZATION METHODS ====================

    /**
     * Get all utilization records.
     */
    public function getAllUtilizations(int $limit = 1000): array
    {
        $cacheKey = "all_utilizations_limit_{$limit}";
        Log::info('Fetching all utilizations', ['limit' => $limit]);

        return $this->cacheRemember($cacheKey, $this->cacheTtl, function () use ($limit) {
            Log::info('Cache miss - fetching utilizations from Supabase API');

            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->url.'/rest/v1/tbl_utilizations', [
                        'order' => 'created_at.desc',
                        'limit' => $limit,
                    ]);

                $result = $this->handleResponse($response);
                
                Log::info('Successfully fetched utilizations', [
                    'limit' => $limit,
                    'count' => count($result)
                ]);

                return $result;
            } catch (\Exception $e) {
                Log::error('Failed to fetch utilizations', [
                    'limit' => $limit,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
        });
    }

    /**
     * Get utilization by equipment ID.
     */
    public function getUtilizationByEquipmentId(int $equipmentId): array
    {
        Log::info('Fetching utilization for equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_utilizations?equipment_id=eq.'.$equipmentId.'&order=created_at.desc');

            $result = $this->handleResponse($response);
            
            Log::info('Successfully fetched utilization for equipment', [
                'equipment_id' => $equipmentId,
                'record_count' => count($result)
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch utilization for equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get latest utilization status for equipment.
     */
    public function getLatestUtilization(int $equipmentId): ?array
    {
        Log::info('Fetching latest utilization for equipment', ['equipment_id' => $equipmentId]);

        try {
            $data = $this->getUtilizationByEquipmentId($equipmentId);
            $result = $data[0] ?? null;

            if ($result) {
                Log::info('Successfully fetched latest utilization', [
                    'equipment_id' => $equipmentId,
                    'type' => $result['type'] ?? null
                ]);
            } else {
                Log::warning('No utilization found for equipment', ['equipment_id' => $equipmentId]);
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch latest utilization for equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get utilization percentage (active records) for equipment.
     */
/**
 * Get utilization percentage (active records) for equipment.
 */
public function getUtilizationPercentage(int $equipmentId, int $hours = 24): float
{
    Log::info('Calculating utilization percentage', [
        'equipment_id' => $equipmentId,
        'hours' => $hours
    ]);

    try {
        // Fix: Use proper PostgreSQL interval syntax
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url.'/rest/v1/tbl_utilizations', [
                'equipment_id' => 'eq.'.$equipmentId,
                'created_at' => 'gte.' . now()->subHours($hours)->toIso8601String(),
                'select' => 'type'
            ]);

        $data = $this->handleResponse($response);

        if (empty($data)) {
            Log::warning('No utilization data for percentage calculation', [
                'equipment_id' => $equipmentId,
                'hours' => $hours
            ]);
            return 0;
        }

        $activeCount = count(array_filter($data, fn ($record) => $record['type'] === true));
        $percentage = ($activeCount / count($data)) * 100;

        Log::info('Calculated utilization percentage', [
            'equipment_id' => $equipmentId,
            'hours' => $hours,
            'percentage' => $percentage,
            'active_count' => $activeCount,
            'total_count' => count($data)
        ]);

        return $percentage;
    } catch (\Exception $e) {
        Log::error('Failed to calculate utilization percentage', [
            'equipment_id' => $equipmentId,
            'hours' => $hours,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }
}

    /**
     * Create utilization record.
     */
    public function createUtilization(int $equipmentId, bool $type): ?array
    {
        Log::info('Creating utilization record', [
            'equipment_id' => $equipmentId,
            'type' => $type
        ]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->post($this->url.'/rest/v1/tbl_utilizations', [
                    'equipment_id' => $equipmentId,
                    'type' => $type,
                    'created_at' => now()->toIso8601String(),
                ]);

            if ($response->successful()) {
                // Clear relevant caches
                $this->clearUtilizationCache($equipmentId);
                Log::info('Successfully created utilization record', [
                    'equipment_id' => $equipmentId,
                    'type' => $type
                ]);
            } else {
                Log::error('Failed to create utilization record', [
                    'equipment_id' => $equipmentId,
                    'type' => $type,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }

            return $this->handleResponse($response)[0] ?? null;
        } catch (\Exception $e) {
            Log::error('Exception creating utilization record', [
                'equipment_id' => $equipmentId,
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    // ==================== COMBINED DATA METHODS ====================

    /**
     * Get equipment with location, power consumption, and utilization data.
     */
    public function getEquipmentFullData(int $equipmentId): ?array
    {
        Log::info('Fetching full equipment data', ['equipment_id' => $equipmentId]);

        try {
            $equipment = $this->getEquipmentWithLocation($equipmentId);

            if (!$equipment) {
                Log::warning('Equipment not found for full data', ['equipment_id' => $equipmentId]);
                return null;
            }

            $equipment['power_consumption'] = $this->getLatestPowerConsumption($equipmentId);
            $equipment['avg_power_24h'] = $this->getAveragePowerConsumption($equipmentId, 24);
            $equipment['utilization'] = $this->getLatestUtilization($equipmentId);
            $equipment['utilization_percentage_24h'] = $this->getUtilizationPercentage($equipmentId, 24);

            Log::info('Successfully fetched full equipment data', ['equipment_id' => $equipmentId]);

            return $equipment;
        } catch (\Exception $e) {
            Log::error('Failed to fetch full equipment data', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get all equipment with full data.
     */
    public function getAllEquipmentsFullData(): array
    {
        Log::info('Fetching full data for all equipments');

        try {
            $equipments = $this->getAllEquipments();
            $processedCount = 0;

            foreach ($equipments as &$equipment) {
                $equipmentId = $equipment['equipment_id'];

                $locations = $this->getLocationsByEquipmentId($equipmentId);
                $equipment['latest_location'] = $locations[0] ?? null;

                $equipment['power_consumption'] = $this->getLatestPowerConsumption($equipmentId);
                $equipment['avg_power_24h'] = $this->getAveragePowerConsumption($equipmentId, 24);

                $equipment['utilization'] = $this->getLatestUtilization($equipmentId);
                $equipment['utilization_percentage_24h'] = $this->getUtilizationPercentage($equipmentId, 24);

                $processedCount++;
            }

            Log::info('Successfully fetched full data for all equipments', [
                'total_count' => count($equipments),
                'processed_count' => $processedCount
            ]);

            return $equipments;
        } catch (\Exception $e) {
            Log::error('Failed to fetch full data for all equipments', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    // ==================== CACHE MANAGEMENT ====================

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
        Log::info('All caches cleared successfully');
    } catch (\Exception $e) {
        Log::error('Failed to clear all caches', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }
}
    /**
     * Clear equipment-related caches.
     */
    public function clearEquipmentCache(?int $equipmentId = null): void
    {
        Log::info('Clearing equipment caches', ['equipment_id' => $equipmentId]);

        try {
            Cache::forget('all_equipments');
            Cache::forget('equipments_with_locations');
            Cache::forget('complete_equipment_data');

            if ($equipmentId) {
                Cache::forget("equipment_{$equipmentId}_full");
                Log::info('Cleared specific equipment cache', ['equipment_id' => $equipmentId]);
            }

            Log::info('Equipment caches cleared successfully');
        } catch (\Exception $e) {
            Log::error('Failed to clear equipment caches', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Clear power consumption caches.
     */
    public function clearPowerConsumptionCache(?int $equipmentId = null): void
    {
        Log::info('Clearing power consumption caches', ['equipment_id' => $equipmentId]);

        try {
            Cache::forget('all_power_consumptions_limit_1000');
            Cache::forget('complete_equipment_data');

            if ($equipmentId) {
                Cache::forget("equipment_{$equipmentId}_full");
                Log::info('Cleared specific power consumption cache', ['equipment_id' => $equipmentId]);
            }

            Log::info('Power consumption caches cleared successfully');
        } catch (\Exception $e) {
            Log::error('Failed to clear power consumption caches', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Clear utilization caches.
     */
    public function clearUtilizationCache(?int $equipmentId = null): void
    {
        Log::info('Clearing utilization caches', ['equipment_id' => $equipmentId]);

        try {
            Cache::forget('all_utilizations_limit_1000');
            Cache::forget('complete_equipment_data');

            if ($equipmentId) {
                Cache::forget("equipment_{$equipmentId}_full");
                Log::info('Cleared specific utilization cache', ['equipment_id' => $equipmentId]);
            }

            Log::info('Utilization caches cleared successfully');
        } catch (\Exception $e) {
            Log::error('Failed to clear utilization caches', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get headers required for Supabase API.
     */
    private function getHeaders(): array
    {
        if (empty($this->key)) {
            Log::error('Supabase API key is empty');
        }

        return [
            'apikey' => $this->key,
            'Authorization' => 'Bearer '.$this->key,
            'Content-Type' => 'application/json',
            'Prefer' => 'return=representation',
        ];
    }

    /**
     * Handle API response.
     */
    private function handleResponse(Response $response): array
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
            }

            if ($response->status() === 429) {
                Log::warning('Supabase API rate limit exceeded');
            }

            $errorMessage = 'Supabase API Error: '.$response->body();
            throw new \Exception($errorMessage);
        }

        $data = $response->json() ?? [];
        
        Log::debug('Supabase API response handled successfully', [
            'status' => $response->status(),
            'data_count' => count($data)
        ]);

        return $data;
    }

    // ==================== PASSWORD HASHING HELPERS ====================

/**
 * Verify password against stored hash and salt.
 */
private function verifyPassword(string $password, string $salt, string $storedHash): bool
{
    $hashedPassword = hash('sha256', $password . $salt);
    return hash_equals($storedHash, $hashedPassword);
}

// ==================== USER/AUTHENTICATION METHODS ====================

/**
 * Authenticate user with email/username and password.
 */
public function authenticateUser(string $emailOrUsername, string $password): ?array
{
    Log::info('Authenticating user', ['identifier' => $emailOrUsername]);

    try {
        // Get user by email or username
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url.'/rest/v1/tbl_users', [
                'or' => '(email.eq.' . $emailOrUsername . ',username.eq.' . $emailOrUsername . ')',
                'limit' => 1,
                'select' => 'user_id,email,username,password,password_salt,first_name,middle_name,last_name,office,last_login,current_login'
            ]);

        $data = $this->handleResponse($response);
        $user = $data[0] ?? null;

        if (!$user) {
            Log::warning('Authentication failed - user not found', ['identifier' => $emailOrUsername]);
            return null;
        }

        // Get salt and stored hash
        $salt = $user['password_salt'] ?? '';
        $storedHash = $user['password'] ?? '';
        
        if (empty($salt) || empty($storedHash)) {
            Log::error('User account missing password hash or salt', [
                'user_id' => $user['user_id']
            ]);
            return null;
        }

        // Verify password
        if (!$this->verifyPassword($password, $salt, $storedHash)) {
            Log::warning('Authentication failed - invalid password', [
                'user_id' => $user['user_id']
            ]);
            return null;
        }

        // Update login timestamps
        $now = now()->toIso8601String();
        Http::withHeaders($this->getHeaders())
            ->patch($this->url.'/rest/v1/tbl_users?user_id=eq.' . $user['user_id'], [
                'last_login' => $user['current_login'] ?? $now,
                'current_login' => $now,
            ]);

        Log::info('User authenticated successfully', [
            'user_id' => $user['user_id'],
            'email' => $user['email']
        ]);

        // Remove sensitive data before returning
        unset($user['password']);
        unset($user['password_salt']);
        
        return $user;
    } catch (\Exception $e) {
        Log::error('Authentication error', [
            'identifier' => $emailOrUsername,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}

/**
 * Get user by ID (without sensitive data).
 */
public function getUserById(int $userId): ?array
{
    Log::info('Fetching user by ID', ['user_id' => $userId]);

    try {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url.'/rest/v1/tbl_users', [
                'user_id' => 'eq.' . $userId,
                'limit' => 1,
                'select' => 'user_id,email,username,first_name,middle_name,last_name,office,last_login,current_login,created_at'
            ]);

        $data = $this->handleResponse($response);
        return $data[0] ?? null;
    } catch (\Exception $e) {
        Log::error('Failed to fetch user', [
            'user_id' => $userId,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}

/**
 * Validate user session/token.
 */
public function validateUserSession(int $userId): bool
{
    Log::info('Validating user session', ['user_id' => $userId]);

    try {
        $user = $this->getUserById($userId);
        return !is_null($user);
    } catch (\Exception $e) {
        Log::error('Session validation failed', [
            'user_id' => $userId,
            'error' => $e->getMessage()
        ]);
        return false;
    }
}

// ==================== EQUIPMENT MANAGEMENT METHODS ====================

/**
 * Create new equipment with initial location.
 */
/**
 * Update equipment.
 */
public function updateEquipment(int $equipmentId, array $equipmentData): ?array
{
    Log::info('Updating equipment', ['equipment_id' => $equipmentId]);

    try {
        $payload = array_merge($equipmentData, [
            'updated_at' => now()->toIso8601String(),
        ]);

        $response = Http::withHeaders($this->getHeaders())
            ->patch($this->url.'/rest/v1/tbl_equipments?equipment_id=eq.' . $equipmentId, $payload);

        $equipment = $this->handleResponse($response)[0] ?? null;

        // Clear caches
        $this->clearEquipmentCache($equipmentId);
        Cache::forget('complete_equipment_data');

        Log::info('Equipment updated successfully', ['equipment_id' => $equipmentId]);

        return $equipment;
    } catch (\Exception $e) {
        Log::error('Failed to update equipment', [
            'equipment_id' => $equipmentId,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}

/**
 * Update equipment initial location.
 */
public function updateInitialLocation(int $equipmentId, float $latitude, float $longitude): ?array
{
    Log::info('Updating initial location', ['equipment_id' => $equipmentId]);

    try {
        // Check if initial location exists
        $existingResponse = Http::withHeaders($this->getHeaders())
            ->get($this->url.'/rest/v1/tbl_locations', [
                'equipment_id' => 'eq.' . $equipmentId,
                'type' => 'eq.0',
                'limit' => 1,
            ]);

        $existing = $this->handleResponse($existingResponse)[0] ?? null;

        if ($existing) {
            // Update existing location
            $response = Http::withHeaders($this->getHeaders())
                ->patch($this->url.'/rest/v1/tbl_locations?location_id=eq.' . $existing['location_id'], [
                    'latitude' => (string) $latitude,
                    'longitude' => (string) $longitude,
                ]);
        } else {
            // Create new initial location
            $response = Http::withHeaders($this->getHeaders())
                ->post($this->url.'/rest/v1/tbl_locations', [
                    'equipment_id' => $equipmentId,
                    'latitude' => (string) $latitude,
                    'longitude' => (string) $longitude,
                    'type' => '0',
                    'created_at' => now()->toIso8601String(),
                ]);
        }

        $location = $this->handleResponse($response)[0] ?? null;

        Log::info('Initial location updated successfully', [
            'equipment_id' => $equipmentId,
            'latitude' => $latitude,
            'longitude' => $longitude
        ]);

        return $location;
    } catch (\Exception $e) {
        Log::error('Failed to update initial location', [
            'equipment_id' => $equipmentId,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}

/**
 * Get all equipment for admin (with initial locations).
 */
public function getAllEquipmentsForAdmin(): array
{
    Log::info('Fetching all equipment for admin');

    try {
        $response = Http::withHeaders($this->getHeaders())
            ->timeout($this->httpTimeout)
            ->get($this->url.'/rest/v1/tbl_equipments', [
                'select' => '*,locations:tbl_locations(*)',
                'order' => 'equipment_id.asc',
            ]);

        $result = $this->handleResponse($response);

        // Add initial location to each equipment
        foreach ($result as &$equipment) {
            $initialLocation = null;
            if (isset($equipment['locations']) && is_array($equipment['locations'])) {
                foreach ($equipment['locations'] as $location) {
                    if ($location['type'] === '0') {
                        $initialLocation = $location;
                        break;
                    }
                }
            }
            $equipment['initial_location'] = $initialLocation;
            unset($equipment['locations']); // Remove all locations, keep only initial
        }

        Log::info('Successfully fetched equipment for admin', [
            'count' => count($result)
        ]);

        return $result;
    } catch (\Exception $e) {
        Log::error('Failed to fetch equipment for admin', [
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}
/**
 * Get all projects.
 */
public function getAllProjects(): array
{
    Log::info('Fetching all projects');

    return $this->cacheRemember('all_projects', $this->cacheTtl, function () {
        Log::info('Cache miss - fetching projects from Supabase API');

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_projects', [
                    'order' => 'project_id.asc',
                ]);

            $result = $this->handleResponse($response);
            
            Log::info('Successfully fetched projects', [
                'count' => count($result)
            ]);

            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to fetch projects', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    });
}

/**
 * Get next equipment ID for a project (4-digit format).
 */
public function getNextEquipmentId(int $projectId): string
{
    Log::info('Getting next equipment ID for project', ['project_id' => $projectId]);

    try {
        // Get all equipment IDs for this project
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url.'/rest/v1/tbl_equipments', [
                'project_id' => 'eq.' . $projectId,
                'select' => 'equipment_id',
                'order' => 'equipment_id.asc',
            ]);

        $equipments = $this->handleResponse($response);
        
        if (empty($equipments)) {
            // First equipment for this project
            $nextId = (int)($projectId . '0001');
            Log::info('First equipment ID generated', ['next_id' => $nextId]);
            return (string) $nextId;
        }

        // Get the last equipment ID
        $lastEquipment = end($equipments);
        $lastId = (int)$lastEquipment['equipment_id'];
        
        // Extract the 4-digit suffix
        $projectPrefix = (string)$projectId;
        $lastIdStr = (string)$lastId;
        
        if (strpos($lastIdStr, $projectPrefix) === 0) {
            $suffix = (int)substr($lastIdStr, strlen($projectPrefix));
            $nextSuffix = $suffix + 1;
            $nextId = (int)($projectPrefix . str_pad($nextSuffix, 4, '0', STR_PAD_LEFT));
        } else {
            // Fallback
            $nextId = (int)($projectId . '0001');
        }

        Log::info('Next equipment ID generated', [
            'project_id' => $projectId,
            'next_id' => $nextId,
            'last_id' => $lastId
        ]);

        return (string) $nextId;
    } catch (\Exception $e) {
        Log::error('Failed to get next equipment ID', [
            'project_id' => $projectId,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}

/**
 * Update the createEquipment method to use project-based IDs.
 */
public function createEquipment(array $equipmentData, ?array $locationData = null): ?array
{
    Log::info('Creating new equipment', ['name' => $equipmentData['equipment_name'] ?? 'unknown']);

    try {
        $projectId = $equipmentData['project_id'] ?? null;
        
        if (!$projectId) {
            throw new \Exception('Project ID is required');
        }

        // Get next equipment ID for this project
        $nextId = $this->getNextEquipmentId($projectId);

        // Create equipment
        $equipmentPayload = array_merge($equipmentData, [
            'equipment_id' => (int) $nextId,
            'created_at' => now()->toIso8601String(),
            'updated_at' => now()->toIso8601String(),
        ]);

        $response = Http::withHeaders($this->getHeaders())
            ->post($this->url.'/rest/v1/tbl_equipments', $equipmentPayload);

        $equipment = $this->handleResponse($response)[0] ?? null;

        if ($equipment && $locationData) {
            // Create initial location (type = '0')
            $locationPayload = array_merge($locationData, [
                'equipment_id' => (int) $nextId,
                'type' => '0',
                'created_at' => now()->toIso8601String(),
            ]);

            Http::withHeaders($this->getHeaders())
                ->post($this->url.'/rest/v1/tbl_locations', $locationPayload);
        }

        // Clear caches
        $this->clearEquipmentCache();
        Cache::forget('complete_equipment_data');

        Log::info('Equipment created successfully', [
            'equipment_id' => $nextId,
            'project_id' => $projectId,
            'name' => $equipmentData['equipment_name'] ?? 'unknown'
        ]);

        return $equipment;
    } catch (\Exception $e) {
        Log::error('Failed to create equipment', [
            'name' => $equipmentData['equipment_name'] ?? 'unknown',
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}
/**
 * Update equipment ID across all related tables when project changes.
 * Uses a transaction-like approach since Supabase REST API doesn't support transactions.
 */
public function updateEquipmentId(int $oldEquipmentId, int $newEquipmentId, int $newProjectId, array $equipmentData): ?array
{
    Log::info('Updating equipment ID', [
        'old_id' => $oldEquipmentId,
        'new_id' => $newEquipmentId,
        'new_project_id' => $newProjectId
    ]);

    try {
        // Step 1: Create new equipment record with new ID
        $equipmentPayload = array_merge($equipmentData, [
            'equipment_id' => $newEquipmentId,
            'project_id' => $newProjectId,
            'updated_at' => now()->toIso8601String(),
        ]);

        $createResponse = Http::withHeaders($this->getHeaders())
            ->post($this->url.'/rest/v1/tbl_equipments', $equipmentPayload);

        $newEquipment = $this->handleResponse($createResponse)[0] ?? null;

        if (!$newEquipment) {
            throw new \Exception('Failed to create new equipment record');
        }

        // Step 2: Update locations to point to new equipment_id
        Http::withHeaders($this->getHeaders())
            ->patch($this->url.'/rest/v1/tbl_locations?equipment_id=eq.'.$oldEquipmentId, [
                'equipment_id' => $newEquipmentId,
            ]);

        // Step 3: Update power consumptions to point to new equipment_id
        Http::withHeaders($this->getHeaders())
            ->patch($this->url.'/rest/v1/tbl_powerconsumptions?equipment_id=eq.'.$oldEquipmentId, [
                'equipment_id' => $newEquipmentId,
            ]);

        // Step 4: Update utilizations to point to new equipment_id
        Http::withHeaders($this->getHeaders())
            ->patch($this->url.'/rest/v1/tbl_utilizations?equipment_id=eq.'.$oldEquipmentId, [
                'equipment_id' => $newEquipmentId,
            ]);

        // Step 5: Delete old equipment record
        Http::withHeaders($this->getHeaders())
            ->delete($this->url.'/rest/v1/tbl_equipments?equipment_id=eq.'.$oldEquipmentId);

        // Clear caches
        $this->clearEquipmentCache();
        Cache::forget('complete_equipment_data');

        Log::info('Equipment ID updated successfully', [
            'old_id' => $oldEquipmentId,
            'new_id' => $newEquipmentId
        ]);

        return $newEquipment;
    } catch (\Exception $e) {
        Log::error('Failed to update equipment ID', [
            'old_id' => $oldEquipmentId,
            'new_id' => $newEquipmentId,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}
}
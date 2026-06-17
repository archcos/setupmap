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

    public function __construct()
    {
        $this->url = config('supabase.url');
        $this->key = config('supabase.key');

        // Check if cache is available
        try {
            Cache::get('test_cache_key');
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
            Log::info('Cache bypassed', ['key' => $key]);
            return $callback();
        }

        try {
            return Cache::remember($key, $ttl, $callback);
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
    Log::info('Fetching complete equipment data with relations');

    return $this->cacheRemember('complete_equipment_data', $this->cacheTtl, function () {
        Log::info('Cache miss - fetching complete equipment data from Supabase API');

        try {
            // IMPORTANT: Supabase select parameter must be a single line with NO line breaks
            // The select string must be clean with only single spaces between elements
            $select = '*,locations:tbl_locations(*),power_consumptions:tbl_powerconsumptions(consumption,created_at),utilizations:tbl_utilizations(type,created_at)';
            
            // Add ordering using the proper syntax
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_equipments', [
                    'select' => $select,
                    'order' => 'created_at.desc', // Order the main query
                    // Note: Ordering of nested resources needs to be in the select parameter
                    // but we can also try with explicit ordering
                ]);

            $result = $this->handleResponse($response);
            
            // If the above doesn't work with ordering on nested relations,
            // we might need to sort the results in PHP instead
            foreach ($result as &$equipment) {
                // Sort power consumptions by created_at desc
                if (isset($equipment['power_consumptions']) && is_array($equipment['power_consumptions'])) {
                    usort($equipment['power_consumptions'], function($a, $b) {
                        return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                    });
                }
                
                // Sort utilizations by created_at desc
                if (isset($equipment['utilizations']) && is_array($equipment['utilizations'])) {
                    usort($equipment['utilizations'], function($a, $b) {
                        return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                    });
                }
            }
            
            Log::info('Successfully fetched complete equipment data', [
                'equipment_count' => count($result)
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
     * Get average power consumption for equipment over time period (in hours).
     */
    public function getAveragePowerConsumption(int $equipmentId, int $hours = 24): float
    {
        Log::info('Calculating average power consumption', [
            'equipment_id' => $equipmentId,
            'hours' => $hours
        ]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_powerconsumptions?equipment_id=eq.'.$equipmentId.
                      '&created_at=gte.now-'.$hours.'hours&select=consumption');

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
    public function getUtilizationPercentage(int $equipmentId, int $hours = 24): float
    {
        Log::info('Calculating utilization percentage', [
            'equipment_id' => $equipmentId,
            'hours' => $hours
        ]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get($this->url.'/rest/v1/tbl_utilizations?equipment_id=eq.'.$equipmentId.
                      '&created_at=gte.now-'.$hours.'hours&select=type');

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
            Cache::flush();
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
                'headers' => $response->headers(),
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
}
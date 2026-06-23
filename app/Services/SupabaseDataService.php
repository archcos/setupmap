<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class SupabaseDataService extends BaseSupabaseService
{
    // ==================== EQUIPMENT METHODS ====================

    /**
     * Get all equipment (active only - not soft deleted).
     */
    public function getAllEquipments(): array
    {
        Log::info('Fetching all equipments from cache/API');

        return $this->cacheRemember('all_equipments', $this->cacheTtl, function () {
            Log::info('Cache miss - fetching all equipments from Supabase API');
            
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
                ->get($this->url.'/rest/v1/tbl_equipments', [
                    'deleted_at' => 'is.null', // Only active equipment
                    'order' => 'equipment_id.asc',
                ]);

            $result = $this->handleResponse($response);
            
            Log::info('Successfully fetched all equipments', [
                'count' => count($result)
            ]);

            return $result;
        });
    }

    /**
     * Get all equipment including soft deleted.
     */
    public function getAllEquipmentsWithTrashed(): array
    {
        Log::info('Fetching all equipments including soft deleted');

        return $this->cacheRemember('all_equipments_with_trashed', $this->cacheTtl, function () {
            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->timeout($this->httpTimeout)
                    ->retry($this->maxRetries, $this->retryDelay)
                    ->get($this->url.'/rest/v1/tbl_equipments', [
                        'order' => 'equipment_id.asc',
                    ]);

                $result = $this->handleResponse($response);
                
                Log::info('Successfully fetched all equipments including soft deleted', [
                    'count' => count($result)
                ]);

                return $result;
            } catch (\Exception $e) {
                Log::error('Failed to fetch equipments with trashed', [
                    'error' => $e->getMessage()
                ]);
                throw $e;
            }
        });
    }

/**
 * Get all equipment for admin (with initial locations only - type = 0).
 */
public function getAllEquipmentsForAdmin(): array
{
    Log::info('Fetching all equipment for admin');

    return $this->cacheRemember('all_equipments_for_admin', $this->cacheTtl, function () {
        try {
            // Get equipment (only active ones - not soft deleted)
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
                ->get($this->url.'/rest/v1/tbl_equipments', [
                    'order' => 'equipment_id.asc',
                    'deleted_at' => 'is.null', // Only active equipment
                ]);

            $equipments = $this->handleResponse($response);

            // For each equipment, get its initial location (type = 0)
            foreach ($equipments as &$equipment) {
                $locationResponse = Http::withHeaders($this->getHeaders())
                    ->timeout($this->httpTimeout)
                    ->get($this->url.'/rest/v1/tbl_locations', [
                        'equipment_id' => 'eq.' . $equipment['equipment_id'],
                        'type' => 'eq.0', // Only get type 0 (initial location)
                        'limit' => 1,
                    ]);

                $locations = $this->handleResponse($locationResponse);
                $equipment['initial_location'] = $locations[0] ?? null;
            }

            Log::info('Successfully fetched equipment for admin', [
                'count' => count($equipments)
            ]);

            return $equipments;
        } catch (\Exception $e) {
            Log::error('Failed to fetch equipment for admin', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    });
}

/**
 * Get equipment by ID with initial location.
 */
public function getEquipmentById(int $equipmentId): ?array
{
    Log::info('Fetching equipment by ID', ['equipment_id' => $equipmentId]);

    try {
        // Get equipment (only active - not soft deleted)
        $response = Http::withHeaders($this->getHeaders())
            ->timeout($this->httpTimeout)
            ->retry($this->maxRetries, $this->retryDelay)
            ->get($this->url.'/rest/v1/tbl_equipments', [
                'equipment_id' => 'eq.' . $equipmentId,
                'deleted_at' => 'is.null', // Only active equipment
            ]);

        $data = $this->handleResponse($response);
        $equipment = $data[0] ?? null;

        if ($equipment) {
            // Get initial location (type = 0) - NO deleted_at filter because locations don't have soft delete
            $locationResponse = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->get($this->url.'/rest/v1/tbl_locations', [
                    'equipment_id' => 'eq.' . $equipmentId,
                    'type' => 'eq.0',
                    'limit' => 1,
                ]);

            $locations = $this->handleResponse($locationResponse);
            $equipment['initial_location'] = $locations[0] ?? null;

            Log::info('Successfully fetched equipment', ['equipment_id' => $equipmentId]);
        } else {
            Log::warning('Equipment not found', ['equipment_id' => $equipmentId]);
        }

        return $equipment;
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
     * Get equipment by ID including soft deleted.
     */
    public function getEquipmentByIdWithTrashed(int $equipmentId): ?array
    {
        Log::info('Fetching equipment by ID including soft deleted', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
                ->get($this->url.'/rest/v1/tbl_equipments', [
                    'equipment_id' => 'eq.'.$equipmentId,
                ]);

            $data = $this->handleResponse($response);
            return $data[0] ?? null;
        } catch (\Exception $e) {
            Log::error('Failed to fetch equipment by ID with trashed', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

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
                    ->retry($this->maxRetries, $this->retryDelay)
                    ->get($this->url.'/rest/v1/tbl_equipments', [
                        'select' => $select,
                        'deleted_at' => 'is.null', // Only active equipment
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
                ->retry($this->maxRetries, $this->retryDelay)
                ->get($this->url . '/rest/v1/tbl_equipments', [
                    'equipment_id' => 'eq.' . $equipmentId,
                    'select' => '*,locations:tbl_locations(*),power_consumptions:tbl_powerconsumptions(consumption,created_at),utilizations:tbl_utilizations(type,created_at)',
                    'limit' => 1,
                    'deleted_at' => 'is.null', // Exclude soft deleted
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
     * Get all equipment with locations only.
     */
    public function getAllEquipmentsWithLocations(): array
    {
        Log::info('Fetching equipments with locations');

        return $this->cacheRemember('equipments_with_locations', $this->cacheTtl, function () {
            Log::info('Cache miss - fetching equipments with locations from Supabase API');

            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->timeout($this->httpTimeout)
                    ->retry($this->maxRetries, $this->retryDelay)
                    ->get($this->url.'/rest/v1/tbl_equipments', [
                        'select' => '*, locations:equipment_id(*)',
                        'deleted_at' => 'is.null', // Exclude soft deleted
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
                    ->timeout($this->httpTimeout)
                    ->retry($this->maxRetries, $this->retryDelay)
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
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
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

    // ==================== POWER CONSUMPTION METHODS ====================

    /**
     * Get power consumption by equipment ID.
     */
    public function getPowerConsumptionByEquipmentId(int $equipmentId): array
    {
        Log::info('Fetching power consumption for equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
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
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
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

    // ==================== UTILIZATION METHODS ====================

    /**
     * Get utilization by equipment ID.
     */
    public function getUtilizationByEquipmentId(int $equipmentId): array
    {
        Log::info('Fetching utilization for equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
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
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
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

    // ==================== PROJECT METHODS ====================

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
                    ->timeout($this->httpTimeout)
                    ->retry($this->maxRetries, $this->retryDelay)
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

    // ==================== EQUIPMENT CRUD METHODS ====================

    /**
     * Create new equipment with initial location.
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
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
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
                    ->timeout($this->httpTimeout)
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
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
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
     * Update equipment ID across all related tables when project changes.
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
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
                ->post($this->url.'/rest/v1/tbl_equipments', $equipmentPayload);

            $newEquipment = $this->handleResponse($createResponse)[0] ?? null;

            if (!$newEquipment) {
                throw new \Exception('Failed to create new equipment record');
            }

            // Step 2: Update locations to point to new equipment_id
            Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->patch($this->url.'/rest/v1/tbl_locations?equipment_id=eq.'.$oldEquipmentId, [
                    'equipment_id' => $newEquipmentId,
                ]);

            // Step 3: Update power consumptions to point to new equipment_id
            Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->patch($this->url.'/rest/v1/tbl_powerconsumptions?equipment_id=eq.'.$oldEquipmentId, [
                    'equipment_id' => $newEquipmentId,
                ]);

            // Step 4: Update utilizations to point to new equipment_id
            Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->patch($this->url.'/rest/v1/tbl_utilizations?equipment_id=eq.'.$oldEquipmentId, [
                    'equipment_id' => $newEquipmentId,
                ]);

            // Step 5: Delete old equipment record (hard delete since we're moving data)
            Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
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

    /**
     * Update equipment initial location.
     */

    public function updateInitialLocation(int $equipmentId, float $latitude, float $longitude): ?array
    {
        Log::info('Updating initial location', ['equipment_id' => $equipmentId]);

        try {
            // Check if initial location exists (type = '0')
            $existingResponse = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->get($this->url.'/rest/v1/tbl_locations', [
                    'equipment_id' => 'eq.' . $equipmentId,
                    'type' => 'eq.0', // Only get type 0 (initial location)
                    'limit' => 1,
                ]);

            $existing = $this->handleResponse($existingResponse)[0] ?? null;

            if ($existing) {
                // Update existing location
                $response = Http::withHeaders($this->getHeaders())
                    ->timeout($this->httpTimeout)
                    ->patch($this->url.'/rest/v1/tbl_locations?location_id=eq.' . $existing['location_id'], [
                        'latitude' => (string) $latitude,
                        'longitude' => (string) $longitude,
                        'updated_at' => now()->toIso8601String(),
                    ]);

                Log::info('Initial location updated', [
                    'equipment_id' => $equipmentId,
                    'location_id' => $existing['location_id']
                ]);
            } else {
                // Create new initial location (type = '0')
                $response = Http::withHeaders($this->getHeaders())
                    ->timeout($this->httpTimeout)
                    ->post($this->url.'/rest/v1/tbl_locations', [
                        'equipment_id' => $equipmentId,
                        'latitude' => (string) $latitude,
                        'longitude' => (string) $longitude,
                        'type' => '0', // Explicitly set type = 0 for initial location
                        'created_at' => now()->toIso8601String(),
                    ]);

                Log::info('Initial location created', [
                    'equipment_id' => $equipmentId
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
     * Get next equipment ID for a project (4-digit format).
     */
    public function getNextEquipmentId(int $projectId): string
    {
        Log::info('Getting next equipment ID for project', ['project_id' => $projectId]);

        try {
            // Get all equipment IDs for this project (excluding soft deleted)
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->retry($this->maxRetries, $this->retryDelay)
                ->get($this->url.'/rest/v1/tbl_equipments', [
                    'project_id' => 'eq.' . $projectId,
                    'select' => 'equipment_id',
                    'order' => 'equipment_id.asc',
                    'deleted_at' => 'is.null', // Exclude soft deleted
                ]);

            $equipments = $this->handleResponse($response);
            
            if (empty($equipments)) {
                // First equipment for this project
                $nextId = (int)($projectId . '0001');  // <-- This line was missing!
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
     * Soft delete equipment (set deleted_at timestamp).
     */
    public function softDeleteEquipment(int $equipmentId): bool
    {
        Log::info('Soft deleting equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->patch($this->url.'/rest/v1/tbl_equipments?equipment_id=eq.'.$equipmentId, [
                    'deleted_at' => now()->toIso8601String(),
                    'updated_at' => now()->toIso8601String(),
                ]);

            if ($response->successful()) {
                // Clear caches
                $this->clearEquipmentCache($equipmentId);
                Cache::forget('complete_equipment_data');
                Cache::forget('all_equipments_for_admin');
                
                Log::info('Equipment soft deleted successfully', ['equipment_id' => $equipmentId]);
                return true;
            }

            Log::error('Failed to soft delete equipment', [
                'equipment_id' => $equipmentId,
                'status' => $response->status()
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('Exception soft deleting equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Restore soft deleted equipment.
     */
    public function restoreEquipment(int $equipmentId): bool
    {
        Log::info('Restoring equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->patch($this->url.'/rest/v1/tbl_equipments?equipment_id=eq.'.$equipmentId, [
                    'deleted_at' => null,
                    'updated_at' => now()->toIso8601String(),
                ]);

            if ($response->successful()) {
                // Clear caches
                $this->clearEquipmentCache($equipmentId);
                Cache::forget('complete_equipment_data');
                Cache::forget('all_equipments_for_admin');
                
                Log::info('Equipment restored successfully', ['equipment_id' => $equipmentId]);
                return true;
            }

            Log::error('Failed to restore equipment', [
                'equipment_id' => $equipmentId,
                'status' => $response->status()
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('Exception restoring equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Permanently delete equipment (hard delete - use with caution).
     */
    public function hardDeleteEquipment(int $equipmentId): bool
    {
        Log::warning('Hard deleting equipment', ['equipment_id' => $equipmentId]);

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout($this->httpTimeout)
                ->delete($this->url.'/rest/v1/tbl_equipments?equipment_id=eq.'.$equipmentId);

            if ($response->successful()) {
                // Clear caches
                $this->clearEquipmentCache($equipmentId);
                Cache::forget('complete_equipment_data');
                Cache::forget('all_equipments_for_admin');
                
                Log::info('Equipment hard deleted successfully', ['equipment_id' => $equipmentId]);
                return true;
            }

            Log::error('Failed to hard delete equipment', [
                'equipment_id' => $equipmentId,
                'status' => $response->status()
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('Exception hard deleting equipment', [
                'equipment_id' => $equipmentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    // ==================== CACHE MANAGEMENT ====================

    /**
     * Clear equipment-related caches.
     */
    public function clearEquipmentCache(?int $equipmentId = null): void
    {
        Log::info('Clearing equipment caches', ['equipment_id' => $equipmentId]);

        try {
            Cache::forget('all_equipments');
            Cache::forget('all_equipments_with_trashed');
            Cache::forget('equipments_with_locations');
            Cache::forget('complete_equipment_data');
            Cache::forget('all_equipments_for_admin');

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
}
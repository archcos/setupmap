<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class EquipmentController extends Controller
{
    public function __construct(private SupabaseService $supabase)
    {
    }

    /**
     * Equipment dashboard page
     */
    public function equipmentPage()
    {
        return Inertia::render('Equipment/EquipmentPage');
    }

    /**
     * API endpoint for equipment utilization data
     * OPTIMIZED: Uses cached complete data, calculates once
     */
/**
 * API endpoint for equipment utilization data
 */
public function utilizations(Request $request)
{
    $startDate = $request->get('start_date');
    $endDate = $request->get('end_date');
    
    $cacheKey = 'equipment_utilization_' . md5($startDate . $endDate);
    
    return Cache::remember($cacheKey, 300, function () use ($startDate, $endDate) {
        Log::info('Calculating equipment utilization', [
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);

        try {
            $equipments = $this->supabase->getCompleteEquipmentData();
            
            $result = array_map(function ($equipment) use ($startDate, $endDate) {
                $utilizations = $equipment['utilizations'] ?? [];
                $powerConsumptions = $equipment['power_consumptions'] ?? [];
                
                // Filter by date range
                if ($startDate || $endDate) {
                    $utilizations = array_values(array_filter($utilizations, function ($record) use ($startDate, $endDate) {
                        $timestamp = strtotime($record['created_at'] ?? '');
                        if (!$timestamp) return false;
                        if ($startDate && $timestamp < strtotime($startDate)) return false;
                        if ($endDate && $timestamp > strtotime($endDate) + 86400) return false;
                        return true;
                    }));
                    
                    $powerConsumptions = array_values(array_filter($powerConsumptions, function ($record) use ($startDate, $endDate) {
                        $timestamp = strtotime($record['created_at'] ?? '');
                        if (!$timestamp) return false;
                        if ($startDate && $timestamp < strtotime($startDate)) return false;
                        if ($endDate && $timestamp > strtotime($endDate) + 86400) return false;
                        return true;
                    }));
                }
                
                // Calculate summary stats
                $utilizationHours = $this->calculateUtilizationHours($utilizations);
                $utilizationPercentage = $utilizationHours > 0 ? min(($utilizationHours / 8) * 100, 100) : 0;
                
                $latestPower = $powerConsumptions[0]['consumption'] ?? 0;
                
                $avgPower = 0;
                if (!empty($powerConsumptions)) {
                    $totalPower = array_sum(array_column($powerConsumptions, 'consumption'));
                    $avgPower = count($powerConsumptions) > 0 ? $totalPower / count($powerConsumptions) : 0;
                }
                
                // Check if active in last hour
                $isActive = false;
                if (!empty($utilizations)) {
                    $latestUtil = $utilizations[0];
                    $latestTime = strtotime($latestUtil['created_at'] ?? '');
                    $oneHourAgo = now()->subHour()->timestamp;
                    $isActive = ($latestUtil['type'] == true || $latestUtil['type'] === 1) && $latestTime >= $oneHourAgo;
                }
                
                return [
                    'equipment_id' => $equipment['equipment_id'] ?? 'Unknown',
                    'equipment_name' => $equipment['equipment_name'] ?? 'Unknown',
                    'owner' => $equipment['owner'] ?? 'Unknown',
                    'expected_location' => $equipment['expected_location'] ?? 'Unknown',
                    'is_active' => $isActive,
                    'utilization_hours_8h' => round($utilizationHours, 2),
                    'utilization_percentage_8h' => round($utilizationPercentage, 2),
                    'power_consumption' => round($latestPower, 2),
                    'avg_power_8h' => round($avgPower, 2),
                    'updated_at' => $equipment['updated_at'] ?? now()->toIso8601String(),
                    // IMPORTANT: Include raw data for graphs
                    'utilizations' => $utilizations,
                    'power_consumptions' => $powerConsumptions,
                ];
            }, $equipments);
            
            $result = array_values(array_filter($result));
            
            Log::info('Equipment utilization calculated', [
                'count' => count($result),
                'sample_util_count' => count($result[0]['utilizations'] ?? []),
                'sample_power_count' => count($result[0]['power_consumptions'] ?? [])
            ]);
            
            return $result;
        } catch (\Exception $e) {
            Log::error('Failed to calculate equipment utilization', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    });
}

    /**
     * API endpoint for map data
     * OPTIMIZED: Uses the same cached data as MapController
     */
    public function mapData()
    {
        Log::info('EquipmentController: Fetching map data');
        
        try {
            // Use the SAME cached method from SupabaseService
            $equipments = $this->supabase->getCompleteEquipmentData();
            
            // Transform for map display
            $transformedEquipments = array_map(function ($equipment) {
                $locations = $equipment['locations'] ?? [];
                $powerConsumptions = $equipment['power_consumptions'] ?? [];
                $utilizations = $equipment['utilizations'] ?? [];
                
                return [
                    'equipment_id' => $equipment['equipment_id'],
                    'equipment_name' => $equipment['equipment_name'],
                    'owner' => $equipment['owner'],
                    'expected_location' => $equipment['expected_location'],
                    'locations' => $locations,
                    'power_consumption' => $powerConsumptions[0]['consumption'] ?? 0,
                    'utilization_history' => $utilizations,
                ];
            }, $equipments);
            
            return response()->json($transformedEquipments);
        } catch (\Exception $e) {
            Log::error('Failed to fetch map data', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

/**
 * Equipment details page - OPTIMIZED single query
 */
public function detailsPage($equipmentId)
{
    try {
        // Use a single query to get equipment with all relations
        $equipment = $this->supabase->getEquipmentWithAllRelations($equipmentId);
        
        if (!$equipment) {
            return Inertia::render('Equipment/Details', [
                'equipment' => null
            ]);
        }
        
        // Process the data that's already fetched
        $equipment['locations'] = $equipment['locations'] ?? [];
        $equipment['power_consumptions'] = $equipment['power_consumptions'] ?? [];
        $equipment['utilizations'] = $equipment['utilizations'] ?? [];
        
        // Set initial values from already fetched data
        $equipment['power_consumption'] = $equipment['power_consumptions'][0]['consumption'] ?? 0;
        
        // Check if active in last hour
        $equipment['is_active'] = false;
        if (!empty($equipment['utilizations'])) {
            $latestUtil = $equipment['utilizations'][0];
            $latestTime = strtotime($latestUtil['created_at'] ?? '');
            $oneHourAgo = now()->subHour()->timestamp;
            $equipment['is_active'] = ($latestUtil['type'] == true || $latestUtil['type'] === 1) && $latestTime >= $oneHourAgo;
        }
        
        $equipment['updated_at'] = $equipment['updated_at'] ?? now()->toIso8601String();
        
        return Inertia::render('Equipment/Details', [
            'equipment' => $equipment
        ]);
    } catch (\Exception $e) {
        Log::error('Failed to load equipment details', [
            'equipment_id' => $equipmentId,
            'error' => $e->getMessage()
        ]);
        
        return Inertia::render('Equipment/Details', [
            'equipment' => null
        ]);
    }
}
/**
 * API endpoint for single equipment data
 */
/**
 * API endpoint for single equipment data - OPTIMIZED
 */
public function show(Request $request, $equipmentId)
{
    $startDate = $request->get('start_date');
    $endDate = $request->get('end_date');
    
    Log::info('Equipment data request', [
        'equipment_id' => $equipmentId,
        'start_date' => $startDate,
        'end_date' => $endDate
    ]);
    
    try {
        // Use the optimized single query method
        $equipment = $this->supabase->getEquipmentWithAllRelations($equipmentId);
        
        if (!$equipment) {
            return response()->json(['error' => 'Equipment not found'], 404);
        }
        
        // Filter power consumptions by date range if needed
        $powerConsumptions = $equipment['power_consumptions'] ?? [];
        if ($startDate || $endDate) {
            $powerConsumptions = array_values(array_filter($powerConsumptions, function ($record) use ($startDate, $endDate) {
                $timestamp = strtotime($record['created_at'] ?? '');
                if (!$timestamp) return false;
                if ($startDate && $timestamp < strtotime($startDate)) return false;
                if ($endDate && $timestamp > strtotime($endDate) + 86400) return false;
                return true;
            }));
        }
        
        // Filter utilizations by date range if needed
        $utilizations = $equipment['utilizations'] ?? [];
        if ($startDate || $endDate) {
            $utilizations = array_values(array_filter($utilizations, function ($record) use ($startDate, $endDate) {
                $timestamp = strtotime($record['created_at'] ?? '');
                if (!$timestamp) return false;
                if ($startDate && $timestamp < strtotime($startDate)) return false;
                if ($endDate && $timestamp > strtotime($endDate) + 86400) return false;
                return true;
            }));
            
            // Sort ascending for proper display
            usort($utilizations, function($a, $b) {
                return strtotime($a['created_at'] ?? '0') - strtotime($b['created_at'] ?? '0');
            });
        }
        
        // Set current power and active status
        $equipment['power_consumption'] = 0;
        $equipment['is_active'] = false;
        
        if (!empty($powerConsumptions)) {
            $latestPower = $powerConsumptions[0];
            $latestTime = strtotime($latestPower['created_at'] ?? '');
            $oneHourAgo = now()->subHour()->timestamp;
            
            if ($latestTime && $latestTime >= $oneHourAgo) {
                $equipment['power_consumption'] = $latestPower['consumption'] ?? 0;
                $equipment['is_active'] = true;
            }
        }
        
        $equipment['power_consumptions'] = $powerConsumptions;
        $equipment['utilizations'] = $utilizations;
        $equipment['updated_at'] = $equipment['updated_at'] ?? now()->toIso8601String();
        
        return response()->json($equipment);
    } catch (\Exception $e) {
        Log::error('Failed to fetch equipment', [
            'equipment_id' => $equipmentId,
            'error' => $e->getMessage()
        ]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

    /**
     * Calculate utilization data for a single equipment
     */
    private function calculateEquipmentUtilization(array $equipment, ?string $startDate, ?string $endDate): ?array
    {
        try {
            $equipmentId = $equipment['equipment_id'];
            $utilizations = $equipment['utilizations'] ?? [];
            $powerConsumptions = $equipment['power_consumptions'] ?? [];
            
            // Filter by date range if provided
            if ($startDate || $endDate) {
                $utilizations = array_filter($utilizations, function ($record) use ($startDate, $endDate) {
                    $timestamp = strtotime($record['created_at']);
                    if ($startDate && $timestamp < strtotime($startDate)) return false;
                    if ($endDate && $timestamp > strtotime($endDate)) return false;
                    return true;
                });
            }
            
            // Calculate utilization hours
            $utilizationHours = $this->calculateUtilizationHours($utilizations);
            $utilizationPercentage = $utilizationHours > 0 ? ($utilizationHours / 8) * 100 : 0;
            
            // Get latest power consumption
            $latestPower = $powerConsumptions[0]['consumption'] ?? 0;
            
            // Calculate average power
            $avgPower = 0;
            if (!empty($powerConsumptions)) {
                $totalPower = array_sum(array_column($powerConsumptions, 'consumption'));
                $avgPower = $totalPower / count($powerConsumptions);
            }
            
            // Determine if active (has utilization in the last hour)
            $isActive = false;
            if (!empty($utilizations)) {
                $latestUtilization = $utilizations[0];
                $latestTime = strtotime($latestUtilization['created_at']);
                $oneHourAgo = now()->subHour()->timestamp;
                $isActive = $latestUtilization['type'] == true && $latestTime >= $oneHourAgo;
            }
            
            return [
                'equipment_id' => $equipmentId,
                'equipment_name' => $equipment['equipment_name'] ?? 'Unknown',
                'owner' => $equipment['owner'] ?? 'Unknown',
                'expected_location' => $equipment['expected_location'] ?? 'Unknown',
                'is_active' => $isActive,
                'utilization_hours_8h' => round($utilizationHours, 2),
                'utilization_percentage_8h' => round($utilizationPercentage, 2),
                'power_consumption' => round($latestPower, 2),
                'avg_power_8h' => round($avgPower, 2),
                'updated_at' => $equipment['updated_at'] ?? now()->toIso8601String(),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to calculate equipment utilization', [
                'equipment_id' => $equipment['equipment_id'] ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Calculate utilization hours from records
     */
    private function calculateUtilizationHours(array $utilizations, ?string $startDate = null, ?string $endDate = null): float
    {
        if (empty($utilizations)) {
            return 0;
        }

        try {
            // Filter by date range if provided
            if ($startDate || $endDate) {
                $utilizations = array_filter($utilizations, function ($record) use ($startDate, $endDate) {
                    $timestamp = strtotime($record['created_at']);
                    if ($startDate && $timestamp < strtotime($startDate)) return false;
                    if ($endDate && $timestamp > strtotime($endDate)) return false;
                    return true;
                });
            }
            
            if (empty($utilizations)) {
                return 0;
            }

            // Sort by created_at ascending
            usort($utilizations, function ($a, $b) {
                return strtotime($a['created_at']) - strtotime($b['created_at']);
            });

            $totalHours = 0;
            $i = 0;

            while ($i < count($utilizations)) {
                $isActive = in_array($utilizations[$i]['type'], [true, 1, '1', 'true'], true);

                if ($isActive) {
                    $startTime = strtotime($utilizations[$i]['created_at']);
                    $j = $i + 1;

                    // Find consecutive active records
                    while ($j < count($utilizations)) {
                        $nextIsActive = in_array($utilizations[$j]['type'], [true, 1, '1', 'true'], true);
                        if (!$nextIsActive) break;
                        $j++;
                    }

                    // Calculate end time
                    $endTime = ($j < count($utilizations)) 
                        ? strtotime($utilizations[$j]['created_at']) 
                        : now()->timestamp;
                    
                    $i = ($j < count($utilizations)) ? $j + 1 : $j;

                    // Calculate hours
                    $hours = ($endTime - $startTime) / 3600;
                    $totalHours += $hours;
                } else {
                    $i++;
                }
            }

            return round($totalHours, 2);
        } catch (\Exception $e) {
            Log::error('Failed to calculate utilization hours', ['error' => $e->getMessage()]);
            return 0;
        }
    }
}
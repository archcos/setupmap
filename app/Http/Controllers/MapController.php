<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class MapController extends Controller
{
    public function __construct(private SupabaseService $supabase)
    {
        Log::info('MapController initialized');
    }

    public function index()
    {
        Log::info('Rendering map page');

        try {
            // Get ALL equipment data in ONE API call with nested relations
            $equipmentsWithRelations = $this->supabase->getCompleteEquipmentData();
            Log::info('Fetched equipment data', ['count' => count($equipmentsWithRelations)]);

            // Transform the data for the map view
            $transformedEquipments = $this->transformEquipmentData($equipmentsWithRelations);
            Log::info('Transformed equipment data', ['count' => count($transformedEquipments)]);

            // Get all locations for the map
            $locations = $this->supabase->getAllLocations();
            Log::info('Fetched locations', ['count' => count($locations)]);

            return Inertia::render('Map/MapPage', [
                'equipments' => $transformedEquipments,
                'locations' => $locations,
                'error' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Map data fetch error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return Inertia::render('Map/MapPage', [
                'equipments' => [],
                'locations' => [],
                'error' => 'Failed to load equipment and location data. Please try again later.',
            ]);
        }
    }

    /**
     * Transform equipment data for the map view
     * This processes the nested data from Supabase.
     */
    private function transformEquipmentData(array $equipments): array
    {
        Log::debug('Transforming equipment data', ['equipment_count' => count($equipments)]);

        $transformed = array_map(function ($equipment) {
            try {
                // Get nested relations from the single API call
                $locations = $equipment['locations'] ?? [];
                $powerConsumptions = $equipment['power_consumptions'] ?? [];
                $utilizationRecords = $equipment['utilizations'] ?? [];

                $result = [
                    'equipment_id' => $equipment['equipment_id'] ?? 'Unknown',
                    'equipment_name' => $equipment['equipment_name'] ?? 'Unknown',
                    'owner' => $equipment['owner'] ?? 'Unknown',
                    'expected_location' => $equipment['expected_location'] ?? null,
                    'locations' => $locations,
                    'power_consumption' => $this->getLatestConsumption($powerConsumptions),
                    'utilization_hours_24h' => $this->calculateUtilizationHours($utilizationRecords),
                    'utilization_percentage_24h' => $this->calculateUtilizationPercentage($utilizationRecords),
                    'latest_location' => $this->getLatestLocation($locations),
                ];

                Log::debug('Transformed equipment', [
                    'equipment_id' => $equipment['equipment_id'] ?? 'Unknown',
                    'location_count' => count($locations),
                    'power_consumption_count' => count($powerConsumptions),
                    'utilization_count' => count($utilizationRecords)
                ]);

                return $result;
            } catch (\Exception $e) {
                Log::error('Failed to transform equipment data', [
                    'equipment_id' => $equipment['equipment_id'] ?? 'unknown',
                    'error' => $e->getMessage()
                ]);
                return null;
            }
        }, $equipments);

        // Filter out null values from failed transformations
        $filtered = array_filter($transformed);
        Log::debug('Equipment transformation complete', [
            'input_count' => count($equipments),
            'output_count' => count($filtered)
        ]);

        return $filtered;
    }

    /**
     * Get the latest power consumption value.
     */
    private function getLatestConsumption(array $powerConsumptions): float
    {
        if (empty($powerConsumptions)) {
            return 0;
        }

        // Already sorted by created_at desc from Supabase
        return (float) ($powerConsumptions[0]['consumption'] ?? 0);
    }

    /**
     * Get the latest location coordinates.
     */
    private function getLatestLocation(array $locations): ?array
    {
        if (empty($locations)) {
            return null;
        }

        try {
            // Already sorted by created_at desc from Supabase
            $latest = $locations[0];

            return [
                'latitude' => (float) ($latest['latitude'] ?? 0),
                'longitude' => (float) ($latest['longitude'] ?? 0),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get latest location', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Calculate utilization hours from utilization records
     * Logic: Find consecutive TRUE records and calculate time until FALSE
     * Only considers records from the last 24 hours.
     */
    private function calculateUtilizationHours(array $utilizationRecords): float
    {
        if (empty($utilizationRecords)) {
            return 0;
        }

        try {
            // Filter records from last 24 hours
            $twentyFourHoursAgo = now()->subHours(24);
            $recentRecords = array_filter($utilizationRecords, function ($record) use ($twentyFourHoursAgo) {
                try {
                    return strtotime($record['created_at']) >= $twentyFourHoursAgo->timestamp;
                } catch (\Exception $e) {
                    Log::error('Error parsing date in utilization records', [
                        'created_at' => $record['created_at'] ?? 'null',
                        'error' => $e->getMessage()
                    ]);
                    return false;
                }
            });

            if (empty($recentRecords)) {
                return 0;
            }

            // Sort by created_at ascending for calculation
            usort($recentRecords, function ($a, $b) {
                return strtotime($a['created_at']) - strtotime($b['created_at']);
            });

            $totalHours = 0;
            $i = 0;

            while ($i < count($recentRecords)) {
                // Check if record is active (type = true/1)
                $isActive = in_array($recentRecords[$i]['type'], [true, 1, '1', 'true'], true);

                if ($isActive) {
                    $startTime = new \DateTime($recentRecords[$i]['created_at']);
                    $j = $i + 1;

                    // Find consecutive active records
                    while ($j < count($recentRecords)) {
                        $nextIsActive = in_array($recentRecords[$j]['type'], [true, 1, '1', 'true'], true);
                        if (!$nextIsActive) {
                            break;
                        }
                        ++$j;
                    }

                    // Calculate end time
                    if ($j < count($recentRecords)) {
                        // Found an inactive record
                        $endTime = new \DateTime($recentRecords[$j]['created_at']);
                        $i = $j + 1;
                    } else {
                        // End of array - use current time if still active
                        $endTime = now();
                        $i = $j;
                    }

                    // Calculate duration in hours
                    $interval = $startTime->diff($endTime);
                    $hours = $interval->h + ($interval->days * 24) + ($interval->i / 60) + ($interval->s / 3600);
                    $totalHours += $hours;
                } else {
                    ++$i;
                }
            }

            return round(min($totalHours, 24), 2);
        } catch (\Exception $e) {
            Log::error('Failed to calculate utilization hours', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 0;
        }
    }

    /**
     * Calculate daily utilization percentage (0-100%).
     */
    private function calculateUtilizationPercentage(array $utilizationRecords): float
    {
        try {
            $hours = $this->calculateUtilizationHours($utilizationRecords);
            $percentage = ($hours / 24) * 100;
            return round(min($percentage, 100), 2);
        } catch (\Exception $e) {
            Log::error('Failed to calculate utilization percentage', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * API endpoint for refreshing map data.
     */
    public function getMapData(): \Illuminate\Http\JsonResponse
    {
        Log::info('API: Fetching map data');

        try {
            $equipments = $this->supabase->getCompleteEquipmentData();
            $locations = $this->supabase->getAllLocations();

            $transformedEquipments = $this->transformEquipmentData($equipments);

            Log::info('API: Successfully fetched map data', [
                'equipments_count' => count($transformedEquipments),
                'locations_count' => count($locations)
            ]);

            return response()->json([
                'equipments' => $transformedEquipments,
                'locations' => $locations,
            ]);
        } catch (\Exception $e) {
            Log::error('API: Failed to fetch map data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to fetch map data',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear cache for map data (useful after updates).
     */
    public function clearCache(): \Illuminate\Http\JsonResponse
    {
        Log::info('API: Clearing map data cache');

        try {
            $this->supabase->clearAllCache();
            Log::info('API: Cache cleared successfully');

            return response()->json([
                'message' => 'Cache cleared successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('API: Failed to clear cache', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to clear cache',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
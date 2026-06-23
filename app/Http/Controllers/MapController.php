<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

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
            // This includes locations, power_consumptions, and utilizations
            $equipmentsWithRelations = $this->supabase->getCompleteEquipmentData();
            Log::info('Fetched equipment data', ['count' => count($equipmentsWithRelations)]);

            // Transform the data for the map view
            $transformedEquipments = $this->transformEquipmentData($equipmentsWithRelations);
            Log::info('Transformed equipment data', ['count' => count($transformedEquipments)]);

            // Extract locations from the already-fetched data - NO SECOND API CALL!
            $locations = [];
            foreach ($equipmentsWithRelations as $equipment) {
                if (!empty($equipment['locations'])) {
                    $locations = array_merge($locations, $equipment['locations']);
                }
            }
            Log::info('Extracted locations from equipment data', ['count' => count($locations)]);

            return Inertia::render('Map/Index', [
                'equipments' => $transformedEquipments,
                'locations' => $locations,
                'error' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Map data fetch error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return Inertia::render('Map/Index', [
                'equipments' => [],
                'locations' => [],
                'error' => 'Failed to load equipment and location data. Please try again later.',
            ]);
        }
    }

    /**
     * Transform equipment data for the map view
     */
    private function transformEquipmentData(array $equipments): array
    {
        $transformed = array_map(function ($equipment) {
            try {
                $locations = $equipment['locations'] ?? [];
                $powerConsumptions = $equipment['power_consumptions'] ?? [];
                $utilizationRecords = $equipment['utilizations'] ?? [];

                return [
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
            } catch (\Exception $e) {
                Log::error('Failed to transform equipment data', [
                    'equipment_id' => $equipment['equipment_id'] ?? 'unknown',
                    'error' => $e->getMessage()
                ]);
                return null;
            }
        }, $equipments);

        return array_filter($transformed);
    }

    /**
     * Get the latest power consumption value.
     */
    private function getLatestConsumption(array $powerConsumptions): float
    {
        if (empty($powerConsumptions)) {
            return 0;
        }
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

        $latest = $locations[0];
        return [
            'latitude' => (float) ($latest['latitude'] ?? 0),
            'longitude' => (float) ($latest['longitude'] ?? 0),
        ];
    }

    /**
     * Calculate utilization hours from utilization records
     */
    private function calculateUtilizationHours(array $utilizationRecords): float
    {
        if (empty($utilizationRecords)) {
            return 0;
        }

        try {
            $twentyFourHoursAgo = now()->subHours(24);
            $recentRecords = array_filter($utilizationRecords, function ($record) use ($twentyFourHoursAgo) {
                return strtotime($record['created_at']) >= $twentyFourHoursAgo->timestamp;
            });

            if (empty($recentRecords)) {
                return 0;
            }

            usort($recentRecords, function ($a, $b) {
                return strtotime($a['created_at']) - strtotime($b['created_at']);
            });

            $totalHours = 0;
            $i = 0;

            while ($i < count($recentRecords)) {
                $isActive = in_array($recentRecords[$i]['type'], [true, 1, '1', 'true'], true);

                if ($isActive) {
                    $startTime = new \DateTime($recentRecords[$i]['created_at']);
                    $j = $i + 1;

                    while ($j < count($recentRecords)) {
                        $nextIsActive = in_array($recentRecords[$j]['type'], [true, 1, '1', 'true'], true);
                        if (!$nextIsActive) break;
                        $j++;
                    }

                    $endTime = ($j < count($recentRecords)) 
                        ? new \DateTime($recentRecords[$j]['created_at']) 
                        : now();
                    
                    $i = ($j < count($recentRecords)) ? $j + 1 : $j;

                    $interval = $startTime->diff($endTime);
                    $hours = $interval->h + ($interval->days * 24) + ($interval->i / 60) + ($interval->s / 3600);
                    $totalHours += $hours;
                } else {
                    $i++;
                }
            }

            return round(min($totalHours, 24), 2);
        } catch (\Exception $e) {
            Log::error('Failed to calculate utilization hours', ['error' => $e->getMessage()]);
            return 0;
        }
    }

    /**
     * Calculate daily utilization percentage (0-100%).
     */
    private function calculateUtilizationPercentage(array $utilizationRecords): float
    {
        $hours = $this->calculateUtilizationHours($utilizationRecords);
        return round(min(($hours / 24) * 100, 100), 2);
    }

    /**
     * API endpoint for map data - Uses SAME cached data
     */
    public function getMapData(): \Illuminate\Http\JsonResponse
    {
        Log::info('API: Fetching map data');

        try {
            // Use the SAME cached method
            $equipments = $this->supabase->getCompleteEquipmentData();
            
            // Extract locations from cached data
            $locations = [];
            foreach ($equipments as $equipment) {
                if (!empty($equipment['locations'])) {
                    $locations = array_merge($locations, $equipment['locations']);
                }
            }

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
            ]);

            return response()->json([
                'error' => 'Failed to fetch map data',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear cache for map data
     */
    public function clearCache(): \Illuminate\Http\JsonResponse
    {
        Log::info('API: Clearing map data cache');

        try {
            Cache::forget('complete_equipment_data');
            Log::info('API: Cache cleared successfully');

            return response()->json(['message' => 'Cache cleared successfully']);
        } catch (\Exception $e) {
            Log::error('API: Failed to clear cache', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to clear cache'], 500);
        }
    }
}
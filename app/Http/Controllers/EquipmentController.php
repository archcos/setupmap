<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EquipmentController extends Controller
{
    private SupabaseService $supabaseService;

    public function __construct(SupabaseService $supabaseService)
    {
        $this->supabaseService = $supabaseService;
    }

    /**
     * Show equipment management page (Inertia view)
     */
    public function equipmentPage(): Response
    {
        return Inertia::render('Equipment/EquipmentPage');
    }

    /**
     * Get all equipment with calculated utilization data (JSON API)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            $equipments = $this->supabaseService->getAllEquipments();
            $enrichedEquipments = [];

            foreach ($equipments as $equipment) {
                $enrichedEquipments[] = $this->enrichEquipmentData($equipment, $startDate, $endDate);
            }

            return response()->json($enrichedEquipments);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get specific equipment with full data
     */
    public function show(int $equipmentId, Request $request): JsonResponse
    {
        try {
            $equipment = $this->supabaseService->getEquipmentById($equipmentId);
            
            if (!$equipment) {
                return response()->json(['error' => 'Equipment not found'], 404);
            }

            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            $enrichedEquipment = $this->enrichEquipmentData($equipment, $startDate, $endDate);

            return response()->json($enrichedEquipment);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function detailsPage(int $equipmentId, Request $request): Response
    {
        $equipment = $this->supabaseService->getEquipmentById($equipmentId);
        
        if (!$equipment) {
            abort(404, 'Equipment not found');
        }

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $enrichedEquipment = $this->enrichEquipmentData($equipment, $startDate, $endDate);

        return Inertia::render('Equipment/Details', [
            'equipment' => $enrichedEquipment
        ]);
    }

    /**
     * Get utilization data for dashboard (JSON API)
     */
    public function utilizations(Request $request): JsonResponse
    {
        try {
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            $equipments = $this->supabaseService->getAllEquipments();
            $utilizationData = [];

            foreach ($equipments as $equipment) {
                $enrichedEquipment = $this->enrichEquipmentData($equipment, $startDate, $endDate);
                
                $utilizationData[] = [
                    'equipment_id' => $enrichedEquipment['equipment_id'],
                    'equipment_name' => $enrichedEquipment['equipment_name'],
                    'owner' => $enrichedEquipment['owner'],
                    'expected_location' => $enrichedEquipment['expected_location'],
                    'utilization_percentage_24h' => $enrichedEquipment['utilization_percentage_24h'],
                    'utilization_hours_24h' => $enrichedEquipment['utilization_hours_24h'],
                    'power_consumption' => $enrichedEquipment['power_consumption'],
                    'avg_power_24h' => $enrichedEquipment['avg_power_24h'],
                    'is_active' => $enrichedEquipment['is_active'],
                    'updated_at' => $enrichedEquipment['updated_at'],
                ];
            }

            return response()->json($utilizationData);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Calculate utilization hours from utilization records within date range
     * 
     * Logic: Find consecutive TRUE records and calculate time until FALSE
     * Sum all TRUE periods within the specified date range
     */
    private function calculateUtilizationHours(array $utilizationRecords): float
    {
        if (empty($utilizationRecords)) {
            return 0;
        }

        // Sort by created_at ascending
        usort($utilizationRecords, function ($a, $b) {
            return strtotime($a['created_at']) - strtotime($b['created_at']);
        });

        $totalHours = 0;
        $i = 0;

        while ($i < count($utilizationRecords)) {
            // Look for a TRUE record
            if ($utilizationRecords[$i]['type'] === true || $utilizationRecords[$i]['type'] === 1 || $utilizationRecords[$i]['type'] === '1') {
                $startTime = new \DateTime($utilizationRecords[$i]['created_at']);
                $j = $i + 1;

                // Find consecutive records until we hit a FALSE
                while ($j < count($utilizationRecords) && 
                       ($utilizationRecords[$j]['type'] === true || $utilizationRecords[$j]['type'] === 1 || $utilizationRecords[$j]['type'] === '1')) {
                    $j++;
                }

                // Calculate end time
                $endTime = null;
                if ($j < count($utilizationRecords) && 
                    ($utilizationRecords[$j]['type'] === false || $utilizationRecords[$j]['type'] === 0 || $utilizationRecords[$j]['type'] === '0')) {
                    // Found FALSE record - use its timestamp
                    $endTime = new \DateTime($utilizationRecords[$j]['created_at']);
                    $i = $j + 1; // Move past the FALSE record
                } else {
                    // End of array - use last TRUE record time
                    $endTime = new \DateTime($utilizationRecords[$j - 1]['created_at']);
                    $i = $j;
                }

                // Calculate duration in hours
                $interval = $startTime->diff($endTime);
                $hours = $interval->h + ($interval->days * 24) + ($interval->i / 60) + ($interval->s / 3600);
                $totalHours += $hours;
            } else {
                $i++;
            }
        }

        return $totalHours;
    }

    /**
     * Calculate utilization percentage based on date range
     */
    private function calculateUtilizationPercentage(array $utilizationRecords, ?string $startDate, ?string $endDate): float
    {
        $hours = $this->calculateUtilizationHours($utilizationRecords);
        
        // Calculate total hours in the date range
        if ($startDate && $endDate) {
            $start = new \DateTime($startDate);
            $end = new \DateTime($endDate);
            $interval = $start->diff($end);
            $totalHours = ($interval->days * 24) + $interval->h;
        } else {
            // Default to 24 hours if no date range provided
            $totalHours = 24;
        }

        $percentage = $totalHours > 0 ? ($hours / $totalHours) * 100 : 0;
        
        return min($percentage, 100); // Cap at 100%
    }

    /**
     * Filter records within a date range
     */
    private function filterRecordsByDateRange(array $records, ?string $startDate = null, ?string $endDate = null): array
    {
        if (!$startDate || !$endDate) {
            // Default to today if no dates provided
            return $this->filterTodaysRecords($records);
        }

        $start = new \DateTime($startDate);
        $end = new \DateTime($endDate);
        
        return array_filter($records, function ($record) use ($start, $end) {
            $recordDate = new \DateTime($record['created_at']);
            return $recordDate >= $start && $recordDate < $end;
        });
    }

    /**
     * Filter records to only include today's data
     */
    private function filterTodaysRecords(array $records): array
    {
        $today = now()->startOfDay();
        
        return array_filter($records, function ($record) use ($today) {
            $recordDate = (new \DateTime($record['created_at']))->format('Y-m-d');
            return $recordDate === $today->format('Y-m-d');
        });
    }

    /**
     * Enrich equipment data with utilization and power consumption info
     */
    private function enrichEquipmentData(array $equipment, ?string $startDate = null, ?string $endDate = null): array
    {
        $equipmentId = $equipment['equipment_id'];

        // Get utilization records filtered by date range
        $utilizationRecords = $this->supabaseService->getUtilizationByEquipmentId($equipmentId);
        $filteredUtilizationRecords = $this->filterRecordsByDateRange($utilizationRecords, $startDate, $endDate);
        
        $utilizationHours = $this->calculateUtilizationHours($filteredUtilizationRecords);
        $utilizationPercentage = $this->calculateUtilizationPercentage($filteredUtilizationRecords, $startDate, $endDate);
        
        $isActive = false;
        if (!empty($filteredUtilizationRecords)) {
            $lastRecord = end($filteredUtilizationRecords);
            $isActive = (bool) $lastRecord['type'] || $lastRecord['type'] === 1 || $lastRecord['type'] === '1';
        }

        // Get power consumption records - filter by date range
        $powerRecords = $this->supabaseService->getPowerConsumptionByEquipmentId($equipmentId);
        $filteredPowerRecords = $this->filterRecordsByDateRange($powerRecords, $startDate, $endDate);
        
        $latestPower = null;
        $avgPower = 0;

        if (!empty($filteredPowerRecords)) {
            // Get latest power record from date range
            $latestPower = reset($filteredPowerRecords);
            
            // Calculate average power from records in date range
            $totalConsumption = array_sum(array_column($filteredPowerRecords, 'consumption'));
            $avgPower = $totalConsumption / count($filteredPowerRecords);
        }

        // Get location
        $locations = $this->supabaseService->getLocationsByEquipmentId($equipmentId);
        $latestLocation = !empty($locations) ? reset($locations) : null;

        return [
            'equipment_id' => $equipment['equipment_id'],
            'equipment_name' => $equipment['equipment_name'] ?? "Equipment {$equipment['equipment_id']}",
            'owner' => $equipment['owner'] ?? 'N/A',
            'expected_location' => $equipment['expected_location'] ?? 'N/A',
            'utilization_percentage_24h' => round($utilizationPercentage, 2),
            'utilization_hours_24h' => round($utilizationHours, 2),
            'power_consumption' => $latestPower ? round($latestPower['consumption'], 2) : 0,
            'avg_power_24h' => round($avgPower, 2),
            'is_active' => $isActive,
            'latest_location' => $latestLocation,
            'updated_at' => $latestPower['created_at'] ?? now()->toIso8601String(),
        ];
    }
}
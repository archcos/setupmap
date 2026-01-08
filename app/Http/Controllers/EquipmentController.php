<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\JsonResponse;
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
    public function index(): JsonResponse
    {
        try {
            $equipments = $this->supabaseService->getAllEquipments();
            $enrichedEquipments = [];

            foreach ($equipments as $equipment) {
                $enrichedEquipments[] = $this->enrichEquipmentData($equipment);
            }

            return response()->json($enrichedEquipments);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get specific equipment with full data
     */
    public function show(int $equipmentId): JsonResponse
    {
        try {
            $equipment = $this->supabaseService->getEquipmentById($equipmentId);
            
            if (!$equipment) {
                return response()->json(['error' => 'Equipment not found'], 404);
            }

            $enrichedEquipment = $this->enrichEquipmentData($equipment);

            return response()->json($enrichedEquipment);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function detailsPage(int $equipmentId): Response
    {
        $equipment = $this->supabaseService->getEquipmentById($equipmentId);
        
        if (!$equipment) {
            abort(404, 'Equipment not found');
        }

        $enrichedEquipment = $this->enrichEquipmentData($equipment);

        return Inertia::render('Equipment/Details', [
            'equipment' => $enrichedEquipment
        ]);
    }
    /**
     * Get utilization data for dashboard (JSON API)
     */
    public function utilizations(): JsonResponse
    {
        try {
            $equipments = $this->supabaseService->getAllEquipments();
            $utilizationData = [];

            foreach ($equipments as $equipment) {
                $enrichedEquipment = $this->enrichEquipmentData($equipment);
                
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
     * Calculate utilization hours from utilization records
     * 
     * Logic: Find consecutive TRUE records and calculate time until FALSE
     * Sum all TRUE periods for the day
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
     * Calculate daily utilization percentage (0-100%)
     */
    private function calculateDailyUtilizationPercentage(array $utilizationRecords): float
    {
        $hours = $this->calculateUtilizationHours($utilizationRecords);
        $percentage = ($hours / 24) * 100;
        
        return min($percentage, 100); // Cap at 100%
    }

    /**
     * Enrich equipment data with utilization and power consumption info
     */
    private function enrichEquipmentData(array $equipment): array
    {
        $equipmentId = $equipment['equipment_id'];

        // Get utilization records
        $utilizationRecords = $this->supabaseService->getUtilizationByEquipmentId($equipmentId);
        $utilizationHours = $this->calculateUtilizationHours($utilizationRecords);
        $utilizationPercentage = $this->calculateDailyUtilizationPercentage($utilizationRecords);
        
        $isActive = false;
        if (!empty($utilizationRecords)) {
            $lastRecord = end($utilizationRecords);
            $isActive = (bool) $lastRecord['type'] || $lastRecord['type'] === 1 || $lastRecord['type'] === '1';
        }

        // Get power consumption records
        $powerRecords = $this->supabaseService->getPowerConsumptionByEquipmentId($equipmentId);
        
        $latestPower = null;
        $avgPower = 0;

        if (!empty($powerRecords)) {
            // Get latest power record
            $latestPower = reset($powerRecords); // First record (already sorted by created_at desc)
            
            // Calculate average power
            $totalConsumption = array_sum(array_column($powerRecords, 'consumption'));
            $avgPower = $totalConsumption / count($powerRecords);
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
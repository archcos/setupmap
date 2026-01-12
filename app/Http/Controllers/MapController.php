<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Inertia\Inertia;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function __construct(private SupabaseService $supabase) {}

    public function index()
    {
        try {
            // Fetch all equipment
            $equipments = $this->supabase->getAllEquipments();
            
            // Fetch all locations
            $locations = $this->supabase->getAllLocations();
            
            // Combine equipment with their locations, power consumption, and utilization
            $equipmentWithData = [];
            
            foreach ($equipments as $equipment) {
                $equipmentId = $equipment['equipment_id'];
                
                // Get locations for this equipment
                $equipmentLocations = array_filter($locations, function ($location) use ($equipmentId) {
                    return $location['equipment_id'] === $equipmentId;
                });
                
                // Get latest power consumption
                $latestPowerConsumption = $this->supabase->getLatestPowerConsumption($equipmentId);
                
                // Get utilization data
                $utilizationRecords = $this->supabase->getUtilizationByEquipmentId($equipmentId);
                
                $equipmentWithData[] = [
                    'equipment_id' => $equipment['equipment_id'],
                    'equipment_name' => $equipment['equipment_name'],
                    'owner' => $equipment['owner'],
                    'expected_location' => $equipment['expected_location'],
                    'locations' => array_values($equipmentLocations),
                    'power_consumption' => $latestPowerConsumption['consumption'] ?? 0,
                    'utilization_hours_24h' => $this->calculateUtilizationHours($utilizationRecords),
                    'utilization_percentage_24h' => $this->calculateUtilizationPercentage($utilizationRecords),
                ];
            }
            
            return Inertia::render('Map/MapPage', [
                'equipments' => $equipmentWithData,
                'locations' => $locations,
            ]);
        } catch (\Exception $e) {
            \Log::error('Map data fetch error: ' . $e->getMessage());
            
            return Inertia::render('Map/MapPage', [
                'equipments' => [],
                'locations' => [],
                'error' => 'Failed to load equipment and location data',
            ]);
        }
    }

    /**
     * Calculate utilization hours from utilization records
     * Logic: Find consecutive TRUE records and calculate time until FALSE
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

        return round($totalHours, 2);
    }

    /**
     * Calculate daily utilization percentage (0-100%)
     */
    private function calculateUtilizationPercentage(array $utilizationRecords): float
    {
        $hours = $this->calculateUtilizationHours($utilizationRecords);
        $percentage = ($hours / 24) * 100;
        
        return round(min($percentage, 100), 2); // Cap at 100%
    }
}
<?php

namespace App\Http\Controllers;

use App\Services\SupabaseDataService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class EquipmentController extends Controller
{
    public function __construct(private SupabaseDataService $supabaseData)
    {
    }

    public function index()
    {
        return Inertia::render('Equipment/Index');
    }

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
                $equipments = $this->supabaseData->getCompleteEquipmentData();
                
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
                    
                    // is_active means "has ANY data in the selected period"
                    $hasUtilizationData = !empty($utilizations);
                    $hasPowerData = !empty($powerConsumptions);
                    $isActive = $hasUtilizationData || $hasPowerData;
                    
                    // Calculate latest power from filtered data
                    $latestPower = 0;
                    if (!empty($powerConsumptions)) {
                        usort($powerConsumptions, function($a, $b) {
                            return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
                        });
                        $latestPower = $powerConsumptions[0]['consumption'] ?? 0;
                    }
                    
                    // Calculate average power
                    $avgPower = 0;
                    if (!empty($powerConsumptions)) {
                        $totalPower = array_sum(array_column($powerConsumptions, 'consumption'));
                        $avgPower = count($powerConsumptions) > 0 ? $totalPower / count($powerConsumptions) : 0;
                    }
                    
                    // Calculate utilization
                    $utilizationHours = $this->calculateUtilizationHours($utilizations);
                    
                    // Calculate working days in the period
                    $periodStart = $startDate ? strtotime($startDate) : strtotime('-30 days');
                    $periodEnd = $endDate ? strtotime($endDate) : time();
                    $workingDays = $this->getWorkingDaysInPeriod($periodStart, $periodEnd);
                    $totalPossibleHours = $workingDays * 8;
                    
                    $utilizationPercentage = $totalPossibleHours > 0 
                        ? min(($utilizationHours / $totalPossibleHours) * 100, 100) 
                        : 0;
                    
                    return [
                        'equipment_id' => $equipment['equipment_id'] ?? 'Unknown',
                        'equipment_name' => $equipment['equipment_name'] ?? 'Unknown',
                        'owner' => $equipment['owner'] ?? 'Unknown',
                        'expected_location' => $equipment['expected_location'] ?? 'Unknown',
                        'is_active' => $isActive,
                        'has_utilization_data' => $hasUtilizationData,
                        'has_power_data' => $hasPowerData,
                        'utilization_hours_8h' => round($utilizationHours, 2),
                        'utilization_percentage_8h' => round($utilizationPercentage, 2),
                        'power_consumption' => round($latestPower, 2),
                        'avg_power_8h' => round($avgPower, 2),
                        'updated_at' => $equipment['updated_at'] ?? now()->toIso8601String(),
                        'utilizations' => $utilizations,
                        'power_consumptions' => $powerConsumptions,
                    ];
                }, $equipments);
                
                $result = array_values(array_filter($result));
                
                Log::info('Equipment utilization calculated', [
                    'count' => count($result),
                    'active_count' => count(array_filter($result, fn($e) => $e['is_active'])),
                    'inactive_count' => count(array_filter($result, fn($e) => !$e['is_active'])),
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

    public function mapData()
    {
        Log::info('EquipmentController: Fetching map data');
        
        try {
            $equipments = $this->supabaseData->getCompleteEquipmentData();
            
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

public function detailsPage($equipmentId)
{
    try {
        $equipment = $this->supabaseData->getEquipmentWithAllRelations($equipmentId);
        
        if (!$equipment) {
            return Inertia::render('Equipment/Details', [
                'equipment' => null
            ]);
        }
        
        $equipment['locations'] = $equipment['locations'] ?? [];
        $powerConsumptions = $equipment['power_consumptions'] ?? [];
        $utilizations = $equipment['utilizations'] ?? [];
        
        // Check if equipment has data TODAY
        $todayStart = strtotime('today 00:00:00');
        $todayEnd = strtotime('today 23:59:59');
        
        $hasDataToday = false;
        $latestPower = 0;
        
        // Check utilizations from today
        if (!empty($utilizations)) {
            foreach ($utilizations as $util) {
                $utilTime = strtotime($util['created_at'] ?? '');
                if ($utilTime >= $todayStart && $utilTime <= $todayEnd) {
                    $hasDataToday = true;
                    break;
                }
            }
        }
        
        // Check power data from today
        if (!$hasDataToday && !empty($powerConsumptions)) {
            foreach ($powerConsumptions as $power) {
                $powerTime = strtotime($power['created_at'] ?? '');
                if ($powerTime >= $todayStart && $powerTime <= $todayEnd) {
                    $hasDataToday = true;
                    break;
                }
            }
        }
        
        // Get latest power reading
        if (!empty($powerConsumptions)) {
            usort($powerConsumptions, function($a, $b) {
                return strtotime($b['created_at'] ?? '0') - strtotime($a['created_at'] ?? '0');
            });
            $latestPower = $powerConsumptions[0]['consumption'] ?? 0;
        }
        
        $equipment['power_consumptions'] = $powerConsumptions;
        $equipment['utilizations'] = $utilizations;
        $equipment['power_consumption'] = $latestPower;
        $equipment['is_active'] = $hasDataToday; // Active if has any data today
        $equipment['updated_at'] = $equipment['updated_at'] ?? now()->toIso8601String();
        
        Log::info('Equipment details loaded', [
            'equipment_id' => $equipmentId,
            'is_active' => $hasDataToday,
            'utilization_count' => count($utilizations),
            'power_count' => count($powerConsumptions),
            'latest_power' => $latestPower
        ]);
        
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
        $equipment = $this->supabaseData->getEquipmentWithAllRelations($equipmentId);
        
        if (!$equipment) {
            return response()->json(['error' => 'Equipment not found'], 404);
        }
        
        $powerConsumptions = $equipment['power_consumptions'] ?? [];
        $utilizations = $equipment['utilizations'] ?? [];
        
        // Filter by date range ONLY if both dates are provided
        if ($startDate && $endDate) {
            $startTimestamp = strtotime($startDate);
            $endTimestamp = strtotime($endDate);
            
            Log::info('Filtering by date range', [
                'start' => date('Y-m-d H:i:s', $startTimestamp),
                'end' => date('Y-m-d H:i:s', $endTimestamp),
                'before_util_count' => count($utilizations),
                'before_power_count' => count($powerConsumptions)
            ]);
            
            $utilizations = array_values(array_filter($utilizations, function ($record) use ($startTimestamp, $endTimestamp) {
                $timestamp = strtotime($record['created_at'] ?? '');
                return $timestamp >= $startTimestamp && $timestamp <= $endTimestamp;
            }));
            
            $powerConsumptions = array_values(array_filter($powerConsumptions, function ($record) use ($startTimestamp, $endTimestamp) {
                $timestamp = strtotime($record['created_at'] ?? '');
                return $timestamp >= $startTimestamp && $timestamp <= $endTimestamp;
            }));
            
            Log::info('After filtering', [
                'after_util_count' => count($utilizations),
                'after_power_count' => count($powerConsumptions)
            ]);
        }
        
        // Sort by created_at ascending
        usort($utilizations, function($a, $b) {
            return strtotime($a['created_at'] ?? '0') - strtotime($b['created_at'] ?? '0');
        });
        
        usort($powerConsumptions, function($a, $b) {
            return strtotime($a['created_at'] ?? '0') - strtotime($b['created_at'] ?? '0');
        });
        
        $equipment['power_consumptions'] = array_values($powerConsumptions);
        $equipment['utilizations'] = array_values($utilizations);
        $equipment['updated_at'] = $equipment['updated_at'] ?? now()->toIso8601String();
        
        // Set current power and active status based on TODAY
        $todayStart = strtotime('today 00:00:00');
        $todayEnd = strtotime('today 23:59:59');
        
        $equipment['power_consumption'] = 0;
        $equipment['is_active'] = false;
        
        // Check if has data today
        $hasDataToday = false;
        foreach ($utilizations as $util) {
            $utilTime = strtotime($util['created_at'] ?? '');
            if ($utilTime >= $todayStart && $utilTime <= $todayEnd) {
                $hasDataToday = true;
                break;
            }
        }
        
        if (!$hasDataToday) {
            foreach ($powerConsumptions as $power) {
                $powerTime = strtotime($power['created_at'] ?? '');
                if ($powerTime >= $todayStart && $powerTime <= $todayEnd) {
                    $hasDataToday = true;
                    break;
                }
            }
        }
        
        $equipment['is_active'] = $hasDataToday;
        
        // Get latest power reading
        if (!empty($powerConsumptions)) {
            $latestPower = $powerConsumptions[count($powerConsumptions) - 1];
            $equipment['power_consumption'] = $latestPower['consumption'] ?? 0;
        }
        
        Log::info('Equipment data returned', [
            'equipment_id' => $equipmentId,
            'is_active' => $hasDataToday,
            'utilization_count' => count($utilizations),
            'power_count' => count($powerConsumptions),
            'latest_power' => $equipment['power_consumption']
        ]);
        
        return response()->json($equipment);
    } catch (\Exception $e) {
        Log::error('Failed to fetch equipment', [
            'equipment_id' => $equipmentId,
            'error' => $e->getMessage()
        ]);
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

    private function getWorkingDaysInPeriod($startTimestamp, $endTimestamp)
    {
        $workingDays = 0;
        $currentDate = new \DateTime();
        $currentDate->setTimestamp($startTimestamp);
        $currentDate->setTime(0, 0, 0);
        
        $endDate = new \DateTime();
        $endDate->setTimestamp($endTimestamp);
        $endDate->setTime(0, 0, 0);
        
        while ($currentDate <= $endDate) {
            $dayOfWeek = $currentDate->format('N');
            if ($dayOfWeek < 6) {
                $workingDays++;
            }
            $currentDate->modify('+1 day');
        }
        
        return $workingDays;
    }

    private function calculateUtilizationHours(array $utilizations): float
    {
        if (empty($utilizations)) {
            return 0;
        }

        try {
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

                    while ($j < count($utilizations)) {
                        $nextIsActive = in_array($utilizations[$j]['type'], [true, 1, '1', 'true'], true);
                        if (!$nextIsActive) break;
                        $j++;
                    }

                    $endTime = ($j < count($utilizations)) 
                        ? strtotime($utilizations[$j]['created_at']) 
                        : time();
                    
                    $i = ($j < count($utilizations)) ? $j + 1 : $j;

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
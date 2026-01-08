<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Response;

class SupabaseService
{
    private string $url;
    private string $key;

    public function __construct()
    {
        $this->url = config('supabase.url');
        $this->key = config('supabase.key');
    }

    // ==================== EQUIPMENT METHODS ====================

    /**
     * Get all equipment
     */
    public function getAllEquipments(): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_equipments');

        return $this->handleResponse($response);
    }

    /**
     * Get equipment by ID
     */
    public function getEquipmentById(int $equipmentId): array|null
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_equipments?equipment_id=eq.' . $equipmentId);

        $data = $this->handleResponse($response);
        return $data[0] ?? null;
    }

    // ==================== LOCATION METHODS ====================

    /**
     * Get all locations
     */
    public function getAllLocations(): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_locations');

        return $this->handleResponse($response);
    }

    /**
     * Get locations by equipment ID
     */
    public function getLocationsByEquipmentId(int $equipmentId): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_locations?equipment_id=eq.' . $equipmentId);

        return $this->handleResponse($response);
    }

    /**
     * Get equipment with its latest location
     */
    public function getEquipmentWithLocation(int $equipmentId): array|null
    {
        $equipment = $this->getEquipmentById($equipmentId);
        
        if (!$equipment) {
            return null;
        }

        $locations = $this->getLocationsByEquipmentId($equipmentId);
        $equipment['latest_location'] = $locations[0] ?? null;

        return $equipment;
    }

    /**
     * Get all equipment with their latest locations
     */
    public function getAllEquipmentsWithLocations(): array
    {
        $equipments = $this->getAllEquipments();
        
        foreach ($equipments as &$equipment) {
            $locations = $this->getLocationsByEquipmentId($equipment['equipment_id']);
            $equipment['latest_location'] = $locations[0] ?? null;
        }

        return $equipments;
    }

    // ==================== POWER CONSUMPTION METHODS ====================

    /**
     * Get all power consumption records
     */
    public function getAllPowerConsumptions(): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_powerconsumptions?order=created_at.desc');

        return $this->handleResponse($response);
    }

    /**
     * Get power consumption by equipment ID
     */
    public function getPowerConsumptionByEquipmentId(int $equipmentId): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_powerconsumptions?equipment_id=eq.' . $equipmentId . '&order=created_at.desc');

        return $this->handleResponse($response);
    }

    /**
     * Get latest power consumption for equipment
     */
    public function getLatestPowerConsumption(int $equipmentId): array|null
    {
        $data = $this->getPowerConsumptionByEquipmentId($equipmentId);
        return $data[0] ?? null;
    }

    /**
     * Get average power consumption for equipment over time period (in hours)
     */
    public function getAveragePowerConsumption(int $equipmentId, int $hours = 24): float
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_powerconsumptions?equipment_id=eq.' . $equipmentId . 
                  '&created_at=gte.now-' . $hours . 'hours&select=consumption');

        $data = $this->handleResponse($response);
        
        if (empty($data)) {
            return 0;
        }

        $total = array_sum(array_column($data, 'consumption'));
        return $total / count($data);
    }

    /**
     * Create power consumption record
     */
    public function createPowerConsumption(int $equipmentId, float $consumption): array|null
    {
        $response = Http::withHeaders($this->getHeaders())
            ->post($this->url . '/rest/v1/tbl_powerconsumptions', [
                'equipment_id' => $equipmentId,
                'consumption' => $consumption,
                'created_at' => now()->toIso8601String(),
            ]);

        return $this->handleResponse($response)[0] ?? null;
    }

    // ==================== UTILIZATION METHODS ====================

    /**
     * Get all utilization records
     */
    public function getAllUtilizations(): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_utilizations?order=created_at.desc');

        return $this->handleResponse($response);
    }

    /**
     * Get utilization by equipment ID
     */
    public function getUtilizationByEquipmentId(int $equipmentId): array
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_utilizations?equipment_id=eq.' . $equipmentId . '&order=created_at.desc');

        return $this->handleResponse($response);
    }

    /**
     * Get latest utilization status for equipment
     */
    public function getLatestUtilization(int $equipmentId): array|null
    {
        $data = $this->getUtilizationByEquipmentId($equipmentId);
        return $data[0] ?? null;
    }

    /**
     * Get utilization percentage (active records) for equipment
     */
    public function getUtilizationPercentage(int $equipmentId, int $hours = 24): float
    {
        $response = Http::withHeaders($this->getHeaders())
            ->get($this->url . '/rest/v1/tbl_utilizations?equipment_id=eq.' . $equipmentId . 
                  '&created_at=gte.now-' . $hours . 'hours&select=type');

        $data = $this->handleResponse($response);
        
        if (empty($data)) {
            return 0;
        }

        $activeCount = count(array_filter($data, fn($record) => $record['type'] === true));
        return ($activeCount / count($data)) * 100;
    }

    /**
     * Create utilization record
     */
    public function createUtilization(int $equipmentId, bool $type): array|null
    {
        $response = Http::withHeaders($this->getHeaders())
            ->post($this->url . '/rest/v1/tbl_utilizations', [
                'equipment_id' => $equipmentId,
                'type' => $type,
                'created_at' => now()->toIso8601String(),
            ]);

        return $this->handleResponse($response)[0] ?? null;
    }

    // ==================== COMBINED DATA METHODS ====================

    /**
     * Get equipment with location, power consumption, and utilization data
     */
    public function getEquipmentFullData(int $equipmentId): array|null
    {
        $equipment = $this->getEquipmentWithLocation($equipmentId);
        
        if (!$equipment) {
            return null;
        }

        $equipment['power_consumption'] = $this->getLatestPowerConsumption($equipmentId);
        $equipment['avg_power_24h'] = $this->getAveragePowerConsumption($equipmentId, 24);
        $equipment['utilization'] = $this->getLatestUtilization($equipmentId);
        $equipment['utilization_percentage_24h'] = $this->getUtilizationPercentage($equipmentId, 24);

        return $equipment;
    }

    /**
     * Get all equipment with full data
     */
    public function getAllEquipmentsFullData(): array
    {
        $equipments = $this->getAllEquipments();
        
        foreach ($equipments as &$equipment) {
            $equipmentId = $equipment['equipment_id'];
            
            $locations = $this->getLocationsByEquipmentId($equipmentId);
            $equipment['latest_location'] = $locations[0] ?? null;
            
            $equipment['power_consumption'] = $this->getLatestPowerConsumption($equipmentId);
            $equipment['avg_power_24h'] = $this->getAveragePowerConsumption($equipmentId, 24);
            
            $equipment['utilization'] = $this->getLatestUtilization($equipmentId);
            $equipment['utilization_percentage_24h'] = $this->getUtilizationPercentage($equipmentId, 24);
        }

        return $equipments;
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get headers required for Supabase API
     */
    private function getHeaders(): array
    {
        return [
            'apikey' => $this->key,
            'Authorization' => 'Bearer ' . $this->key,
            'Content-Type' => 'application/json',
        ];
    }

    /**
     * Handle API response
     */
    private function handleResponse(Response $response): array
    {
        if ($response->failed()) {
            throw new \Exception('Supabase API Error: ' . $response->body());
        }

        return $response->json() ?? [];
    }
}
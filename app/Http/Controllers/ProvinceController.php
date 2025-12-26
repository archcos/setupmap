<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ProvinceController extends Controller
{
    /**
     * Get Northern Mindanao provinces with population data
     */
    public function getNorthernMindanao(): JsonResponse
    {
        try {
            // Cache the data for 24 hours to reduce API calls
            $provinces = Cache::remember('northern_mindanao_provinces', 86400, function () {
                return $this->fetchNorthernMindanaoProvinces();
            });

            if ($provinces === null) {
                return response()->json([
                    'error' => 'Failed to fetch provinces from external API'
                ], 500);
            }

            return response()->json([
                'provinces' => $provinces
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Server error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fetch Northern Mindanao provinces with population
     */
    private function fetchNorthernMindanaoProvinces(): ?array
    {
        try {
            // Fetch from PSGC API
            $psgcData = $this->fetchUrl('https://psgc.gitlab.io/api/provinces/');
            
            if ($psgcData === null) {
                return null;
            }

            $allProvinces = json_decode($psgcData, true);
            
            if (!is_array($allProvinces)) {
                return null;
            }

            // Filter for Northern Mindanao (Region 10)
            $northernMindanaoProvinces = array_filter($allProvinces, function ($province) {
                return isset($province['regionCode']) && $province['regionCode'] === '100000000';
            });

            $provincesWithPopulation = [];

            foreach ($northernMindanaoProvinces as $province) {
                if (!isset($province['name'], $province['code'])) {
                    continue;
                }

                $population = null;
                $populationNumeric = null;

                try {
                    // Fetch population from Rootscratch
                    $popData = $this->fetchUrl(
                        "https://psgc.rootscratch.com/api/provinces/{$province['code']}/"
                    );
                    
                    if ($popData !== null) {
                        $populationData = json_decode($popData, true);
                        if (is_array($populationData) && isset($populationData['population'])) {
                            $population = $populationData['population'];
                            $populationNumeric = $this->parsePopulation($population);
                        }
                    }
                } catch (\Exception $e) {
                    // Log error but continue
                    Log::warning("Failed to fetch population for {$province['name']}: " . $e->getMessage());
                }

                $provincesWithPopulation[] = [
                    'name' => $province['name'],
                    'code' => $province['code'],
                    'regionCode' => $province['regionCode'] ?? null,
                    'population' => $population,
                    'population_numeric' => $populationNumeric,
                ];
            }

            return $provincesWithPopulation;

        } catch (\Exception $e) {
            Log::error('Error fetching Northern Mindanao provinces: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch data from URL using cURL
     */
    private function fetchUrl(string $url): ?string
    {
        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response !== false) {
                return $response;
            }

            return null;
        } catch (\Exception $e) {
            Log::error("Failed to fetch URL {$url}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Parse population string to numeric value
     * Converts "2,694,335" to 2694335
     */
    private function parsePopulation(?string $population): ?int
    {
        if (!$population || !is_string($population)) {
            return null;
        }

        return (int) str_replace(',', '', $population);
    }
}
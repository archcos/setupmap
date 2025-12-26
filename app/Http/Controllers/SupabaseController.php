<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Response;
use Inertia\Inertia;

class SupabaseController extends Controller
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = 'https://<PROJECT>.supabase.co/rest/v1'; // replace <PROJECT>
        $this->apiKey = env('SUPABASE_SERVICE_KEY'); // server-side service role key
    }

    /**
     * Fetch all locations
     */
    public function locations()
    {
        /** @var Response $response */
        $response = Http::withHeaders([
            'apikey' => $this->apiKey,
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Accept' => 'application/json',
        ])->get($this->baseUrl . '/tbl_locations', [
            'select' => '*'
        ]);

        if (!$response->successful()) {
            dd('Supabase Error:', $response->status(), $response->body());
        }

        $locations = $response->json();

        return Inertia::render('MapPage', [
            'locations' => $locations,
        ]);
    }

    /**
     * Fetch all equipments
     */
    public function equipments()
    {
        /** @var Response $response */
        $response = Http::withHeaders([
            'apikey' => $this->apiKey,
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Accept' => 'application/json',
        ])->get($this->baseUrl . '/tbl_equipments', [
            'select' => '*'
        ]);

        if (!$response->successful()) {
            dd('Supabase Error:', $response->status(), $response->body());
        }

        $equipments = $response->json();

        return Inertia::render('EquipmentPage', [
            'equipments' => $equipments,
        ]);
    }

    /**
     * Fetch equipments for a specific location
     */
    public function equipmentsByLocation($locationId)
    {
        /** @var Response $response */
        $response = Http::withHeaders([
            'apikey' => $this->apiKey,
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Accept' => 'application/json',
        ])->get($this->baseUrl . '/tbl_equipments', [
            'select' => '*',
            'location_id' => 'eq.' . $locationId
        ]);

        if (!$response->successful()) {
            dd('Supabase Error:', $response->status(), $response->body());
        }

        $equipments = $response->json();

        return Inertia::render('EquipmentPage', [
            'equipments' => $equipments,
        ]);
    }

    /**
     * Fetch locations filtered by province
     */
    public function locationsByProvince($province)
    {
        /** @var Response $response */
        $response = Http::withHeaders([
            'apikey' => $this->apiKey,
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Accept' => 'application/json',
        ])->get($this->baseUrl . '/tbl_locations', [
            'select' => '*',
            'province' => 'eq.' . $province
        ]);

        if (!$response->successful()) {
            dd('Supabase Error:', $response->status(), $response->body());
        }

        $locations = $response->json();

        return Inertia::render('MapPage', [
            'locations' => $locations,
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AdminController extends Controller
{
private SupabaseService $supabase;

public function __construct(SupabaseService $supabase)
{
    $this->supabase = $supabase;
}

/**
 * Show admin dashboard with equipment list and projects.
 */
public function index()
{
    try {
        $equipments = $this->supabase->getAllEquipmentsForAdmin();
        $projects = $this->supabase->getAllProjects();
    } catch (\Exception $e) {
        Log::error('Failed to load admin dashboard', ['error' => $e->getMessage()]);
        $equipments = [];
        $projects = [];
    }

    return Inertia::render('Admin/Dashboard', [
        'equipments' => $equipments,
        'projects' => $projects,
    ]);
}

/**
 * Create new equipment.
 */
public function store(Request $request)
{
    $request->validate([
        'project_id' => 'required|integer',
        'equipment_name' => 'required|string|max:255',
        'owner' => 'required|string|max:255',
        'expected_location' => 'required|string|max:255',
        'equipment_specifications' => 'nullable|string',
        'latitude' => 'required|numeric',
        'longitude' => 'required|numeric',
    ]);

    try {
        $equipmentData = [
            'project_id' => (int) $request->project_id,
            'equipment_name' => $request->equipment_name,
            'owner' => $request->owner,
            'expected_location' => $request->expected_location,
            'equipment_specifications' => $request->equipment_specifications,
        ];

        $locationData = [
            'latitude' => (string) $request->latitude,
            'longitude' => (string) $request->longitude,
        ];

        $equipment = $this->supabase->createEquipment($equipmentData, $locationData);

        return redirect()->back()->with('success', 'Equipment created successfully! ID: ' . $equipment['equipment_id']);
    } catch (\Exception $e) {
        Log::error('Failed to create equipment', ['error' => $e->getMessage()]);
        return redirect()->back()->with('error', 'Failed to create equipment: ' . $e->getMessage());
    }
}

/**
 * Update existing equipment.
 */
public function update(Request $request, $id)
{
$request->validate([
    'project_id' => 'required|integer',
    'equipment_name' => 'required|string|max:255',
    'owner' => 'required|string|max:255',
    'expected_location' => 'required|string|max:255',
    'equipment_specifications' => 'nullable|string',
    'latitude' => 'required|numeric',
    'longitude' => 'required|numeric',
]);

try {
    $equipmentData = [
        'equipment_name' => $request->equipment_name,
        'owner' => $request->owner,
        'expected_location' => $request->expected_location,
        'equipment_specifications' => $request->equipment_specifications,
        'created_at' => now()->toIso8601String(),
    ];

    $oldProjectId = null;
    $currentEquipment = $this->supabase->getEquipmentById((int) $id);
    if ($currentEquipment) {
        $oldProjectId = $currentEquipment['project_id'] ?? null;
    }

    // Check if project changed
    if ($oldProjectId && (int)$oldProjectId !== (int)$request->project_id) {
        // Project changed - need to update equipment_id
        $newEquipmentId = (int) $this->supabase->getNextEquipmentId((int) $request->project_id);
        
        // Update equipment with new ID across all tables
        $equipment = $this->supabase->updateEquipmentId(
            (int) $id,
            $newEquipmentId,
            (int) $request->project_id,
            $equipmentData
        );

        // Update initial location with new equipment_id
        if ($request->latitude && $request->longitude) {
            $this->supabase->updateInitialLocation($newEquipmentId, $request->latitude, $request->longitude);
        }

        return redirect()->back()->with('success', 
            'Equipment updated successfully! Equipment ID changed from ' . $id . ' to ' . $newEquipmentId . '. All related records have been updated.'
        );
    } else {
        // Project didn't change - just update normally
        $this->supabase->updateEquipment((int) $id, $equipmentData);

        if ($request->latitude && $request->longitude) {
            $this->supabase->updateInitialLocation((int) $id, $request->latitude, $request->longitude);
        }

        return redirect()->back()->with('success', 'Equipment updated successfully!');
    }
} catch (\Exception $e) {
    Log::error('Failed to update equipment', ['error' => $e->getMessage()]);
    return redirect()->back()->with('error', 'Failed to update equipment: ' . $e->getMessage());
}
}
}
<?php

namespace App\Http\Controllers;

use App\Services\SupabaseDataService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AdminController extends Controller
{
    private SupabaseDataService $supabaseData;

    public function __construct(SupabaseDataService $supabaseData)
    {
        $this->supabaseData = $supabaseData;
    }

    /**
     * Show admin dashboard with equipment list and projects.
     */
    public function index()
    {
        Log::info('=== ADMIN DASHBOARD INDEX CALLED ===');
        
        try {
            Log::info('Fetching equipment data for admin dashboard');
            $equipments = $this->supabaseData->getAllEquipmentsForAdmin();
            
            Log::info('Equipment data retrieved', [
                'count' => count($equipments),
                'first_equipment' => isset($equipments[0]) ? [
                    'id' => $equipments[0]['equipment_id'] ?? 'N/A',
                    'name' => $equipments[0]['equipment_name'] ?? 'N/A',
                    'has_initial_location' => isset($equipments[0]['initial_location']),
                    'initial_location' => $equipments[0]['initial_location'] ?? null,
                    'latitude_type' => isset($equipments[0]['initial_location']['latitude']) ? gettype($equipments[0]['initial_location']['latitude']) : 'null',
                    'longitude_type' => isset($equipments[0]['initial_location']['longitude']) ? gettype($equipments[0]['initial_location']['longitude']) : 'null',
                ] : null
            ]);
            
            Log::info('Fetching projects data');
            $projects = $this->supabaseData->getAllProjects();
            Log::info('Projects data retrieved', ['count' => count($projects)]);
            
        } catch (\Exception $e) {
            Log::error('Failed to load admin dashboard', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $equipments = [];
            $projects = [];
        }

        Log::info('=== RENDERING ADMIN DASHBOARD ===', [
            'equipments_count' => count($equipments),
            'projects_count' => count($projects)
        ]);

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
        Log::info('=== STORE EQUIPMENT CALLED ===', [
            'all_input' => $request->all(),
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'latitude_type' => gettype($request->latitude),
            'longitude_type' => gettype($request->longitude),
        ]);

        $request->validate([
            'project_id' => 'required|integer',
            'equipment_name' => 'required|string|max:255',
            'owner' => 'required|string|max:255',
            'expected_location' => 'required|string|max:255',
            'equipment_specifications' => 'nullable|string',
            'latitude' => 'required|string|regex:/^-?\d{1,3}\.?\d*$/',
            'longitude' => 'required|string|regex:/^-?\d{1,3}\.?\d*$/',
        ]);

        Log::info('Validation passed for new equipment');

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

            Log::info('Attempting to create equipment', [
                'equipment_data' => $equipmentData,
                'location_data' => $locationData
            ]);

            $equipment = $this->supabaseData->createEquipment($equipmentData, $locationData);

            Log::info('Equipment created successfully', [
                'equipment_id' => $equipment['equipment_id'] ?? 'unknown'
            ]);

            return redirect()->route('admin.dashboard')->with('success', 
                'Equipment created successfully! ID: ' . $equipment['equipment_id']
            );
        } catch (\Exception $e) {
            Log::error('Failed to create equipment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return redirect()->back()->with('error', 'Failed to create equipment: ' . $e->getMessage());
        }
    }

    /**
     * Update existing equipment.
     */
    public function update(Request $request, $id)
    {
        Log::info('=== UPDATE EQUIPMENT CALLED ===', [
            'equipment_id' => $id,
            'all_input' => $request->all(),
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'latitude_type' => gettype($request->latitude),
            'longitude_type' => gettype($request->longitude),
            'latitude_value' => $request->latitude,
            'longitude_value' => $request->longitude,
        ]);

        $request->validate([
            'project_id' => 'required|integer',
            'equipment_name' => 'required|string|max:255',
            'owner' => 'required|string|max:255',
            'expected_location' => 'required|string|max:255',
            'equipment_specifications' => 'nullable|string',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        Log::info('Validation passed for update', [
            'equipment_id' => $id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude
        ]);

        try {
            $equipmentData = [
                'equipment_name' => $request->equipment_name,
                'owner' => $request->owner,
                'expected_location' => $request->expected_location,
                'equipment_specifications' => $request->equipment_specifications,
            ];

            Log::info('Fetching current equipment data', ['id' => $id]);
            $oldProjectId = null;
            $currentEquipment = $this->supabaseData->getEquipmentById((int) $id);
            
            if ($currentEquipment) {
                $oldProjectId = $currentEquipment['project_id'] ?? null;
                Log::info('Current equipment found', [
                    'id' => $id,
                    'old_project_id' => $oldProjectId,
                    'new_project_id' => $request->project_id
                ]);
            } else {
                Log::warning('Current equipment not found', ['id' => $id]);
            }

            // Check if project changed
            if ($oldProjectId && (int)$oldProjectId !== (int)$request->project_id) {
                Log::info('Project changed - updating equipment ID');
                
                // Project changed - need to update equipment_id
                $newEquipmentId = (int) $this->supabaseData->getNextEquipmentId((int) $request->project_id);
                
                Log::info('New equipment ID generated', [
                    'old_id' => $id,
                    'new_id' => $newEquipmentId
                ]);
                
                // Update equipment with new ID across all tables
                $this->supabaseData->updateEquipmentId(
                    (int) $id,
                    $newEquipmentId,
                    (int) $request->project_id,
                    $equipmentData
                );

                // Update initial location with new equipment_id
                if ($request->latitude && $request->longitude) {
                    Log::info('Updating initial location for new equipment ID', [
                        'equipment_id' => $newEquipmentId,
                        'latitude' => $request->latitude,
                        'longitude' => $request->longitude
                    ]);
                    
                    $this->supabaseData->updateInitialLocation(
                        $newEquipmentId, 
                        (float) $request->latitude, 
                        (float) $request->longitude
                    );
                }

                Log::info('Equipment updated with new ID successfully');

                return redirect()->route('admin.dashboard')->with('success', 
                    'Equipment updated successfully! Equipment ID changed from ' . $id . ' to ' . $newEquipmentId
                );
            } else {
                Log::info('Project not changed - updating normally');
                
                // Project didn't change - just update normally
                $updateResult = $this->supabaseData->updateEquipment((int) $id, $equipmentData);
                
                Log::info('Equipment update result', ['result' => $updateResult]);

                if ($request->latitude && $request->longitude) {
                    Log::info('Updating initial location', [
                        'equipment_id' => $id,
                        'latitude' => (float) $request->latitude,
                        'longitude' => (float) $request->longitude,
                        'latitude_original' => $request->latitude,
                        'longitude_original' => $request->longitude
                    ]);
                    
                    $locationResult = $this->supabaseData->updateInitialLocation(
                        (int) $id, 
                        (float) $request->latitude, 
                        (float) $request->longitude
                    );
                    
                    Log::info('Location update result', ['result' => $locationResult]);
                } else {
                    Log::warning('Latitude or longitude missing, skipping location update', [
                        'has_latitude' => !empty($request->latitude),
                        'has_longitude' => !empty($request->longitude)
                    ]);
                }

                Log::info('Equipment updated successfully');
                return redirect()->route('admin.dashboard')->with('success', 'Equipment updated successfully!');
            }
        } catch (\Exception $e) {
            Log::error('Failed to update equipment', [
                'equipment_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return redirect()->back()->with('error', 'Failed to update equipment: ' . $e->getMessage());
        }
    }

    /**
     * Soft delete equipment (move to trash).
     */
    public function destroy($id)
    {
        Log::info('=== SOFT DELETE CALLED ===', ['equipment_id' => $id]);
        
        try {
            $result = $this->supabaseData->softDeleteEquipment((int) $id);
            
            if ($result) {
                Log::info('Equipment soft deleted successfully', ['id' => $id]);
                return redirect()->route('admin.dashboard')->with('success', 'Equipment moved to trash successfully!');
            }
            
            Log::warning('Failed to soft delete equipment', ['id' => $id]);
            return redirect()->route('admin.dashboard')->with('error', 'Failed to delete equipment.');
        } catch (\Exception $e) {
            Log::error('Failed to soft delete equipment', [
                'equipment_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->route('admin.dashboard')->with('error', 'Failed to delete equipment: ' . $e->getMessage());
        }
    }

    /**
     * Restore soft deleted equipment.
     */
    public function restore($id)
    {
        Log::info('=== RESTORE CALLED ===', ['equipment_id' => $id]);
        
        try {
            $result = $this->supabaseData->restoreEquipment((int) $id);
            
            if ($result) {
                Log::info('Equipment restored successfully', ['id' => $id]);
                return redirect()->route('admin.dashboard')->with('success', 'Equipment restored successfully!');
            }
            
            Log::warning('Failed to restore equipment', ['id' => $id]);
            return redirect()->route('admin.dashboard')->with('error', 'Failed to restore equipment.');
        } catch (\Exception $e) {
            Log::error('Failed to restore equipment', [
                'equipment_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->route('admin.dashboard')->with('error', 'Failed to restore equipment: ' . $e->getMessage());
        }
    }
}
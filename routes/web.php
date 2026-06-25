<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MapController;
use Illuminate\Support\Facades\Route;

Route::get('/equipment', [EquipmentController::class, 'index'])->name('equipment.index');
Route::get('/equipment-utilization', [EquipmentController::class, 'utilizations'])->name('equipment.utilizations');
Route::get('/equipment/details/{equipmentId}', [EquipmentController::class, 'detailsPage'])->name('equipment.details');
Route::get('/equipment/{equipmentId}', [EquipmentController::class, 'show'])->name('equipment.show');

Route::get('/map', [MapController::class, 'index'])->name('map.index');
Route::get('/map-data', [MapController::class, 'getMapData'])->name('map.data');
Route::post('/map/clear-cache', [MapController::class, 'clearCache'])->name('map.clear-cache');
Route::get('/equipment-map-data', [MapController::class, 'getMapData']);

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::prefix('admin')->group(function () {
    // Auth routes
    Route::get('/login', [AdminAuthController::class, 'showLogin'])->name('admin.login');
    Route::post('/login', [AdminAuthController::class, 'login']);
    Route::post('/logout', [AdminAuthController::class, 'logout'])->name('admin.logout');
    
    // Protected routes - Admin middleware
    Route::middleware(['admin.auth'])->group(function () {
        Route::get('/dashboard', [AdminController::class, 'index'])->name('admin.dashboard');
        
        // Equipment CRUD routes
        Route::post('/equipment', [AdminController::class, 'store'])->name('admin.equipment.store');
        Route::put('/equipment/{id}', [AdminController::class, 'update'])->name('admin.equipment.update');
        Route::delete('/equipment/{id}', [AdminController::class, 'destroy'])->name('admin.equipment.destroy');
        Route::put('/equipment/{equipmentId}/change-project', [AdminController::class, 'changeProject']);

        
        // Optional: Equipment restore route
        Route::post('/equipment/{id}/restore', [AdminController::class, 'restore'])->name('admin.equipment.restore');
        
        // Logout (GET fallback)
        Route::get('/logout', [AdminAuthController::class, 'logout'])->name('admin.logout.get');
    });
});
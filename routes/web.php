<?php

use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\MapController;
use Illuminate\Support\Facades\Route;

Route::get('/equipment', [EquipmentController::class, 'index'])->name('equipment.index');
Route::get('/equipment-utilization', [EquipmentController::class, 'utilizations'])->name('equipment.utilizations');
Route::get('/equipment/{equipmentId}/details', [EquipmentController::class, 'detailsPage'])->name('equipment.details');
Route::get('/equipment/{equipmentId}', [EquipmentController::class, 'show'])->name('equipment.show');

Route::get('/map', [MapController::class, 'index'])->name('map.index');
Route::get('/map-data', [MapController::class, 'getMapData'])->name('map.data');
Route::post('/map/clear-cache', [MapController::class, 'clearCache'])->name('map.clear-cache');
Route::get('/equipment-map-data', [MapController::class, 'getMapData']);

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

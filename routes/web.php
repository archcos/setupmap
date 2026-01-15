<?php

use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EquipmentController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::get('/equipment', [EquipmentController::class, 'equipmentPage']); // Dashboard page
Route::get('/equipment-utilization', [EquipmentController::class, 'utilizations']); // JSON API for dashboard
Route::get('/equipment-map-data', [EquipmentController::class, 'mapData']); // JSON API for map
Route::get('/equipment/{equipmentId}/details', [EquipmentController::class, 'detailsPage']); // Details page
Route::get('/equipment/{equipmentId}', [EquipmentController::class, 'show']); // JSON API

Route::get('/map', [MapController::class, 'index']);
Route::get('/', [DashboardController::class, 'index']);

Route::get('/api/provinces/northern-mindanao', [ProvinceController::class, 'getNorthernMindanao']);
require __DIR__.'/auth.php';

<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/provinces/northern-mindanao', [App\Http\Controllers\Api\ProvinceController::class, 'getNorthernMindanao']);
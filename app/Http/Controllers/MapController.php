<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function index()
    {
        return Inertia::render('Map/MapPage');
    }
}

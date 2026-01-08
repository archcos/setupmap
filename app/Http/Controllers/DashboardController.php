<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Display the dashboard page
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        return inertia('Dashboard/Dashboard');
    }
}
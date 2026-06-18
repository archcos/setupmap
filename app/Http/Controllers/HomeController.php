<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class HomeController extends Controller
{
    /**
     * Display the home page
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        return inertia('Home/Index');
    }
}
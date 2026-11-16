<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Route to serve PD verification photos
Route::get('pd_verification_photos/{filename}', function ($filename) {
    $path = public_path('pd_verification_photos/' . $filename);
    
    if (!file_exists($path)) {
        abort(404);
    }
    
    return response()->file($path);
})->where('filename', '.*');
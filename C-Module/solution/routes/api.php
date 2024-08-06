<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ParticipantController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/olympics/events/create', [EventController::class, 'create']);
    Route::get('/olympics/events/list', [EventController::class, 'list']);
    Route::post('/olympics/events/edit/{id}', [EventController::class, 'edit']);
});


Route::middleware('auth:sanctum')->group(function () {
    Route::post('/olympics/participants/create', [ParticipantController::class, 'create']);
    Route::get('/olympics/participants/list/{event_id}', [ParticipantController::class, 'listByEvent']);
    Route::post('/olympics/participants/delete/{id}', [ParticipantController::class, 'delete']);
});
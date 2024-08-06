<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Event; // Asegúrate de tener el modelo Event
use Illuminate\Support\Facades\Validator;

class EventController extends Controller
{
    // Método para crear un evento
    public function create(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:64',
            'date' => 'required|date',
            'venue_id' => 'required|exists:venues,id'
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $event = Event::create([
            'name' => $request->name,
            'date' => $request->date,
            'venue_id' => $request->venue_id,
        ]);

        return response()->json($event, 201);
    }

    // Método para listar los eventos
    public function list()
    {
        $events = Event::all();
        return response()->json($events);
    }

    // Método para editar un evento
    public function edit(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:64',
            'date' => 'sometimes|date',
            'venue_id' => 'sometimes|exists:venues,id'
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $event = Event::findOrFail($id);
        $event->update($request->all());

        return response()->json($event);
    }
}
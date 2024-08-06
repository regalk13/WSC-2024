<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Participant;
use Illuminate\Support\Facades\Validator;

class ParticipantController extends Controller
{
    // Método para crear un participante
    public function create(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fullname' => 'required|string|max:64',
            'email' => 'required|string|email|max:64',
            'phone' => 'required|string|max:64',
            'event_id' => 'required|exists:events,id'
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $participant = Participant::create([
            'fullname' => $request->fullname,
            'email' => $request->email,
            'phone' => $request->phone,
            'event_id' => $request->event_id,
        ]);

        return response()->json($participant, 201);
    }

    // Método para listar los participantes por evento
    public function listByEvent($event_id)
    {
        $participants = Participant::where('event_id', $event_id)->get();
        return response()->json($participants);
    }

    // Método para eliminar un participante
    public function delete($id)
    {
        $participant = Participant::findOrFail($id);
        $participant->delete();

        return response()->json(['message' => 'Participant deleted successfully']);
    }
}
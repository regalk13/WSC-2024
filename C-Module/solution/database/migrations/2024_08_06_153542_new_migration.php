<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->string('name', 64);
            $table->string('location', 64);
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('name', 64);
            $table->date("date");

            $table->bigInteger('venue_id')->unsigned();
            $table->foreign("venue_id")->references("id")->on("venues")->onDelete("cascade");
        });
        Schema::create('participants', function (Blueprint $table) {
            $table->id();
            $table->string('fullname', 64);
            $table->string('email', 64);
            $table->string('phone', 64);


            $table->bigInteger('event_id')->unsigned();
            $table->foreign("event_id")->references("id")->on("events")->onDelete("cascade");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
        Schema::dropIfExists('venues');
        Schema::dropIfExists('events');
        Schema::dropIfExists('participants');

    }
};

@extends('errors.layout')

@section('title', '419')
@section('code', '419')
@section('error_label', 'Sesi 419')

@section('illustration')
    @php
        $pngPath = public_path('images/errors/419.png');
        $photoPath = public_path('images/errors/419.jpg');
    @endphp
    @if(is_file($pngPath))
        <img src="/images/errors/419.png" alt="419" class="illustration-img">
    @elseif(is_file($photoPath))
        <img src="/images/errors/419.jpg" alt="419" class="illustration-img">
    @else
        @include('errors.illustrations', ['name' => '419'])
    @endif
@endsection

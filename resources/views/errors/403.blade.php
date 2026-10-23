@extends('errors.layout')

@section('title', '403')
@section('code', '403')
@section('error_label', 'Akses 403')

@section('illustration')
    @php
        $pngPath = public_path('images/errors/403.png');
        $photoPath = public_path('images/errors/403.jpg');
    @endphp
    @if(is_file($pngPath))
        <img src="/images/errors/403.png" alt="403" class="illustration-img">
    @elseif(is_file($photoPath))
        <img src="/images/errors/403.jpg" alt="403" class="illustration-img">
    @else
        @include('errors.illustrations', ['name' => '403'])
    @endif
@endsection

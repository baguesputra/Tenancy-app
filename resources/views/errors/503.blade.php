@extends('errors.layout')

@section('title', '503')
@section('code', '503')
@section('error_label', 'Maintenance 503')

@section('illustration')
    @php
        $pngPath = public_path('images/errors/503.png');
        $photoPath = public_path('images/errors/503.jpg');
    @endphp
    @if(is_file($pngPath))
        <img src="/images/errors/503.png" alt="503" class="illustration-img">
    @elseif(is_file($photoPath))
        <img src="/images/errors/503.jpg" alt="503" class="illustration-img">
    @else
        @include('errors.illustrations', ['name' => '503'])
    @endif
@endsection

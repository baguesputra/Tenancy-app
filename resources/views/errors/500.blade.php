@extends('errors.layout')

@section('title', '500')
@section('code', '500')
@section('error_label', 'Error 500')

@section('illustration')
    @php
        $pngPath = public_path('images/errors/500.png');
        $photoPath = public_path('images/errors/500.jpg');
    @endphp
    @if(is_file($pngPath))
        <img src="/images/errors/500.png" alt="500" class="illustration-img">
    @elseif(is_file($photoPath))
        <img src="/images/errors/500.jpg" alt="500" class="illustration-img">
    @else
        @include('errors.illustrations', ['name' => '500'])
    @endif
@endsection

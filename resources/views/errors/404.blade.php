@extends('errors.layout')

@section('title', '404')
@section('code', '404')
@section('error_label', 'Oops! 404')

@section('illustration')
    @php
        $pngPath = public_path('images/errors/404.png');
        $photoPath = public_path('images/errors/404.jpg');
    @endphp
    @if(is_file($pngPath))
        <img src="/images/errors/404.png" alt="404" class="illustration-img">
    @elseif(is_file($photoPath))
        <img src="/images/errors/404.jpg" alt="404" class="illustration-img">
    @else
        @include('errors.illustrations', ['name' => '404'])
    @endif
@endsection

@extends('errors.layout')

@section('title', '429')
@section('code', '429')
@section('error_label', 'Batas 429')

@section('illustration')
    @php
        $pngPath = public_path('images/errors/429.png');
        $photoPath = public_path('images/errors/429.jpg');
    @endphp
    @if(is_file($pngPath))
        <img src="/images/errors/429.png" alt="429" class="illustration-img">
    @elseif(is_file($photoPath))
        <img src="/images/errors/429.jpg" alt="429" class="illustration-img">
    @else
        @include('errors.illustrations', ['name' => '429'])
    @endif
@endsection

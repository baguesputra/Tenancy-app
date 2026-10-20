<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 10mm 12mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; font-size: 11px; line-height: 1.65; margin: 0; }
        .kop img { width: 100%; }
        .guide img { width: 100%; }
        .title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 1px; margin: 10px 0 8px; text-decoration: underline; }
        table.bio { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        table.bio td { padding: 2px 4px; vertical-align: top; }
        table.bio td.k { width: 130px; }
        .narr { text-align: justify; margin: 8px 0; }
        ol.pernyataan { margin: 6px 0 6px 16px; padding: 0; text-align: justify; }
        ol.pernyataan li { margin-bottom: 4px; }
        ol.sub { list-style-type: lower-alpha; margin: 4px 0 4px 18px; padding: 0; }
        table.sig { width: 100%; border-collapse: collapse; margin-top: 12px; }
        table.sig td { width: 50%; text-align: center; vertical-align: top; padding: 6px 10px; font-size: 11px; }
        .sig .space { height: 48px; }
        .sig .name { font-weight: bold; text-decoration: underline; }
        .foot { margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 6px; font-size: 9px; color: #6b7280; text-align: right; }
    </style>
</head>
<body>
    <div class="kop">
        @if ($kopData)<img src="{{ $kopData }}" alt="Duta Mall Banjarmasin">@endif
    </div>
    <div class="guide">
        @if ($guideData)<img src="{{ $guideData }}" alt="{{ $jenisLabel ?? 'Fit Out' }} Guide">@endif
    </div>

    <div class="title">SURAT PERNYATAAN KONTRAKTOR</div>

    <p class="narr">Yang bertanda tangan dibawah ini :</p>
    <table class="bio">
        <tr><td class="k">Nama</td><td>: {{ $nama }}</td></tr>
        <tr><td class="k">Jabatan</td><td>: {{ $jabatan }}</td></tr>
        <tr><td class="k">Nama Tenant</td><td>: {{ $namaTenant }}</td></tr>
        <tr><td class="k">Telepon</td><td>: {{ $telepon }}</td></tr>
    </table>
    <p class="narr">Merupakan penanggung jawab atas pekerjaan {{ $jenisLabel ?? 'Fit Out' }} yang bertempat di :</p>
    <table class="bio">
        <tr><td class="k">Lantai / No. Unit</td><td>: {{ $unit }}</td></tr>
    </table>

    <p class="narr">Menyatakan bahwa bersedia untuk menyetujui perjanjian sebagai berikut :</p>
    <ol class="pernyataan">
        <li>Melaksanakan pekerjaan {{ $jenisLabel ?? 'Fit Out' }} sesuai dengan prosedur yang berlaku di Duta Mall Banjarmasin.</li>
        <li>Menghentikan sementara pekerjaan {{ $jenisLabel ?? 'Fit Out' }}, apabila terdapat kegiatan yang tidak sesuai dengan peraturan dan tanpa persetujuan dari Badan Pengelola Duta Mall Banjarmasin.</li>
        <li>Membongkar Instalasi {{ $jenisLabel ?? 'Fit Out' }}, apabila ditemukan instalasi yang melanggar peraturan dan tanpa disetujui oleh Badan Pengelola Duta Mall Banjarmasin dan biaya akan ditanggung pihak tenant.</li>
        <li>Memberikan teguran secara lisan ataupun tulisan, apabila tidak mematuhi peraturan {{ $jenisLabel ?? 'Fit Out' }} yang telah ditetapkan oleh Badan Pengelola Duta Mall Banjarmasin.</li>
        <li>Menghentikan pekerjaan {{ $jenisLabel ?? 'Fit Out' }} apabila setelah mendapatkan teguran baik lisan maupun tulisan, tetap melanggar peraturan yang telah ditetapkan Badan Pengelola Duta Mall Banjarmasin.</li>
        <li>Mengkoordinasikan kepada Badan Pengelola Duta Mall Banjarmasin dalam hal izin keluar masuk barang, uji kelistrikan/plumbing serta pembuangan sampah bongkaran pekerjaan {{ $jenisLabel ?? 'Fit Out' }}.</li>
        <li>Menjalankan {{ $jenisLabel ?? 'Fit Out' }} sesuai jadwal yang telah ditetapkan, apabila pekerjaan mengalami keterlambatan maka pihak kontraktor akan mendapatkan penalty sebagai berikut:
            <ol class="sub">
                <li>Perpanjangan {{ $jenisLabel ?? 'Fit Out' }} akan dikenakan biaya administrasi {{ $jenisLabel ?? 'Fit Out' }} seperti diawal, terhitung mulai tanggal {{ $jenisLabel ?? 'Fit Out' }} berakhir apabila pengajuan perpanjangan {{ $jenisLabel ?? 'Fit Out' }} tidak disetujui oleh Badan Pengelola Duta Mall Banjarmasin.</li>
                <li>Apabila pengajuan perpanjangan {{ $jenisLabel ?? 'Fit Out' }} disetujui oleh Badan Pengelola Duta Mall Banjarmasin, maka tidak akan penalty.</li>
            </ol>
        </li>
        <li>Badan Pengelola Duta Mall Banjarmasin akan mengaktifkan biaya sewa dan service charge apabila perpanjangan pekerjaan lebih dari 30 (tiga puluh) hari sejak tanggal {{ $jenisLabel ?? 'Fit Out' }} berakhir.</li>
    </ol>

    <p class="narr">Demikian surat ini kami buat dengan sebenar-benarnya dan dapat dipertanggungjawabkan.</p>
    <p class="narr">{{ $kota }}, {{ $tanggalSurat }}</p>

    <table class="sig">
        <tr>
            <td>
                <div>Mengetahui,</div>
                <div class="space">&nbsp;</div>
                <div><span class="name">M. Nazaruddin Alamsyah</span></div>
                <div>Spv. Tenancy &amp; FO Department</div>
            </td>
            <td>
                <div>Menyetujui,</div>
                <div class="space">&nbsp;</div>
                <div><span class="name">{{ $nama }}</span></div>
                <div>Kontraktor</div>
            </td>
        </tr>
    </table>

    <div class="foot">Dicetak dari sistem pada {{ $printedAt }} • {{ $permit->permit_number }}</div>
</body>
</html>

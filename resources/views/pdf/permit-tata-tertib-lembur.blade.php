<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: A4; margin: 10mm 12mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: sans-serif; color: #111827; font-size: 10.5px; line-height: 1.55; margin: 0; }
        .kop img { width: 100%; }
        .guide img { width: 100%; }
        .title { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; margin: 10px 0 8px; }
        ol.rules { margin: 6px 0 6px 18px; padding: 0; text-align: justify; }
        ol.rules li { margin-bottom: 3px; }
        .sanction { text-align: justify; margin: 6px 0; font-weight: bold; }
        .date { text-align: right; margin: 8px 0 4px; }
        table.sig { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.sig td { width: 50%; text-align: center; vertical-align: top; padding: 4px 10px; font-size: 10.5px; }
        .sig .space { height: 44px; }
        .sig .name { font-weight: bold; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="kop">
        @if ($kopData)<img src="{{ $kopData }}" alt="Duta Mall Banjarmasin">@endif
    </div>
    <div class="guide">
        @if ($guideData)<img src="{{ $guideData }}" alt="Fit Out Guide">@endif
    </div>

    <div class="title">PERATURAN &amp; KETENTUAN FITOUT BAGI PEKERJA LEMBUR :</div>

    <ol class="rules">
        <li>Mengurus surat ijin kerja lembur / perpanjangan lembur yang dikeluarkan oleh Tenancy Department di kantor Badan Pengelola Duta Mall. Kontraktor wajib menyerahkan daftar nama pekerja.</li>
        <li>Para pekerja diwajibkan lapor ke Pos Security Pagar yang bertugas di depan area Loading Dock saat akan memulai pekerjaan dengan membawa Surat Ijin yang telah diberikan serta memberikan kartu tanda pengenal (KTP/SIM) yang masih berlaku untuk ditukarkan dengan Kartu Pengenal Lembur (KPL) yang wajib dipakai selama melaksanakan pekerjaan. Kartu pekerja lembur juga berlaku untuk ke toilet (yang telah ditentukan).</li>
        <li>Setelah pekerjaan lembur selesai, Kartu Pengenal Lembur harus dikembalikan ke Pos Security Pagar.</li>
        <li>Apabila Kartu Pengenal Lembur hilang akan dikenakan denda sejumlah Rp. 50.000,00 ( lima puluh ribu rupiah ) / kartu.</li>
        <li>Ruang lingkup pelaksanaan kerja lembur adalah area unit yang tercantum dalam Surat Ijin dan tidak diperkenankan untuk berkeliaran di luar area tersebut.</li>
        <li>Dilarang merokok dan buang air di dalam area kerja, membawa minuman keras, obat-obatan terlarang, senjata tajam serta melakukan tindakan asusila</li>
        <li>Pekerja wajib mentaati semua instruksi yang diberikan oleh petugas terkait dari Badan Pengelola demi menjaga ketertiban, kebersihan, dan keamanan lingkungan mall.</li>
        <li>Seluruh kerusakan pada peralatan dan material yang telah terpasang pada gedung yang diakibatkan oleh kelalaian / ketidaksengajaan dari kontraktor / penyewa selama berlangsung fit out akan diperbaiki atas biaya kontraktor / penyewa.</li>
        <li>Seluruh pekerjaan fit out harus dilaksanakan berdasarkan desain dan spesifikasi yang telah disetujui oleh pengelola gedung dan tidak diperkenankan melakukan perubahan tanpa persetujuan dari pengelola gedung. Jika ada perubahan atau perbedaan antara gambar kerja dan pelaksanaan dilapangan harus berkoordinasi dengan pengelola gedung dalam hal ini diwakili oleh Fit Out Coordinator Tenancy Department.</li>
        <li>Pengelola gedung berhak untuk meminta kontraktor / penyewa untuk memodifikasi pekerjaan tertentu selama Fit out bila pekerjaan kontraktor tidak sesuai dengan petunjuk Fitout.</li>
        <li>Pengelola gedung tidak bertanggung jawab atas kehilangan ataupun kerusakan pada perlengkapan, peralatan ataupun material kontraktor / penyewa.</li>
        <li>Kontraktor diwajibkan untuk memasang dinding penyekat atau pembatas sementara selama Fitout sesuai dengan standart yang diberikan dari pengelola gedung.</li>
        <li>Kontraktor harus menyediakan &amp; meninggalkan gambar ME / single line diagram unit toko.</li>
        <li>Kontraktor wajib membuat jadwal kerja / work schedule dan menyerahkan kepada pihak pengelola gedung.</li>
        <li>Kontraktor wajib melaporkan progres pekerjaannya setiap minggu kepada pihak pengelola gedung dan apabila dirasa perlu pihak pengelola gedung berhak mengadakan rapat koordinasi dengan kontraktor terkait pekerjaan tersebut.</li>
        <li>Kontraktor / penyewa diwajibkan untuk menjaga kebersihan di area unit dan gedung.</li>
        <li>Pengelola gedung berhak untuk mengeluarkan, memberhentikan setiap pekerjaan, tidak memberikan supply listrik dan air, apabila kontraktor (penyewa) tidak mematuhi ketentuan dan peraturan tersebut diatas.</li>
    </ol>

    <p class="sanction">Pelanggaran dari tata tertib yang tercantum diatas akan diberikan sanksi yang ditetapkan oleh pihak mall.</p>
    <p class="date">{{ $kota }}, {{ $tanggalSurat }}</p>

    <table class="sig">
        <tr>
            <td>
                <div>Menyetujui,</div>
                <div class="space">&nbsp;</div>
                <div>&nbsp;</div>
            </td>
            <td>
                <div>Mengetahui,</div>
                <div class="space">&nbsp;</div>
                <div><span class="name">M. Nazaruddin Alamsyah</span></div>
                <div>Spv. Tenancy &amp; FO Department</div>
            </td>
        </tr>
    </table>
</body>
</html>

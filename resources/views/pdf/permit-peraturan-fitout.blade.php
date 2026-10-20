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
        .title { text-align: center; font-size: 15px; font-weight: bold; letter-spacing: 1px; margin: 10px 0 2px; }
        .subtitle { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 1px; margin: 0 0 8px; }
        ol.rules { margin: 6px 0 6px 18px; padding: 0; text-align: justify; font-weight: bold; }
        ol.rules li { margin-bottom: 4px; }
        .note { text-align: justify; margin: 8px 0; font-size: 10.5px; }
        table.sig { width: 100%; border-collapse: collapse; margin-top: 12px; }
        table.sig td { width: 33.33%; text-align: center; vertical-align: top; padding: 6px 8px; font-size: 11px; }
        .sig .space { height: 48px; }
    </style>
</head>
<body>
    <div class="kop">
        @if ($kopData)<img src="{{ $kopData }}" alt="Duta Mall Banjarmasin">@endif
    </div>
    <div class="guide">
        @if ($guideData)<img src="{{ $guideData }}" alt="Fit Out Guide">@endif
    </div>

    <div class="title">PERATURAN PEKERJA</div>
    <div class="subtitle">({{ strtoupper($jenisLabel ?? 'Fit Out') }})</div>

    <ol class="rules">
        <li>DILARANG MEMBAWA &amp; MEROKOK DI AREA KERJA</li>
        <li>DILARANG MEMBAWA SENJATA</li>
        <li>DILARANG TIDUR DI AREA KERJA</li>
        <li>DILARANG BERMAIN PETASAN</li>
        <li>DILARANG MAKAN DI AREA KERJA</li>
        <li>DILARANG BUANG AIR KECIL/BESAR DI AREA KERJA</li>
        <li>DILARANG MEMBAWA PERALATAN MASAK/MEMASAK DI DALAM AREA KERJA</li>
        <li>DILARANG MEMBAWA MINUMAN KERAS</li>
        <li>DILARANG MEMBAWA OBAT-OBATAN TERLARANG</li>
        <li>DILARANG MELAKUKAN TINDAKAN ASUSILA</li>
        <li>DILARANG MENJEMUR PAKAIAN DI AREA KERJA</li>
        <li>DILARANG TIDAK MEMAKAI BAJU PADA SAAT BEKERJA</li>
        <li>WAJIB MEMAKAI TANDA PENGENAL SELAMA KERJA</li>
        <li>TIDAK BOLEH MEMBUANG SAMPAH MATERIAL DI LOKASI TENANT {{ strtoupper($jenisLabel ?? 'Fit Out') }}</li>
    </ol>

    <p class="note">*Pihak Pengelola Gedung berhak untuk menghentikan setiap pekerjaan/pekerja yang bersangkutan akan dikenakan denda sebesar Rp. 1.000.000,- untuk setiap pelanggaran, apabila kontraktor/penyewa tidak mematuhi peraturan tersebut di atas @if (($jenis ?? 'fit_out') === 'pull_out') selama proses Pull Out. @else selama proses Fit Out/Pull Out. @endif</p>

    <table class="sig">
        <tr>
            <td>
                <div>Menyetujui,</div>
                <div class="space">&nbsp;</div>
                <div>(Building Service)</div>
            </td>
            <td>
                <div>Mengetahui,</div>
                <div class="space">&nbsp;</div>
                <div>(Tenancy &amp; {{ str_replace(' ', '', $jenisLabel ?? 'Fit Out') }})</div>
            </td>
            <td>
                <div>&nbsp;</div>
                <div class="space">&nbsp;</div>
                <div>(Kontraktor/Penyewa)</div>
            </td>
        </tr>
    </table>
</body>
</html>

import { Card } from '../components/ui/card'

export default function Pricing() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pricing Self Photo Studio</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Konsep: Harga terjangkau, sesi cepat, hasil premium.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Paket Utama</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold">Paket Basic</h4>
              <div className="text-sm font-bold">20K / sesi</div>
            </div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <li>1 sesi foto (30–45 detik)</li>
              <li>4–6 jepretan otomatis</li>
              <li>1 filter standar</li>
              <li>1 file digital (Google Drive)</li>
              <li>Cocok untuk foto fun, selfie, dan keperluan santai</li>
            </ul>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold">Paket Couple / Bestie</h4>
              <div className="text-sm font-bold">35K / sesi</div>
            </div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <li>1 sesi foto (45–60 detik)</li>
              <li>6–8 jepretan otomatis</li>
              <li>Bisa 2–3 orang</li>
              <li>1 filter premium</li>
              <li>Semua file digital</li>
            </ul>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold">Paket Premium</h4>
              <div className="text-sm font-bold">55K / sesi</div>
            </div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <li>2 sesi foto</li>
              <li>10–12 jepretan</li>
              <li>Filter premium + color grading</li>
              <li>Semua file digital</li>
              <li>1 cetak 4R (optional)</li>
            </ul>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Paket Spesial</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold">Paket Family / Group</h4>
              <div className="text-sm font-bold">75K / sesi</div>
            </div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <li>Hingga 5 orang</li>
              <li>1 sesi foto (60–75 detik)</li>
              <li>10 jepretan</li>
              <li>Semua file digital</li>
              <li>Gratis 2 pose tambahan</li>
            </ul>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold">Paket Graduation / Hijab Style</h4>
              <div className="text-sm font-bold">85K</div>
            </div>
            <ul className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
              <li>2 sesi foto</li>
              <li>Lighting khusus portrait</li>
              <li>Retouch wajah halus</li>
              <li>Semua file digital</li>
              <li>1 cetak 4R</li>
            </ul>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Add-ons</h3>
        <Card className="p-4">
          <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ color: 'var(--muted)' }}>
            <li>Cetak 4R tambahan: 5K / lembar</li>
            <li>Cetak Strip Photo: 7K / strip</li>
            <li>Cetak A5: 15K</li>
            <li>Retouch premium: 10K / foto</li>
            <li>Sewa semua foto (RAW): 20K</li>
            <li>Frame minimalis: 25K</li>
          </ul>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Paket UMKM / Event</h3>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-semibold">Pop-up Event (3 jam)</div>
              <ul className="text-sm mt-2 space-y-1" style={{ color: 'var(--muted)' }}>
                <li>Setup booth</li>
                <li>Unlimited session</li>
                <li>Operator on-site</li>
                <li>Semua hasil digital</li>
              </ul>
            </div>
            <div className="text-xl font-bold">Rp 450.000</div>
          </div>
        </Card>
      </section>

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Rekomendasi Strategi Pricing (opsional)</h3>
        <Card className="p-4">
          <div className="text-sm space-y-1" style={{ color: 'var(--muted)' }}>
            <div>Untuk omzet 10 juta/bulan, kamu butuh sekitar:</div>
            <div>• 500 sesi × 20K</div>
            <div>• 300 sesi × 35K</div>
            <div>• atau campuran paket populer (Basic + Couple)</div>
          </div>
        </Card>
      </section>
    </div>
  )
}


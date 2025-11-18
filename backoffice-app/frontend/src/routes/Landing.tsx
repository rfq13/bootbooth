// Komponen landing terpisah dari admin, tidak menggunakan UI dari admin
import { Camera, Zap, ShieldCheck, Users, Star } from "lucide-react";

export default function Landing() {
  return (
    <main id="home" className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section
        className="py-12 md:py-20 grid md:grid-cols-2 gap-8 items-center"
        aria-labelledby="hero-heading"
      >
        <div>
          <h1
            id="hero-heading"
            className="text-4xl md:text-5xl font-bold leading-tight"
          >
            Kelola Booth Foto Anda Secara Real‑Time
          </h1>
          <p className="mt-3 text-[#6b7280]">
            Booking, pembayaran, dan sesi operasional dalam satu sistem yang
            cepat, aman, dan dapat diandalkan.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="/login"
              className="inline-flex h-10 px-5 items-center rounded-md bg-[#0ea5e9] text-white text-sm hover:bg-[#0d8fd0]"
            >
              Masuk Backoffice
            </a>
            <a
              href="#features"
              className="inline-flex h-10 px-5 items-center rounded-md bg-[#e5e7eb] text-[#111827] text-sm hover:bg-[#dfe3e7]"
            >
              Lihat Fitur
            </a>
          </div>
        </div>
        <figure
          className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-card"
          aria-label="Ilustrasi layanan"
        >
          <img
            src="/placeholder.svg"
            alt="Ilustrasi SnapStudio"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </figure>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-12"
        aria-labelledby="features-heading"
      >
        <h2 id="features-heading" className="text-2xl font-semibold mb-6">
          Fitur Utama
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-lg border border-[#e5e7eb] bg-white shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <Camera aria-hidden size={20} />
              <span className="font-semibold">Manajemen Sesi</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              Alur lengkap ARRIVED → ONGOING → DONE dengan kontrol admin dan
              override.
            </p>
          </div>
          <div className="p-5 rounded-lg border border-[#e5e7eb] bg-white shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck aria-hidden size={20} />
              <span className="font-semibold">Pembayaran Aman</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              Webhook Xendit dengan validasi signature dan broadcasting status
              secara real‑time.
            </p>
          </div>
          <div className="p-5 rounded-lg border border-[#e5e7eb] bg-white shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <Zap aria-hidden size={20} />
              <span className="font-semibold">Realtime Events</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              SSE/WS untuk update cepat dengan latency rendah dan auto
              reconnect.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="py-12"
        aria-labelledby="testimonials-heading"
      >
        <h2 id="testimonials-heading" className="text-2xl font-semibold mb-6">
          Apa Kata Mereka
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-5 rounded-lg border border-[#e5e7eb] bg-white shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Users aria-hidden size={18} />
              <span className="font-semibold">Event Organizer</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              “Panel adminnya ringkas dan cepat. Monitoring booth jadi jauh
              lebih mudah.”
            </p>
            <div className="mt-3 text-[#f59e0b]" aria-label="Rating">
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />
            </div>
          </div>
          <div className="p-5 rounded-lg border border-[#e5e7eb] bg-white shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Users aria-hidden size={18} />
              <span className="font-semibold">Venue Partner</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              “Integrasi pembayaran berjalan mulus. Laporan transaksi akurat.”
            </p>
            <div className="mt-3 text-[#f59e0b]" aria-label="Rating">
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />
            </div>
          </div>
          <div className="p-5 rounded-lg border border-[#e5e7eb] bg-white shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Users aria-hidden size={18} />
              <span className="font-semibold">Brand Activation</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              “Realtime feed membantu kami melihat antrian dan performa booth.”
            </p>
            <div className="mt-3 text-[#f59e0b]" aria-label="Rating">
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />{" "}
              <Star size={16} className="inline" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12" aria-labelledby="cta-heading">
        <div className="p-6 rounded-lg border border-[#e5e7eb] bg-white shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 id="cta-heading" className="text-xl font-semibold">
              Siap meningkatkan pengalaman booth Anda?
            </h2>
            <p className="text-sm text-[#6b7280]">
              Mulai gunakan backoffice yang cepat, aman, dan mudah dioperasikan.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex h-9 px-4 items-center rounded-md bg-[#0ea5e9] text-white text-sm hover:bg-[#0d8fd0]"
          >
            Mulai Sekarang
          </a>
        </div>
      </section>
    </main>
  );
}

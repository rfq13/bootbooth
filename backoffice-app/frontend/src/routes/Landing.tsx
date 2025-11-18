// Komponen landing terpisah dari admin, tidak menggunakan UI dari admin
import { Camera, Zap, ShieldCheck, Users, Star } from "lucide-react";
import { useEffect } from "react";

export default function Landing() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    let gsapRef: any = null;
    const init = async () => {
      try {
        const mod = await import("gsap");
        const st = await import("gsap/ScrollTrigger");
        gsapRef = (mod as any).gsap || mod;
        const ScrollTrigger = (st as any).ScrollTrigger || (st as any).default;
        if (gsapRef && ScrollTrigger) { (gsapRef as any).registerPlugin(ScrollTrigger) }
      } catch { gsapRef = null }
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            if (gsapRef) { (gsapRef as any).to(e.target, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }) }
            else { e.target.classList.add("reveal-visible") }
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.15 });
      els.forEach(el => io.observe(el));
      const btns = Array.from(document.querySelectorAll<HTMLElement>(".btn-gradient"));
      btns.forEach(b => {
        b.addEventListener("mouseenter", () => { if (gsapRef) { (gsapRef as any).to(b, { scale: 1.03, duration: 0.2, ease: "power2.out" }) } });
        b.addEventListener("mouseleave", () => { if (gsapRef) { (gsapRef as any).to(b, { scale: 1.0, duration: 0.2, ease: "power2.out" }) } });
      });
      const icons = Array.from(document.querySelectorAll<HTMLElement>(".icon-anim"));
      icons.forEach(i => {
        i.addEventListener("mouseenter", () => { if (gsapRef) { (gsapRef as any).to(i, { scale: 1.05, duration: 0.25, ease: "elastic.out(1, 0.6)" }) } });
        i.addEventListener("mouseleave", () => { if (gsapRef) { (gsapRef as any).to(i, { scale: 1.0, duration: 0.2, ease: "power2.out" }) } });
      });
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".card-anim"));
      cards.forEach(c => {
        c.addEventListener("mouseenter", () => { if (gsapRef) { (gsapRef as any).to(c, { y: -5, duration: 0.2, ease: "power2.out" }) } });
        c.addEventListener("mouseleave", () => { if (gsapRef) { (gsapRef as any).to(c, { y: 0, duration: 0.2, ease: "power2.out" }) } });
      });
      if (gsapRef && (gsapRef as any).ScrollTrigger) {
        const hero = document.querySelector<HTMLElement>("figure[aria-label='Ilustrasi layanan']");
        if (hero) {
          (gsapRef as any).to(hero, {
            yPercent: -20,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top 75%", end: "bottom 25%", scrub: true },
          });
        }
        const sections = [
          { sel: "#features", start: "top 75%" },
          { sel: "#testimonials", start: "top 50%" },
          { sel: "#cta-heading", start: "top 25%" },
        ];
        sections.forEach(s => {
          const el = document.querySelector<HTMLElement>(s.sel);
          if (el) {
            (gsapRef as any).fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: el, start: s.start, toggleActions: "play none none reverse" } });
          }
        });
      }
    };
    init();
    return () => {};
  }, []);
  return (
    <div className="landing-wrap min-h-screen relative">
      <div className="landing-glow" />
      <main id="home" className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section
        className="py-12 md:py-20 grid md:grid-cols-2 gap-8 items-center"
        aria-labelledby="hero-heading"
      >
        <div className="animate-[floatY_8s_ease-in-out_infinite] reveal">
          <h1
            id="hero-heading"
            className="text-4xl md:text-5xl font-bold leading-tight text-gradient"
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
              className="inline-flex h-10 px-5 items-center rounded-md btn-gradient text-sm"
            >
              Masuk Backoffice
            </a>
            <a
              href="#features"
              className="inline-flex h-10 px-5 items-center rounded-md bg-white/80 text-[#111827] text-sm hover:bg-white card-soft"
            >
              Lihat Fitur
            </a>
          </div>
        </div>
        <figure
          className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden shadow-card animate-[floatY_10s_ease-in-out_infinite] reveal"
          aria-label="Ilustrasi layanan"
        >
          <picture>
            <source srcSet="https://images.pexels.com/photos/1995123/pexels-photo-1995123.jpeg?auto=compress&cs=tinysrgb&format=webp&w=1920" type="image/webp" />
            <img
              src="https://images.pexels.com/photos/1995123/pexels-photo-1995123.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt="Pengunjung berpose di photobooth dengan pencahayaan estetik"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
          </picture>
        </figure>
      </section>
      <div className="section-divider my-6" />

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
          <div className="p-5 rounded-lg border border-[#e5e7eb] card-soft shadow-card reveal">
            <div className="flex items-center gap-3 mb-3">
              <Camera aria-hidden size={20} />
              <span className="font-semibold">Manajemen Sesi</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              Alur lengkap ARRIVED → ONGOING → DONE dengan kontrol admin dan
              override.
            </p>
          </div>
          <div className="p-5 rounded-lg border border-[#e5e7eb] card-soft shadow-card reveal">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck aria-hidden size={20} />
              <span className="font-semibold">Pembayaran Aman</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              Webhook Xendit dengan validasi signature dan broadcasting status
              secara real‑time.
            </p>
          </div>
          <div className="p-5 rounded-lg border border-[#e5e7eb] card-soft shadow-card reveal">
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
      <div className="section-divider my-6" />

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
        <div className="p-6 rounded-lg border border-[#e5e7eb] card-soft shadow-card flex flex-col md:flex-row items-center justify-between gap-4 reveal">
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
            className="inline-flex h-9 px-4 items-center rounded-md btn-gradient text-sm"
          >
            Mulai Sekarang
          </a>
        </div>
      </section>
      </main>
    </div>
  );
}

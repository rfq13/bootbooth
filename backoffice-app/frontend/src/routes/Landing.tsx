// Komponen landing terpisah dari admin, tidak menggunakan UI dari admin
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { appName } from "../utils/constants";

export default function Landing() {
  useEffect(() => {
    // Smooth scroll untuk anchor links
    const handleAnchorClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.hash) {
        e.preventDefault();
        const element = document.querySelector(target.hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    // Tambahkan event listener untuk semua anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach((link) => {
      link.addEventListener("click", handleAnchorClick);
    });

    return () => {
      anchorLinks.forEach((link) => {
        link.removeEventListener("click", handleAnchorClick);
      });
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>{appName} - Solusi Photobooth Modern</title>
        <meta
          name="description"
          content="Solusi photobooth modern dengan live preview, efek instan, dan kemudahan capture. Sempurna untuk menciptakan momen berkesan dengan gaya."
        />
      </Helmet>

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .no-underline {
            text-decoration: none;
          }
          
          .list-none {
            list-style: none;
          }
        `}
      </style>
      <div className="min-h-screen bg-[#FDF8F3]">
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-[rgba(253,248,243,0.95)] backdrop-blur-lg px-8 py-4 z-50 shadow-[0_2px_20px_rgba(155,122,91,0.1)]">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 text-2xl font-bold text-[#1a1917]">
              <img src="/icon.png" alt={appName} className="w-10 h-10" />
              {appName}
            </div>
            <ul className="flex gap-8 list-none">
              <li>
                <a
                  href="#features"
                  className="no-underline text-[#6d6354] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Fitur
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="no-underline text-[#6d6354] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Cara Kerja
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="no-underline text-[#6d6354] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Harga
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="no-underline text-[#6d6354] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Kontak
                </a>
              </li>
            </ul>
            <a
              href="/login"
              className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
            >
              Coba Gratis
            </a>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="min-h-screen flex items-center px-8 pt-24 pb-16 bg-gradient-to-br from-[#FDF8F3] via-[#FAF1E7] to-[#F3E5D3] relative overflow-hidden">
          <div
            className="absolute top-[-50%] right-[-20%] w-4/5 h-[150%] opacity-50"
            style={{
              background:
                "radial-gradient(ellipse, rgba(237,217,192,0.5) 0%, transparent 70%)",
            }}
          ></div>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1917] leading-tight mb-6">
                Digitize Your{" "}
                <span className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] bg-clip-text text-transparent">
                  Photobooth
                </span>{" "}
                Experience
              </h1>
              <p className="text-xl text-[#6d6354] mb-8">
                Solusi photobooth modern dengan live preview, efek instan, dan
                kemudahan capture. Sempurna untuk menciptakan momen berkesan
                dengan gaya.
              </p>
              <div className="flex gap-4 flex-wrap">
                <a
                  href="#"
                  className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
                >
                  Mulai Sekarang <i className="fas fa-arrow-right ml-2"></i>
                </a>
                <a
                  href="#"
                  className="bg-white text-[#1a1917] px-6 py-3 rounded-full no-underline font-semibold border-2 border-[#EAD0B3] hover:bg-[#FAF1E7] hover:border-[#D6BFA1] transition-all inline-block"
                >
                  <i className="fas fa-play mr-2"></i> Lihat Demo
                </a>
              </div>
            </div>
            <div className="relative">
              <div
                className="bg-white rounded-2xl p-6 shadow-[0_30px_60px_rgba(155,122,91,0.2)]"
                style={{
                  perspective: "1000px",
                  transform: "perspective(1000px) rotateY(-5deg)",
                  animation: "float 6s ease-in-out infinite",
                }}
              >
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
                </div>
                <div className="bg-[#FAF1E7] rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-[#EDD9C0] rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-camera text-2xl text-[#4f4a41]"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-[#1a1917] mb-2">
                    Live Preview
                  </h3>
                  <p className="text-[#6d6354] text-sm mb-4">
                    Lihat photobooth Anda secara real-time
                  </p>
                  <div className="flex justify-center gap-6 p-3 bg-white rounded-full">
                    <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                      <div className="w-2 h-2 rounded-full bg-[#28c840]"></div>
                      Server: Aktif
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                      <div className="w-2 h-2 rounded-full bg-[#febc2e]"></div>
                      Kamera: Ready
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-8 py-24 bg-white" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1a1917] mb-4">
                Fitur Unggulan
              </h2>
              <p className="text-lg text-[#9c8f78] max-w-2xl mx-auto">
                Semua yang Anda butuhkan untuk menjalankan photobooth
                profesional dalam satu platform
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-[#FDF8F3] p-8 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-eye text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Live Preview
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Tampilan real-time untuk memastikan setiap pose sempurna
                  sebelum capture
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-magic text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Efek Instan
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Berbagai filter dan efek menarik yang bisa diterapkan secara
                  langsung
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-bolt text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Capture Cepat
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Proses pengambilan foto yang cepat dengan countdown otomatis
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-share-alt text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Sharing Mudah
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Bagikan hasil foto langsung ke media sosial atau via QR code
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-palette text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Template Custom
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Desain template sesuai tema acara atau branding Anda
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-print text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Print Langsung
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Integrasi dengan printer untuk cetak foto instan berkualitas
                  tinggi
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          className="px-8 py-24 bg-gradient-to-br from-[#FAF1E7] to-[#F3E5D3]"
          id="how-it-works"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1a1917] mb-4">
                Cara Kerja
              </h2>
              <p className="text-lg text-[#9c8f78]">
                Mulai dalam 3 langkah sederhana
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-2">
                  Setup Perangkat
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Hubungkan kamera dan printer ke sistem photobooth
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-2">
                  Konfigurasi
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Atur template, efek, dan pengaturan sesuai kebutuhan acara
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] text-white text-2xl font-bold rounded-full flex items-center justify-center mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-2">
                  Mulai Event
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Tamu bisa langsung menggunakan dan menikmati photobooth
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-8 py-24 bg-white" id="pricing">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1a1917] mb-4">
                Pilihan Paket
              </h2>
              <p className="text-lg text-[#9c8f78]">
                Pilih paket yang sesuai dengan kebutuhan bisnis Anda
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-[#FDF8F3] rounded-3xl p-10 text-center relative hover:transform hover:translate-y-[-5px] transition-all">
                <h3 className="text-2xl font-semibold mb-2">Starter</h3>
                <div className="text-5xl font-extrabold my-4">
                  Rp 500K
                  <span className="text-lg font-normal opacity-70">/bulan</span>
                </div>
                <ul className="list-none text-left mb-8">
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#C5A888]"></i>1 Perangkat
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#C5A888]"></i>5 Template
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#C5A888]"></i>
                    Filter Dasar
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#C5A888]"></i>
                    Email Support
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#C5A888]"></i>
                    1000 Foto/bulan
                  </li>
                </ul>
                <a
                  href="#"
                  className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block w-full text-center"
                >
                  Pilih Paket
                </a>
              </div>
              <div className="bg-gradient-to-br from-[#2f2c28] to-[#1a1917] text-white rounded-3xl p-10 text-center relative transform scale-105 hover:scale-105 hover:translate-y-[-5px] transition-all">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#D6BFA1] to-[#B3916F] text-white px-6 py-2 rounded-full text-sm font-semibold">
                  Populer
                </div>
                <h3 className="text-2xl font-semibold mb-2">Professional</h3>
                <div className="text-5xl font-extrabold my-4">
                  Rp 1.2JT
                  <span className="text-lg font-normal opacity-70">/bulan</span>
                </div>
                <ul className="list-none text-left mb-8">
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#EAD0B3]"></i>5 Perangkat
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#EAD0B3]"></i>
                    Unlimited Template
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#EAD0B3]"></i>
                    Semua Filter & Efek
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#EAD0B3]"></i>
                    Priority Support
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#EAD0B3]"></i>
                    Unlimited Foto
                  </li>
                  <li className="py-2 flex items-center gap-3">
                    <i className="fas fa-check text-[#EAD0B3]"></i>
                    Custom Branding
                  </li>
                </ul>
                <a
                  href="#"
                  className="bg-gradient-to-r from-[#E8D3BA] to-[#D6BFA1] text-[#1a1917] px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block w-full text-center"
                >
                  Pilih Paket
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section
          className="px-8 py-24 bg-gradient-to-br from-[#2f2c28] to-[#1a1917] text-center text-white"
          id="contact"
        >
          <h2 className="text-4xl font-bold mb-4">Siap Memulai?</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
            Bergabung dengan ratusan event organizer yang sudah mempercayai
            photobooth kami
          </p>
          <a
            href="#"
            className="bg-gradient-to-r from-[#E8D3BA] to-[#D6BFA1] text-[#1a1917] px-8 py-4 rounded-full no-underline font-semibold text-lg hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
          >
            Hubungi Kami <i className="fas fa-arrow-right ml-2"></i>
          </a>
        </section>

        {/* Footer */}
        <footer className="bg-[#1a1917] text-[#e5e5e5] px-8 py-12">
          <div className="max-w-6xl mx-auto flex justify-between items-center flex-wrap gap-8">
            <div className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fas fa-camera-retro text-[#9c8f78]"></i>
              {appName}
            </div>
            <ul className="flex gap-8 list-none">
              <li>
                <a
                  href="/tentang-kami"
                  className="text-[#d4d4d4] no-underline hover:text-[#9c8f78] transition-colors"
                >
                  Tentang Kami
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#d4d4d4] no-underline hover:text-[#9c8f78] transition-colors"
                >
                  Kebijakan Privasi
                </a>
              </li>
              <li>
                <a
                  href="/syarat-dan-ketentuan"
                  className="text-[#d4d4d4] no-underline hover:text-[#9c8f78] transition-colors"
                >
                  Syarat & Ketentuan
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#d4d4d4] no-underline hover:text-[#9c8f78] transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 bg-[#2f2c28] rounded-full flex items-center justify-center text-[#d4d4d4] hover:bg-[#C5A888] hover:text-white transition-all"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#2f2c28] rounded-full flex items-center justify-center text-[#d4d4d4] hover:bg-[#C5A888] hover:text-white transition-all"
              >
                <i className="fab fa-facebook"></i>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-[#2f2c28] rounded-full flex items-center justify-center text-[#d4d4d4] hover:bg-[#C5A888] hover:text-white transition-all"
              >
                <i className="fab fa-whatsapp"></i>
              </a>
            </div>
          </div>
        </footer>

        {/* Font Awesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </div>
    </>
  );
}

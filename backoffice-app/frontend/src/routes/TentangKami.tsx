import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const appName = import.meta.env.VITE_APP_NAME || "PijarRupa";

export default function TentangKami() {
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
        <title>Tentang Kami - {appName}</title>
        <meta
          name="description"
          content={`Kenali lebih dekat tim ${appName} dan misi kami dalam menyediakan solusi photobooth modern untuk berbagai acara.`}
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
              <i className="fas fa-camera-retro text-[#B3916F]"></i>
              {appName}
            </div>
            <ul className="flex gap-8 list-none">
              <li>
                <a
                  href="/"
                  className="no-underline text-[#6d6354] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Beranda
                </a>
              </li>
              <li>
                <a
                  href="/tentang-kami"
                  className="no-underline text-[#B3916F] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Tentang Kami
                </a>
              </li>
              <li>
                <a
                  href="/syarat-dan-ketentuan"
                  className="no-underline text-[#6d6354] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Syarat & Ketentuan
                </a>
              </li>
            </ul>
            <a
              href="/login"
              className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
            >
              Masuk
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
                Tentang{" "}
                <span className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] bg-clip-text text-transparent">
                  Photobooth
                </span>
              </h1>
              <p className="text-xl text-[#6d6354] mb-8">
                Kami adalah tim yang bersemangat dalam menciptakan pengalaman
                photobooth yang tak terlupakan untuk setiap momen spesial Anda.
              </p>
              <div className="flex gap-4 flex-wrap">
                <a
                  href="#team"
                  className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
                >
                  Tim Kami <i className="fas fa-users ml-2"></i>
                </a>
                <a
                  href="#contact"
                  className="bg-white text-[#1a1917] px-6 py-3 rounded-full no-underline font-semibold border-2 border-[#EAD0B3] hover:bg-[#FAF1E7] hover:border-[#D6BFA1] transition-all inline-block"
                >
                  <i className="fas fa-envelope mr-2"></i> Hubungi Kami
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
                <div className="bg-[#FAF1E7] rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-[#EDD9C0] rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-heart text-2xl text-[#4f4a41]"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-[#1a1917] mb-2">
                    Passion & Innovation
                  </h3>
                  <p className="text-[#6d6354] text-sm mb-4">
                    Menggabungkan teknologi modern dengan sentuhan personal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="px-8 py-24 bg-white" id="story">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1a1917] mb-4">
                Cerita Kami
              </h2>
              <p className="text-lg text-[#9c8f78] max-w-2xl mx-auto">
                Perjalanan kami dalam menghadirkan solusi photobooth terbaik
                untuk Indonesia
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-rocket text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  2020 - Awal Mula
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Dimulai dari kebutuhan akan solusi photobooth yang modern dan
                  mudah digunakan untuk berbagai acara.
                </p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-chart-line text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  2022 - Pertumbuhan
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Berkembang pesat dengan melayani ratusan event dan perusahaan
                  di seluruh Indonesia.
                </p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#EDD9C0] to-[#E8D3BA] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-trophy text-3xl text-[#1a1917]"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  2024 - Prestasi
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Menjadi leader dalam solusi photobooth digital dengan
                  teknologi terkini dan pelayanan terbaik.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="px-8 py-24 bg-[#FDF8F3]" id="team">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1a1917] mb-4">
                Tim Kami
              </h2>
              <p className="text-lg text-[#9c8f78] max-w-2xl mx-auto">
                Profesional berpengalaman yang siap mewujudkan momen berharga
                Anda
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-24 h-24 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user text-3xl text-white"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#1a1917] mb-2">
                  Ahmad Rizki
                </h3>
                <p className="text-[#B3916F] text-sm mb-2">CEO & Founder</p>
                <p className="text-[#9c8f78] text-xs">
                  10+ tahun pengalaman dalam industri event dan teknologi
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-24 h-24 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user text-3xl text-white"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#1a1917] mb-2">
                  Sarah Putri
                </h3>
                <p className="text-[#B3916F] text-sm mb-2">CTO</p>
                <p className="text-[#9c8f78] text-xs">
                  Expert dalam pengembangan software dan sistem photobooth
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-24 h-24 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user text-3xl text-white"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#1a1917] mb-2">
                  Budi Santoso
                </h3>
                <p className="text-[#B3916F] text-sm mb-2">
                  Head of Operations
                </p>
                <p className="text-[#9c8f78] text-xs">
                  Spesialis dalam manajemen event dan logistik
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl text-center hover:transform hover:translate-y-[-10px] hover:shadow-[0_20px_40px_rgba(155,122,91,0.15)] transition-all">
                <div className="w-24 h-24 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-user text-3xl text-white"></i>
                </div>
                <h3 className="text-lg font-semibold text-[#1a1917] mb-2">
                  Maya Sari
                </h3>
                <p className="text-[#B3916F] text-sm mb-2">Creative Director</p>
                <p className="text-[#9c8f78] text-xs">
                  Master dalam desain dan pengalaman pengguna
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="px-8 py-24 bg-white" id="values">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1a1917] mb-4">
                Nilai-Nilai Kami
              </h2>
              <p className="text-lg text-[#9c8f78] max-w-2xl mx-auto">
                Prinsip yang memandu setiap langkah kami dalam melayani Anda
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#FDF8F3] p-8 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-star text-2xl text-white"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Kualitas Terbaik
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Kami selalu berkomitmen untuk memberikan produk dan layanan
                  dengan kualitas tertinggi, dari perangkat keras hingga
                  pengalaman pengguna.
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-lightbulb text-2xl text-white"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Inovasi Berkelanjutan
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Terus mengembangkan teknologi dan fitur baru untuk tetap
                  menjadi yang terdepan dalam industri photobooth.
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-smile text-2xl text-white"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Kepuasan Pelanggan
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Kepuasan Anda adalah prioritas utama kami. Kami selalu
                  mendengarkan dan berusaha melampaui ekspektasi.
                </p>
              </div>
              <div className="bg-[#FDF8F3] p-8 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-handshake text-2xl text-white"></i>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                  Integritas
                </h3>
                <p className="text-[#9c8f78] text-sm">
                  Berbisnis dengan jujur, transparan, dan bertanggung jawab
                  dalam setiap interaksi dengan pelanggan dan mitra.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section
          className="px-8 py-24 bg-gradient-to-br from-[#2f2c28] to-[#1a1917] text-center text-white"
          id="contact"
        >
          <h2 className="text-4xl font-bold mb-4">Hubungi Kami</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
            Siap untuk membuat acara Anda lebih berkesan dengan photobooth kami?
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="mailto:info@photobooth.com"
              className="bg-gradient-to-r from-[#E8D3BA] to-[#D6BFA1] text-[#1a1917] px-8 py-4 rounded-full no-underline font-semibold text-lg hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
            >
              <i className="fas fa-envelope mr-2"></i> Email Kami
            </a>
            <a
              href="tel:+628123456789"
              className="bg-white text-[#1a1917] px-8 py-4 rounded-full no-underline font-semibold text-lg hover:bg-[#FAF1E7] transition-all inline-block"
            >
              <i className="fas fa-phone mr-2"></i> Telepon
            </a>
          </div>
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
                  href="/"
                  className="text-[#d4d4d4] no-underline hover:text-[#9c8f78] transition-colors"
                >
                  Beranda
                </a>
              </li>
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
                  href="/syarat-dan-ketentuan"
                  className="text-[#d4d4d4] no-underline hover:text-[#9c8f78] transition-colors"
                >
                  Syarat & Ketentuan
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

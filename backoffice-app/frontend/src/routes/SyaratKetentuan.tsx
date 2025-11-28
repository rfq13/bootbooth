import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const appName = import.meta.env.VITE_APP_NAME || "PijarRupa";

export default function SyaratKetentuan() {
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
        <title>Syarat dan Ketentuan - {appName}</title>
        <meta
          name="description"
          content={`Baca syarat dan ketentuan penggunaan layanan ${appName} untuk informasi lengkap tentang aturan dan kebijakan kami.`}
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
                  className="no-underline text-[#6d6354] font-medium hover:text-[#9B7A5B] transition-colors"
                >
                  Tentang Kami
                </a>
              </li>
              <li>
                <a
                  href="/syarat-dan-ketentuan"
                  className="no-underline text-[#B3916F] font-medium hover:text-[#9B7A5B] transition-colors"
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
        <section className="min-h-[60vh] flex items-center px-8 pt-24 pb-16 bg-gradient-to-br from-[#FDF8F3] via-[#FAF1E7] to-[#F3E5D3] relative overflow-hidden">
          <div
            className="absolute top-[-50%] right-[-20%] w-4/5 h-[150%] opacity-50"
            style={{
              background:
                "radial-gradient(ellipse, rgba(237,217,192,0.5) 0%, transparent 70%)",
            }}
          ></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-3xl flex items-center justify-center mx-auto mb-8">
              <i className="fas fa-file-contract text-4xl text-white"></i>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1917] leading-tight mb-6">
              Syarat dan{" "}
              <span className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] bg-clip-text text-transparent">
                Ketentuan
              </span>
            </h1>
            <p className="text-xl text-[#6d6354] mb-8">
              Harap baca syarat dan ketentuan berikut dengan seksama sebelum
              menggunakan layanan kami.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <a
                href="#terms"
                className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
              >
                Baca Syarat <i className="fas fa-arrow-down ml-2"></i>
              </a>
              <a
                href="/"
                className="bg-white text-[#1a1917] px-6 py-3 rounded-full no-underline font-semibold border-2 border-[#EAD0B3] hover:bg-[#FAF1E7] hover:border-[#D6BFA1] transition-all inline-block"
              >
                <i className="fas fa-home mr-2"></i> Kembali ke Beranda
              </a>
            </div>
          </div>
        </section>

        {/* Terms Content */}
        <section className="px-8 py-24 bg-white" id="terms">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              {/* Pengantar */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                  <i className="fas fa-info-circle text-[#B3916F]"></i>
                  Pengantar
                </h2>
                <p className="text-[#6d6354] leading-relaxed mb-4">
                  Selamat datang di {appName}. Syarat dan ketentuan ini mengatur
                  penggunaan layanan photobooth digital yang kami sediakan.
                  Dengan menggunakan layanan kami, Anda setuju untuk mematuhi
                  semua syarat dan ketentuan yang tercantum di bawah ini.
                </p>
                <p className="text-[#6d6354] leading-relaxed">
                  Terakhir diperbarui: 22 November 2024
                </p>
              </div>

              {/* Definisi */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                  <i className="fas fa-book text-[#B3916F]"></i>
                  Definisi
                </h2>
                <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                  <ul className="space-y-3 text-[#6d6354]">
                    <li className="flex items-start gap-3">
                      <i className="fas fa-check text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>Layanan:</strong> Solusi photobooth digital yang
                        kami sediakan termasuk perangkat keras, perangkat lunak,
                        dan dukungan teknis.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <i className="fas fa-check text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>Pengguna:</strong> Individu atau perusahaan yang
                        menggunakan layanan {appName} untuk acara atau keperluan
                        komersial.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <i className="fas fa-check text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>Konten:</strong> Foto, video, dan materi visual
                        lainnya yang dihasilkan melalui layanan {appName}.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <i className="fas fa-check text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>Akun:</strong> Akses pribadi yang diberikan
                        kepada Pengguna untuk mengelola layanan {appName}.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Ketentuan Penggunaan */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                  <i className="fas fa-user-check text-[#B3916F]"></i>
                  Ketentuan Penggunaan
                </h2>
                <div className="space-y-6">
                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      1. Pendaftaran Akun
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>
                        • Pengguna harus mendaftar dengan informasi yang akurat
                        dan lengkap
                      </li>
                      <li>
                        • Pengguna bertanggung jawab atas keamanan akun
                        masing-masing
                      </li>
                      <li>
                        • Setiap akun hanya untuk satu pengguna atau entitas
                        bisnis
                      </li>
                      <li>
                        • Kami berhak menangguhkan akun yang melanggar ketentuan
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      2. Penggunaan Layanan
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>
                        • Layanan hanya boleh digunakan untuk tujuan yang sah
                        dan etis
                      </li>
                      <li>
                        • Dilarang menggunakan layanan untuk aktivitas ilegal
                        atau melanggar hukum
                      </li>
                      <li>
                        • Pengguna tidak boleh mencoba membobol atau merusak
                        sistem
                      </li>
                      <li>
                        • Setiap pelanggaran akan ditindak sesuai hukum yang
                        berlaku
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      3. Konten dan Hak Cipta
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>
                        • Pengguna memegang hak cipta atas konten yang
                        dihasilkan
                      </li>
                      <li>
                        • {appName} memiliki hak untuk menggunakan konten untuk
                        tujuan promosi dengan persetujuan pengguna
                      </li>
                      <li>
                        • Pengguna bertanggung jawab atas konten yang diunggah
                        atau dibagikan
                      </li>
                      <li>
                        • Dilarang mengunggah konten yang melanggar hak cipta
                        pihak ketiga
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Pembayaran dan Tagihan */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                  <i className="fas fa-credit-card text-[#B3916F]"></i>
                  Pembayaran dan Tagihan
                </h2>
                <div className="space-y-6">
                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      1. Struktur Harga
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>• Harga berdasarkan paket langganan yang dipilih</li>
                      <li>
                        • Biaya tambahan untuk fitur premium atau penggunaan
                        ekstra
                      </li>
                      <li>
                        • Harga dapat berubah sewaktu-waktu dengan pemberitahuan
                        30 hari
                      </li>
                      <li>• Diskon tersedia untuk pembayaran tahunan</li>
                    </ul>
                  </div>

                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      2. Metode Pembayaran
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>• Transfer bank ke rekening resmi {appName}</li>
                      <li>• Pembayaran melalui gateway pembayaran online</li>
                      <li>
                        • Pembayaran harus dilakukan sebelum tanggal jatuh tempo
                      </li>
                      <li>
                        • Denda keterlambatan 2% per hari dari total tagihan
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      3. Kebijakan Pengembalian
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>
                        • Pengembalian dana hanya untuk layanan yang belum
                        digunakan
                      </li>
                      <li>
                        • Permintaan pengembalian harus diajukan dalam 7 hari
                      </li>
                      <li>• Biaya administrasi 10% dari total pengembalian</li>
                      <li>• Pengembalian diproses dalam 14 hari kerja</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Privasi dan Keamanan */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                  <i className="fas fa-shield-alt text-[#B3916F]"></i>
                  Privasi dan Keamanan
                </h2>
                <div className="space-y-6">
                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      1. Perlindungan Data
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>
                        • Kami melindungi data pribadi sesuai GDPR dan regulasi
                        setempat
                      </li>
                      <li>
                        • Data pengguna disimpan dengan enkripsi standar
                        industri
                      </li>
                      <li>
                        • Kami tidak menjual data pribadi kepada pihak ketiga
                      </li>
                      <li>
                        • Pengguna dapat mengakses dan menghapus data pribadi
                        kapan saja
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-[#1a1917] mb-3">
                      2. Keamanan Sistem
                    </h3>
                    <ul className="space-y-2 text-[#6d6354] ml-4">
                      <li>• Sistem dilengkapi dengan keamanan berlapis</li>
                      <li>• Backup data dilakukan secara rutin</li>
                      <li>• Monitoring keamanan 24/7</li>
                      <li>• Update keamanan dilakukan secara berkala</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Pembatalan dan Pengakhiran */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                  <i className="fas fa-times-circle text-[#B3916F]"></i>
                  Pembatalan dan Pengakhiran
                </h2>
                <div className="bg-[#FDF8F3] p-6 rounded-2xl">
                  <ul className="space-y-3 text-[#6d6354]">
                    <li className="flex items-start gap-3">
                      <i className="fas fa-arrow-right text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>
                          Pengguna dapat membatalkan langganan kapan saja
                        </strong>{" "}
                        dengan pemberitahuan 30 hari sebelum tanggal pemutusan.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <i className="fas fa-arrow-right text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>{appName} dapat mengakhiri layanan</strong> jika
                        pengguna melanggar syarat dan ketentuan.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <i className="fas fa-arrow-right text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>Data pengguna akan dihapus</strong> dalam 30
                        hari setelah pengakhiran layanan.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <i className="fas fa-arrow-right text-[#C5A888] mt-1"></i>
                      <div>
                        <strong>Tidak ada pengembalian dana</strong> untuk sisa
                        periode langganan yang belum digunakan.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Hubungi Kami */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                  <i className="fas fa-question-circle text-[#B3916F]"></i>
                  Pertanyaan dan Bantuan
                </h2>
                <div className="bg-gradient-to-br from-[#FAF1E7] to-[#F3E5D3] p-8 rounded-2xl text-center">
                  <p className="text-[#6d6354] mb-6">
                    Jika Anda memiliki pertanyaan tentang syarat dan ketentuan
                    ini, jangan ragu untuk menghubungi kami.
                  </p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <a
                      href="mailto:support@photobooth.com"
                      className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white px-6 py-3 rounded-full no-underline font-semibold hover:transform hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all inline-block"
                    >
                      <i className="fas fa-envelope mr-2"></i> Email Support
                    </a>
                    <a
                      href="tel:+628123456789"
                      className="bg-white text-[#1a1917] px-6 py-3 rounded-full no-underline font-semibold border-2 border-[#EAD0B3] hover:bg-[#FAF1E7] hover:border-[#D6BFA1] transition-all inline-block"
                    >
                      <i className="fas fa-phone mr-2"></i> Telepon
                    </a>
                  </div>
                </div>
              </div>
            </div>
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

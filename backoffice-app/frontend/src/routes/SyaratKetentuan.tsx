import { useEffect, useMemo, useState } from "react";
import { getActiveTerms } from "../utils/api";
import { Button } from "../components/ui/button";
import {
  Info,
  BookText,
  UserCheck,
  CreditCard,
  Shield,
  HelpCircle,
  Check,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

const appName = import.meta.env.VITE_APP_NAME || "PijarRupa";

export default function SyaratKetentuan() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const t = await getActiveTerms();
        setVersion(t.version_code || "");
        let content = t.content;
        if (typeof content === "string") {
          try {
            content = JSON.parse(content);
          } catch {}
        }
        if (Array.isArray(content)) setBlocks(content);
      } catch {}
    })();

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

  const Icon = useMemo(
    () =>
      ({
        info: Info,
        book: BookText,
        "user-check": UserCheck,
        "credit-card": CreditCard,
        shield: Shield,
        "help-circle": HelpCircle,
        check: Check,
        "arrow-right": ArrowRight,
        phone: Phone,
        mail: Mail,
      } as Record<string, any>),
    []
  );

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
              <div className="mb-4 text-sm text-[#9c8f78]">
                Versi: {version || "-"}
              </div>
              {blocks.map((b, i) => {
                if (b.type === "heading") {
                  const level = b.level || 2;
                  const text = b.text || "";
                  const Ico = b.icon && Icon[b.icon] ? Icon[b.icon] : Info;
                  return (
                    <div key={i} className="mb-8">
                      <h2 className="text-3xl font-bold text-[#1a1917] mb-6 flex items-center gap-3">
                        <Ico className="text-[#B3916F]" />
                        {text}
                      </h2>
                    </div>
                  );
                }
                if (b.type === "paragraph") {
                  return (
                    <p key={i} className="text-[#6d6354] leading-relaxed mb-4">
                      {b.text}
                    </p>
                  );
                }
                if (b.type === "list") {
                  const items = Array.isArray(b.items) ? b.items : [];
                  return (
                    <div key={i} className="bg-[#FDF8F3] p-6 rounded-2xl mb-8">
                      <ul className="space-y-2 text-[#6d6354] ml-4">
                        {items.map((it: any, idx: number) => (
                          <li key={idx}>• {it}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                if (b.type === "callout") {
                  const Ico = b.icon && Icon[b.icon] ? Icon[b.icon] : Info;
                  return (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-[#FAF1E7] to-[#F3E5D3] p-8 rounded-2xl mb-8"
                    >
                      <div className="flex items-start gap-3">
                        <Ico className="text-[#B3916F]" />
                        <div className="text-[#6d6354]">{b.text}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}

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

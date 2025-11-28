import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      <header className="sticky top-0 z-10 bg-[#fafafa]/90 backdrop-blur border-b border-[#e5e7eb]">
        <nav
          className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between"
          aria-label="Public"
        >
          <Link
            to="/"
            className="text-lg font-bold"
            aria-label="Backoffice Booth"
          >
            Backoffice Booth
          </Link>
          <ul className="hidden md:flex items-center gap-6 text-sm">
            <li>
              <a className="hover:text-[#0ea5e9]" href="#features">
                Fitur
              </a>
            </li>
            <li>
              <a className="hover:text-[#0ea5e9]" href="#testimonials">
                Testimoni
              </a>
            </li>
            <li>
              <a className="hover:text-[#0ea5e9]" href="#contact">
                Kontak
              </a>
            </li>
          </ul>
          <div className="flex items-center gap-2">
            <a className="text-sm" href="#contact">
              Hubungi Kami
            </a>
            <Link
              to="/login"
              aria-label="Masuk"
              className="inline-flex h-9 px-4 items-center rounded-md bg-[#0ea5e9] text-white text-sm hover:bg-[#0d8fd0]"
            >
              Masuk
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto">
        <Outlet />
      </main>
      <footer id="contact" className="mt-12 border-t border-[#e5e7eb] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold">Kontak</h3>
            <p className="text-sm text-[#6b7280]">support@example.com</p>
          </div>
          <div>
            <h3 className="font-semibold">Link Penting</h3>
            <ul className="text-sm text-[#6b7280]">
              <li>
                <a className="hover:text-[#0ea5e9]" href="#features">
                  Fitur
                </a>
              </li>
              <li>
                <a className="hover:text-[#0ea5e9]" href="#testimonials">
                  Testimoni
                </a>
              </li>
              <li>
                <a className="hover:text-[#0ea5e9]" href="#cta-heading">
                  Mulai
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Ikuti Kami</h3>
            <p className="text-sm text-[#6b7280]">
              Instagram · Twitter · Facebook
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

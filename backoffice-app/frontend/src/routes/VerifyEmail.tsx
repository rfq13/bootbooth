import { useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { apiVerifyEmail } from "../utils/api";

export default function VerifyEmail() {
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      await apiVerifyEmail(token);
      setMsg("Email berhasil diverifikasi");
    } catch (err: any) {
      setError(err?.message || "Verifikasi gagal");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={onSubmit as any}>
      <Card className="p-0 overflow-hidden shadow-[0_20px_40px_rgba(155,122,91,0.15)] bg-white">
        <div className="grid md:grid-cols-2">
          <div className="p-6">
            <div className="flex justify-center mb-6">
              <a
                href="/"
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-2xl hover:scale-105 transition-transform duration-200"
                title="Kembali ke Beranda"
              >
                <img src="/icon.png" alt="BootBooth" className="w-10 h-10" />
              </a>
            </div>
            <h3 className="text-2xl font-semibold mb-1 text-[#1a1917]">
              Verifikasi Email
            </h3>
            <p className="text-sm text-[#9c8f78] mb-6">
              Masukkan token verifikasi yang telah kami kirim ke email Anda
            </p>
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#6d6354]">
                  Token Verifikasi
                </span>
                <Input
                  aria-label="Token"
                  value={token}
                  onChange={(e) =>
                    setToken((e.target as HTMLInputElement).value)
                  }
                  className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1] focus:ring-2 focus:ring-[#D6BFA1]/20 transition-all"
                  placeholder="Tempel token verifikasi dari email"
                />
              </label>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <span className="text-[#ef4444] text-sm" role="alert">
                    {error}
                  </span>
                </div>
              )}
              {msg && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <span className="text-[#16a34a] text-sm" role="status">
                    {msg}
                  </span>
                </div>
              )}
              <Button
                aria-busy={loading}
                disabled={loading}
                className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all duration-200 h-11 font-medium"
              >
                {loading ? "Memuat..." : "Verifikasi Email"}
              </Button>
              <div className="text-center text-sm pt-2">
                <a
                  className="text-[#9B7A5B] hover:text-[#C5A888] transition-colors font-medium"
                  href="/login"
                >
                  ← Kembali ke Login
                </a>
              </div>
            </div>
          </div>
          <div className="hidden md:block bg-gradient-to-br from-[#FDF8F3] to-[#FAF1E7] p-6">
            <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#C5A888] to-[#9B7A5B] rounded-2xl flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-[#1a1917] mb-2">
                Verifikasi Email
              </h4>
              <p className="text-sm text-[#9c8f78] mb-4">
                Langkah terakhir untuk mengamankan akun Anda dan mengakses semua
                fitur
              </p>
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Keamanan akun terjamin
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Akses penuh ke dashboard
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Siap mengelola booth
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </form>
  );
}

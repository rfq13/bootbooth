import { useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { apiForgotPassword } from "../utils/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      await apiForgotPassword(email);
      setMsg("Link reset telah dikirim jika email terdaftar");
    } catch (err: any) {
      setError(err?.message || "Permintaan gagal");
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
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#f1d6ba] to-[#f5f2ee] rounded-2xl hover:scale-105 transition-transform duration-200"
                title="Kembali ke Beranda"
              >
                <img src="/icon.png" alt="BootBooth" className="w-10 h-10" />
              </a>
            </div>
            <h3 className="text-2xl font-semibold mb-1 text-[#1a1917]">
              Lupa Password
            </h3>
            <p className="text-sm text-[#9c8f78] mb-6">
              Masukkan email Anda dan kami akan mengirimkan link reset password
            </p>
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#6d6354]">
                  Email
                </span>
                <Input
                  aria-label="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail((e.target as HTMLInputElement).value)
                  }
                  className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1] focus:ring-2 focus:ring-[#D6BFA1]/20 transition-all"
                  placeholder="Masukkan email terdaftar"
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
                {loading ? "Memuat..." : "Kirim Link Reset"}
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-[#1a1917] mb-2">
                Reset Password
              </h4>
              <p className="text-sm text-[#9c8f78] mb-4">
                Jangan khawatir, kami akan membantu Anda mengakses kembali akun
                Anda
              </p>
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Link reset akan dikirim ke email
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Link berlaku selama 30 menit
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Periksa folder spam jika tidak diterima
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </form>
  );
}

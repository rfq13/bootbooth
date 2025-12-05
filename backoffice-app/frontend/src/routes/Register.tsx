import { useMemo, useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { apiRegister, getActiveTerms } from "../utils/api";

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [termsVersion, setTermsVersion] = useState<string>("");
  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );
  const passwordValid = useMemo(
    () => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password),
    [password]
  );
  useEffect(() => {
    getActiveTerms()
      .then((t) => setTermsVersion(t?.version_code || ""))
      .catch(() => {});
  }, []);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      setError("Email tidak valid");
      return;
    }
    if (!passwordValid) {
      setError("Password minimal 8 karakter, kombinasi huruf & angka");
      return;
    }
    if (!agree) {
      setError("Anda harus menyetujui Syarat & Ketentuan");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRegister(email, password);
      nav("/verify-email");
    } catch (err: any) {
      setError(err?.message || "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  }
  async function onSocial(provider: "google" | "apple" | "facebook") {
    setLoading(true);
    setError(null);
    try {
      await apiRegister(`user.${provider}@bootbooth.local`, "Social1234");
      nav("/verify-email");
    } catch (err: any) {
      setError(err?.message || "Registrasi sosial gagal");
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
              Buat Akun
            </h3>
            <p className="text-sm text-[#9c8f78] mb-6">
              Mulai perjalanan Anda dengan uji coba gratis 30 hari
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
                  placeholder="Masukkan email Anda"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#6d6354]">
                  Password
                </span>
                <Input
                  aria-label="Password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword((e.target as HTMLInputElement).value)
                  }
                  className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1] focus:ring-2 focus:ring-[#D6BFA1]/20 transition-all"
                  placeholder="Buat password yang kuat"
                />
              </label>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <span className="text-[#ef4444] text-sm" role="alert">
                    {error}
                  </span>
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) =>
                    setAgree((e.target as HTMLInputElement).checked)
                  }
                />
                <span className="text-[#6d6354]">
                  Saya menyetujui{" "}
                  <a
                    className="text-[#9B7A5B] hover:text-[#C5A888]"
                    href="/syarat-dan-ketentuan"
                    target="_blank"
                  >
                    Syarat & Ketentuan
                  </a>
                  {termsVersion ? ` (versi ${termsVersion})` : ""}
                </span>
              </label>
              <Button
                aria-busy={loading}
                disabled={loading || !agree}
                className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(155,122,91,0.3)] transition-all duration-200 h-11 font-medium"
              >
                {loading ? "Memuat..." : "Buat Akun"}
              </Button>
              <div className="text-center text-sm pt-2">
                <span className="text-[#6d6354]">Sudah punya akun? </span>
                <a
                  className="text-[#9B7A5B] hover:text-[#C5A888] transition-colors font-medium"
                  href="/login"
                >
                  Masuk
                </a>
              </div>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#EAD0B3]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#9c8f78]">
                    Atau daftar dengan
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  onClick={() => onSocial("google")}
                  className="bg-white text-[#1a1917] border-2 border-[#EAD0B3] hover:bg-[#FAF1E7] hover:border-[#D6BFA1] transition-all duration-200 h-12 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </Button>
                <Button
                  type="button"
                  onClick={() => onSocial("apple")}
                  className="bg-white text-[#1a1917] border-2 border-[#EAD0B3] hover:bg-[#FAF1E7] hover:border-[#D6BFA1] transition-all duration-200 h-12 flex items-center justify-center"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </Button>
                <Button
                  type="button"
                  onClick={() => onSocial("facebook")}
                  className="bg-white text-[#1a1917] border-2 border-[#EAD0B3] hover:bg-[#FAF1E7] hover:border-[#D6BFA1] transition-all duration-200 h-12 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </Button>
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
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-[#1a1917] mb-2">
                Bergabung Sekarang
              </h4>
              <p className="text-sm text-[#9c8f78] mb-4">
                Dapatkan akses penuh ke semua fitur dashboard untuk mengelola
                booth photo Anda
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
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Uji coba gratis 30 hari
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Tidak perlu kartu kredit
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6d6354]">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Setup dalam 5 menit
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </form>
  );
}

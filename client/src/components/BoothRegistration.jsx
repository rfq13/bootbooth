import { useEffect, useState } from "preact/hooks";
import { API_URL } from "../constants";

export default function BoothRegistration({ onRegistered }) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude || 0);
        setLng(pos.coords.longitude || 0);
      },
      () => {}
    );
    return () => { try { navigator.geolocation.clearWatch(id); } catch (_) {} };
  }, []);

  const sanitize = (s) => s.replace(/[^a-zA-Z0-9 \-_.]/g, "").trim();

  const postWithTimeout = async (url, body, timeoutMs, retries) => {
    for (let i = 0; i < retries; i++) {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: c.signal,
        });
        clearTimeout(t);
        if (!res.ok) throw new Error("bad_status");
        const data = await res.json();
        return data;
      } catch (e) {
        clearTimeout(t);
        if (i === retries - 1) throw e;
      }
    }
    throw new Error("failed");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const n = sanitize(name);
    if (n.length < 3 || n.length > 50) { setError("Nama tidak valid"); return; }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { setError("Lokasi tidak valid"); return; }
    setLoading(true);
    try {
      const reg = await postWithTimeout("http://localhost:3002/api/booth/register", { booth_name: n, location: { lat, lng } }, 10000, 3);
      if (!reg.success) { setError(reg.error || "Registrasi gagal"); setLoading(false); return; }
      const identity = reg.data;
      const fw = await postWithTimeout(`${API_URL}/api/identity`, { booth_name: identity.booth_name, location: identity.location, encrypted_data: identity.encrypted_data || "" }, 10000, 3);
      if (!fw.success) { setError("Gagal menyimpan identity"); setLoading(false); return; }
      onRegistered(identity);
    } catch (err) {
      setError("Gagal koneksi API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">Registrasi Booth</h2>
        <label className="block text-sm">Nama Booth</label>
        <input className="w-full border rounded px-3 py-2" value={name} onInput={(e) => setName(e.target.value)} placeholder="Nama" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Latitude</label>
            <input className="w-full border rounded px-3 py-2" type="number" step="0.000001" value={lat} onInput={(e) => setLat(parseFloat(e.target.value || "0"))} />
          </div>
          <div>
            <label className="block text-sm">Longitude</label>
            <input className="w-full border rounded px-3 py-2" type="number" step="0.000001" value={lng} onInput={(e) => setLng(parseFloat(e.target.value || "0"))} />
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded px-4 py-2">{loading ? "Mendaftar..." : "Daftar"}</button>
      </form>
    </div>
  );
}
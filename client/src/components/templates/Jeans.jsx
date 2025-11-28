// Template: Jeans
// Tujuan: Layout 4R dengan tema kain jeans (denim) lengkap dengan tekstur, jahitan, dan placeholder konten.
// Catatan:
// - Ukuran 4R mengikuti pola komponen lain: 600x900px (rasio 2:3)
// - Menggunakan kombinasi CSS gradient untuk mensimulasikan tekstur denim yang realistis
// - Memakai slot foto seperti template lain (klik untuk memilih), tetap responsif dengan pembungkusan yang fleksibel

import denimTexture from "../../../assets/denim-texture.jpg";

export default function Jeans({ photos = [], domRef, onClickSlot }) {
  const slots = [0, 1, 2, 3];

  return (
    <div
      ref={domRef}
      className="relative w-[600px] h-[900px] overflow-hidden border border-blue-900/40 shadow-2xl"
      // Background denim: kombinasi variasi warna biru dan pola twill (45°) khas jeans
      style={{
        backgroundImage: `url(${denimTexture})`,
        backgroundRepeat: "repeat",
        backgroundSize: "500px 300px",
        boxShadow:
          "inset 0 0 60px rgba(0,0,0,0.35), inset 0 12px 32px rgba(255,255,255,0.06)",
      }}
    >
      {/* Overlay untuk variasi tone agar lebih natural */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.08) 100%)," +
            "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)," +
            "radial-gradient(circle at 75% 80%, rgba(255,255,255,0.04) 0%, transparent 45%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* Jahitan tepi: garis jahitan putus-putus di sekeliling layout */}
      <div
        className="pointer-events-none absolute inset-4"
        style={{
          border: "3px dashed rgba(240, 212, 165, 0.8)",
          boxShadow:
            "inset 0 0 6px rgba(0,0,0,0.25), 0 0 0 3px rgba(16,36,72,0.35)",
        }}
      />
      {/* Header label */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <div className="text-white/90 font-extrabold tracking-widest text-lg">
          JEANS
        </div>
        <div className="text-blue-200 text-xs italic">classic denim • 4R</div>
      </div>
      {/* Strip dekor benang (stitch line) horizontal */}
      <div
        className="absolute top-16 left-6 right-6 h-1"
        style={{
          background:
            "repeating-linear-gradient(90deg, rgba(240,212,165,0.9), rgba(240,212,165,0.9) 8px, transparent 8px, transparent 12px)",
          filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.3))",
        }}
      />
      {/* Grid slot foto: 4 slot konten utama dengan frame jeans + jahitan */}
      <div className="absolute inset-x-6 top-28 bottom-24 grid grid-cols-2 grid-rows-2 gap-6">
        {slots.map((i) => (
          <div
            key={i}
            onClick={() => onClickSlot && onClickSlot(i)}
            className="relative rounded-xl overflow-hidden cursor-pointer"
            // Frame jeans untuk setiap slot + jahitan keliling
            style={{
              backgroundImage: `url(${denimTexture})`,
              backgroundRepeat: "repeat",
              backgroundSize: "500px 300px",
              border: "3px dashed rgba(240, 212, 165, 0.9)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {photos[i] ? (
              <img
                src={photos[i]}
                alt={`Jeans-${i + 1}`}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              // Placeholder jelas untuk konten utama
              <div className="w-full h-full flex flex-col items-center justify-center text-blue-100 gap-1">
                <div className="text-sm">Klik untuk pilih foto</div>
                <div className="text-[10px] opacity-80">
                  Jeans slot #{i + 1}
                </div>
              </div>
            )}
            {/* Label sudut kecil */}
            <div className="absolute bottom-1 right-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded">
              {i + 1}
            </div>
          </div>
        ))}
      </div>
      {/* Footer badge */}
      <div className="absolute bottom-8 left-6 right-6 flex items-center justify-between">
        <div className="text-blue-200 text-xs">denim • twill • stitch</div>
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            color: "#e6cfa4",
            background: "rgba(16,36,72,0.35)",
            border: "1px solid rgba(230,207,164,0.6)",
            boxShadow: "inset 0 0 6px rgba(0,0,0,0.2)",
          }}
        >
          4R • 600×900
        </div>
      </div>
    </div>
  );
}

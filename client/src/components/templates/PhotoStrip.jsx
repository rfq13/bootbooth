// PhotoStrip layout (BYD style) – menerima daftar URL foto
// Tidak menggunakan React hooks; kompatibel dengan Preact

const defaultIdolPhotoUrl = "https://picsum.photos/seed/kpop/200/300";

export default function PhotoStrip({
  photos = [
    "https://picsum.photos/seed/photo1/300/400",
    "https://picsum.photos/seed/photo2/300/400",
    "https://picsum.photos/seed/photo3/300/400",
  ],
  domRef,
  stripId = 1,
  isReversed = false,
  idolPhotoUrl = defaultIdolPhotoUrl,
  onClickSlot,
}) {
  const ordered = isReversed ? [...photos].reverse() : photos;

  return (
    <div
      id={`photo-strip-${stripId}`}
      ref={domRef}
      className="flex flex-col w-[300px] h-[900px] bg-white border border-gray-100 shadow-md overflow-hidden relative"
      style={{ boxSizing: "content-box", fontFamily: "'Times New Roman', serif" }}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start px-4 pt-4 text-xs tracking-widest text-gray-700">
        <div className="flex flex-col items-center relative">
          <span className="text-lg font-bold">07.05</span>
          <span className="absolute top-0 right-0 p-1 text-red-500 text-lg">
            <span className="absolute -top-1 -left-1 text-xs">❤️</span>
            <span className="absolute -top-2 left-2 text-sm">💕</span>
          </span>
          <span className="text-gray-400 italic text-xxs mt-1">ALL THE BEST FOR YOU</span>
        </div>
        <div className="text-center">
          <span className="font-bold text-sm">Born to Love</span>
          <div className="text-xs text-gray-500">(BYD)</div>
        </div>
      </div>

      {/* MAIN PHOTOS */}
      <div className="flex flex-col flex-grow p-1.5 space-y-1.5">
        {ordered.slice(0, 3).map((url, index) => (
          <div key={index} className="flex-grow bg-gray-100 border-2 border-dashed border-gray-300 relative overflow-hidden" onClick={() => onClickSlot && onClickSlot(index)}>
            <div className={`absolute text-gray-300 text-lg ${index === 0 ? "top-1 right-1" : "bottom-1 left-1"}`}>
              <span className="text-2xl opacity-70">✶</span>
            </div>
            {index === 1 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300 opacity-30">BYD</div>
            )}
            {url ? (
              <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-secondary-500 text-sm">Klik untuk pilih foto</div>
            )}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="flex flex-col p-4 pt-2 text-center">
        <div className="mb-3">
          <p className="text-2xl font-extrabold tracking-tight" style={{ lineHeight: 1.1 }}>Happy (YEDAM) Day.</p>
          <p className="text-xs text-gray-500 italic mt-0.5">Happy birthday wishing</p>
        </div>
        <div className="flex justify-between text-xs text-gray-500 italic mb-2">
          <span>Hey! {`I Love You`}</span>
          <span>02</span>
        </div>
        <div className="flex justify-center items-end">
          <div className="w-1/2 h-auto overflow-hidden rounded-sm relative">
            <div className="absolute top-0 left-0 w-full flex justify-between px-2 text-xs text-gray-700 font-semibold mb-1">
              <span>2023 Birthday</span>
              <span className="italic">Bang Yedam</span>
            </div>
            <img src={idolPhotoUrl} alt="Idol" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* DECORATIONS */}
      <div className="absolute top-[250px] left-2 text-4xl rotate-3">🦢</div>
      <div className="absolute top-[265px] right-2 bg-white px-3 py-1 text-sm font-bold rounded-full border border-gray-300 shadow-sm text-gray-700">BYD</div>
      <div className="absolute top-[565px] left-2 bg-white px-3 py-1 text-sm font-bold rounded-full border border-gray-300 shadow-sm text-gray-700">Yedam</div>
      <div className="absolute top-[580px] right-1 text-red-500 text-xl">
        <span className="absolute -top-3 left-0">❤️</span>
        <span className="absolute top-0 right-1 text-sm">💕</span>
      </div>
    </div>
  );
}
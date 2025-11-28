export default function DoublePhotoStrip({ photos = [], domRef, onClickSlot }) {
  const left = photos.slice(0, 3);
  const right = photos.slice(3, 6);
  return (
    <div
      ref={domRef}
      className="flex w-[600px] h-[900px] bg-white p-3 gap-3 border border-primary-200 rounded-3xl"
    >
      <div
        className="flex flex-col flex-1 rounded-2xl overflow-hidden relative"
        style={{
          background:
            "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15) 0%, transparent 50%), repeating-linear-gradient(45deg, rgba(124,58,237,0.55), rgba(124,58,237,0.55) 10px, rgba(147,51,234,0.55) 10px, rgba(147,51,234,0.55) 20px)",
          boxShadow: "inset 0 0 20px rgba(0,0,0,0.15)",
        }}
      >
        <div className="absolute inset-x-2 top-2 h-4 bg-white/20 rounded-full" />
        <div className="absolute inset-x-2 bottom-2 h-4 bg-white/20 rounded-full" />
        <div className="absolute top-6 right-3 text-2xl">⭐</div>
        <div className="absolute top-20 left-3 text-2xl">✨</div>
        <div className="absolute bottom-24 right-5 text-2xl">⭐</div>
        <div className="flex flex-col flex-1 p-3 gap-3">
          {left.map((url, i) => (
            <div
              key={i}
              onClick={() => onClickSlot && onClickSlot(i)}
              className="flex-1 bg-white rounded-2xl border-4 border-purple-700/50 shadow-xl overflow-hidden relative cursor-pointer"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
            >
              {url ? (
                <img
                  src={url}
                  alt={`L${i + 1}`}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-secondary-700">
                  Klik untuk pilih foto
                </div>
              )}
              <div className="absolute bottom-1 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 text-center font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-red-500 to-blue-500">
          TOY STORY
        </div>
      </div>
      <div
        className="flex flex-col flex-1 rounded-2xl overflow-hidden relative"
        style={{
          background:
            "repeating-linear-gradient(0deg, #fbbf24, #fbbf24 24px, #f59e0b 24px, #f59e0b 25px), repeating-linear-gradient(90deg, #fbbf24, #fbbf24 24px, #f59e0b 24px, #f59e0b 25px)",
        }}
      >
        <div className="absolute inset-x-2 top-2 h-4 bg-white/20 rounded-full" />
        <div className="absolute inset-x-2 bottom-2 h-4 bg-white/20 rounded-full" />
        <div className="absolute top-8 left-3 text-xl">🤠</div>
        <div className="absolute top-24 right-5 text-xl">🚀</div>
        <div className="absolute bottom-24 left-6 text-xl">🧸</div>
        <div className="flex flex-col flex-1 p-3 gap-3">
          {right.map((url, i) => (
            <div
              key={i}
              onClick={() => onClickSlot && onClickSlot(3 + i)}
              className="flex-1 bg-white rounded-2xl border-4 border-amber-600/60 shadow-xl overflow-hidden relative cursor-pointer"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
            >
              {url ? (
                <img
                  src={url}
                  alt={`R${i + 1}`}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-secondary-700">
                  Klik untuk pilih foto
                </div>
              )}
              <div className="absolute bottom-1 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 text-center font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-red-500 to-yellow-300">
          TOY STORY
        </div>
      </div>
    </div>
  );
}

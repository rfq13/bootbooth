export default function Instagram4R({ photos = [], domRef, onClickSlot }) {
  const slots = Array.from({ length: 6 }, (_, i) => i)
  return (
    <div ref={domRef} className="relative w-[600px] h-[900px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-400 text-white">
        <div className="font-bold tracking-tight">Instagram</div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white/30" />
          <div className="w-6 h-6 rounded-full bg-white/30" />
          <div className="w-8 h-8 rounded-full bg-white/40" />
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                <div className="w-full h-full rounded-full bg-white" />
              </div>
              <div className="text-[10px] text-gray-600">Story {i + 1}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          {slots.map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="relative w-full h-36 bg-gray-100 cursor-pointer"
                onClick={() => onClickSlot && onClickSlot(i)}
              >
                {photos[i] ? (
                  <img src={photos[i]} alt={`post-${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-500 text-sm">Klik untuk pilih foto</div>
                )}
              </div>
              <div className="flex items-center gap-4 px-3 py-2 text-xl">
                <span>❤</span>
                <span>💬</span>
                <span>✈️</span>
              </div>
              <div className="px-3 pb-3 text-xs text-gray-600">Liked by you and others • View comments</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-14 border-t border-gray-200 bg-white">
        <div className="h-full flex items-center justify-around text-2xl">
          <span>🏠</span>
          <span>🔍</span>
          <span>🎞️</span>
          <span>❤️</span>
          <span className="w-7 h-7 rounded-full bg-gray-300 inline-block" />
        </div>
      </div>
    </div>
  )
}
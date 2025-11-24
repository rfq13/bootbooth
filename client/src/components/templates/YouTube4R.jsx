export default function YouTube4R({ photos = [], domRef, onClickSlot }) {
  const slots = Array.from({ length: 6 }, (_, i) => i)
  return (
    <div
      ref={domRef}
      className="relative w-[600px] h-[900px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center gap-4 px-4 h-14 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-9 h-6 bg-red-600 rounded-sm relative">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-6 border-y-transparent border-l-8 border-l-white"></div>
          </div>
          <div className="font-semibold tracking-tight">YouTube</div>
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[340px] h-10 border border-gray-300 rounded-l-full px-4 text-sm text-gray-500 bg-gray-50">Search</div>
          <div className="h-10 w-12 border border-l-0 border-gray-300 rounded-r-full grid place-items-center bg-gray-100">🔍</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <div className="w-8 h-8 rounded-full bg-gray-300" />
        </div>
      </div>

      <div className="flex h-[calc(900px-56px)]">
        <div className="w-20 border-r border-gray-200 py-4 space-y-5 grid place-items-center">
          <div className="text-xs text-gray-600">🏠</div>
          <div className="text-xs text-gray-600">🔥</div>
          <div className="text-xs text-gray-600">🎵</div>
          <div className="text-xs text-gray-600">🎮</div>
          <div className="text-xs text-gray-600">📰</div>
        </div>
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4">
            {slots.map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div
                  onClick={() => onClickSlot && onClickSlot(i)}
                  className="relative w-full h-32 bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
                >
                  {photos[i] ? (
                    <img src={photos[i]} alt={`video-${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-gray-500 text-sm">Klik untuk pilih foto</div>
                  )}
                  <div className="absolute bottom-1 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">12:34</div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-300" />
                  <div className="flex-1">
                    <div className="text-sm font-medium leading-tight line-clamp-2">Judul Video Placeholder #{i + 1}</div>
                    <div className="text-xs text-gray-500">Channel • 1.2M views • 2 days ago</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
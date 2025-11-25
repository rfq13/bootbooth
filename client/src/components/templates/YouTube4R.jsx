import { useState, useRef, useEffect } from "react";

// Komponen Ikon untuk konsistensi visual
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-6 h-6 text-gray-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const ShortsIcon = () => (
  <svg
    className="size-6"
    version="1.1"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    x="0px"
    y="0px"
    viewBox="0 0 98.94 122.88"
    style={{ enableBackground: "new 0 0 98.94 122.88" }}
    xmlSpace="preserve"
  >
    <g>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M63.49,2.71c11.59-6.04,25.94-1.64,32.04,9.83c6.1,11.47,1.65,25.66-9.94,31.7l-9.53,5.01 
      c8.21,0.3,16.04,4.81,20.14,12.52c6.1,11.47,1.66,25.66-9.94,31.7l-50.82,26.7c-11.59,6.04-25.94,1.64-32.04-9.83 
      c-6.1-11.47-1.65-25.66,9.94-31.7l9.53-5.01c-8.21-0.3-16.04-4.81-20.14-12.52c-6.1-11.47-1.65-25.66,9.94-31.7L63.49,2.71 
      L63.49,2.71z M36.06,42.53l30.76,18.99l-30.76,18.9V42.53L36.06,42.53z"
      />
    </g>
  </svg>
);

const SubscriptionsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M20 8H4V6h16v2zm-2-6H6v2h12V2zm4 10v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-6 4l-6-3.27v6.53L16 16z" />
  </svg>
);

const YouIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const YouTubeLogo = () => (
  <div className="flex items-center gap-1">
    <div className="w-8 h-6 bg-red-600 rounded-lg flex items-center justify-center">
      <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-white" />
    </div>
    <div className="font-semibold tracking-tighter text-xl">YouTube</div>
  </div>
);

/**
 * Komponen YouTube4R
 * @param {object} props
 * @param {string[]} props.photos - Array URL gambar untuk thumbnail video
 * @param {React.Ref} props.domRef - Ref untuk elemen DOM utama
 * @param {function} props.onClickSlot - Fungsi yang dipanggil saat slot thumbnail diklik
 * @param {function} props.showVirtualKeyboard - Fungsi untuk menampilkan keyboard virtual
 * @param {function} props.hideVirtualKeyboard - Fungsi untuk menyembunyikan keyboard virtual
 * @param {number} props.currentEditingIndex - Index yang sedang diedit
 */
export default function YouTube4R({
  photos = [],
  domRef,
  onClickSlot,
  showVirtualKeyboard,
  hideVirtualKeyboard,
  currentEditingIndex,
}) {
  // State untuk menyimpan judul video yang dapat diedit
  const [videoTitles, setVideoTitles] = useState(
    Array.from(
      { length: 6 },
      (_, i) => `Video Title Placeholder That Can Be Two Lines Long #${i + 1}`
    )
  );

  // State untuk melacak judul mana yang sedang diedit
  const [editingIndex, setEditingIndex] = useState(null);
  const inputRefs = useRef([]);

  // Fungsi untuk menangani perubahan judul video
  const handleTitleChange = (index, newTitle) => {
    const updatedTitles = [...videoTitles];
    updatedTitles[index] = newTitle;
    setVideoTitles(updatedTitles);
  };

  // Fungsi untuk memulai mode edit
  const startEditing = (index) => {
    setEditingIndex(index);
    // Tampilkan keyboard virtual dengan nilai saat ini
    showVirtualKeyboard(
      videoTitles[index],
      (newTitle) => {
        handleTitleChange(index, newTitle);
      },
      index
    );

    // Focus ke input setelah keyboard muncul tanpa auto-select
    setTimeout(() => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].focus();
        // Set cursor ke akhir text, bukan select all
        const length = inputRefs.current[index].value.length;
        inputRefs.current[index].setSelectionRange(length, length);
      }
    }, 150);
  };

  // Fungsi untuk mengakhiri mode edit
  const stopEditing = () => {
    setEditingIndex(null);
  };

  // Handle input events untuk mencegah keyboard hilang saat user berinteraksi
  const handleInputFocus = (index) => {
    if (editingIndex !== index) {
      startEditing(index);
    }
  };

  const handleInputBlur = (e) => {
    // Jangan sembunyikan keyboard jika user masih berinteraksi dengan keyboard virtual
    // Delay sedikit untuk memastikan ini bukan karena klik tombol keyboard
    setTimeout(() => {
      if (currentEditingIndex === editingIndex) {
        // Jangan sembunyikan keyboard jika masih dalam mode editing yang sama
        return;
      }
      stopEditing();
    }, 200);
  };

  const handleInputChange = (index, e) => {
    const newTitle = e.target.value;
    handleTitleChange(index, newTitle);

    // Update keyboard input hanya jika ini adalah field yang sedang aktif
    if (editingIndex === index && showVirtualKeyboard) {
      showVirtualKeyboard(
        newTitle,
        (updatedTitle) => {
          handleTitleChange(index, updatedTitle);
        },
        index
      );
    }
  };

  const handleInputClick = (e, index) => {
    e.stopPropagation();
    if (editingIndex !== index) {
      startEditing(index);
    }
  };

  // Sync editing state dengan currentEditingIndex dari parent
  useEffect(() => {
    if (currentEditingIndex !== editingIndex && currentEditingIndex !== null) {
      setEditingIndex(currentEditingIndex);
      // Focus ke input yang baru dan set cursor ke akhir
      setTimeout(() => {
        if (inputRefs.current[currentEditingIndex]) {
          inputRefs.current[currentEditingIndex].focus();
          const length = inputRefs.current[currentEditingIndex].value.length;
          inputRefs.current[currentEditingIndex].setSelectionRange(
            length,
            length
          );
        }
      }, 100);
    } else if (currentEditingIndex === null && editingIndex !== null) {
      setEditingIndex(null);
    }
  }, [currentEditingIndex, editingIndex]);

  // Menyiapkan 6 slot untuk thumbnail video
  const slots = Array.from({ length: 6 }, (_, i) => i);

  // Daftar item untuk sidebar
  const sidebarItems = [
    { icon: <HomeIcon />, label: "Home" },
    { icon: <ShortsIcon />, label: "Shorts" },
    { icon: <SubscriptionsIcon />, label: "Subscriptions" },
    { icon: <YouIcon />, label: "You" },
  ];

  return (
    <div
      ref={domRef}
      className="relative w-[600px] h-[900px] bg-[#0f0f0f] text-white border border-gray-700 rounded-2xl shadow-2xl overflow-hidden font-sans"
    >
      {/* Header: Logo, Search Bar, dan Ikon Profil */}
      <div className="flex items-center justify-between gap-4 px-4 h-14 border-b border-gray-700">
        <YouTubeLogo />
        <div className="flex-1 flex items-center justify-center max-w-[400px]">
          <input
            type="text"
            placeholder="Search"
            className="w-full max-w-[340px] h-10 border border-gray-600 rounded-l-full px-4 text-base bg-[#121212] placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button className="h-10 w-16 border-y border-r border-gray-600 rounded-r-full grid place-items-center bg-[#222222] hover:bg-gray-600">
            <SearchIcon />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-gray-700 grid place-items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-300" />
        </div>
      </div>

      <div className="flex h-[calc(900px-56px)]">
        {/* Sidebar: Navigasi Utama */}
        <div className="w-24 border-r border-gray-700 py-2 flex flex-col items-center gap-2">
          {sidebarItems.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center w-full py-3 rounded-lg hover:bg-[#272727] cursor-pointer"
            >
              {item.icon}
              <span className="text-[10px] mt-1.5">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Konten Utama: Grid Video */}
        <div className="flex-1 p-4 bg-[#0f0f0f] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {slots.map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div
                  onClick={() => onClickSlot && onClickSlot(i)}
                  className="relative w-full aspect-video bg-[#272727] rounded-lg overflow-hidden cursor-pointer group"
                >
                  {photos[i] ? (
                    <img
                      src={photos[i]}
                      alt={`video-${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-gray-400 text-sm">
                      Click to select photo
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 text-xs bg-black/80 text-white px-1 py-0.5 rounded">
                    12:34
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-500 mt-0.5" />
                  <div className="flex-1">
                    {editingIndex === i ? (
                      <input
                        ref={(el) => (inputRefs.current[i] = el)}
                        type="text"
                        data-index={i}
                        value={videoTitles[i]}
                        onChange={(e) => handleInputChange(i, e)}
                        onFocus={() => handleInputFocus(i)}
                        onBlur={handleInputBlur}
                        onClick={(e) => handleInputClick(e, i)}
                        className="text-sm font-medium leading-snug bg-transparent border-b border-blue-500 outline-none w-full"
                        style={{ userSelect: "text" }}
                      />
                    ) : (
                      <div
                        className="text-sm font-medium leading-snug line-clamp-2 cursor-text hover:bg-gray-800 px-1 py-0.5 rounded"
                        onClick={() => startEditing(i)}
                        style={{ userSelect: "text" }}
                      >
                        {videoTitles[i]}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Channel Name
                      <div className="flex items-center">
                        <span>1.2M views</span>
                        <span className="mx-1">•</span>
                        <span>2 days ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

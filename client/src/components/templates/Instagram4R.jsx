import { useState, useRef, useEffect } from "react";

// Generator caption puitis, unik, dan lucu
const generateCaption = () => {
  const poeticCaptions = [
    "Ada momen yang cuma datang sekali… dan ini salah satunya 🌸",
    "Bahagia itu sesederhana senyum yang terekam di foto ini 😊",
    "Hidup terdiri dari potongan-potongan indah seperti ini ✨",
    "Detik ini kayak puisi tanpa kata, tapi langsung ngerti 📸",
    "Senyum hari ini bakal jadi kenangan yang hangat besok 🌟",
    "Setiap foto punya cerita — dan ini salah satu favoritku 📖",
    "Keindahan kadang ada di momen kecil yang sering kita lewatkan 🌺",
    "Hari ini adalah hadiah — makanya disebut ‘present’ 🎁",
    "Kita menulis cerita lewat senyuman, bukan tulisan 😄",
    "Momen kayak gini lebih mahal dari emas 💎",
    "Hidup terlalu singkat buat nggak menikmati detik ini 🎪",
    "Kita nyuri waktu sedikit… buat bikin kenangan ⏰",
    "Ini bukan cuma foto — ini sepotong kebahagiaan 🍰",
    "Senyuman tuh bahasa universal, dan hari ini kita lancar banget 🌍",
    "Momen kayak gini bikin kita percaya keajaiban itu nyata ✨",
    "Kita ngumpulin kenangan kayak anak kecil ngumpulin bunga 🌻",
    "Hidup itu perjalanan — dan ini salah satu pemberhentian yang indah 🚂",
    "Kayaknya bahagia tuh cocok banget ya sama kita? 😎",
    "Kita bikin memoar, satu foto setiap kali 📚",
    "Momen ini kayak pelangi di hari yang biasa aja 🌈",
    "Hari ini kita nggak cuma hidup — kita bener-bener hadir 🌟",
  ];

  const funnyCaptions = [
    "Niatnya mau foto serius… hasilnya? Ya gini 😂",
    "Skill kami: jago banget ngapa-ngapain tapi juga nggak ngapa-ngapain 🎭",
    "Kami dewasa… tapi cuma di KTP 👶",
    "Ini adalah wajah ‘sebenernya kita nggak ngerti kita ngapain’ 🤷‍♀️",
    "Hidup cuma modal kopi dan tekad yang rapuh ☕",
    "Bukan aneh, cuma limited edition 🏆",
    "Mode default manusia: bingung tapi semangat 🤪",
    "Tipe kami: kalau bisa sekarang, kenapa nanti? ⏳",
    "Gelar master? Iya, dalam hal menunda-nunda 🎓",
    "Kami dewasa hanya kalau terpaksa 🧐",
    "Ekspresi ini: lagi mikirin makanan 🍕",
    "Tidak sempurna, tapi edisi terbatas 💎",
    "Mau serius, tapi tiba-tiba inget hal lucu 😄",
    "Kami punya PhD dalam ‘rebahan produktif’ 📜",
    "Bukan aneh — cuma terlalu heboh buat standar manusia 🎉",
  ];

  const memorableCaptions = [
    "Hari ini baik banget sama kami 🌟",
    "Momen kayak gini bikin hidup terasa layak dijalani ✨",
    "Kenangan yang bakal kita ceritain ke anak cucu nanti 👶",
    "Hari ketika semuanya pas di tempatnya 🧩",
    "Momen yang ngingetin kita kenapa kita tetap jalan 💪",
    "Salah satu hari yang bakal nempel selamanya 📅",
    "Detik-detil yang bikin semua perjuangan terasa worth it 🏆",
    "Hari ketika hidup terasa penuh warna 🌈",
    "Kenangan yang bakal ngahangatin hati kita nanti 🔥",
    "Momen yang meredefinisi arti bahagia buat kita 😊",
    "Hari yang diam-diam ngubah banyak hal 🔄",
    "Foto yang bakal kita simpen sampai lama 📸",
    "Hari ketika kita nemu lagi diri kita sendiri 🧭",
    "Kenangan yang bakal bikin kita senyum bertahun-tahun ke depan 😄",
    "Momen yang rasanya pengen di-pause selamanya ⏰",
  ];

  const allCaptions = [
    ...poeticCaptions,
    ...funnyCaptions,
    ...memorableCaptions,
  ];
  return allCaptions[Math.floor(Math.random() * allCaptions.length)];
};

/**
 * Komponen Instagram4R
 * @param {object} props
 * @param {string[]} props.photos - Array URL gambar untuk post Instagram
 * @param {React.Ref} props.domRef - Ref untuk elemen DOM utama
 * @param {function} props.onClickSlot - Fungsi yang dipanggil saat slot gambar diklik
 * @param {function} props.showVirtualKeyboard - Fungsi untuk menampilkan keyboard virtual
 * @param {function} props.hideVirtualKeyboard - Fungsi untuk menyembunyikan keyboard virtual
 * @param {number} props.currentEditingIndex - Index yang sedang diedit
 */
export default function Instagram4R({
  photos = [],
  domRef,
  onClickSlot,
  showVirtualKeyboard,
  hideVirtualKeyboard,
  currentEditingIndex,
}) {
  const [captions, setCaptions] = useState(() =>
    Array.from({ length: 4 }, () => generateCaption())
  );
  const [editingIndex, setEditingIndex] = useState(null);
  const inputRefs = useRef([]);

  const slots = Array.from({ length: 4 }, (_, i) => i);

  // Handle caption change
  const handleCaptionChange = (index, value) => {
    const newCaptions = [...captions];
    newCaptions[index] = value;
    setCaptions(newCaptions);

    // Update keyboard input jika ini adalah field yang sedang aktif
    if (
      editingIndex === index &&
      window.keyboardMethods &&
      window.keyboardMethods.setCurrentInput
    ) {
      window.keyboardMethods.setCurrentInput(value);
    }
  };

  // Start editing caption
  const startEditing = (index) => {
    setEditingIndex(index);
    console.log(
      "Starting editing for index:",
      index,
      "with caption:",
      captions[index]
    );

    // Tampilkan keyboard virtual dengan nilai saat ini
    if (showVirtualKeyboard) {
      showVirtualKeyboard(
        captions[index],
        (newCaption) => {
          console.log(
            "Callback received new caption:",
            newCaption,
            "for index:",
            index
          );
          // Create a fake event object to unify the update logic
          const fakeEvent = { target: { value: newCaption } };
          handleInputChange(index, fakeEvent);
        },
        index
      );
    }

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

  // Stop editing
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
    const newCaption = e.target.value;
    console.log("handleInputChange (manual):", index, newCaption);
    handleCaptionChange(index, newCaption);
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

  // Debug: Monitor captions changes
  useEffect(() => {
    console.log("captions updated:", captions);
  }, [captions]);

  return (
    <div
      ref={domRef}
      className="relative w-[600px] h-[900px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
        {/* Logo */}
        <img src="/assets/logo-ig.png" alt="Instagram" className="w-22 h-10" />
        <div className="flex items-center gap-4">
          {/* Plus Icon */}
          <img
            src="/assets/instagram/Add.svg"
            alt="New post"
            className="w-6 h-6"
          />
          {/* Heart Icon */}
          <img
            src="/assets/instagram/Like.svg"
            alt="Heart"
            className="size-6"
          />
          {/* Messenger Icon */}
          <img
            src="/assets/instagram/Messenger.svg"
            alt="Messenger"
            className="size-6"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          {slots.map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col"
            >
              {/* Post Header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div className="font-semibold text-sm">username</div>
              </div>
              {/* Post Image */}
              <div
                className="relative w-full h-48 bg-gray-100 cursor-pointer"
                onClick={() => onClickSlot && onClickSlot(i)}
              >
                {photos[i] ? (
                  <img
                    src={photos[i]}
                    alt={`post-${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-500 text-sm">
                    Click to select a photo
                  </div>
                )}
              </div>
              {/* Post Actions */}
              <div className="flex items-center gap-4 px-3 py-2 text-2xl">
                {/* Like Icon */}
                <img
                  src="/assets/instagram/Like.svg"
                  alt="Like"
                  className="size-6"
                />
                {/* Comment Icon */}
                <img
                  src="/assets/instagram/Comment.svg"
                  alt="Comment"
                  className="size-6"
                />
                {/* Share Icon */}
                <img
                  src="/assets/instagram/Share.svg"
                  alt="Share"
                  className="size-6"
                />
                <div className="flex-grow"></div>
                {/* Save Icon */}
                <img
                  src="/assets/instagram/Bookmark.svg"
                  alt="Save"
                  className="size-6"
                />
              </div>
              <div className="px-3 pb-3 text-sm text-gray-800">
                <div className="font-semibold">1,234 likes</div>
                <div>
                  <span className="font-semibold">username</span>{" "}
                  {editingIndex === i ? (
                    <input
                      ref={(el) => (inputRefs.current[i] = el)}
                      type="text"
                      data-index={i}
                      value={captions[i]}
                      onChange={(e) => handleInputChange(i, e)}
                      onFocus={() => handleInputFocus(i)}
                      onBlur={handleInputBlur}
                      onClick={(e) => handleInputClick(e, i)}
                      className="inline-block bg-transparent border-b border-blue-500 outline-none text-sm w-full"
                      style={{ userSelect: "text" }}
                      placeholder="Ketik caption..."
                    />
                  ) : (
                    <span
                      onClick={() => startEditing(i)}
                      className="cursor-text hover:bg-gray-100 px-1 rounded"
                      style={{ userSelect: "text" }}
                    >
                      {captions[i] || "Klik untuk menambah caption..."}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-14 border-t border-gray-200 bg-white">
        <div className="h-full flex items-center justify-around text-2xl">
          {/* Home Icon */}
          <img
            src="/assets/instagram/Home.svg"
            alt="Home"
            className="cursor-pointer size-7"
          />
          {/* Search Icon */}
          <img
            src="/assets/instagram/Search.svg"
            alt="Search"
            className="cursor-pointer size-7"
          />
          {/* Reels Icon */}
          <img
            src="/assets/instagram/reels.svg"
            alt="Reels"
            className="cursor-pointer size-6"
          />
          {/* Plus Icon */}
          <img
            src="/assets/instagram/Add.svg"
            alt="Add"
            className="cursor-pointer size-7"
          />
          {/* Profile Icon */}
          <img
            src="/assets/instagram/User.svg"
            alt="Profile"
            className="cursor-pointer size-7"
          />
        </div>
      </div>
    </div>
  );
}

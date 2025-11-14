import { useEffect } from "preact/hooks";

export default function LayoutPicker({ selectedLayout, onPick, onShowLayoutPage }) {
  const layouts = [
    {
      id: "single_4R",
      name: "4R Penuh",
      desc: "Satu foto memenuhi kertas 4R",
    },
    {
      id: "two_2R",
      name: "2 x 2R",
      desc: "Dua foto ukuran 2R pada kertas 4R",
    },
    {
      id: "photostrip_spotify",
      name: "Photostrip Spotify",
      desc: "3 panel foto vertikal + bar musik",
    },
    {
      id: "spotify_card",
      name: "Spotify Player Card",
      desc: "Satu foto + bar pemutar musik",
    },
    {
      id: "photo_booth_ticket",
      name: "Photo Booth Ticket",
      desc: "Layout tiket bioskop dengan 3 foto",
      special: true,
    },
  ];

  useEffect(() => {
    // Auto-pick default if none
    if (!selectedLayout && onPick) onPick("single_4R");
  }, [selectedLayout]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {layouts.map((l) => (
        <button
          key={l.id}
          onClick={() => l.special ? (onShowLayoutPage && onShowLayoutPage()) : (onPick && onPick(l.id))}
          className={`text-left p-4 rounded-2xl border transition-all shadow-soft ${
            selectedLayout === l.id
              ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white border-primary-500"
              : "bg-primary-50 text-secondary-800 hover:bg-primary-100 border-primary-200"
          } ${l.special ? "bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300 hover:from-purple-200 hover:to-pink-200" : ""}`}
        >
          <div className="font-semibold mb-1">{l.name}</div>
          <div className="text-sm opacity-80">{l.desc}</div>
          {l.special && (
            <div className="mt-2 text-xs bg-purple-500 text-white px-2 py-1 rounded-full inline-block">
              Baru!
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
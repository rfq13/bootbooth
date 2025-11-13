import { useEffect } from "preact/hooks";

export default function LayoutPicker({ selectedLayout, onPick }) {
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
          onClick={() => onPick && onPick(l.id)}
          className={`text-left p-4 rounded-2xl border transition-all shadow-soft ${
            selectedLayout === l.id
              ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white border-primary-500"
              : "bg-primary-50 text-secondary-800 hover:bg-primary-100 border-primary-200"
          }`}
        >
          <div className="font-semibold mb-1">{l.name}</div>
          <div className="text-sm opacity-80">{l.desc}</div>
        </button>
      ))}
    </div>
  );
}
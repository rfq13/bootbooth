import { useRef } from "react";
import { toPng } from "html-to-image";
import { Download, Camera, Film, Sparkles, Star } from "lucide-react";

const PhotoBoothTicket = ({
  photos,
  eventName = "Movie",
  date = "Sunday, May 25th",
  time = "19:30",
  row = "01",
  seat = "23",
  qrCode,
  domRef, // optional: ref dari parent untuk proses cetak
  enableInternalExport = false, // default: sembunyikan tombol internal
}) => {
  const ticketRef = useRef(null);

  const exportToImage = async () => {
    if (!ticketRef.current) return;

    try {
      // Convert to PNG using html-to-image
      const dataUrl = await toPng(ticketRef.current, {
        quality: 0.95,
        backgroundColor: "#4a7ba7",
        pixelRatio: 3, // For high resolution output
      });

      // Create download link
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `photo-booth-${Date.now()}.png`;
      link.click();
    } catch (error) {
      console.error("Error exporting image:", error);
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-6 p-8 min-h-screen relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(280, 65%, 55%) 0%, hsl(210, 45%, 45%) 50%, hsl(340, 75%, 65%) 100%)",
      }}
    >
      {/* Animated floating decoration elements */}
      <Camera className="absolute top-20 left-10 w-16 h-16 text-booth-gold/40 rotate-12 animate-pulse drop-shadow-lg" />
      <Film className="absolute top-40 right-16 w-20 h-20 text-booth-pink/40 -rotate-12 animate-pulse" />
      <Sparkles className="absolute bottom-32 left-20 w-14 h-14 text-booth-orange/50 animate-pulse drop-shadow-lg" />
      <Star className="absolute top-60 left-1/4 w-12 h-12 text-booth-gold/40 rotate-45 animate-pulse" />
      <Camera className="absolute bottom-48 right-1/4 w-14 h-14 text-booth-purple/40 -rotate-45 animate-pulse" />
      <Film className="absolute top-1/3 left-12 w-16 h-16 text-booth-pink/30 rotate-6" />
      <Sparkles className="absolute top-1/4 right-20 w-10 h-10 text-booth-gold/50 -rotate-12 animate-pulse" />
      <Star className="absolute bottom-1/4 left-16 w-10 h-10 text-booth-orange/40 rotate-12 animate-pulse" />
      <Camera className="absolute top-1/2 right-12 w-12 h-12 text-booth-purple/30 rotate-45" />

      {/* Glowing orbs */}
      <div className="absolute top-10 right-1/3 w-32 h-32 bg-booth-gold/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-booth-pink/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 right-10 w-36 h-36 bg-booth-purple/20 rounded-full blur-3xl animate-pulse" />

      <div
        ref={domRef || ticketRef}
        className="relative z-10"
        style={{
          width: "600px",
          height: "900px",
        }}
      >
        {/* Decorative background with vibrant texture */}
        <div
          className="absolute inset-0 rounded-3xl shadow-2xl p-6 backdrop-blur-sm"
          style={{
            background:
              "linear-gradient(135deg, hsl(280, 65%, 45%) 0%, hsl(210, 50%, 40%) 50%, hsl(340, 75%, 50%) 100%)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.4), inset 0 2px 10px rgba(255,255,255,0.1)",
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(255, 105, 180, 0.15) 0%, transparent 50%),
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.05) 10px,
                rgba(255,255,255,0.05) 20px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 15px,
                rgba(255,215,0,0.03) 15px,
                rgba(255,215,0,0.03) 30px
              )
            `,
          }}
        >
          {/* Decorative corner elements with glow */}
          <div
            className="absolute top-2 left-2 w-10 h-10 border-l-4 border-t-4 border-booth-gold rounded-tl-xl drop-shadow-lg"
            style={{ filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))" }}
          />
          <div
            className="absolute top-2 right-2 w-10 h-10 border-r-4 border-t-4 border-booth-pink rounded-tr-xl drop-shadow-lg"
            style={{ filter: "drop-shadow(0 0 8px rgba(255, 105, 180, 0.5))" }}
          />
          <div
            className="absolute bottom-2 left-2 w-10 h-10 border-l-4 border-b-4 border-booth-orange rounded-bl-xl drop-shadow-lg"
            style={{ filter: "drop-shadow(0 0 8px rgba(255, 150, 0, 0.5))" }}
          />
          <div
            className="absolute bottom-2 right-2 w-10 h-10 border-r-4 border-b-4 border-booth-gold rounded-br-xl drop-shadow-lg"
            style={{ filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))" }}
          />

          {/* Enhanced film strip decoration on sides */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-6 flex flex-col justify-around bg-gradient-to-b from-booth-gold/30 to-booth-orange/30 rounded-r">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 bg-black/40 rounded-sm ml-1 border border-booth-gold/50"
              />
            ))}
          </div>
          <div className="absolute right-0 top-1/4 bottom-1/4 w-6 flex flex-col justify-around bg-gradient-to-b from-booth-pink/30 to-booth-purple/30 rounded-l">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 bg-black/40 rounded-sm mr-1 border border-booth-pink/50"
              />
            ))}
          </div>

          {/* Sparkle decorations */}
          <Star
            className="absolute top-8 left-1/4 w-5 h-5 text-booth-gold fill-booth-gold animate-pulse"
            style={{ filter: "drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))" }}
          />
          <Star
            className="absolute bottom-8 right-1/3 w-4 h-4 text-booth-pink fill-booth-pink animate-pulse"
            style={{ filter: "drop-shadow(0 0 6px rgba(255, 105, 180, 0.8))" }}
          />
          <Sparkles
            className="absolute top-1/3 right-8 w-6 h-6 text-booth-orange animate-pulse"
            style={{ filter: "drop-shadow(0 0 6px rgba(255, 150, 0, 0.8))" }}
          />
          {/* Two ticket strips side by side */}
          <div className="flex gap-4 h-full">
            {[1, 2].map((stripNum) => (
              <div
                key={stripNum}
                className="flex-1 bg-gradient-to-br from-booth-ticket via-booth-ticket to-amber-100 rounded-2xl relative overflow-hidden border-4 border-booth-gold/30"
                style={{
                  boxShadow:
                    "0 12px 24px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,215,0,0.2), 0 0 20px rgba(255,215,0,0.2)",
                }}
              >
                {/* Decorative ticket edges with colorful perforations */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-booth-gold via-booth-orange to-booth-pink flex items-center justify-around px-2">
                  {[...Array(15)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-white rounded-full shadow-lg"
                      style={{ boxShadow: "0 0 4px rgba(255,255,255,0.8)" }}
                    />
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-booth-pink via-booth-purple to-booth-gold flex items-center justify-around px-2">
                  {[...Array(15)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-white rounded-full shadow-lg"
                      style={{ boxShadow: "0 0 4px rgba(255,255,255,0.8)" }}
                    />
                  ))}
                </div>

                {/* Camera icon decoration with glow */}
                {stripNum === 2 && (
                  <div
                    className="absolute top-4 left-1/2 -translate-x-1/2 bg-booth-gold/20 rounded-full p-2"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))",
                    }}
                  >
                    <Camera className="w-8 h-8 text-booth-red drop-shadow-lg" />
                  </div>
                )}

                {/* QR Code - only on first strip */}
                {stripNum === 1 && qrCode && (
                  <div className="absolute top-4 right-4 w-16 h-16 bg-white p-1 rounded">
                    <img src={qrCode} alt="QR" className="w-full h-full" />
                  </div>
                )}

                {/* Header with vibrant design */}
                <div
                  className="px-4 pt-8 pb-4 text-center border-b-4 border-gradient-to-r from-booth-gold via-booth-orange to-booth-pink relative"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,105,180,0.1))",
                    borderImage:
                      "linear-gradient(to right, hsl(var(--booth-gold)), hsl(var(--booth-orange)), hsl(var(--booth-pink))) 1",
                  }}
                >
                  {/* Decorative stars with glow */}
                  <Star
                    className="absolute top-3 left-4 w-6 h-6 text-booth-gold fill-booth-gold animate-pulse"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))",
                    }}
                  />
                  <Star
                    className="absolute top-3 right-4 w-6 h-6 text-booth-pink fill-booth-pink animate-pulse"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(255, 105, 180, 0.8))",
                    }}
                  />
                  <Sparkles
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 text-booth-orange animate-pulse"
                    style={{
                      filter: "drop-shadow(0 0 6px rgba(255, 150, 0, 0.8))",
                    }}
                  />

                  <h2
                    className="text-transparent bg-clip-text bg-gradient-to-r from-booth-red via-booth-orange to-booth-pink font-serif italic text-4xl mb-3 font-black tracking-wide"
                    style={{
                      fontFamily: "Georgia, serif",
                      textShadow:
                        "2px 2px 4px rgba(0,0,0,0.2), 0 0 10px rgba(255,215,0,0.3)",
                    }}
                  >
                    {eventName}
                  </h2>
                  <div className="flex justify-between text-xs font-bold px-2">
                    <div className="bg-gradient-to-br from-booth-purple/20 to-booth-pink/20 rounded-lg p-2 border-2 border-booth-purple/30">
                      <div className="text-[10px] text-booth-purple uppercase tracking-wide">
                        {date}
                      </div>
                      <div
                        className="text-3xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-br from-booth-purple to-booth-pink"
                        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                      >
                        {time}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-booth-orange/20 to-booth-gold/20 rounded-lg p-2 border-2 border-booth-orange/30">
                      <div className="text-[10px] text-booth-orange uppercase tracking-wide">
                        Row
                      </div>
                      <div
                        className="text-3xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-br from-booth-orange to-booth-gold"
                        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                      >
                        {row}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-booth-pink/20 to-booth-red/20 rounded-lg p-2 border-2 border-booth-pink/30">
                      <div className="text-[10px] text-booth-pink uppercase tracking-wide">
                        Seat
                      </div>
                      <div
                        className="text-3xl font-black mt-1 text-transparent bg-clip-text bg-gradient-to-br from-booth-pink to-booth-red"
                        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                      >
                        {seat}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo slots - 3 photos with vibrant frames */}
                <div className="flex flex-col gap-4 p-4">
                  {photos.slice(0, 3).map((photo, idx) => {
                    const gradients = [
                      "from-booth-gold via-booth-orange to-booth-pink",
                      "from-booth-pink via-booth-purple to-booth-blue",
                      "from-booth-orange via-booth-gold to-booth-pink",
                    ];
                    const labelColors = [
                      "from-booth-gold to-booth-orange",
                      "from-booth-purple to-booth-pink",
                      "from-booth-orange to-booth-red",
                    ];
                    return (
                      <div
                        key={idx}
                        className={`relative w-full aspect-[4/3] bg-gradient-to-br ${gradients[idx]} rounded-xl overflow-hidden p-1.5 shadow-2xl transform transition-transform hover:scale-105`}
                        style={{
                          boxShadow:
                            "0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.3), inset 0 2px 8px rgba(255,255,255,0.3)",
                        }}
                      >
                        <div className="relative w-full h-full bg-white rounded-lg overflow-hidden">
                          <img
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Vintage photo corners */}
                          <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-booth-gold/70" />
                          <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-booth-pink/70" />
                          <div className="absolute bottom-10 left-0 w-6 h-6 border-l-4 border-b-4 border-booth-orange/70" />
                          <div className="absolute bottom-10 right-0 w-6 h-6 border-r-4 border-b-4 border-booth-purple/70" />
                        </div>
                        {/* Enhanced Polaroid-style label with gradient */}
                        <div
                          className={`absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-r ${labelColors[idx]} flex items-center justify-center border-t-2 border-white/50`}
                          style={{
                            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3)",
                          }}
                        >
                          <span className="text-white text-sm font-black tracking-widest drop-shadow-lg flex items-center gap-2">
                            <Star className="w-4 h-4 fill-white" />
                            {idx === 0
                              ? "POSE 1"
                              : idx === 1
                              ? "POSE 2"
                              : "POSE 3"}
                            <Star className="w-4 h-4 fill-white" />
                          </span>
                        </div>
                        {/* Sparkle decorations on frame */}
                        <Sparkles
                          className="absolute -top-1 -right-1 w-6 h-6 text-white animate-pulse"
                          style={{
                            filter:
                              "drop-shadow(0 0 6px rgba(255,255,255,0.8))",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Footer with vibrant design */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-amber-100 via-booth-ticket/80 to-transparent border-t-4"
                  style={{
                    borderImage:
                      "linear-gradient(to right, hsl(var(--booth-gold)), hsl(var(--booth-pink)), hsl(var(--booth-purple))) 1",
                  }}
                >
                  <div className="flex justify-center gap-2 mb-3">
                    <Star
                      className="w-5 h-5 text-booth-gold fill-booth-gold animate-pulse"
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))",
                      }}
                    />
                    <Sparkles
                      className="w-4 h-4 text-booth-pink animate-pulse mt-1"
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(255, 105, 180, 0.8))",
                      }}
                    />
                    <Star
                      className="w-5 h-5 text-booth-orange fill-booth-orange animate-pulse"
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(255, 150, 0, 0.8))",
                      }}
                    />
                  </div>
                  <div className="text-center text-sm font-black tracking-wider mb-2 text-transparent bg-clip-text bg-gradient-to-r from-booth-purple via-booth-pink to-booth-orange">
                    THANK YOU ★ SEE YOU AGAIN ★ THANK YOU
                  </div>
                  <div
                    className="text-center font-black text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-booth-gold via-booth-orange to-booth-red"
                    style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.1)" }}
                  >
                    ★ ADMIT MORE ★
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {enableInternalExport && (
        <button
          onClick={exportToImage}
          className="gap-2 bg-gradient-to-r from-booth-purple via-booth-pink to-booth-orange hover:from-booth-pink hover:via-booth-orange hover:to-booth-gold text-white font-bold shadow-2xl transform hover:scale-105 transition-all border-2 border-white/30 px-6 py-3 rounded-lg flex items-center justify-center"
          style={{
            boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 20px rgba(255,215,0,0.4)",
          }}
        >
          <Download className="w-5 h-5 mr-2" />
          Download as 4R Image
        </button>
      )}
    </div>
  );
};

export default PhotoBoothTicket;

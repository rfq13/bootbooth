import texture from "../../../assets/love/texture.jpg";
import frame from "../../../assets/love/love-frame.png";
import inLovingmemory from "../../../assets/love/In-Loving-Memory-PNG-Pic.png";

export default function Love4R({ photos = [], domRef, onClickSlot }) {
  const slots = Array.from({ length: 6 }, (_, i) => i);

  const HeartSlot = ({ url, index }) => (
    <div
      onClick={() => onClickSlot && onClickSlot(index)}
      className="relative cursor-pointer"
      style={{ aspectRatio: "1" }}
    >
      {/* Frame di belakang */}
      <img
        src={frame}
        alt="Frame"
        className="absolute inset-0 w-64 object-cover z-20"
        style={{
          left: "-6%",
          top: "3%",
          transform: "scale(1.2)",
        }}
      />

      {url ? (
        <img
          src={url}
          alt={`Foto ${index + 1}`}
          className="w-full h-full object-cover heart-clip"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-full heart-clip bg-pink-100 flex items-center justify-center">
            <span className="text-pink-500 text-sm font-medium text-center px-2">
              Klik untuk foto {index + 1}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={domRef}
      className="relative w-[600px] h-[900px] bg-gradient-to-br from-pink-100 to-red-100 shadow-2xl overflow-hidden"
      style={{
        backgroundImage: `url(${texture})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundBlendMode: "multiply",
      }}
    >
      {/* Header dengan dekorasi hati */}
      <div className="relative h-[90px] flex items-center justify-center">
        <img
          src={inLovingmemory}
          alt="In Loving Memory"
          className="inset-0 h-20 object-cover z-20"
        />
      </div>

      {/* Grid 2x3 untuk 6 foto - dibagi 2 secara vertikal */}
      <div className="p-6 h-[calc(100%-8rem)] ml-6">
        <div className="grid grid-cols-2 gap-6 h-full">
          <div className="flex flex-col gap-6">
            {slots.slice(0, 3).map((index) => (
              <HeartSlot key={index} url={photos[index]} index={index} />
            ))}
          </div>
          <div className="flex flex-col gap-6">
            {slots.slice(3, 6).map((index) => (
              <HeartSlot key={index} url={photos[index]} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer dengan dekorasi */}
      <div className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl opacity-70">❤️</span>
        </div>
      </div>

      {/* CSS untuk clip-path bentuk hati */}
      <style jsx>{`
        .heart-clip {
          clip-path: path(
            "M100,30 C40,0 0,40 0,90 C0,150 100,210 100,210 C100,210 200,150 200,90 C200,40 160,0 100,30 Z"
          );
        }
      `}</style>
    </div>
  );
}

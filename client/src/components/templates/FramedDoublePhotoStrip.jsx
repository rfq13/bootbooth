import { useMemo } from "preact/hooks";
import framePng from "../../../assets/output-onlinepngtools.png";

export default function FramedDoublePhotoStrip({
  photos = [],
  domRef,
  onClickSlot,
}) {
  const left = useMemo(() => photos.slice(0, 3), [photos]);
  const right = useMemo(() => photos.slice(3, 6), [photos]);
  const Slot = ({ url, index, accent }) => (
    <div
      onClick={() => onClickSlot && onClickSlot(index)}
      className={`flex-1 border-4 ${accent} shadow-xl relative cursor-pointer bg-black`}
      style={{
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        aspectRatio: "16/10", // Landscape ratio
      }}
    >
      {/* Foto yang masuk ke area layar frame - landscape */}
      <div
        className="absolute"
        style={{
          left: "2.5%",
          top: "8%",
          width: "80%",
          height: "60%",
          backgroundColor: "white",
        }}
      >
        {url ? (
          <img
            src={url}
            alt={`S${index + 1}`}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm px-2 text-center">
            Klik untuk pilih foto
          </div>
        )}
      </div>

      {/* Frame kamera sebagai overlay - diperbesar */}
      <img
        src={framePng}
        alt="frame"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        crossOrigin="anonymous"
      />
    </div>
  );

  return (
    <div
      ref={domRef}
      className="flex w-[600px] h-[900px] bg-white border border-primary-200"
    >
      <div className="flex flex-col flex-1 rounded-2xl overflow-hidden relative">
        <div className="flex flex-col flex-1 p-3 gap-3">
          <Slot url={left[0]} index={0} />
          <Slot url={left[1]} index={1} />
          <Slot url={left[2]} index={2} />
        </div>
      </div>
      <div className="flex flex-col flex-1 rounded-2xl overflow-hidden relative">
        <div className="flex flex-col flex-1 p-3 gap-3">
          <Slot url={right[0]} index={3} />
          <Slot url={right[1]} index={4} />
          <Slot url={right[2]} index={5} />
        </div>
      </div>
    </div>
  );
}

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
      className={`flex-1 bg-white rounded-2xl border-4 ${accent} shadow-xl overflow-hidden relative cursor-pointer`}
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
    >
      {url ? (
        <img
          src={url}
          alt={`S${index + 1}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-secondary-700">
          Klik untuk pilih foto
        </div>
      )}
      <img
        src={framePng}
        alt="frame"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
      <div className="absolute bottom-1 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
        {index + 1}
      </div>
    </div>
  );

  return (
    <div
      ref={domRef}
      className="flex w-[600px] h-[900px] bg-white p-3 gap-3 border border-primary-200 rounded-3xl"
    >
      <div
        className="flex flex-col flex-1 rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)",
        }}
      >
        <div className="flex flex-col flex-1 p-3 gap-3">
          <Slot url={left[0]} index={0} accent="border-blue-600/60" />
          <Slot url={left[1]} index={1} accent="border-blue-600/60" />
          <Slot url={left[2]} index={2} accent="border-blue-600/60" />
        </div>
      </div>
      <div
        className="flex flex-col flex-1 rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #fef3c7 0%, #fff7ed 100%)",
        }}
      >
        <div className="flex flex-col flex-1 p-3 gap-3">
          <Slot url={right[0]} index={3} accent="border-amber-600/60" />
          <Slot url={right[1]} index={4} accent="border-amber-600/60" />
          <Slot url={right[2]} index={5} accent="border-amber-600/60" />
        </div>
      </div>
    </div>
  );
}

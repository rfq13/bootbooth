import { useEffect, useRef, useState } from "preact/hooks";
import { API_URL } from "../constants";

// Canvas size for 4R at ~300dpi: 1200x1800 px (portrait)
const CANVAS_W = 1200;
const CANVAS_H = 1800;

function drawCover(ctx, img, dx, dy, dw, dh) {
  const sw = img.width;
  const sh = img.height;
  const scale = Math.max(dw / sw, dh / sh);
  const cw = sw * scale;
  const ch = sh * scale;
  const sx = (cw - dw) / 2;
  const sy = (ch - dh) / 2;

  ctx.drawImage(img, -sx + dx, -sy + dy, cw, ch);
}

export default function PrintComposer({
  photo,
  layoutId,
  onComposed,
  songTitle,
  songArtist,
}) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState(null);

  function drawPlaceholder(ctx, dx, dy, dw, dh) {
    ctx.save();
    ctx.fillStyle = "#e5e7eb"; // gray-200
    ctx.strokeStyle = "#cbd5e1"; // gray-300
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(dx, dy, dw, dh, 24);
    ctx.fill();
    ctx.stroke();
    // simple landscape icon
    ctx.clip();
    ctx.fillStyle = "#d1d5db"; // gray-300 darker
    ctx.beginPath();
    ctx.moveTo(dx + dw * 0.15, dy + dh * 0.7);
    ctx.lineTo(dx + dw * 0.35, dy + dh * 0.5);
    ctx.lineTo(dx + dw * 0.55, dy + dh * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      dx + dw * 0.75,
      dy + dh * 0.3,
      Math.min(dw, dh) * 0.06,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  useEffect(() => {
    if (!layoutId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");

    // Fill background white (safe for print)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const proceedDraw = (img) => {
      const margin = 40;
      if (layoutId === "single_4R") {
        const dw = CANVAS_W - margin * 2;
        const dh = CANVAS_H - margin * 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, dw, dh, 24);
        ctx.clip();
        if (img) {
          drawCover(ctx, img, margin, margin, dw, dh);
        } else {
          ctx.restore();
          drawPlaceholder(ctx, margin, margin, dw, dh);
        }
        ctx.restore();
      } else if (layoutId === "two_2R") {
        const gap = 30;
        const dw = CANVAS_W - margin * 2;
        const availableH = CANVAS_H - margin * 2 - gap;
        const slotH = Math.floor(availableH / 2);

        // Top slot
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, dw, slotH, 24);
        ctx.clip();
        if (img) {
          drawCover(ctx, img, margin, margin, dw, slotH);
        } else {
          ctx.restore();
          drawPlaceholder(ctx, margin, margin, dw, slotH);
        }
        ctx.restore();

        // Bottom slot (duplicate same photo)
        const y2 = margin + slotH + gap;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, y2, dw, slotH, 24);
        ctx.clip();
        if (img) {
          drawCover(ctx, img, margin, y2, dw, slotH);
        } else {
          ctx.restore();
          drawPlaceholder(ctx, margin, y2, dw, slotH);
        }
        ctx.restore();
      }

      // Photostrip Spotify: 3 stacked panels + bottom music bar
      else if (layoutId === "photostrip_spotify") {
        const headerH = 120;
        const barH = 180;
        const gap = 30;
        const areaTop = margin + headerH;
        const areaBottom = CANVAS_H - margin - barH;

        // Header (date + time style)
        ctx.fillStyle = "#555";
        ctx.font = "bold 36px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Saturday, November 30", CANVAS_W / 2, margin + 40);
        ctx.fillStyle = "#777";
        ctx.font = "bold 64px system-ui";
        ctx.fillText("11:26", CANVAS_W / 2, margin + 100);

        // Panels area
        const areaH = areaBottom - areaTop;
        const dw = CANVAS_W - margin * 2;
        const slotH = Math.floor((areaH - gap * 2) / 3);
        const x = margin;
        for (let i = 0; i < 3; i++) {
          const y = areaTop + i * (slotH + gap);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, dw, slotH, 28);
          ctx.clip();
          if (img) {
            drawCover(ctx, img, x, y, dw, slotH);
          } else {
            ctx.restore();
            drawPlaceholder(ctx, x, y, dw, slotH);
          }
          ctx.restore();
        }

        // Bottom music bar (mimic)
        const barY = CANVAS_H - margin - barH;
        ctx.fillStyle = "#ececec";
        ctx.strokeStyle = "#d0d0d0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(margin, barY, dw, barH, 36);
        ctx.fill();
        ctx.stroke();

        // Song title and progress
        ctx.fillStyle = "#333";
        ctx.font = "bold 32px system-ui";
        ctx.textAlign = "left";
        ctx.fillText(songTitle || "About You", margin + 32, barY + 60);
        ctx.fillStyle = "#666";
        ctx.font = "24px system-ui";
        ctx.fillText(songArtist || "The 1975", margin + 32, barY + 96);

        // Progress bar
        const pbX = margin + 32;
        const pbY = barY + 120;
        const pbW = dw - 64;
        const pbH = 10;
        ctx.fillStyle = "#d8d8d8";
        ctx.roundRect(pbX, pbY, pbW, pbH, 5);
        ctx.fill();
        ctx.fillStyle = "#888";
        ctx.roundRect(pbX, pbY, pbW * 0.35, pbH, 5);
        ctx.fill();

        // Control icons (simple triangles/rects)
        ctx.fillStyle = "#555";
        // Previous
        ctx.beginPath();
        ctx.moveTo(pbX + 60, barY + 150);
        ctx.lineTo(pbX + 60, barY + 180);
        ctx.lineTo(pbX + 40, barY + 165);
        ctx.closePath();
        ctx.fill();
        // Play
        ctx.beginPath();
        ctx.moveTo(pbX + 110, barY + 150);
        ctx.lineTo(pbX + 110, barY + 180);
        ctx.lineTo(pbX + 135, barY + 165);
        ctx.closePath();
        ctx.fill();
        // Next
        ctx.beginPath();
        ctx.moveTo(pbX + 180, barY + 150);
        ctx.lineTo(pbX + 180, barY + 180);
        ctx.lineTo(pbX + 200, barY + 165);
        ctx.closePath();
        ctx.fill();
      }

      // Spotify Player Card: satu foto + bar pemutar musik
      else if (layoutId === "spotify_card") {
        const headerH = 120;
        const barH = 200;
        const gapTop = 20;

        // Header waktu
        const d = new Date();
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const headerDate = `${dayNames[d.getDay()]}, ${
          monthNames[d.getMonth()]
        } ${d.getDate()}`;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        ctx.fillStyle = "#555";
        ctx.font = "bold 36px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(headerDate, CANVAS_W / 2, margin + 40);
        ctx.fillStyle = "#777";
        ctx.font = "bold 64px system-ui";
        ctx.fillText(`${hh}:${mm}`, CANVAS_W / 2, margin + 100);

        // Area foto
        const x = margin;
        const y = margin + headerH + gapTop;
        const dw = CANVAS_W - margin * 2;
        const dh = CANVAS_H - (margin + headerH + gapTop) - margin - barH;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, dw, dh, 28);
        ctx.clip();
        if (img) {
          drawCover(ctx, img, x, y, dw, dh);
        } else {
          ctx.restore();
          drawPlaceholder(ctx, x, y, dw, dh);
        }
        ctx.restore();

        // Bar musik bawah
        const barY = CANVAS_H - margin - barH;
        ctx.fillStyle = "#ececec";
        ctx.strokeStyle = "#d0d0d0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(margin, barY, dw, barH, 36);
        ctx.fill();
        ctx.stroke();

        // Judul & artis
        ctx.fillStyle = "#333";
        ctx.font = "bold 32px system-ui";
        ctx.textAlign = "left";
        ctx.fillText(songTitle || "About You", margin + 32, barY + 60);
        ctx.fillStyle = "#666";
        ctx.font = "24px system-ui";
        ctx.fillText(songArtist || "The 1975", margin + 32, barY + 96);

        // Progress bar
        const pbX = margin + 32;
        const pbY = barY + 120;
        const pbW = dw - 64;
        const pbH = 10;
        ctx.fillStyle = "#d8d8d8";
        ctx.roundRect(pbX, pbY, pbW, pbH, 5);
        ctx.fill();
        ctx.fillStyle = "#888";
        ctx.roundRect(pbX, pbY, pbW * 0.45, pbH, 5);
        ctx.fill();

        // Kontrol
        ctx.fillStyle = "#555";
        // Prev
        ctx.beginPath();
        ctx.moveTo(pbX + 60, barY + 150);
        ctx.lineTo(pbX + 60, barY + 180);
        ctx.lineTo(pbX + 40, barY + 165);
        ctx.closePath();
        ctx.fill();
        // Play
        ctx.beginPath();
        ctx.moveTo(pbX + 110, barY + 150);
        ctx.lineTo(pbX + 110, barY + 180);
        ctx.lineTo(pbX + 135, barY + 165);
        ctx.closePath();
        ctx.fill();
        // Next
        ctx.beginPath();
        ctx.moveTo(pbX + 180, barY + 150);
        ctx.lineTo(pbX + 180, barY + 180);
        ctx.lineTo(pbX + 200, barY + 165);
        ctx.closePath();
        ctx.fill();
      }

      const url = canvas.toDataURL("image/jpeg", 0.92);
      setDataUrl(url);
      if (onComposed) onComposed(url);
    };
    if (photo?.path) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => proceedDraw(img);
      img.src = `${API_URL}${photo.path}`;
    } else {
      proceedDraw(null);
    }
  }, [photo, layoutId, songTitle, songArtist]);

  const handleQueuePrint = async () => {
    if (!dataUrl) return;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const form = new FormData();
    const filename = `${
      photo?.Filename?.replace(/\.[^.]+$/, "") || "print"
    }_${layoutId}.jpg`;
    form.append("file", blob, filename);
    form.append("layoutId", layoutId);

    try {
      const resp = await fetch(`${API_URL}/api/printqueue`, {
        method: "POST",
        body: form,
      });
      if (!resp.ok) throw new Error(`Upload gagal: ${resp.status}`);
      alert("Berhasil dikirim ke antrian cetak (/printqueue)");
    } catch (err) {
      console.error(err);
      alert("Gagal mengupload ke antrian cetak. Cek backend.");
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-primary-200 shadow-soft">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4">
        Preview Layout (4R)
      </h3>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <canvas
            ref={canvasRef}
            className="w-full border border-primary-200 rounded-xl shadow-soft"
          />
        </div>
        <div className="w-full lg:w-64">
          <button
            onClick={handleQueuePrint}
            disabled={!dataUrl}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all transform hover:scale-105 shadow-soft ${
              dataUrl
                ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white"
                : "bg-primary-100 text-secondary-500 cursor-not-allowed"
            }`}
          >
            Simpan & Antri Cetak
          </button>
          <p className="text-secondary-700 text-sm mt-3">
            Hasil diproses di frontend, diekspor JPEG, lalu diunggah ke backend
            untuk disimpan ke folder <code>/printqueue</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

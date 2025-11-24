import { lazy, Suspense } from "preact/compat";
import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import { API_URL } from "../constants";
import { appState } from "../main.jsx";
import imageEffectsManager, { CanvasUtils } from "../utils/imageEffects.js";
import { PerformanceMonitor } from "../config/performance.js";
import { faceMaskingUtils } from "../utils/faceMasking.js";

// Loading component untuk lazy loading
const EditorLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mb-4 shadow-lg animate-glow">
        <svg
          className="w-8 h-8 text-white animate-spin"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-secondary-900 mb-2">
        Memuat Editor...
      </h2>
      <p className="text-secondary-600">Sedang menyiapkan tools editing foto</p>
    </div>
  </div>
);

// Error boundary component
const EditorError = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white flex items-center justify-center">
    <div className="bg-white/85 backdrop-blur-md rounded-3xl p-8 shadow-soft-lg border border-primary-200 max-w-md">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Editor Error
        </h2>
        <p className="text-secondary-600 mb-4">
          {error?.message || "Terjadi kesalahan saat memuat editor"}
        </p>
        <button
          onClick={onRetry}
          className="btn-gradient px-6 py-2 rounded-xl text-white font-medium transition-all shadow-soft hover:shadow-soft-lg"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  </div>
);

const defaultTemplates = [
  {
    name: "Vogue Classic",
    template: {
      background: null,
      backgroundColor: "#1a1a1a",
      overlays: [],
      text: [
        {
          content: "VOGUE",
          font: "Playfair Display",
          size: 180,
          color: "#ffffff",
          position: { x: 120, y: 140 },
        },
        {
          content: "THE BEAUTY ISSUE",
          font: "Cormorant",
          size: 48,
          color: "#f0eae4",
          position: { x: 120, y: 360 },
        },
      ],
    },
  },
];

// Optimized TemplateEditor untuk low-spec devices
export default function OptimizedTemplateEditor(props) {
  const canvasRef = useRef(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoPath, setPhotoPath] = useState("");
  const [selected, setSelected] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [effect, setEffect] = useState("none");
  const [effectParams, setEffectParams] = useState({
    intensity: 0.3,
    pixelSize: 8,
  });
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Face Masking states
  const [personMask, setPersonMask] = useState(null);
  const [isSegmentingPerson, setIsSegmentingPerson] = useState(false);
  const [usePersonSegmentation, setUsePersonSegmentation] = useState(false);
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0);
  const [segmentationThreshold, setSegmentationThreshold] = useState(0.5);
  const [faceMaskData, setFaceMaskData] = useState(null);
  const [useFaceMask, setUseFaceMask] = useState(false);
  const [isDetectingFace, setIsDetectingFace] = useState(false);

  // Get URL parameters from props in preact-router
  const url = props.url || window.location.pathname + window.location.search;
  const tpl = defaultTemplates[selected].template;

  // Memory management - cleanup saat component unmount
  useEffect(() => {
    return () => {
      // Cleanup image effects manager
      imageEffectsManager.cleanup();

      // Cleanup face masking utils
      faceMaskingUtils.cleanup();

      // Cleanup global state
      appState.value = {
        ...appState.value,
        isEditing: false,
        currentPhoto: null,
      };
    };
  }, []);

  // Load photo dari URL dengan error handling
  useEffect(() => {
    const loadPhotoFromUrl = async () => {
      const urlParams = new URLSearchParams(url.split("?")[1] || "");
      const photoFilename = urlParams.get("photo");

      if (photoFilename) {
        setLoadingPhoto(true);
        setError(null);

        try {
          const imageUrl = `${API_URL}/uploads/${photoFilename}`;
          const checkResponse = await fetch(imageUrl, { method: "HEAD" });

          if (!checkResponse.ok) {
            throw new Error(`Foto tidak ditemukan: ${photoFilename}`);
          }

          const photoData = {
            filename: photoFilename,
            path: `/uploads/${photoFilename}`,
          };

          if (photoData && photoData.path) {
            const img = new Image();
            img.crossOrigin = "anonymous";

            img.onload = () => {
              setPhotoDataUrl(imageUrl);
              setPhotoPath(photoData.path);
              setLoadingPhoto(false);
            };

            img.onerror = () => {
              setError("Gagal memuat foto");
              setLoadingPhoto(false);
            };

            img.src = imageUrl;
          } else {
            setError("Data foto tidak valid");
            setLoadingPhoto(false);
          }
        } catch (err) {
          console.error("Error loading photo:", err);
          setError(err.message || "Gagal memuat foto");
          setLoadingPhoto(false);
        }
      }
    };

    loadPhotoFromUrl();
  }, [url]);

  // Sync dengan global appState
  useEffect(() => {
    if (photoDataUrl && photoPath) {
      const currentPhoto = {
        filename: photoPath.split("/").pop(),
        path: photoPath,
        dataUrl: photoDataUrl,
      };

      appState.value = {
        ...appState.value,
        currentPhoto: currentPhoto,
        isEditing: true,
      };
    }
  }, [photoDataUrl, photoPath]);

  // Optimized rendering dengan 4-Layer System dan person segmentation
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = 900;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;

    return PerformanceMonitor.measureAsync("canvas-render", async () => {
      ctx.clearRect(0, 0, W, H);

      if (usePersonSegmentation && photoDataUrl && personMask) {
        // ========== 4-LAYER SYSTEM WITH PERSON SEGMENTATION ==========
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = photoDataUrl;
          await img.decode();

          // LAYER 0: Background SOLID COLOR (penting!)
          ctx.fillStyle = tpl.backgroundColor || "#1a1a1a";
          ctx.fillRect(0, 0, W, H);

          // LAYER 1: Text "VOGUE" BEHIND face
          ctx.save();
          const vogueLogo = tpl.text?.find((t) => t.content === "VOGUE");
          if (vogueLogo) {
            ctx.fillStyle = vogueLogo.color || "#ffffff";
            ctx.font = `${vogueLogo.size}px ${vogueLogo.font}`;
            ctx.textBaseline = "top";
            ctx.fillText(
              vogueLogo.content,
              vogueLogo.position?.x || 120,
              vogueLogo.position?.y || 140
            );
          }
          ctx.restore();

          // LAYER 2: Person (TRANSPARANT BACKGROUND!)
          try {
            let maskToUse = personMask;
            if (useFaceMask && faceMaskData && faceMaskData.mask && personMask?.mask) {
              const merged = faceMaskingUtils.mergeMasks(personMask.mask, faceMaskData.mask);
              maskToUse = { ...personMask, mask: merged };
            }
            const personLayer = faceMaskingUtils.extractPersonLayer(maskToUse, { feather: 3 });

            // Calculate position to center
            const ratio = Math.min(
              W / personLayer.width,
              H / personLayer.height
            );
            const w = personLayer.width * ratio;
            const h = personLayer.height * ratio;
            const x = (W - w) / 2;
            const y = (H - h) / 2;

            // PENTING: Set composite mode untuk transparency
            ctx.save();
            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(personLayer, x, y, w, h);
            ctx.restore();
          } catch (error) {
            console.error("Person layer failed:", error);
            // Fallback: draw original image
            const ratio = Math.min(W / img.width, H / img.height);
            const w = img.width * ratio;
            const h = img.height * ratio;
            const x = (W - w) / 2;
            const y = (H - h) / 2;
            ctx.drawImage(img, x, y, w, h);
          }

          // LAYER 3: Subtitle ON TOP
          ctx.save();
          const subtitle = tpl.text?.find((t) => t.content !== "VOGUE");
          if (subtitle) {
            ctx.fillStyle = subtitle.color || "#f0eae4";
            ctx.font = `${subtitle.size}px ${subtitle.font}`;
            ctx.textBaseline = "top";
            ctx.fillText(
              subtitle.content,
              subtitle.position?.x || 120,
              subtitle.position?.y || 360
            );
          }
          ctx.restore();
        } catch (error) {
          console.error("Failed to render with person segmentation:", error);
          // Fallback to traditional rendering
          renderTraditionalCanvas(ctx, W, H);
        }
      } else {
        // ========== TRADITIONAL RENDERING (NO SEGMENTATION) ==========
        renderTraditionalCanvas(ctx, W, H);
      }
    });
  }, [
    tpl,
    photoDataUrl,
    effect,
    effectParams,
    personMask,
    usePersonSegmentation,
  ]);

  // Traditional canvas rendering (fallback)
  const renderTraditionalCanvas = async (ctx, W, H) => {
    // Use background color from template or default
    ctx.fillStyle = tpl.backgroundColor || "#111";
    ctx.fillRect(0, 0, W, H);

    // Load background image if exists
    if (tpl.background) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = tpl.background;

      try {
        await img.decode();
        if (img.complete && img.naturalWidth > 0) {
          const ratio = Math.min(W / img.width, H / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          const x = (W - w) / 2;
          const y = (H - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        }
      } catch (error) {
        console.warn("Background image failed to load:", tpl.background, error);
      }
    }

    // Process photo with effects if available
    if (photoDataUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = photoDataUrl;

      await img.decode().catch(() => {});
      const ratio = Math.min(W / img.width, H / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (W - w) / 2;
      const y = (H - h) / 2;

      // Create offscreen canvas untuk photo processing
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");

      // Clear canvas dan draw image dengan high quality
      octx.clearRect(0, 0, w, h);
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = "high";
      octx.drawImage(img, 0, 0, w, h);

      let imgData = octx.getImageData(0, 0, w, h);

      // Apply effects using Web Worker untuk performa lebih baik
      if (effect !== "none") {
        try {
          const params = {
            intensity: effectParams.intensity || 0.5,
            pixelSize: effectParams.pixelSize || 8,
            radius: effectParams.radius || 1.0,
          };

          imgData = await imageEffectsManager.applyEffect(
            effect,
            imgData,
            params
          );
        } catch (error) {
          console.error("Effect processing failed:", error);
          // Continue with original image if effect fails
        }
      }

      // Clear offscreen canvas sebelum putImageData
      octx.clearRect(0, 0, w, h);
      octx.putImageData(imgData, 0, 0);

      // Draw to main canvas dengan proper blending
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(off, x, y, w, h);
      ctx.restore();

      // Apply vignette overlay if needed (tetap di main thread karena simple)
      if (effect === "vignette") {
        const gx = ctx.createRadialGradient(
          W / 2,
          H / 2,
          Math.min(W, H) * 0.3,
          W / 2,
          H / 2,
          Math.min(W, H) * 0.6
        );
        const alpha = Math.min(0.85, 0.2 + (effectParams.intensity || 0.3));
        gx.addColorStop(0, `rgba(0,0,0,0)`);
        gx.addColorStop(1, `rgba(0,0,0,${alpha})`);

        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = gx;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // Draw text overlays
    for (const t of tpl.text || []) {
      ctx.fillStyle = t.color || "#fff";
      ctx.font = `${t.size || 48}px ${t.font || "Playfair Display"}`;
      ctx.textBaseline = "top";
      ctx.fillText(t.content || "", t.position?.x || 0, t.position?.y || 0);
    }
  };

  // Debounced rendering untuk optimasi
  const debouncedRender = useCallback(
    (() => {
      let timeoutId;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(renderCanvas, 32); // ~30fps untuk low-spec
      };
    })(),
    [renderCanvas]
  );

  useEffect(() => {
    debouncedRender();
  }, [debouncedRender]);

  // Optimized upload dengan image optimization
  const onUploadLocal = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setPhotoDataUrl(dataUrl);

      // Optimize image sebelum upload
      const img = new Image();
      img.src = dataUrl;
      await img.decode().catch(() => {});

      const optimizedBlob = await CanvasUtils.optimizeForUpload(
        CanvasUtils.canvasToImageData(
          CanvasUtils.createCanvasFromImageData(
            await new Promise((resolve) => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
            })
          )
        ),
        1920, // Max width
        0.85 // Quality
      );

      const filename = `client_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append("image", optimizedBlob, filename);

      try {
        const res = await fetch(`${API_URL}/api/upload-image`, {
          method: "POST",
          body: formData,
        });
        const j = await res.json();
        if (j && j.success) setPhotoPath(j.path);
      } catch (error) {
        console.error("Upload failed:", error);
        setError("Gagal mengupload foto");
      }
    };
    reader.readAsDataURL(file);
  };

  // Person segmentation function
  const segmentPerson = async () => {
    if (!photoDataUrl) {
      setError("Tidak ada foto untuk di-segmentasi");
      return;
    }

    setIsSegmentingPerson(true);
    setError(null);
    setModelLoadingProgress(0);

    try {
      // Load model if not already loaded
      if (!faceMaskingUtils.isModelLoaded) {
        setModelLoadingProgress(25);
        await faceMaskingUtils.loadModel();
        setModelLoadingProgress(50);
      }

      setModelLoadingProgress(75);

      // Segment person from background dengan threshold
      const maskData = await faceMaskingUtils.segmentPerson(photoDataUrl, {
        scoreThreshold: segmentationThreshold,
        erode: 2,
        dilate: 3,
      });

      setModelLoadingProgress(100);

      if (maskData) {
        setPersonMask(maskData);
        setUsePersonSegmentation(true);
        console.log("✅ Person segmented successfully:", maskData);
      } else {
        setError(
          "Tidak dapat mendeteksi person. Silakan coba foto lain atau gunakan mode manual."
        );
        setUsePersonSegmentation(false);
      }
    } catch (error) {
      console.error("Person segmentation failed:", error);
      setError(error.message || "Gagal memisahkan person dari background");
      setUsePersonSegmentation(false);
    } finally {
      setIsSegmentingPerson(false);
      setModelLoadingProgress(0);
    }
  };

  const detectFace = async () => {
    if (!photoDataUrl) {
      setError("Tidak ada foto untuk face masking");
      return;
    }
    setIsDetectingFace(true);
    try {
      const fm = await faceMaskingUtils.segmentFaceWithWorker(photoDataUrl, { expansion: 15, feather: 5 });
      setFaceMaskData(fm);
      setUseFaceMask(true);
      debouncedRender();
    } catch (e) {
      setError(e.message || "Face masking gagal");
      setUseFaceMask(false);
    } finally {
      setIsDetectingFace(false);
    }
  };

  // Toggle person segmentation
  const togglePersonSegmentation = () => {
    if (!personMask && photoDataUrl) {
      // Auto-segment person if no mask exists
      segmentPerson();
    } else {
      setUsePersonSegmentation(!usePersonSegmentation);
    }
  };

  // Re-segment dengan threshold baru
  const resegmentWithThreshold = async () => {
    if (!photoDataUrl) return;
    await segmentPerson();
  };

  // Optimized render final
  const renderFinal = async () => {
    if (!photoPath) return;
    setRendering(true);

    try {
      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = 900;
      overlayCanvas.height = 1350;
      const octx = overlayCanvas.getContext("2d");
      octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      for (const t of tpl.text || []) {
        octx.fillStyle = t.color || "#fff";
        octx.font = `${t.size || 48}px ${t.font || "Playfair Display"}`;
        octx.textBaseline = "top";
        octx.fillText(t.content || "", t.position?.x || 0, t.position?.y || 0);
      }

      const overlayDataUrl = overlayCanvas.toDataURL("image/png");
      const overlayFilename = `overlay_${Date.now()}.png`;

      const up = await fetch(`${API_URL}/api/upload-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: overlayFilename,
          imageBase64: overlayDataUrl,
        }),
      });

      const uj = await up.json();
      const renderTpl = {
        ...tpl,
        overlays: [...(tpl.overlays || []), uj?.path || ""].filter(Boolean),
      };

      const payload = {
        photoPath,
        outputWidth: 3000,
        outputHeight: 4500,
        template: renderTpl,
      };

      const res = await fetch(`${API_URL}/api/render-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (j && j.success && j.output) {
        setOutputUrl(`data:image/jpeg;base64,${j.output}`);
      }
    } catch (error) {
      console.error("Render failed:", error);
      setError("Gagal render final");
    } finally {
      setRendering(false);
    }
  };

  // Error handling
  if (error) {
    return (
      <EditorError
        error={error}
        onRetry={() => {
          setError(null);
          setRetryKey((prev) => prev + 1);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full mb-4 shadow-lg animate-glow">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 font-poppins animate-float drop-shadow-sm h-16 shiny-text">
            Photo Editor
          </h1>
          <p className="text-lg text-secondary-700 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            Edit dan percantik foto Anda dengan template dan efek yang menawan
          </p>
        </header>

        {/* Loading State */}
        {loadingPhoto && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-2xl mb-6 shadow-soft">
            <div className="flex items-center">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
              <p>Memuat foto...</p>
            </div>
          </div>
        )}

        {/* Person Segmentation Status */}
        {usePersonSegmentation && (
          <div className="bg-purple-100 border border-purple-400 text-purple-700 px-4 py-3 rounded-2xl mb-6 shadow-soft">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              <p>
                {personMask
                  ? "✅ Person segmentation aktif - Menggunakan 4-Layer Vogue System"
                  : "🔄 Menyiapkan person segmentation..."}
              </p>
            </div>
          </div>
        )}

        {/* Main Editor Container */}
        <div className="bg-white/85 backdrop-blur-md rounded-3xl p-8 shadow-soft-lg border border-primary-200">
          {/* Controls Section */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-4 p-4 bg-primary-50 rounded-2xl border border-primary-200">
              {/* Template Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-secondary-700">
                  Template:
                </label>
                <select
                  className="border border-primary-200 rounded-xl px-3 py-2 bg-white text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  value={selected}
                  onChange={(e) => setSelected(parseInt(e.target.value))}
                >
                  {defaultTemplates.map((t, i) => (
                    <option key={i} value={i}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Button */}
              <div className="flex items-center gap-2">
                <label className="btn-gradient cursor-pointer px-4 py-2 rounded-xl text-white font-medium transition-all shadow-soft hover:shadow-soft-lg">
                  <svg
                    className="w-4 h-4 inline mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  Upload Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onUploadLocal}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Effect Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-secondary-700">
                  Efek:
                </span>
                <div className="inline-flex items-center gap-2 bg-white border border-primary-200 rounded-xl p-1 shadow-soft">
                  {[
                    { key: "none", label: "Normal" },
                    { key: "fisheye", label: "Fish Eye" },
                    { key: "grayscale", label: "B&W" },
                    { key: "sepia", label: "Sepia" },
                    { key: "vignette", label: "Vignette" },
                    { key: "invert", label: "Invert" },
                    { key: "pixelate", label: "Pixelate" },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        effect === btn.key
                          ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white shadow-soft animate-glow"
                          : "text-secondary-700 hover:bg-primary-50"
                      }`}
                      onClick={() => setEffect(btn.key)}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Effect Intensity Slider */}
              {effect !== "none" && (
                <div className="flex items-center gap-3 bg-white border border-primary-200 rounded-xl px-4 py-2 shadow-soft">
                  <span className="text-sm font-medium text-secondary-700">
                    Intensitas:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={effectParams.intensity}
                    onInput={(e) =>
                      setEffectParams({
                        ...effectParams,
                        intensity: parseFloat(e.target.value),
                      })
                    }
                    className="w-24 h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <span className="text-sm text-secondary-600">
                    {Math.round(effectParams.intensity * 100)}%
                  </span>
                </div>
              )}

              {/* Person Segmentation Controls */}
              <div className="flex items-center gap-2 border-l border-primary-200 pl-4">
                <button
                  className={`px-4 py-2 rounded-xl font-medium transition-all shadow-soft ${
                    usePersonSegmentation
                      ? "bg-gradient-to-r from-purple-400 to-purple-600 text-white animate-glow"
                      : "bg-white border border-primary-200 text-secondary-700 hover:bg-purple-50"
                  }`}
                  onClick={togglePersonSegmentation}
                  disabled={!photoDataUrl || isSegmentingPerson}
                >
                  {isSegmentingPerson ? (
                    <span className="flex items-center">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                      {modelLoadingProgress > 0
                        ? `${modelLoadingProgress}%`
                        : "Segmenting..."}
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      {usePersonSegmentation
                        ? "Person Segmentation ON"
                        : "Auto Person Segmentation"}
                    </span>
                  )}
                </button>
                <button
                  className={`px-4 py-2 rounded-xl font-medium transition-all shadow-soft ${
                    useFaceMask
                      ? "bg-gradient-to-r from-amber-400 to-amber-600 text-white"
                      : "bg-white border border-primary-200 text-secondary-700 hover:bg-amber-50"
                  }`}
                  onClick={detectFace}
                  disabled={!photoDataUrl || isDetectingFace}
                >
                  {isDetectingFace ? "Detecting..." : "Refine Face Mask"}
                </button>
              </div>

              {/* Threshold Adjustment Controls */}
              {usePersonSegmentation && (
                <div className="flex items-center gap-3 bg-white border border-primary-200 rounded-xl px-4 py-2 shadow-soft">
                  <span className="text-sm font-medium text-secondary-700">
                    Threshold:
                  </span>
                  <input
                    type="range"
                    min="0.3"
                    max="0.7"
                    step="0.05"
                    value={segmentationThreshold}
                    onChange={(e) => {
                      setSegmentationThreshold(parseFloat(e.target.value));
                      // Re-segment dengan threshold baru
                      resegmentWithThreshold();
                    }}
                    className="w-32 h-2 bg-primary-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    disabled={isSegmentingPerson}
                  />
                  <span className="text-sm text-secondary-600">
                    {segmentationThreshold.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Render Button */}
              <button
                className="btn-gradient px-6 py-2 rounded-xl text-white font-medium transition-all shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={rendering || !photoPath}
                onClick={renderFinal}
              >
                {rendering ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Rendering...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Render Final
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Canvas Container */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-soft-lg border border-primary-200">
              <canvas
                ref={canvasRef}
                className="border border-primary-200 rounded-xl max-w-full h-auto"
                style={{ maxHeight: "600px" }}
              />
            </div>
          </div>

          {/* Output Section */}
          {outputUrl && (
            <div className="bg-white rounded-2xl p-6 shadow-soft-lg border border-primary-200">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-primary-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Hasil Akhir
              </h3>
              <div className="flex justify-center">
                <img
                  src={outputUrl}
                  className="border border-primary-200 rounded-xl max-w-full h-auto shadow-soft"
                  style={{ maxHeight: "400px" }}
                  alt="Final rendered result"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

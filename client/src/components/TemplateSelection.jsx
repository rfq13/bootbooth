import { useRef } from "preact/hooks";
import PhotoBoothTicket from "./templates/PhotoBoothTicket";
import PhotoStrip from "./templates/PhotoStrip";
import DoublePhotoStrip from "./templates/DoublePhotoStrip";
import Jeans from "./templates/Jeans";
import FramedDoublePhotoStrip from "./templates/FramedDoublePhotoStrip";
import YouTube4R from "./templates/YouTube4R";
import Instagram4R from "./templates/Instagram4R";

const TemplateSelection = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onContinue,
  onBack,
}) => {
  const previewRef = useRef(null);

  const renderPreview = (id) => {
    const containerStyle = {
      width: 150,
      height: 225,
      position: "relative",
      overflow: "hidden",
    };
    const scaleWrapStyle = {
      width: 600,
      height: 900,
      transform: "scale(0.25)",
      transformOrigin: "top left",
      pointerEvents: "none",
    };
    const photos = [null, null, null, null, null, null];

    if (id === "ticket") {
      return (
        <div style={containerStyle} className="rounded-xl bg-white">
          <div style={scaleWrapStyle}>
            <PhotoBoothTicket
              photos={photos}
              eventName="Movie"
              date="Sunday, May 25th"
              time="19:30"
              row="01"
              seat="23"
              domRef={previewRef}
            />
          </div>
        </div>
      );
    }
    if (id === "strip") {
      return (
        <div style={containerStyle} className="rounded-xl bg-white">
          <div style={scaleWrapStyle}>
            <PhotoStrip photos={photos} domRef={previewRef} />
          </div>
        </div>
      );
    }
    if (id === "grid4") {
      return (
        <div style={containerStyle} className="rounded-xl bg-white">
          <div
            style={scaleWrapStyle}
            className="grid grid-cols-2 gap-3 w-[600px] h-[900px] bg-white p-4 border border-primary-200 rounded-3xl"
          >
            {[...Array(4)].map((_, idx) => (
              <div
                key={idx}
                className="relative bg-gray-100 border-2 border-dashed border-primary-200 rounded-xl overflow-hidden"
                style={{ aspectRatio: "3/2" }}
              >
                <div className="absolute bottom-1 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (id === "doubleStripFramed") {
      return (
        <div style={containerStyle} className="rounded-xl bg-white">
          <div style={scaleWrapStyle}>
            <FramedDoublePhotoStrip photos={photos} domRef={previewRef} />
          </div>
        </div>
      );
    }
    if (id === "jeans") {
      return (
        <div style={containerStyle} className="rounded-xl bg-white">
          <div style={scaleWrapStyle}>
            <Jeans photos={photos} domRef={previewRef} />
          </div>
        </div>
      );
    }
    if (id === "youtube4r") {
      return (
        <div style={containerStyle} className="rounded-xl bg-white">
          <div style={scaleWrapStyle}>
            <YouTube4R photos={photos} domRef={previewRef} />
          </div>
        </div>
      );
    }
    if (id === "instagram4r") {
      return (
        <div style={containerStyle} className="rounded-xl bg-white">
          <div style={scaleWrapStyle}>
            <Instagram4R photos={photos} domRef={previewRef} />
          </div>
        </div>
      );
    }
    return (
      <div style={containerStyle} className="rounded-xl bg-white">
        <div style={scaleWrapStyle}>
          <DoublePhotoStrip photos={photos} domRef={previewRef} />
        </div>
      </div>
    );
  };
  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-105 ${
              selectedTemplate?.id === template.id
                ? "ring-4 ring-primary-500 shadow-2xl"
                : "shadow-lg hover:shadow-xl"
            }`}
          >
            <div
              className={`h-48 bg-white p-4 flex items-center justify-center`}
            >
              {renderPreview(template.id)}
            </div>
            <div
              className={`p-4 bg-gradient-to-br ${template.color} text-white`}
            >
              <h3 className="text-lg font-bold text-center">{template.name}</h3>
              <p className="text-xs text-center mt-1 opacity-90">
                {template.description}
              </p>
              <div className="mt-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 inline-block">
                <span className="text-xs font-semibold">
                  {template.requiredPhotos} foto
                </span>
              </div>
            </div>
            {selectedTemplate?.id === template.id && (
              <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-secondary-200 text-secondary-800 rounded-lg hover:bg-secondary-300 transition-colors"
        >
          Kembali
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedTemplate}
          className={`px-8 py-3 rounded-lg transition-colors ${
            selectedTemplate
              ? "bg-gradient-to-r from-primary-400 to-primary-600 text-white hover:from-primary-500 hover:to-primary-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Lanjutkan
        </button>
      </div>
    </div>
  );
};

export default TemplateSelection;

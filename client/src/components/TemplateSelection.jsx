const TemplateSelection = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onContinue,
  onBack,
}) => {
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
              className={`h-48 bg-gradient-to-br ${template.color} p-6 flex flex-col items-center justify-center text-white`}
            >
              <div className="text-5xl mb-3">{template.preview}</div>
              <h3 className="text-xl font-bold text-center">{template.name}</h3>
              <p className="text-sm text-center mt-2 opacity-90">
                {template.description}
              </p>
              <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
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

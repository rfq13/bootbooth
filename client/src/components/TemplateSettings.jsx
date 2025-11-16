const TemplateSettings = ({
  selectedTemplate,
  eventName,
  date,
  time,
  row,
  seat,
  onEventNameChange,
  onDateChange,
  onTimeChange,
  onRowChange,
  onSeatChange,
}) => {
  if (!selectedTemplate || !selectedTemplate.settings.eventName) {
    return null;
  }

  return (
    <div className="mt-8 bg-white/85 backdrop-blur-md rounded-3xl p-6 shadow-soft-lg border border-primary-200">
      <h2 className="text-xl font-semibold text-secondary-900 mb-4">
        Pengaturan Template
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Nama Event
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => onEventNameChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Tanggal
          </label>
          <input
            type="text"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Waktu
          </label>
          <input
            type="text"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Baris
            </label>
            <input
              type="text"
              value={row}
              onChange={(e) => onRowChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Kursi
            </label>
            <input
              type="text"
              value={seat}
              onChange={(e) => onSeatChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-primary-200 focus:border-primary-400 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSettings;

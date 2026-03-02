export default function ResultCard({ data }: any) {
  const severityColor =
    data.severity_level === "High"
      ? "text-red-500"
      : data.severity_level === "Medium"
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="mt-8 bg-gray-800 p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Prediction Result</h2>

      <p className={`text-xl font-semibold ${severityColor}`}>
        Severity: {data.severity_level}
      </p>

      <p className="mt-2">
        Estimated Damage: ₹{data.estimated_damage.toLocaleString()}
      </p>

      <div className="mt-4 space-y-1">
        <p>🚑 Ambulances: {data.recommended_resources.ambulances}</p>
        <p>👷 Rescue Teams: {data.recommended_resources.rescue_teams}</p>
        <p>🏕 Relief Camps: {data.recommended_resources.relief_camps}</p>
      </div>
    </div>
  );
}
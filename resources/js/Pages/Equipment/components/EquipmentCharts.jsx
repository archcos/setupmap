import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function EquipmentCharts({ graphData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
          {graphData.isSingleDay ? 'Hourly Utilization' : 'Daily Average Utilization'}
        </h2>
        {graphData.utilization.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graphData.utilization} margin={{ top: 10, right: 15, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" angle={!graphData.isSingleDay ? -45 : 0} textAnchor={!graphData.isSingleDay ? "end" : "middle"} height={60} tick={{ fontSize: 10 }} />
              <YAxis label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500">No utilization data</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
          {graphData.isSingleDay ? 'Hourly Power' : 'Daily Average Power'}
        </h2>
        {graphData.power.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={graphData.power} margin={{ top: 10, right: 15, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" angle={!graphData.isSingleDay ? -45 : 0} textAnchor={!graphData.isSingleDay ? "end" : "middle"} height={60} tick={{ fontSize: 10 }} />
              <YAxis label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip formatter={(v) => `${v}W`} />
              <Legend />
              <Line type="monotone" dataKey="power" stroke="#f59e0b" name="Power (W)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500">No power data</div>
        )}
      </div>
    </div>
  );
}
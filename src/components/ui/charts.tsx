import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

const palette = ["#67e8f9", "#22d3ee", "#a78bfa", "#f97316", "#22c55e", "#38bdf8"];

const axisStyle = { stroke: "#475569", tickLine: { stroke: "#334155" } };
const tickStyle = { fill: "#cbd5e1", fontSize: 12 };

export function SimpleBar({ data, xKey, yKey }: { data: any[]; xKey: string; yKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
        <XAxis dataKey={xKey} {...axisStyle} tick={tickStyle} />
        <YAxis allowDecimals={false} {...axisStyle} tick={tickStyle} />
        <Tooltip
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(148,163,184,0.3)", color: "#e2e8f0" }}
          labelStyle={{ color: "#cbd5e1" }}
        />
        <Bar dataKey={yKey} fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimplePie({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={labelKey} outerRadius={110} stroke="#0f172a" label>
          {data.map((_: any, idx: number) => (
            <Cell key={idx} fill={palette[idx % palette.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(148,163,184,0.3)", color: "#e2e8f0" }}
          labelStyle={{ color: "#cbd5e1" }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

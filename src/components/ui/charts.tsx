import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const BAR_COLOR = "#1e40af";
const axisStyle = {
  stroke: "rgba(255,255,255,0.75)",
  axisLine: { stroke: "rgba(255,255,255,0.5)" },
  tickLine: { stroke: "rgba(255,255,255,0.4)" }
};
const tickStyle = { fill: "#ffffff", fontSize: 12 };

const tooltipStyles = {
  contentStyle: {
    backgroundColor: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(148,163,184,0.3)",
    color: "#ffffff"
  },
  labelStyle: { color: "#ffffff" },
  itemStyle: { color: "#ffffff" }
};

const palette = ["#67e8f9", "#22d3ee", "#a78bfa", "#f97316", "#22c55e", "#38bdf8"];
const computeHeight = (length: number) => Math.min(Math.max(length * 44 + 120, 280), 540);
const BAR_SIZE = 30;

export function SimpleBar({ data, xKey, yKey }: { data: any[]; xKey: string; yKey: string }) {
  const height = computeHeight(data.length);
  const yTickStyle = { ...tickStyle, textAnchor: "end" as const };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          barGap={8}
          barCategoryGap="24%"
        >
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
            tickLine={false}
            tick={false}
          />
          <YAxis
            type="category"
            dataKey={xKey}
            width={200}
            interval={0}
            {...axisStyle}
            tick={yTickStyle}
            axisLine={false}
            tickLine={false}
            dx={-10}
          />
          <Tooltip {...tooltipStyles} />
          <Bar dataKey={yKey} fill={BAR_COLOR} radius={[0, 10, 10, 0]} barSize={BAR_SIZE} />
        </BarChart>
      </ResponsiveContainer>
    </div>
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
        <Tooltip {...tooltipStyles} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

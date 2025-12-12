import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import "./OpeningsChart.css";

const COLORS = [
    "#60a5fa", "#34d399", "#fbbf24", "#f87171",
    "#a78bfa", "#f472b6", "#4ade80", "#2dd4bf",
    "#fb7185", "#c084fc"
];

export default function OpeningsChart({ openings }: { openings: any[] }) {
    const data = openings.map((o, i) => ({
        name: o.name,
        value: o.games,
        color: COLORS[i % COLORS.length],
    }));

    return (
        <div className="openings-chart-card">
            <h4 className="chart-title">Top 10 obertures</h4>

            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                    >
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>

                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

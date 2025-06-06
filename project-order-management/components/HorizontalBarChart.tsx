
import React from 'react';

interface HorizontalBarChartDataItem {
  name: string;
  value: number;
}

interface HorizontalBarChartProps {
  data: HorizontalBarChartDataItem[];
  width: number;
  height: number;
  barColor?: string; // Single color for all bars
  chartTitle?: string; 
}

const DEFAULT_HORIZONTAL_BAR_COLORS = ['#0ea5e9', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc']; // Sky/Cyan shades

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  width,
  height,
  barColor, 
  chartTitle
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-slate-700 p-4 bg-slate-50 rounded-md">
        No data available for chart.
      </div>
    );
  }

  const chartData = data.slice(0, 5); 

  const paddingTop = 25;
  const paddingBottom = 35; 
  const paddingLeft = 160; 
  const paddingRight = 70; 

  const chartAreaHeight = height - paddingTop - paddingBottom;
  const chartAreaWidth = width - paddingLeft - paddingRight;

  const maxValue = Math.max(...chartData.map(d => d.value), 0);
  const barCount = chartData.length;
  
  const barGroupHeight = chartAreaHeight / barCount;
  const barPadding = barGroupHeight * 0.25; 
  const barThickness = Math.max(1, barGroupHeight - barPadding);

  const xScale = maxValue === 0 ? 0 : chartAreaWidth / maxValue;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-label={chartTitle || "Horizontal bar chart"}>
      {/* Subtle background for the chart plot area */}
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" rx="4" ry="4" /> {/* slate-50 */}

      <g transform={`translate(${paddingLeft}, ${paddingTop})`}>
        {chartData.map((d, i) => {
          const barW = Math.max(0, d.value * xScale);
          const y = i * barGroupHeight + barPadding / 2;
          const currentBarColor = barColor || DEFAULT_HORIZONTAL_BAR_COLORS[i % DEFAULT_HORIZONTAL_BAR_COLORS.length];

          return (
            <g key={d.name} className="group">
              <text
                x={-12} 
                y={y + barThickness / 2 + 4} 
                textAnchor="end"
                fontSize="12px"
                fill="#1e293b" // slate-800
                className="font-semibold truncate"
              >
                {d.name.length > 22 ? d.name.substring(0, 20) + '...' : d.name}
                <title>{d.name}</title> 
              </text>
              
              <rect
                x={0} y={y}
                width={barW} height={barThickness}
                fill={currentBarColor}
                rx="3" ry="3"
                className="transition-all duration-200 ease-in-out group-hover:opacity-80 group-hover:fill-sky-400"
              >
                <title>{`${d.name}: ${d.value.toLocaleString()}`}</title>
              </rect>

              <text
                x={barW + 8} 
                y={y + barThickness / 2 + 4} 
                textAnchor="start"
                fontSize="11px"
                fill="#334155" // slate-700 for value labels
                className="font-bold"
              >
                {d.value.toLocaleString(undefined, {notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1})}
              </text>
            </g>
          );
        })}
          
        <line x1="0" y1="0" x2="0" y2={chartAreaHeight} stroke="#cbd5e1" strokeWidth="1.5"/> {/* Y-axis line */}
        <line x1="0" y1={chartAreaHeight} x2={chartAreaWidth} y2={chartAreaHeight} stroke="#cbd5e1" strokeWidth="1.5"/> {/* X-axis line */}


        {/* X-axis Ticks and Labels */}
        {maxValue > 0 && Array.from({ length: 4 }).map((_, i, arr) => {
            const tickValue = (maxValue / (arr.length -1)) * i;
            if (i === 0 && tickValue === 0 && arr.length > 1 && (maxValue / (arr.length -1) * 1) === 0) return null; 
            const xPos = tickValue * xScale;
            return (
                <g key={`x-tick-${i}`} transform={`translate(${xPos}, ${chartAreaHeight})`} className="text-slate-600"> {/* Darker axis text */}
                    <line y1="0" y2="6" stroke="currentColor" strokeOpacity="0.5" />
                    <text y="20" textAnchor="middle" fontSize="10px" fill="currentColor" className="font-medium">
                        {tickValue.toLocaleString(undefined, {notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1})}
                    </text>
                </g>
            );
        })}
      </g>
    </svg>
  );
};

export default HorizontalBarChart;

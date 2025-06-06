
import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  width: number;
  height: number;
  barColor?: string;
  title?: string; 
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  width,
  height,
  barColor = '#0ea5e9', // sky-500
  title 
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-slate-600 p-4 bg-slate-50 rounded-md">
        No data to display in chart.
      </div>
    );
  }

  const paddingTop = 40; 
  const paddingBottom = 80; 
  const paddingLeft = 70;  
  const paddingRight = 30;
  
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const numYAxisTicks = 5;
  const barCount = data.length;
  
  const barGroupWidth = chartWidth / barCount;
  const barPadding = barGroupWidth * 0.25; 
  const barWidth = Math.max(1, barGroupWidth - barPadding);


  const yScale = maxValue === 0 ? 0 : chartHeight / maxValue;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} aria-label={title || "Bar chart"}>
      {/* Subtle background for the chart plot area */}
      <rect x="0" y="0" width={width} height={height} fill="#f8fafc" rx="4" ry="4" /> {/* slate-50 */}
      
      <g transform={`translate(${paddingLeft}, ${paddingTop})`}>
        {/* Y-axis Ticks and Labels */}
        {Array.from({ length: numYAxisTicks + 1 }).map((_, i) => {
          const tickValue = (maxValue / numYAxisTicks) * i;
          const yPos = chartHeight - tickValue * yScale;
          return (
            <g key={`y-tick-${i}`} className="text-slate-600"> {/* Darker axis text */}
              <line
                x1={-6} y1={yPos}
                x2={chartWidth} y2={yPos}
                stroke="currentColor" strokeOpacity="0.2" strokeDasharray="3,3"
              />
              <text
                x={-10} y={yPos + 4} 
                textAnchor="end" fontSize="11px" fill="currentColor"
                className="font-medium"
              >
                {tickValue.toLocaleString(undefined, {notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1})}
              </text>
            </g>
          );
        })}

        {/* Bars and X-axis Labels */}
        {data.map((d, i) => {
          const barH = Math.max(0, d.value * yScale); 
          const x = i * barGroupWidth + barPadding / 2;
          const y = chartHeight - barH;

          return (
            <g key={d.label} className="group">
              <rect
                x={x} y={y}
                width={barWidth} height={barH}
                fill={barColor}
                rx="3" ry="3"
                className="transition-all duration-200 ease-in-out group-hover:opacity-80 group-hover:fill-sky-400"
              >
                <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
              </rect>
              <text
                x={x + barWidth / 2} y={y - 6} 
                textAnchor="middle" fontSize="10px" fill="#0f172a" // slate-900 for value labels
                className="font-semibold transition-opacity duration-200 opacity-0 group-hover:opacity-100"
              >
                {d.value.toLocaleString(undefined, {notation: 'compact', compactDisplay: 'short', maximumFractionDigits:1})}
              </text>
              <foreignObject x={x - barGroupWidth/2 + barWidth/2} y={chartHeight + 10} width={barGroupWidth} height={paddingBottom - 10}>
                 <p 
                    className="text-xs text-slate-700 text-center break-words line-clamp-2 leading-tight p-1" // Darker X-axis label text
                    style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxHeight: '2.5em', 
                    }}
                    title={d.label}
                  >
                   {d.label}
                 </p>
              </foreignObject>
            </g>
          );
        })}
        
         {/* X-axis Line */}
        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Y-axis Line */}
        <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#cbd5e1" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

export default BarChart;

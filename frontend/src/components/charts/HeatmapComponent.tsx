import React from 'react';

interface HeatmapComponentProps {
  columns: string[];
  matrix: number[][];
  height?: number;
}

function interpolateColor(value: number): string {
  // value: -1 to 1
  // -1 -> red (#ef4444), 0 -> gray (#3d3f50), 1 -> blue (#6366f1)
  const clamp = Math.max(-1, Math.min(1, value));

  if (clamp < 0) {
    // interpolate between red and gray
    const t = clamp + 1; // 0 to 1 (0=red, 1=gray)
    const r = Math.round(0xef + (0x3d - 0xef) * t);
    const g = Math.round(0x44 + (0x3f - 0x44) * t);
    const b = Math.round(0x44 + (0x50 - 0x44) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // interpolate between gray and indigo
    const t = clamp; // 0 to 1 (0=gray, 1=indigo)
    const r = Math.round(0x3d + (0x63 - 0x3d) * t);
    const g = Math.round(0x3f + (0x66 - 0x3f) * t);
    const b = Math.round(0x50 + (0xf1 - 0x50) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function textColorForBg(value: number): string {
  // Use white text for strong correlations, muted for near zero
  return Math.abs(value) > 0.4 ? '#f1f5f9' : '#94a3b8';
}

const CELL_SIZE = 40;
const LABEL_WIDTH = 90;

const HeatmapComponent: React.FC<HeatmapComponentProps> = ({ columns, matrix, height }) => {
  const gridWidth = columns.length * CELL_SIZE + LABEL_WIDTH;

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: height ? 'auto' : 'visible',
        maxHeight: height ? height : undefined,
      }}
    >
      <div style={{ minWidth: gridWidth, userSelect: 'none' }}>
        {/* Top column labels */}
        <div style={{ display: 'flex', marginLeft: LABEL_WIDTH }}>
          {columns.map((col) => (
            <div
              key={col}
              title={col}
              style={{
                width: CELL_SIZE,
                height: 72,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 4,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: 10,
                  fontWeight: 500,
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  maxHeight: 68,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {col}
              </span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {matrix.map((row, rowIdx) => (
          <div key={columns[rowIdx]} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Row label */}
            <div
              title={columns[rowIdx]}
              style={{
                width: LABEL_WIDTH,
                height: CELL_SIZE,
                display: 'flex',
                alignItems: 'center',
                paddingRight: 8,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: '#94a3b8',
                  fontSize: 11,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  textAlign: 'right',
                }}
              >
                {columns[rowIdx]}
              </span>
            </div>

            {/* Cells */}
            {row.map((val, colIdx) => (
              <div
                key={colIdx}
                title={`${columns[rowIdx]} vs ${columns[colIdx]}: ${val.toFixed(4)}`}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: interpolateColor(val),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  borderRadius: 2,
                  margin: 1,
                  transition: 'opacity 0.15s',
                  cursor: 'default',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: textColorForBg(val),
                    letterSpacing: '-0.3px',
                  }}
                >
                  {val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ))}

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            paddingLeft: LABEL_WIDTH,
          }}
        >
          <span style={{ color: '#94a3b8', fontSize: 11 }}>-1</span>
          <div
            style={{
              flex: 1,
              maxWidth: 200,
              height: 8,
              borderRadius: 4,
              background: 'linear-gradient(to right, #ef4444, #3d3f50, #6366f1)',
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: 11 }}>+1</span>
        </div>
      </div>
    </div>
  );
};

export default HeatmapComponent;

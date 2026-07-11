import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

interface BubbleMapComponentProps {
  data: Array<{ location: string; size: number }>;
  locationCol: string;
  sizeCol: string;
  height?: number;
}

const BubbleMapComponent: React.FC<BubbleMapComponentProps> = ({ data, locationCol, sizeCol, height = 400 }) => {
  const plotData = useMemo(() => {
    const locations = data.map((d) => d.location);
    const sizes = data.map((d) => d.size);
    const text = data.map((d) => `${d.location}<br>${sizeCol}: ${d.size != null ? d.size.toLocaleString() : 0}`);

    // Normalize sizes for display (so max bubble is around 40px)
    const maxVal = Math.max(...sizes.filter((s) => s != null), 1);
    const markerSizes = sizes.map((s) => (s != null ? (Math.sqrt(s) / Math.sqrt(maxVal)) * 40 : 0));

    return [
      {
        type: 'scattergeo',
        locationmode: 'country names',
        locations: locations,
        text: text,
        hoverinfo: 'text',
        marker: {
          size: markerSizes,
          color: sizes,
          colorscale: [
            [0, '#6366f1'],   // Indigo
            [0.5, '#8b5cf6'], // Purple
            [1, '#ec4899'],   // Pink
          ],
          showscale: false,
          opacity: 0.85,
          line: {
            color: '#0f1117',
            width: 1,
          },
        },
      },
    ] as any;
  }, [data, sizeCol]);

  const layout = useMemo(() => {
    return {
      geo: {
        projection: { type: 'natural earth' },
        showland: true,
        landcolor: '#1a1d27',
        showocean: true,
        oceancolor: '#0f1117',
        showcountries: true,
        countrycolor: '#2d2f3e',
        bgcolor: 'transparent',
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 0, r: 0, b: 0, l: 0 },
      height: height,
      dragmode: 'pan',
    } as any;
  }, [height]);

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['toImage', 'select2d', 'lasso2d'],
    responsive: true,
    scrollZoom: true,
  };

  return (
    <div style={{ width: '100%', height: height, display: 'flex', justifyContent: 'center' }}>
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
};

export default BubbleMapComponent;

"use client";

import { createChart, ColorType, ISeriesApi, CandlestickData, CandlestickSeries, LineStyle, IChartApi } from 'lightweight-charts';
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface SentinelaChartProps {
  data: CandlestickData[];
  r_1h?: number;
  s_1h?: number;
  r_4h?: number;
  s_4h?: number;
}

export interface SentinelaChartHandle {
  takeScreenshot: () => string | null;
}

export const SentinelaChart = forwardRef<SentinelaChartHandle, SentinelaChartProps>(({
  data, r_1h, s_1h, r_4h, s_4h
}, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      if (!chartRef.current) return null;
      try {
        const canvas = chartRef.current.takeScreenshot();
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    }
  }));

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#020817' },
        textColor: '#94a3b8',
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Solid },
        horzLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Solid },
      },
      width: chartContainerRef.current.clientWidth,
      height: 460,
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        autoScale: true,
        scaleMargins: { top: 0.2, bottom: 0.2 },
      }
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    candlestickSeries.setData(data);
    candlestickSeriesRef.current = candlestickSeries;
    chartRef.current = chart;

    if (r_4h) candlestickSeries.createPriceLine({ price: r_4h, color: '#f43f5e', lineWidth: 3, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'RESISTÊNCIA 4H' });
    if (s_4h) candlestickSeries.createPriceLine({ price: s_4h, color: '#10b981', lineWidth: 3, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'SUPORTE 4H' });
    if (r_1h) candlestickSeries.createPriceLine({ price: r_1h, color: '#fb7185', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'RESISTÊNCIA 1H' });
    if (s_1h) candlestickSeries.createPriceLine({ price: s_1h, color: '#34d399', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'SUPORTE 1H' });

    if (data.length > 0) {
      chart.timeScale().setVisibleLogicalRange({ from: data.length - 300, to: data.length });
    }

    const handleResize = () => {
      if (!chartContainerRef.current) return;
      chart.resize(chartContainerRef.current.clientWidth, chartContainerRef.current.clientHeight || 460);
    };

    requestAnimationFrame(handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, r_1h, s_1h, r_4h, s_4h]);

  return <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />;
});

SentinelaChart.displayName = 'SentinelaChart';

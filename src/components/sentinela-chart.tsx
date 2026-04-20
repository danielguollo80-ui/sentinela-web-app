"use client";

import { createChart, ColorType, ISeriesApi, CandlestickData, CandlestickSeries, LineStyle } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

interface SentinelaChartProps {
  data: CandlestickData[];
  r_1h?: number;
  s_1h?: number;
  r_4h?: number;
  s_4h?: number;
}

export const SentinelaChart: React.FC<SentinelaChartProps> = ({ 
  data, 
  r_1h, 
  s_1h,
  r_4h,
  s_4h
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Solid },
        horzLines: { color: 'rgba(51, 65, 85, 0.2)', style: LineStyle.Solid },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        autoScale: true,
        scaleMargins: {
            top: 0.2,
            bottom: 0.2,
        },
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

    // Macro Levels (4H) - Stronger/Thicker
    if (r_4h) {
        candlestickSeries.createPriceLine({
            price: r_4h,
            color: '#f43f5e', 
            lineWidth: 3,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'RESISTANCE 4H',
        });
    }

    if (s_4h) {
        candlestickSeries.createPriceLine({
            price: s_4h,
            color: '#10b981', 
            lineWidth: 3,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'SUPPORT 4H',
        });
    }

    // Intraday Levels (1H) - Thinner/Solid
    if (r_1h) {
        candlestickSeries.createPriceLine({
            price: r_1h,
            color: '#f43f5e',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'RESISTANCE 1H',
        });
    }

    if (s_1h) {
        candlestickSeries.createPriceLine({
            price: s_1h,
            color: '#10b981',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'SUPPORT 1H',
        });
    }

    // Set visible range to last 150 candles for professional density
    if (data.length > 0) {
        chart.timeScale().setVisibleLogicalRange({
            from: data.length - 150,
            to: data.length,
        });
    }

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, r_1h, s_1h, r_4h, s_4h]);

  return <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />;
};

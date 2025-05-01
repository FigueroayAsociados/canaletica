import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { ReportingChartData, ReportingDataSeries } from '@/lib/services/reportingService';

interface LineChartProps {
  data: ReportingChartData;
  height?: number;
  showLegend?: boolean;
  showGridLines?: boolean;
  colors?: string[];
}

export function LineChartComponent({
  data,
  height = 300,
  showLegend = true,
  showGridLines = true,
  colors = ['#0369a1', '#4f46e5', '#0891b2', '#0d9488', '#6366f1']
}: LineChartProps) {
  
  // Preparar los datos en el formato que espera Recharts
  const formattedData = data.series[0]?.data.map(point => {
    const result: Record<string, any> = { date: point.date };
    
    data.series.forEach(series => {
      const matchingPoint = series.data.find(p => p.date === point.date);
      if (matchingPoint) {
        result[series.id] = matchingPoint.value;
      }
    });
    
    return result;
  }) || [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGridLines && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        {showLegend && <Legend />}
        
        {data.series.map((series, index) => (
          <Line
            key={series.id}
            type="monotone"
            dataKey={series.id}
            name={series.name}
            stroke={colors[index % colors.length]}
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  showLegend?: boolean;
  showGridLines?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export function BarChartComponent({
  data,
  height = 300,
  color = '#4f46e5',
  showLegend = false,
  showGridLines = true,
  layout = 'horizontal'
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGridLines && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
        
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey="name" />
            <YAxis />
          </>
        ) : (
          <>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" />
          </>
        )}
        
        <Tooltip />
        {showLegend && <Legend />}
        <Bar dataKey="value" fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
}

export function PieChartComponent({
  data,
  height = 300,
  colors = ['#0369a1', '#4f46e5', '#0891b2', '#0d9488', '#6366f1', '#8b5cf6', '#d946ef'],
  showLegend = true
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps {
  data: ReportingChartData;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  stacked?: boolean;
}

export function AreaChartComponent({
  data,
  height = 300,
  colors = ['#0369a1', '#4f46e5', '#0891b2', '#0d9488', '#6366f1'],
  showLegend = true,
  stacked = false
}: AreaChartProps) {
  
  // Preparar los datos en el formato que espera Recharts
  const formattedData = data.series[0]?.data.map(point => {
    const result: Record<string, any> = { date: point.date };
    
    data.series.forEach(series => {
      const matchingPoint = series.data.find(p => p.date === point.date);
      if (matchingPoint) {
        result[series.id] = matchingPoint.value;
      }
    });
    
    return result;
  }) || [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        {showLegend && <Legend />}
        
        {data.series.map((series, index) => (
          <Area
            key={series.id}
            type="monotone"
            dataKey={series.id}
            name={series.name}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.3}
            stackId={stacked ? "1" : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
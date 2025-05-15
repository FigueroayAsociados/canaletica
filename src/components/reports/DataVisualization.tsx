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
import { SafeRender } from '@/components/ui/safe-render';

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
  
  // Validación de datos
  const isDataValid = data && 
                     data.series && 
                     Array.isArray(data.series) && 
                     data.series.length > 0 &&
                     data.series[0] && 
                     Array.isArray(data.series[0].data) && 
                     data.series[0].data.length > 0;
  
  // Preparar los datos en el formato que espera Recharts (solo si los datos son válidos)
  const formattedData = isDataValid 
    ? data.series[0].data.map(point => {
        const result: Record<string, any> = { date: point.date };
        
        data.series.forEach(series => {
          if (series && Array.isArray(series.data)) {
            const matchingPoint = series.data.find(p => p && p.date === point.date);
            if (matchingPoint && typeof matchingPoint.value === 'number') {
              result[series.id] = matchingPoint.value;
            }
          }
        });
        
        return result;
      })
    : [];

  // Fallback para cuando no hay datos
  const NoDataView = () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-50 rounded-md border border-gray-200">
      <p className="text-gray-500 text-sm">No hay datos disponibles</p>
    </div>
  );

  return (
    <SafeRender
      condition={isDataValid && formattedData.length > 0}
      fallback={<div style={{ width: '100%', height }}><NoDataView /></div>}
    >
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
              key={series.id || `series-${index}`}
              type="monotone"
              dataKey={series.id}
              name={series.name || `Serie ${index + 1}`}
              stroke={colors[index % colors.length]}
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </SafeRender>
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
  // Validación de datos
  const isDataValid = data && 
                     Array.isArray(data) && 
                     data.length > 0 &&
                     data.every(item => item && typeof item === 'object' && 
                                      typeof item.name === 'string' && 
                                      typeof item.value === 'number');
  
  // Filtrar datos válidos (solo por seguridad)
  const validData = isDataValid 
    ? data.filter(item => item && typeof item.name === 'string' && typeof item.value === 'number')
    : [];

  // Fallback para cuando no hay datos
  const NoDataView = () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-50 rounded-md border border-gray-200">
      <p className="text-gray-500 text-sm">No hay datos disponibles</p>
    </div>
  );

  return (
    <SafeRender
      condition={isDataValid && validData.length > 0}
      fallback={<div style={{ width: '100%', height }}><NoDataView /></div>}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={validData}
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
    </SafeRender>
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
  // Validación de datos
  const isDataValid = data && 
                     Array.isArray(data) && 
                     data.length > 0 &&
                     data.every(item => item && typeof item === 'object' && 
                                      typeof item.name === 'string' && 
                                      typeof item.value === 'number');
  
  // Filtrar datos válidos para evitar errores
  const validData = isDataValid 
    ? data.filter(item => item && typeof item.name === 'string' && typeof item.value === 'number')
    : [];

  // Fallback para cuando no hay datos
  const NoDataView = () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-50 rounded-md border border-gray-200">
      <p className="text-gray-500 text-sm">No hay datos disponibles</p>
    </div>
  );

  return (
    <SafeRender
      condition={isDataValid && validData.length > 0}
      fallback={<div style={{ width: '100%', height }}><NoDataView /></div>}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={validData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {validData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </SafeRender>
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
  
  // Validación de datos
  const isDataValid = data && 
                     data.series && 
                     Array.isArray(data.series) && 
                     data.series.length > 0 &&
                     data.series[0] && 
                     Array.isArray(data.series[0].data) && 
                     data.series[0].data.length > 0;
  
  // Preparar los datos en el formato que espera Recharts (solo si los datos son válidos)
  const formattedData = isDataValid 
    ? data.series[0].data.map(point => {
        const result: Record<string, any> = { date: point.date };
        
        data.series.forEach(series => {
          if (series && Array.isArray(series.data)) {
            const matchingPoint = series.data.find(p => p && p.date === point.date);
            if (matchingPoint && typeof matchingPoint.value === 'number') {
              result[series.id] = matchingPoint.value;
            }
          }
        });
        
        return result;
      })
    : [];

  // Fallback para cuando no hay datos
  const NoDataView = () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-50 rounded-md border border-gray-200">
      <p className="text-gray-500 text-sm">No hay datos disponibles</p>
    </div>
  );

  return (
    <SafeRender
      condition={isDataValid && formattedData.length > 0}
      fallback={<div style={{ width: '100%', height }}><NoDataView /></div>}
    >
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
              key={series.id || `series-${index}`}
              type="monotone"
              dataKey={series.id}
              name={series.name || `Serie ${index + 1}`}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.3}
              stackId={stacked ? "1" : undefined}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </SafeRender>
  );
}
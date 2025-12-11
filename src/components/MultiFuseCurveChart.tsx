import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Label, Scatter, ZAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFuseData, fuseTripTimeExplain, getAvailableFuseSizes } from "@/lib/fuseCurves";

interface MultiFuseCurveChartProps {
  manufacturer: string;
  fuseType: string;
  highlightCurrent?: number;
  highlightLabel?: string;
  selectedFuseSize?: number;  // Optional: highlight a specific fuse size
}

const COLORS = [
  "hsl(0, 70%, 50%)",    // Red
  "hsl(30, 70%, 50%)",   // Orange
  "hsl(60, 70%, 50%)",   // Yellow
  "hsl(120, 70%, 40%)",  // Green
  "hsl(180, 70%, 40%)",  // Cyan
  "hsl(240, 70%, 50%)",  // Blue
  "hsl(270, 70%, 50%)",  // Purple
  "hsl(300, 70%, 50%)",  // Magenta
  "hsl(15, 70%, 50%)",
  "hsl(45, 70%, 50%)",
  "hsl(90, 70%, 40%)",
  "hsl(210, 70%, 50%)",
];

export function MultiFuseCurveChart({
  manufacturer,
  fuseType,
  highlightCurrent,
  highlightLabel = "Arbejdspunkt",
  selectedFuseSize
}: MultiFuseCurveChartProps) {

  // Get all available fuse sizes and their curves
  const { chartData, tripPoints, error, sizes } = useMemo(() => {
    try {
      const sizes = getAvailableFuseSizes(manufacturer, fuseType);

      if (sizes.length === 0) {
        return {
          chartData: [],
          tripPoints: [],
          error: "Ingen sikringsstørrelser tilgængelige",
          sizes: []
        };
      }

      // Check if curve uses absolute Ik values or multipliers
      // Diazed, Neozed, and Knivsikring use absolute Ik values
      // MCB uses multipliers (m = Ik/In)
      const isAbsoluteCurve = fuseType.includes("Diazed") ||
                              fuseType.includes("Neozed") ||
                              fuseType.includes("Knivsikring") ||
                              fuseType.includes("NH");

      // Collect all curve points from all sizes
      const sizeData: Record<number, Array<{ current: number; time: number }>> = {};
      const tripPoints: Array<{ size: number; current: number; time: number; explanation: string }> = [];

      sizes.forEach(size => {
        try {
          const { curvePoints, InCurve } = getFuseData(manufacturer, fuseType, size);

          const curveData = curvePoints.map(([xVal, time]) => {
            const current = isAbsoluteCurve ? xVal : xVal * InCurve;
            return { current, time };
          });

          sizeData[size] = curveData;

          // Calculate trip point for this size if current is highlighted
          if (highlightCurrent && highlightCurrent > 0) {
            try {
              const { time, explanation } = fuseTripTimeExplain(
                InCurve,
                highlightCurrent,
                curvePoints,
                isAbsoluteCurve
              );

              if (time > 0) {
                tripPoints.push({
                  size,
                  current: highlightCurrent,
                  time,
                  explanation
                });
              } else {
                console.warn(`Trip time is 0 or negative for size ${size}A at ${highlightCurrent}A`);
              }
            } catch (err) {
              console.error(`Failed to calculate trip time for size ${size}A at ${highlightCurrent}A:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to load curve for size ${size}:`, err);
        }
      });

      // Find the overall current range across all fuses
      let minCurrent = Infinity;
      let maxCurrent = -Infinity;

      Object.values(sizeData).forEach(curve => {
        curve.forEach(point => {
          if (point.current > 0 && isFinite(point.current)) {
            minCurrent = Math.min(minCurrent, point.current);
            maxCurrent = Math.max(maxCurrent, point.current);
          }
        });
      });

      // Generate uniform logarithmically-spaced current values for smooth curves
      const numPoints = 200;
      const logMin = Math.log10(minCurrent);
      const logMax = Math.log10(maxCurrent);
      const logStep = (logMax - logMin) / (numPoints - 1);

      const uniformCurrents = Array.from({ length: numPoints }, (_, i) => {
        return Math.pow(10, logMin + i * logStep);
      });

      // Build unified dataset where each row has current + time for each fuse size
      const chartData = uniformCurrents.map(current => {
        const dataPoint: Record<string, number | null> = { current };

        sizes.forEach(size => {
          const curve = sizeData[size];
          if (!curve || curve.length === 0) {
            dataPoint[`time_${size}`] = null;
            return;
          }

          // Find surrounding points for smooth log-log interpolation
          const before = curve.filter(p => p.current <= current).pop();
          const after = curve.find(p => p.current >= current);

          if (before && after && before.current === after.current) {
            // Exact match
            dataPoint[`time_${size}`] = before.time;
          } else if (before && after) {
            // Log-log interpolation for smooth curve
            const logCurrent = Math.log10(current);
            const logBefore = Math.log10(before.current);
            const logAfter = Math.log10(after.current);
            const logTimeBefore = Math.log10(before.time);
            const logTimeAfter = Math.log10(after.time);

            const ratio = (logCurrent - logBefore) / (logAfter - logBefore);
            const logTime = logTimeBefore + ratio * (logTimeAfter - logTimeBefore);
            dataPoint[`time_${size}`] = Math.pow(10, logTime);
          } else {
            // Outside curve range
            dataPoint[`time_${size}`] = null;
          }
        });

        return dataPoint;
      });

      console.log(`MultiFuseCurveChart: Calculated ${tripPoints.length} trip points for ${sizes.length} fuse sizes`);
      console.log(`Highlight current: ${highlightCurrent}, Selected fuse: ${selectedFuseSize}`);
      if (tripPoints.length > 0) {
        console.log(`Trip points:`, tripPoints.map(tp => `${tp.size}A @ ${tp.current.toFixed(1)}A = ${tp.time.toFixed(3)}s`));
      }

      return { chartData, tripPoints, error: null, sizes };
    } catch (err) {
      console.error("Failed to load fuse curves:", err);
      return {
        chartData: [],
        tripPoints: [],
        error: err instanceof Error ? err.message : "Kunne ikke indlæse sikringskurver",
        sizes: []
      };
    }
  }, [manufacturer, fuseType, highlightCurrent, selectedFuseSize]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sikringskurver</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!Array.isArray(chartData) || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sikringskurver</CardTitle>
          <CardDescription>Ingen kurvedata tilgængelig</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain for axes from unified dataset
  const validCurrents: number[] = [];
  const allTimes: number[] = [];

  chartData.forEach(dataPoint => {
    if (dataPoint.current > 0 && isFinite(dataPoint.current)) {
      validCurrents.push(dataPoint.current);
    }

    sizes.forEach(size => {
      const time = dataPoint[`time_${size}`];
      if (time && time > 0 && isFinite(time)) {
        allTimes.push(time);
      }
    });
  });

  // Include trip point times to ensure they're visible on the chart
  tripPoints.forEach(tp => {
    if (tp.time > 0 && isFinite(tp.time)) {
      allTimes.push(tp.time);
    }
  });

  if (validCurrents.length === 0 || allTimes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sikringskurver</CardTitle>
          <CardDescription className="text-destructive">Ingen gyldige kurvedata</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const minCurrent = Math.min(...validCurrents);
  const maxCurrent = Math.max(...validCurrents);
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);

  const currentDomain: [number, number] = [
    Math.pow(10, Math.floor(Math.log10(minCurrent))),
    Math.pow(10, Math.ceil(Math.log10(maxCurrent)))
  ];

  // For time domain, ensure we include very fast trip times by using power-of-10 for min as well
  const timeDomain: [number, number] = [
    Math.pow(10, Math.floor(Math.log10(minTime))),  // Use power-of-10 to include fast trip times
    Math.pow(10, Math.ceil(Math.log10(maxTime)))
  ];

  console.log(`Time domain: [${timeDomain[0].toFixed(6)}s, ${timeDomain[1].toFixed(1)}s], minTime from data: ${minTime.toFixed(6)}s`);

  // Generate logarithmic ticks (1, 2, 3, ..., 9, 10, 20, 30, ..., 90, 100, ...)
  const generateLogTicks = (min: number, max: number): number[] => {
    const ticks: number[] = [];
    const minPower = Math.floor(Math.log10(min));
    const maxPower = Math.ceil(Math.log10(max));

    for (let power = minPower; power <= maxPower; power++) {
      const base = Math.pow(10, power);
      for (let i = 1; i <= 9; i++) {
        const tick = i * base;
        if (tick >= min && tick <= max) {
          ticks.push(tick);
        }
      }
    }
    return ticks;
  };

  const currentTicks = generateLogTicks(currentDomain[0], currentDomain[1]);
  const timeTicks = generateLogTicks(timeDomain[0], timeDomain[1]);

  // Chart config for all sizes
  const chartConfig: Record<string, { label: string; color: string }> = {};
  sizes.forEach((size, idx) => {
    chartConfig[`curve_${size}`] = {
      label: `${size} A`,
      color: COLORS[idx % COLORS.length]
    };
  });

  const formatLogTick = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    if (value >= 1) return value.toFixed(0);
    if (value >= 0.1) return value.toFixed(1);
    if (value >= 0.01) return value.toFixed(2);
    return value.toFixed(3);
  };

  const formatTime = (time: number) => {
    if (time >= 3600) return `${(time / 3600).toFixed(1)} timer`;
    if (time >= 60) return `${(time / 60).toFixed(1)} min`;
    if (time >= 1) return `${time.toFixed(2)} s`;
    return `${(time * 1000).toFixed(0)} ms`;
  };

  const formatTooltip = (value: number, name: string) => {
    if (name.startsWith("time_")) {
      return formatTime(value);
    }
    return value;
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-2">
        <ChartContainer config={chartConfig} className="w-full max-w-[480px] aspect-square">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 40, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />

            <XAxis
              dataKey="current"
              type="number"
              scale="log"
              domain={currentDomain}
              ticks={currentTicks}
              tickFormatter={formatLogTick}
              allowDataOverflow={false}
              label={{
                value: 'Strøm (A)',
                position: 'insideBottom',
                offset: -10,
                style: { textAnchor: 'middle' }
              }}
            />

            <YAxis
              type="number"
              scale="log"
              domain={timeDomain}
              ticks={timeTicks}
              tickFormatter={formatLogTick}
              allowDataOverflow={false}
              label={{
                value: 'Tid (s)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const dataPoint = payload[0].payload;
                if (!dataPoint) return null;

                // Only show tooltip for selected fuse
                if (!selectedFuseSize) return null;

                const selectedValue = dataPoint[`time_${selectedFuseSize}`];
                if (!selectedValue || selectedValue <= 0) return null;

                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <div className="text-sm font-medium mb-2">
                      Strøm: {formatLogTick(dataPoint.current)} A
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: "hsl(var(--destructive))" }}
                      />
                      <span>{selectedFuseSize} A: {formatTime(selectedValue)}</span>
                    </div>
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="top"
              height={40}
              layout="horizontal"
              wrapperStyle={{
                fontSize: '9px',
                lineHeight: '1.2',
                paddingTop: '5px'
              }}
              iconSize={8}
            />

            {/* Draw each curve with shared dataset */}
            {sizes.map((size, idx) => {
              const isSelected = selectedFuseSize === size;

              return (
                <Line
                  key={size}
                  type="monotone"
                  dataKey={`time_${size}`}
                  stroke={isSelected ? "hsl(var(--destructive))" : COLORS[idx % COLORS.length]}
                  strokeWidth={isSelected ? 4 : 2}
                  dot={false}
                  isAnimationActive={false}
                  name={`${size} A`}
                  connectNulls={false}
                  opacity={selectedFuseSize && !isSelected ? 0.4 : 1}
                />
              );
            })}

            {/* Highlight current line */}
            {highlightCurrent && highlightCurrent > 0 && (
              <ReferenceLine
                x={highlightCurrent}
                stroke="hsl(var(--destructive))"
                strokeWidth={3}
                strokeDasharray="8 4"
              />
            )}

            {/* Show horizontal time line for selected fuse */}
            {selectedFuseSize && highlightCurrent && tripPoints.length > 0 && (() => {
              const selectedTripPoint = tripPoints.find(tp => tp.size === selectedFuseSize);
              if (!selectedTripPoint) return null;

              return (
                <ReferenceLine
                  y={selectedTripPoint.time}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                />
              );
            })()}

            {/* Trip points - only show for selected fuse */}
            {tripPoints.length > 0 && selectedFuseSize && (() => {
              const selectedTripPoint = tripPoints.find(tp => tp.size === selectedFuseSize);
              if (!selectedTripPoint) return null;

              return (
                <>
                  <Scatter
                    data={[selectedTripPoint]}
                    fill="hsl(var(--destructive))"
                    shape="circle"
                  />
                  <ZAxis range={[200, 200]} />
                </>
              );
            })()}
          </LineChart>
        </ChartContainer>

        {/* Show trip time for selected fuse */}
        {selectedFuseSize && highlightCurrent && tripPoints.length > 0 && (() => {
          const selectedTripPoint = tripPoints.find(tp => tp.size === selectedFuseSize);
          if (!selectedTripPoint) return null;

          return (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="font-semibold text-destructive">{selectedFuseSize} A</span>
                <span className="text-muted-foreground">ved {highlightCurrent.toFixed(1)} A:</span>
                <span className="font-bold text-destructive">{formatTime(selectedTripPoint.time)}</span>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

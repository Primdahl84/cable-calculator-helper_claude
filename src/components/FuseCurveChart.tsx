import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Label, Tooltip, Scatter, ZAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFuseData, fuseTripTimeExplain } from "@/lib/fuseCurves";

interface FuseCurveChartProps {
  manufacturer: string;  // e.g., "Standard"
  fuseType: string;       // e.g., "Diazed gG", "MCB C", "Neozed gG"
  fuseSize: number;       // e.g., 25 (A)
  highlightCurrent?: number;  // Optional: mark a specific current (e.g., cable design current)
  highlightLabel?: string;    // Optional: label for highlighted current
}

export function FuseCurveChart({
  manufacturer,
  fuseType,
  fuseSize,
  highlightCurrent,
  highlightLabel = "Arbejdspunkt"
}: FuseCurveChartProps) {

  // Get fuse curve data and calculate trip point if current is highlighted
  const { chartData, InCurve, tripPoint, error } = useMemo(() => {
    try {
      const { curvePoints, InCurve } = getFuseData(manufacturer, fuseType, fuseSize);

      // Check if curve uses absolute Ik values or multipliers
      // Diazed, Neozed, and Knivsikring use absolute Ik values
      // MCB uses multipliers (m = Ik/In)
      const isAbsoluteCurve = fuseType.includes("Diazed") ||
                              fuseType.includes("Neozed") ||
                              fuseType.includes("Knivsikring") ||
                              fuseType.includes("NH");

      // Convert curve points to chart data with logarithmic values
      const chartData = curvePoints.map(([xVal, time]) => {
        // For absolute curves (like NEOZED), xVal is already Ik in amperes
        // For normalized curves (like MCB), xVal is m = Ik/In
        const current = isAbsoluteCurve ? xVal : xVal * InCurve;

        return {
          current: current,
          time: time,
          // Keep original values for precise calculations
          _originalX: xVal,
          _originalTime: time
        };
      });

      console.log(`FuseCurveChart: ${fuseType} ${fuseSize}A, isAbsolute=${isAbsoluteCurve}, points=${chartData.length}, currentRange=[${Math.min(...chartData.map(d => d.current)).toFixed(1)}, ${Math.max(...chartData.map(d => d.current)).toFixed(1)}]`);
      console.log('First 3 chart points:', chartData.slice(0, 3));
      console.log('Last 3 chart points:', chartData.slice(-3));

      // Calculate trip point if current is highlighted
      let tripPoint = null;
      if (highlightCurrent && highlightCurrent > 0) {
        try {
          const { time, explanation } = fuseTripTimeExplain(
            InCurve,
            highlightCurrent,
            curvePoints,
            isAbsoluteCurve
          );

          if (time > 0) {
            tripPoint = {
              current: highlightCurrent,
              time: time,
              explanation: explanation
            };
          }
        } catch (err) {
          console.error("Failed to calculate trip time:", err);
        }
      }

      return { chartData, InCurve, tripPoint, error: null };
    } catch (err) {
      console.error("Failed to load fuse curve:", err);
      return {
        chartData: [],
        InCurve: fuseSize,
        tripPoint: null,
        error: err instanceof Error ? err.message : "Kunne ikke indlæse sikringskurve"
      };
    }
  }, [manufacturer, fuseType, fuseSize, highlightCurrent]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sikringskurve</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sikringskurve</CardTitle>
          <CardDescription>Ingen kurvedata tilgængelig</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate domain for axes - ensure all values are positive and valid
  const validCurrents = chartData.map(d => d.current).filter(v => v > 0 && isFinite(v));
  const validTimes = chartData.map(d => d.time).filter(v => v > 0 && isFinite(v));

  if (validCurrents.length === 0 || validTimes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sikringskurve</CardTitle>
          <CardDescription className="text-destructive">Ingen gyldige kurvedata</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const minCurrent = Math.min(...validCurrents);
  const maxCurrent = Math.max(...validCurrents);
  const minTime = Math.min(...validTimes);
  const maxTime = Math.max(...validTimes);

  // Expand domain to show full curve
  const currentDomain: [number, number] = [
    Math.pow(10, Math.floor(Math.log10(minCurrent))),
    Math.pow(10, Math.ceil(Math.log10(maxCurrent)))
  ];
  const timeDomain: [number, number] = [
    Math.pow(10, Math.floor(Math.log10(minTime))),
    Math.pow(10, Math.ceil(Math.log10(maxTime)))
  ];

  console.log(`Domain: current=[${currentDomain[0]}, ${currentDomain[1]}], time=[${timeDomain[0]}, ${timeDomain[1]}], highlightCurrent=${highlightCurrent}`);

  const chartConfig = {
    time: {
      label: "Tid (s)",
      color: "hsl(var(--chart-1))",
    },
    tripPoint: {
      label: "Udløsningspunkt",
      color: "hsl(var(--destructive))",
    },
  };

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

  // Custom tick formatter for logarithmic scale
  const formatLogTick = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    if (value >= 1) return value.toFixed(0);
    if (value >= 0.1) return value.toFixed(1);
    if (value >= 0.01) return value.toFixed(2);
    return value.toFixed(3);
  };

  // Custom tooltip formatter
  const formatTooltip = (value: number, name: string) => {
    if (name === "time") {
      if (value >= 3600) return `${(value / 3600).toFixed(2)} timer`;
      if (value >= 60) return `${(value / 60).toFixed(2)} min`;
      if (value >= 1) return `${value.toFixed(2)} s`;
      return `${(value * 1000).toFixed(0)} ms`;
    }
    return value;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tid-strøm karakteristik</CardTitle>
        <CardDescription>
          {fuseType} {InCurve}A - Udløsningstid vs. strøm
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full max-w-[700px] aspect-square mx-auto">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 60, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />

            {/* Logarithmic X-axis (Current) */}
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

            {/* Logarithmic Y-axis (Time) */}
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
                const data = payload[0].payload;
                if (!data) return null;

                // Check if this is the trip point
                const isTripPoint = data.current === tripPoint?.current;

                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    {isTripPoint && (
                      <div className="text-xs font-semibold text-destructive mb-2">
                        ⚡ UDLØSNINGSPUNKT
                      </div>
                    )}
                    <div className="text-sm font-medium mb-1">
                      Strøm: {formatLogTick(data.current)} A
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tid: {formatTooltip(data.time, "time")}
                    </div>
                  </div>
                );
              }}
            />

            {/* Main curve line */}
            <Line
              type="monotone"
              dataKey="time"
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />

            {/* Trip point marker */}
            {tripPoint && (
              <>
                {/* Vertical reference line at trip current */}
                <ReferenceLine
                  x={tripPoint.current}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                >
                  <Label
                    value={highlightLabel || `${formatLogTick(tripPoint.current)} A`}
                    position="top"
                    fill="hsl(var(--destructive))"
                    fontSize={12}
                  />
                </ReferenceLine>

                {/* Horizontal reference line at trip time */}
                <ReferenceLine
                  y={tripPoint.time}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                >
                  <Label
                    value={formatTooltip(tripPoint.time, "time")}
                    position="right"
                    fill="hsl(var(--destructive))"
                    fontSize={12}
                  />
                </ReferenceLine>

                {/* Scatter point at intersection */}
                <Scatter
                  data={[tripPoint]}
                  fill="hsl(var(--destructive))"
                  shape="circle"
                />
                <ZAxis range={[200, 200]} />
              </>
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

import fs from 'fs';

let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf8');

// 1. Replace State & slicedData mapping
const originalStateStr = `  // Zoom / Pan State
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 60]);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  // Take up to 60 daily data points for crisp rendering
  const slicedData = useMemo(() => data.slice(0, 60), [data]);`;

const newStateStr = `  // Zoom / Pan State
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 60]);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  // Multi-Station Comparison State
  const [activeStations, setActiveStations] = useState<string[]>([selectedStationId && selectedStationId !== 'ALL' ? selectedStationId : 'BOM']);
  const [isStationSelectorOpen, setIsStationSelectorOpen] = useState(false);

  useEffect(() => {
    if (selectedStationId && selectedStationId !== 'ALL') {
      setActiveStations([selectedStationId]);
    } else if (selectedStationId === 'ALL' && activeStations.length === 0) {
      setActiveStations(['BOM']);
    }
  }, [selectedStationId]);

  const primaryStationId = activeStations[0] || 'BOM';
  
  // Isolate primary station for baseline metrics to not break legacy functionality
  const primaryData = useMemo(() => {
    const filtered = data.filter(d => d.stationId === primaryStationId);
    return filtered.slice(0, 60);
  }, [data, primaryStationId]);

  const slicedData = primaryData;`;

content = content.replace(originalStateStr, newStateStr);

// 2. Modify fullChartData return block
const fullChartDataReturnStart = `      return {
        date: mmdd,
        fullDate: d.date,`;

const fullChartDataReplacement = `      const baseObj = {
        date: mmdd,
        fullDate: d.date,`;

content = content.replace(fullChartDataReturnStart, fullChartDataReplacement);

const fullChartDataReturnEnd = `        anomalyType: anomalyMeta.type,
        anomalyDiff: anomalyMeta.absDiff,
        anomalyZScore: anomalyMeta.zScore,
      };
    });
  }, [`;

const fullChartDataEndReplacement = `        anomalyType: anomalyMeta.type,
        anomalyDiff: anomalyMeta.absDiff,
        anomalyZScore: anomalyMeta.zScore,
      };
      
      // Inject comparison stations
      activeStations.slice(1).forEach((stId) => {
        const compRow = data.find(x => x.stationId === stId && x.date === d.date);
        if (compRow) {
          baseObj[\`\${stId}_observed\`] = compRow.observedMm;
          baseObj[\`\${stId}_aiCorrected\`] = compRow.correctedForecastMm;
        }
      });
      
      return baseObj;
    });
  }, [
    activeStations,
    data,`;

content = content.replace(fullChartDataReturnEnd, fullChartDataEndReplacement);

// 3. UI Header for Multi-Station
const headerUI = `            <span className={\`text-xs font-semibold px-2 py-0.5 rounded \${
              isDark ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono' : 'bg-slate-100 text-slate-600 border border-slate-200'
            }\`}>
              {selectedStationName}
            </span>`;

const newHeaderUI = `            <div className="relative">
              <button
                onClick={() => setIsStationSelectorOpen(!isStationSelectorOpen)}
                className={\`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer \${
                  isDark ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 hover:bg-cyan-900 font-mono' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }\`}
              >
                {activeStations.length === 1 ? selectedStationName : \`\${activeStations.length} Stations Compared\`}
                <ChevronDown className="w-3 h-3" />
              </button>

              {isStationSelectorOpen && (
                <div className={\`absolute top-full left-0 mt-1 w-64 rounded-xl border shadow-2xl z-50 p-2 \${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }\`}>
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">Compare Stations</div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {MET_STATIONS.map(st => {
                      const isActive = activeStations.includes(st.id);
                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            if (isActive && activeStations.length > 1) {
                              setActiveStations(activeStations.filter(id => id !== st.id));
                            } else if (!isActive && activeStations.length < 5) {
                              setActiveStations([...activeStations, st.id]);
                            }
                          }}
                          className={\`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors \${
                            isActive 
                              ? (isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-50 text-blue-700 font-semibold')
                              : (isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600')
                          }\`}
                        >
                          <div className={\`w-3 h-3 rounded flex items-center justify-center border \${isActive ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500'}\`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="truncate">{st.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>`;

content = content.replace(headerUI, newHeaderUI);

// 4. Inject Comparison Lines into the chart
const aiCorrectedLine = `              {/* AI Corrected (Blue/Cyan bold, high fidelity, with custom D3 Anomaly Dot Renderer) */}
              <Line
                type="monotone"
                dataKey="aiCorrected"`;

const multiStationLines = `              {/* Comparison Stations dynamically rendered */}
              {activeStations.slice(1).map((stId, idx) => {
                const color = ['#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#3b82f6'][idx % 5];
                return (
                  <React.Fragment key={stId}>
                    <Line
                      type="monotone"
                      dataKey={\`\${stId}_observed\`}
                      stroke={color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      isAnimationActive={true}
                    />
                    <Line
                      type="monotone"
                      dataKey={\`\${stId}_aiCorrected\`}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </React.Fragment>
                );
              })}
              
              {/* AI Corrected (Blue/Cyan bold, high fidelity, with custom D3 Anomaly Dot Renderer) */}
              <Line
                type="monotone"
                dataKey="aiCorrected"`;

content = content.replace(aiCorrectedLine, multiStationLines);

// 5. Add Brush for Pinch-to-zoom area selection
const xAxisStr = `              <XAxis
                dataKey="date"`;
                
const brushStr = `              <Brush 
                dataKey="date" 
                height={30} 
                stroke={isDark ? '#475569' : '#cbd5e1'} 
                fill={isDark ? '#0f172a' : '#f8fafc'}
                tickFormatter={(val) => val}
                className="text-xs"
              />
              <XAxis
                dataKey="date"`;

content = content.replace(xAxisStr, brushStr);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('Script completed');

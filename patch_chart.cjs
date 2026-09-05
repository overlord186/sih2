const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

const target = `  const CustomTooltip = ({ active, payload }: any) => {
    // Sonification Effect on Hover
    useEffect(() => {
      if (active && payload && payload.length) {
        const item = payload[0].payload;
        weatherSynth.init();
        weatherSynth.playRainSound(item.aiCorrected);
        
        // Dispatch ambient background event for the whole app
        const event = new CustomEvent('app-ambient-update', { 
            detail: { regime: item.regime } 
        });
        window.dispatchEvent(event);
      } else {
        const event = new CustomEvent('app-ambient-update', { 
            detail: { regime: null } 
        });
        window.dispatchEvent(event);
      }
    }, [active, payload ? payload[0]?.payload?.fullDate : null]);`;

const replacement = `  const CustomTooltip = ({ active, payload }: any) => {
    // Sonification Effect on Hover
    useEffect(() => {
      if (active && payload && payload.length) {
        const item = payload[0].payload;
        weatherSynth.init();
        weatherSynth.playRainSound(item.aiCorrected);
        
        // Dispatch ambient background event for the whole app
        const event = new CustomEvent('app-ambient-update', { 
            detail: { regime: item.regime, intensity: item.aiCorrected } 
        });
        window.dispatchEvent(event);
      } else {
        weatherSynth.playRainSound(0);
        const event = new CustomEvent('app-ambient-update', { 
            detail: { regime: null, intensity: 0 } 
        });
        window.dispatchEvent(event);
      }
    }, [active, payload ? payload[0]?.payload?.fullDate : null]);`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('patched chart');

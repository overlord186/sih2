const fs = require('fs');

// Fix report.ts to match the actual MetricSummary type
let reportContent = fs.readFileSync('src/utils/report.ts', 'utf-8');

const oldReportParams = `  metrics: {
    mae: string | number;
    rmse: string | number;
    r2: string | number;
    pod: number;
    far: number;
  },`;

const newReportParams = `  metrics: {
  sampleCount: number;
  maeRaw: number;
  maeBaseline: number;
  maeCorrected: number;
  rmseRaw: number;
  rmseBaseline: number;
  rmseCorrected: number;
  biasRaw: number;
  biasBaseline: number;
  biasCorrected: number;
  pearsonRaw: number;
  pearsonCorrected: number;
  threatScoreRaw: number;
  threatScoreCorrected: number;
},`;

reportContent = reportContent.replace(oldReportParams, newReportParams);

const oldReportBody = `      ['Mean Absolute Error (MAE)', \`\${metrics.mae} mm\`],
      ['Root Mean Square Error (RMSE)', \`\${metrics.rmse} mm\`],
      ['Correlation (R²)', \`\${metrics.r2}\`],
      ['Probability of Detection (POD)', \`\${(metrics.pod * 100).toFixed(1)}%\`],
      ['False Alarm Ratio (FAR)', \`\${(metrics.far * 100).toFixed(1)}%\`],`;

const newReportBody = `      ['Mean Absolute Error (MAE)', \`\${metrics.maeCorrected.toFixed(2)} mm (Corrected)\`],
      ['Root Mean Square Error (RMSE)', \`\${metrics.rmseCorrected.toFixed(2)} mm (Corrected)\`],
      ['Correlation (Pearson)', \`\${metrics.pearsonCorrected.toFixed(3)}\`],
      ['Threat Score (CSI)', \`\${metrics.threatScoreCorrected.toFixed(3)}\`],
      ['Sample Count', \`\${metrics.sampleCount}\`],`;

reportContent = reportContent.replace(oldReportBody, newReportBody);

fs.writeFileSync('src/utils/report.ts', reportContent);
console.log('patched report.ts');

// Fix Header.tsx (it was accidentally referring to onDownloadReport inside JSX without props)
let headerContent = fs.readFileSync('src/components/Header.tsx', 'utf-8');
headerContent = headerContent.replace("          {activeTab === 'dashboard' && onDownloadReport && (", "          {activeTab === 'dashboard' && props.onDownloadReport && (");
headerContent = headerContent.replace("               onClick={onDownloadReport}", "               onClick={props.onDownloadReport}");

// I'll just change the function signature of Header back to (props) to avoid destructuring issues
headerContent = headerContent.replace(`export const Header: React.FC<HeaderProps> = ({
  selectedStationId,
  onStationChange,
  selectedLeadTime,
  onLeadTimeChange,
  selectedYear,
  onYearChange,
  activeTab,
  onTabChange,
  totalSamples,
  onDownloadReport
}) => {`, `export const Header: React.FC<HeaderProps> = (props) => {
  const {
    selectedStationId,
    onStationChange,
    selectedLeadTime,
    onLeadTimeChange,
    selectedYear,
    onYearChange,
    activeTab,
    onTabChange,
    totalSamples,
    onDownloadReport
  } = props;`);

fs.writeFileSync('src/components/Header.tsx', headerContent);
console.log('patched Header.tsx variables');


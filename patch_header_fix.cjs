const fs = require('fs');

let headerContent = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// I'll just change the function signature of Header back to (props) to avoid destructuring issues
headerContent = headerContent.replace(`export const Header: React.FC<HeaderProps> = (props) => {
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
  } = props;`, `export const Header: React.FC<HeaderProps> = (props) => {
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
  } = props;`); // Just validating it exists...

// Wait, the previous patch probably messed up because the initial string didn't perfectly match.
// Let's just do a clean regex replacement on the signature.

headerContent = headerContent.replace(
  /export const Header: React\.FC<HeaderProps> = \(\{\s*selectedStationId,[\s\S]*?onDownloadReport\s*\}\) => \{/,
  `export const Header: React.FC<HeaderProps> = (props) => {
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
  } = props;`
);

fs.writeFileSync('src/components/Header.tsx', headerContent);
console.log('patched Header.tsx variables with regex');


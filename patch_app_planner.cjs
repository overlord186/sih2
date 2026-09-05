const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

if (!content.includes('import { ActionPlanner }')) {
  content = content.replace(
    `import { InteractivePredictor } from './components/InteractivePredictor';`,
    `import { InteractivePredictor } from './components/InteractivePredictor';
import { ActionPlanner } from './components/ActionPlanner';`
  );
}

if (!content.includes('activeTab === \'planner\'')) {
  content = content.replace(
    `{activeTab === 'predictor' && (
          <InteractivePredictor />
        )}`,
    `{activeTab === 'predictor' && (
          <InteractivePredictor />
        )}
        {activeTab === 'planner' && (
          <ActionPlanner />
        )}`
  );
}

fs.writeFileSync('src/App.tsx', content);
console.log('patched App.tsx for ActionPlanner');

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateIndex } from '../../../utils/src/lib/generate-index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, '..', 'src');

generateIndex({
  srcPath,
  outputPath: join(srcPath, 'index.ts'),
  typeName: 'CommandName',
  exportName: 'commands',
  typeNamePlural: 'Commands',
  regenerateCommand: 'npx nx run @solo-labs/commands-frontend:generate-index',
}).catch((error) => {
  console.error('Failed to generate index:', error);
  process.exit(1);
});

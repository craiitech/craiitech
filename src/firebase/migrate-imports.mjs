import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '..');

// Skip our wrappers to avoid circular import issues
const SKIP_FILES = [
  path.resolve(__dirname, 'firestore-wrapper.ts'),
  path.resolve(__dirname, 'custom-firestore-wrapper.ts'),
];

function migrateDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      migrateDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      if (SKIP_FILES.includes(fullPath)) {
        continue;
      }

      migrateFile(fullPath);
    }
  }
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanged = false;

  // Pattern matches:
  // 1. from 'firebase/firestore'
  // 2. from "firebase/firestore"
  const singleQuoteRegex = /from\s+[']firebase\/firestore[']/g;
  const doubleQuoteRegex = /from\s+["]firebase\/firestore["]/g;

  if (singleQuoteRegex.test(content)) {
    content = content.replace(singleQuoteRegex, "from '@/firebase/firestore-wrapper'");
    hasChanged = true;
  }

  if (doubleQuoteRegex.test(content)) {
    content = content.replace(doubleQuoteRegex, "from '@/firebase/firestore-wrapper'");
    hasChanged = true;
  }

  if (hasChanged) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Migrated imports in: ${path.relative(SRC_DIR, filePath)}`);
  }
}

console.log('Starting Firestore import migration...');
migrateDirectory(SRC_DIR);
console.log('Firestore import migration complete.');

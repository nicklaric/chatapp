/**
 * Script to check for deleteDoc calls that should be replaced with updateDoc
 * 
 * This is a simple utility to scan the source code for potentially problematic 
 * patterns where deleteDoc is used directly on Firestore documents.
 */

const fs = require('fs');
const path = require('path');

// Directories to scan
const DIRECTORIES_TO_SCAN = [
  'src/components',
  'src/contexts',
  'src/pages',
  'src/services',
];

// Patterns to look for
const PATTERNS = [
  {
    pattern: /await\s+deleteDoc\(/g,
    description: 'Direct use of deleteDoc without the workaround'
  },
  {
    pattern: /deleteDoc\(\s*doc\(/g,
    description: 'Chained deleteDoc with doc() call'
  }
];

// Function to check a single file
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let hasIssues = false;
  
  console.log(`Checking ${fileName}...`);
  
  PATTERNS.forEach(({ pattern, description }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`  ❌ Found ${matches.length} instances of ${description}`);
      
      // Get line numbers for better identification
      const lines = content.split('\n');
      let lineNumber = 1;
      lines.forEach(line => {
        if (pattern.test(line)) {
          console.log(`    - Line ${lineNumber}: ${line.trim()}`);
        }
        lineNumber++;
      });
      
      hasIssues = true;
    }
  });
  
  if (!hasIssues) {
    console.log(`  ✅ No issues found`);
  }
  
  return hasIssues;
}

// Function to scan directories recursively
function scanDirectory(directory) {
  const files = fs.readdirSync(directory);
  let hasIssues = false;
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Recurse into subdirectories
      const subDirIssues = scanDirectory(filePath);
      hasIssues = hasIssues || subDirIssues;
    } else if (stats.isFile() && 
              (filePath.endsWith('.js') || filePath.endsWith('.jsx'))) {
      // Check JavaScript files
      const fileIssues = checkFile(filePath);
      hasIssues = hasIssues || fileIssues;
    }
  });
  
  return hasIssues;
}

// Main function
function main() {
  console.log('='.repeat(50));
  console.log('CHECKING FOR deleteDoc CALLS');
  console.log('='.repeat(50));
  
  let hasIssues = false;
  
  DIRECTORIES_TO_SCAN.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`\nScanning ${dir}...`);
      const dirIssues = scanDirectory(dir);
      hasIssues = hasIssues || dirIssues;
    } else {
      console.log(`\nDirectory ${dir} does not exist, skipping.`);
    }
  });
  
  console.log('\n='.repeat(50));
  
  if (hasIssues) {
    console.log('❌ ISSUES FOUND: Replace deleteDoc calls with updateDoc approach');
    console.log('Recommended fix:');
    console.log(`
// INSTEAD OF:
await deleteDoc(doc(db, "collection", "docId"));

// USE:
await updateDoc(doc(db, "collection", "docId"), {
  isHidden: true,
  // other fields as needed
});
    `);
  } else {
    console.log('✅ NO ISSUES FOUND: All seems good!');
  }
  
  console.log('='.repeat(50));
}

// Run the check
main(); 
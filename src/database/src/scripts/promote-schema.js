#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Team D Schema Promotion Tool');
console.log('================================');

const overlaysDir = path.join(__dirname, '..', 'overlays');
const sharedSchemaDir = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'shared', 'database', 'src', 'schemas');

function getOverlayFiles() {
  return fs.readdirSync(overlaysDir)
    .filter(file => file.endsWith('.ts') && file !== 'index.ts')
    .map(file => path.join(overlaysDir, file));
}

function analyzeSchema(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const tables = content.match(/export const \w+ = pgTable\(/g) || [];
  const dependencies = content.match(/from ['"]@large-event\/database\/schemas['"]/g) || [];

  return {
    tables: tables.map(t => t.match(/export const (\w+)/)[1]),
    hasSharedDependencies: dependencies.length > 0,
    content
  };
}

function promptUser(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  const overlayFiles = getOverlayFiles();

  if (overlayFiles.length === 0) {
    console.log('❌ No overlay files found to promote');
    return;
  }

  console.log(`\n📁 Found ${overlayFiles.length} overlay files:`);
  overlayFiles.forEach((file, i) => {
    const analysis = analyzeSchema(file);
    console.log(`  ${i + 1}. ${path.basename(file)} (${analysis.tables.length} tables)`);
  });

  const choice = await promptUser('\n🤔 Which file would you like to promote? (number or "all"): ');

  let filesToPromote = [];
  if (choice === 'all') {
    filesToPromote = overlayFiles;
  } else {
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < overlayFiles.length) {
      filesToPromote = [overlayFiles[index]];
    } else {
      console.log('❌ Invalid choice');
      return;
    }
  }

  for (const file of filesToPromote) {
    const fileName = path.basename(file);
    const analysis = analyzeSchema(file);

    console.log(`\n📋 Promoting ${fileName}:`);
    console.log(`   📊 Tables: ${analysis.tables.join(', ')}`);
    console.log(`   🔗 Has shared dependencies: ${analysis.hasSharedDependencies ? 'Yes' : 'No'}`);

    const proceed = await promptUser(`   ✅ Proceed with promotion? (y/n): `);

    if (proceed === 'y' || proceed === 'yes') {
      const targetPath = path.join(sharedSchemaDir, fileName.replace('team-specific-', '').replace('extensions', 'team-extensions'));

      try {
        fs.copyFileSync(file, targetPath);
        console.log(`   ✅ Copied to ${path.relative(process.cwd(), targetPath)}`);

        console.log('   🔄 Updating shared schema index...');
        const indexPath = path.join(sharedSchemaDir, 'index.ts');
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const exportName = path.basename(targetPath, '.ts');

        if (!indexContent.includes(`export * from './${exportName}';`)) {
          fs.appendFileSync(indexPath, `export * from './${exportName}';\n`);
        }

        console.log('   🎉 Schema promoted successfully!');
        console.log('   💡 Remember to:');
        console.log('      1. Generate new migrations in shared/database');
        console.log('      2. Update team overlays to use promoted schema');
        console.log('      3. Test the changes across all teams');

      } catch (error) {
        console.error(`   ❌ Failed to promote ${fileName}:`, error.message);
      }
    } else {
      console.log(`   ⏭️  Skipped ${fileName}`);
    }
  }

  console.log('\n🎯 Promotion process completed!');
}

main().catch(console.error);
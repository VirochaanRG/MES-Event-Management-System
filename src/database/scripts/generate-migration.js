#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTimestampPrefix() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

console.log('🚀 Generating timestamped migration...');

try {
  // Generate migration with drizzle-kit
  execSync('pnpm drizzle-kit generate', { stdio: 'inherit' });

  const drizzleDir = path.join(__dirname, '..', 'drizzle');

  // Find the most recently generated migration file
  const files = fs.readdirSync(drizzleDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => ({
      name: file,
      stats: fs.statSync(path.join(drizzleDir, file))
    }))
    .sort((a, b) => b.stats.mtime - a.stats.mtime);

  if (files.length > 0) {
    const latestFile = files[0];
    const currentPath = path.join(drizzleDir, latestFile.name);

    // Check if file was created in the last 5 seconds (truly new)
    const isNewFile = (Date.now() - latestFile.stats.mtime.getTime()) < 5000;

    if (!isNewFile) {
      console.log('ℹ️  Latest migration file is not new, skipping rename');
      console.log('✅ Migration generation completed (no new files to rename)');
      return;
    }

    // Extract the descriptive name (strip any existing timestamp prefix)
    // Format: YYYYMMDD_HHMMSS_description or just timestamp_description
    const nameMatch = latestFile.name.match(/^\d+_(.+)\.sql$/);
    let descriptiveName = nameMatch ? nameMatch[1] : 'migration';

    // Remove any timestamp prefix from the descriptive name (YYYYMMDD_HHMMSS format)
    descriptiveName = descriptiveName.replace(/^\d{8}_\d{6}_/, '').replace(/^\d+_/, '');

    // Create new filename with timestamp prefix
    const timestamp = createTimestampPrefix();
    const newFileName = `${timestamp}_${descriptiveName}.sql`;
    const newPath = path.join(drizzleDir, newFileName);

    // Rename the SQL file
    fs.renameSync(currentPath, newPath);
    console.log(`✅ Migration renamed to: ${newFileName}`);

    // Handle meta files
    const metaDir = path.join(drizzleDir, 'meta');
    if (fs.existsSync(metaDir)) {
      const metaFiles = fs.readdirSync(metaDir)
        .filter(file => file.endsWith('.json') && file !== '_journal.json')
        .map(file => ({
          name: file,
          stats: fs.statSync(path.join(metaDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      if (metaFiles.length > 0) {
        const latestMeta = metaFiles[0];
        const currentMetaPath = path.join(metaDir, latestMeta.name);
        const newMetaName = `${timestamp}_${descriptiveName}.json`;
        const newMetaPath = path.join(metaDir, newMetaName);

        fs.renameSync(currentMetaPath, newMetaPath);
        console.log(`✅ Meta file renamed to: ${newMetaName}`);

        // Update the journal file to reflect the new name
        const journalPath = path.join(metaDir, '_journal.json');
        if (fs.existsSync(journalPath)) {
          try {
            const journalContent = fs.readFileSync(journalPath, 'utf8').trim();
            if (journalContent) {
              const journal = JSON.parse(journalContent);
              const oldFileName = latestFile.name.replace('.sql', '');
              const newJournalName = `${timestamp}_${descriptiveName}`;

              // Update entries array
              if (journal.entries) {
                journal.entries = journal.entries.map(entry => {
                  // Strip old timestamp from tag before comparing
                  const entryDescriptiveName = entry.tag.replace(/^\d{8}_\d{6}_/, '').replace(/^\d+_/, '');
                  if (entry.tag === oldFileName || entryDescriptiveName === descriptiveName) {
                    return { ...entry, tag: newJournalName };
                  }
                  return entry;
                });

                fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2));
                console.log('✅ Journal updated with new migration name');
              }
            } else {
              console.log('⚠️  Journal file is empty, skipping update');
            }
          } catch (error) {
            console.log('⚠️  Could not parse journal file, skipping update:', error.message);
          }
        }
      }
    }
  }

  console.log('✅ Migration generated with timestamp prefix!');
} catch (error) {
  console.error('❌ Migration generation failed:', error.message);
  process.exit(1);
}
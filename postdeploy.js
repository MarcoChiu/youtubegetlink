#!/usr/bin/env node
// postdeploy.js — automatically commit & push source changes to main after deploying
import { execSync } from 'child_process';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp =
  now.getFullYear() +
  pad(now.getMonth() + 1) +
  pad(now.getDate()) +
  pad(now.getHours()) +
  pad(now.getMinutes());

try {
  execSync('git add -A', { stdio: 'inherit' });

  // Check if there is anything staged to commit
  try {
    execSync('git diff --cached --quiet');
    console.log('Nothing to commit — source unchanged, skipping commit.');
  } catch {
    // diff --cached --quiet exits with code 1 when there ARE staged changes
    execSync(`git commit -m "deploy: ${timestamp}"`, { stdio: 'inherit' });
    console.log(`Committed: deploy: ${timestamp}`);
  }

  execSync('git push origin main', { stdio: 'inherit' });
  console.log('Pushed source to main ✓');
} catch (err) {
  console.error('postdeploy failed:', err.message);
  process.exit(1);
}

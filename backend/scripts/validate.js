import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { commands } from '../src/commands.js';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = [...walk(path.resolve('src')), ...walk(path.resolve('scripts')), ...walk(path.resolve('tests'))].filter(file => file.endsWith('.js'));
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) {
    console.error(check.stderr || check.stdout);
    process.exit(check.status || 1);
  }
}

const names = commands.map(command => command.name);
if (new Set(names).size !== names.length) throw new Error('Duplicate application command names detected.');
if (commands.length > 100) throw new Error('Discord global command limit exceeded.');
for (const command of commands) {
  if (!command.description || command.description.length > 100) throw new Error(`Invalid description for /${command.name}.`);
}

console.log(`Validated ${files.length} JavaScript files and ${commands.length} application commands.`);

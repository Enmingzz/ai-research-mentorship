import { mkdir, copyFile, cp, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js']) await copyFile(file, `dist/${file}`);
await cp('data', 'dist/data', { recursive: true });
await writeFile('dist/.nojekyll', '');
console.log('Built static course → dist/');

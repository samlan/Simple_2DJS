// Builds dist/simple2d.js (readable) and dist/simple2d.min.js (minified) from src/.
const esbuild = require('esbuild');
const fs = require('fs');

const banner = '/*! Simple2D v' + require('./package.json').version + ' | MIT */';
fs.mkdirSync('dist', { recursive: true });

for (const [outfile, minify] of [['dist/simple2d.js', false], ['dist/simple2d.min.js', true]]) {
  esbuild.buildSync({
    entryPoints: ['src/simple2d.js'],
    outfile,
    minify,
    banner: { js: banner },
    target: 'es2018',
    logLevel: 'info'
  });
}
console.log('sizes:', fs.statSync('dist/simple2d.js').size, 'B /', fs.statSync('dist/simple2d.min.js').size, 'B min');

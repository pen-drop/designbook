import { defineConfig } from 'vite';
import { resolve, join, relative } from 'path';
import { globSync } from 'glob';
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgSpritePlugin from '@pivanov/vite-plugin-svg-sprite';

/**
 * Defines glob patterns for CSS source files.
 */
const cssGlob = {
  '': 'css/**/[!_]*.src.css',
  'css': 'components/**/[!_]*.src.css',
};

/**
 * Defines icon lib folder.
 * You can define one icon lib for each spritemap.
 */
const iconLibs = {
  'layout': ['icons/layout'],
};

export default defineConfig(() => {
  const projectRoot = __dirname;

  // Generate entry points for Rollup: CSS
  const entries = Object.entries(cssGlob).reduce((acc, [folder, pattern]) => {
    const files = globSync(join(projectRoot, pattern));
    files.forEach((file) => {
      const outputKey = join(folder, relative(projectRoot, file)).replace('.src.css', '');
      acc[outputKey] = resolve(projectRoot, file);
    });
    return acc;
  }, {});

  // Generate entry points for Rollup: JS behavior files
  // Build any "behavior" JS files found under components and emit into dist/js/...
  const jsFiles = globSync(join(projectRoot, 'components/**/*.src.js'));
  jsFiles.forEach((file) => {
    // Prefix with js/ so output path becomes dist/js/components/... via [name].js
    const outputKey = join('js', relative(projectRoot, file)).replace('.src.js', '');
    entries[outputKey] = resolve(projectRoot, file);
  });

  // Create plugins array with svgSpritePlugin instances
  const plugins = Object.entries(iconLibs).map(([lib, folders]) =>
    svgSpritePlugin({
      iconDirs: folders,
      symbolId: '[dir]-[name]',
      fileName: `${lib}-icons.svg`,
      svgDomId: 'svg-sprite',
    })
  );
  plugins.push(tailwindcss());

  return {
    plugins: [
      ...plugins,
      viteStaticCopy({
        targets: [
          {
            src: 'dist/css/components', // Copy compiled CSS directory
            dest: '../', // to component and folder.
          },
          {
            src: 'dist/js/components', // Copy compiled CSS directory
            dest: '../', // to component and folder.
          }
        ],
      }),
    ],
    css: {
      postcss: false,
    },
    build: {
      outDir: 'dist',
      minify: process.env.NODE_ENV === 'production',
      rollupOptions: {
        input: entries,
        output: {
          // Keep original folder structure for assets and JS entries.
          assetFileNames: '[name].[ext]',
          entryFileNames: '[name].js',
        },
      },
    },
  };
});

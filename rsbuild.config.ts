import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginStylus } from "@rsbuild/plugin-stylus";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  plugins: [pluginReact(), pluginStylus(), pluginSvgr()],
  html: {
    template: "./public/index.html",
  },
  server: {
    port: 5000,
    historyApiFallback: true,
  },
  source: {
    entry: {
      index: "./src/index.tsx",
    },
  },
  output: {
    distPath: {
      root: "dist",
    },
  },
  performance: {
    minify: false,
  },
});

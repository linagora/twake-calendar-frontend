import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginStylus } from "@rsbuild/plugin-stylus";
import { pluginSvgr } from "@rsbuild/plugin-svgr";
import path from "path";

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
    minify: false,
  },
  tools: {
    rspack: {
      resolve: {
        alias: {
          react: path.resolve(__dirname, "node_modules/react"),
          "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        },
      },
    },
  },
});

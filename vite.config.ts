import { defineConfig, Plugin } from "vite";

export default defineConfig({
  plugins: [singleFile()],
  base: "./",
  build: {
    polyfillModulePreload: false,
    reportCompressedSize: false,
    assetsInlineLimit: 0,
    minify: "terser",
    terserOptions: {
      compress: {
        unsafe_arrows: true,
        passes: 2,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
  },
});

function singleFile(): Plugin {
  return {
    name: "vite:single-file",
    enforce: "post",
    generateBundle(options, bundle) {
      let html = bundle["index.html"] as any;
      let js = bundle["index.js"] as any;

      if (html.type === "asset") {
        html.source = html.source
          .replace(/<script.*<\/script>/, "")
          .replace("</body>", () => `<script>${js.code}</script>`)
          .replace(/\n+/g, "");
      }

      delete bundle[js.fileName];
    },
  };
}

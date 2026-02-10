import { build as viteBuild } from "vite";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

async function buildForVercel() {
  console.log("Building client for Vercel deployment...");
  
  // Create client/dist directory if it doesn't exist
  await mkdir("client/dist", { recursive: true });
  
  // Build the client
  await viteBuild({
    build: {
      outDir: "client/dist",
      emptyOutDir: true
    }
  });
  
  // Create a simple index.html if it doesn't exist
  const indexPath = join("client/dist", "index.html");
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TeamSync</title>
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" href="/assets/index.css">
</head>
<body>
    <div id="root"></div>
</body>
</html>`;
  
  await writeFile(indexPath, indexHtml.trim());
  
  console.log("✅ Client built successfully for Vercel");
}

buildForVercel().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
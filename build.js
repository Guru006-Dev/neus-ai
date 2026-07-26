const { execSync } = require('child_process');
console.log("Starting ADIP build logic (overriding NitroStack default)...");

try {
  console.log("Downloading static 'uv' binary for python toolchain magic...");
  execSync('wget -qO uv.tar.gz https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-musl.tar.gz', { stdio: 'inherit' });
  execSync('tar -xzf uv.tar.gz', { stdio: 'inherit' });
  execSync('mv uv-x86_64-unknown-linux-musl/uv /app/uv', { stdio: 'inherit' });
  execSync('chmod +x /app/uv', { stdio: 'inherit' });
  console.log("uv downloaded successfully!");
} catch (e) {
  console.error("Failed to download uv:", e);
  process.exit(1);
}

try {
  console.log("Installing JS dependencies if present...");
  if (require('fs').existsSync('knowledge-mcp/agent/package.json')) {
    execSync('npm install', { cwd: 'knowledge-mcp/agent', stdio: 'inherit' });
  }
} catch (e) {
  console.warn("JS dependencies install failed but continuing.");
}

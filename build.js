const { execSync } = require('child_process');
console.log("Starting ADIP build logic (overriding NitroStack default)...");

try {
  const archMap = { 'arm64': 'aarch64', 'x64': 'x86_64' };
  const arch = archMap[process.arch] || 'x86_64';
  console.log(`Detected architecture: ${process.arch} -> downloading uv for ${arch}-musl...`);
  
  const url = `https://github.com/astral-sh/uv/releases/latest/download/uv-${arch}-unknown-linux-musl.tar.gz`;
  execSync(`wget -qO uv.tar.gz ${url}`, { stdio: 'inherit' });
  execSync('tar -xzf uv.tar.gz', { stdio: 'inherit' });
  execSync(`mv uv-${arch}-unknown-linux-musl/uv /app/uv`, { stdio: 'inherit' });
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

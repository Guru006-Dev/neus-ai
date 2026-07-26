const { execSync } = require('child_process');
const fs = require('fs');

console.log("Starting ADIP build logic (overriding NitroStack default)...");

// ─── Step 1: Download uv binary ───
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

// ─── Step 2: Pre-install Python venv & all packages during BUILD ───
try {
  console.log("Pre-installing Python 3.11 virtual environment...");
  const env = { ...process.env, UV_PYTHON_INSTALL_DIR: '/app/.uv_python' };
  
  execSync('/app/uv venv --python 3.11 /app/.venv', { stdio: 'inherit', env });

  // Discover all requirements.txt across MCP servers
  const reqs = ['orchestrator', 'explorer-mcp', 'documentation-mcp', 'qa-mcp', 'demo-mcp', 'release-mcp', 'knowledge-mcp']
    .map(f => `${f}/requirements.txt`)
    .filter(f => fs.existsSync(f))
    .map(f => `-r ${f}`)
    .join(' ');

  console.log("Installing all python packages...");
  execSync(`/app/uv pip install --python /app/.venv/bin/python ${reqs} fastmcp pydantic mcp`, { stdio: 'inherit', env });
  console.log("Python environment ready!");
} catch (e) {
  console.error("Failed to pre-install Python:", e);
  process.exit(1);
}

// ─── Step 3: JS dependencies ───
try {
  console.log("Installing JS dependencies if present...");
  if (fs.existsSync('knowledge-mcp/agent/package.json')) {
    execSync('npm install', { cwd: 'knowledge-mcp/agent', stdio: 'inherit' });
  }
} catch (e) {
  console.warn("JS dependencies install failed but continuing.");
}

console.log("Build completed successfully! Python is pre-installed for instant startup.");

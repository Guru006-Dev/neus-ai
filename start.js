const { execSync, spawn } = require('child_process');
const fs = require('fs');

try {
    console.log("Setting up Python virtual environment via uv...");
    // We map HOME to a writable directory in case it isn't
    const env = { ...process.env, UV_PYTHON_INSTALL_DIR: '/app/.uv_python' };
    
    // Create Python 3.11 venv
    execSync('/app/uv venv --python 3.11 /app/.venv', { stdio: 'inherit', env });
    
    // Discover all requirements.txt
    const reqs = ['orchestrator', 'explorer-mcp', 'documentation-mcp', 'qa-mcp', 'demo-mcp', 'release-mcp', 'knowledge-mcp']
        .map(f => `${f}/requirements.txt`)
        .filter(f => fs.existsSync(f))
        .map(f => `-r ${f}`)
        .join(' ');

    console.log("Installing python packages...");
    execSync(`/app/uv pip install --python /app/.venv/bin/python ${reqs} fastmcp pydantic mcp`, { stdio: 'inherit', env });

    console.log("Starting FASTAPI Orchestrator...");
    const child = spawn('/app/.venv/bin/python', ['orchestrator/main.py'], { stdio: 'inherit', env });
    
    child.on('close', (code) => {
        process.exit(code !== null ? code : 1);
    });
} catch (e) {
    console.error("Error during startup sequence:", e);
    process.exit(1);
}

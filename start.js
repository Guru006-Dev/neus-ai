const { spawn } = require('child_process');

// Python is already pre-installed during build phase — just launch the server instantly!
console.log("Starting FASTAPI Orchestrator (Python pre-installed during build)...");

const env = { ...process.env, UV_PYTHON_INSTALL_DIR: '/app/.uv_python' };
const child = spawn('/app/.venv/bin/python', ['orchestrator/main.py'], { stdio: 'inherit', env });

child.on('close', (code) => {
    process.exit(code !== null ? code : 1);
});

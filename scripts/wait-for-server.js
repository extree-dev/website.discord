const http = require('http');

function waitForServer(port = 4000, maxAttempts = 30, interval = 1000) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        function checkServer() {
            attempts++;

            const req = http.get(`http://localhost:${port}/health`, (res) => {
                if (res.statusCode === 200) {
                    console.log(`✅ Server on port ${port} is ready! (attempt ${attempts})`);
                    resolve(true);
                } else {
                    retryOrFail();
                }
            });

            req.on('error', (err) => {
                if (err.code === 'ECONNREFUSED') {
                    console.log(`⏳ Waiting for server on port ${port}... (${attempts}/${maxAttempts})`);
                    retryOrFail();
                } else {
                    reject(err);
                }
            });

            req.setTimeout(5000, () => {
                req.destroy();
                retryOrFail();
            });
        }

        function retryOrFail() {
            if (attempts < maxAttempts) {
                setTimeout(checkServer, interval);
            } else {
                reject(new Error(`Server on port ${port} not ready after ${maxAttempts} attempts`));
            }
        }

        console.log(`🔍 Waiting for server on port ${port}...`);
        checkServer();
    });
}

// Если скрипт запущен напрямую
if (require.main === module) {
    const port = process.argv[2] || 4000;
    waitForServer(port)
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('❌', err.message);
            process.exit(1);
        });
}

module.exports = waitForServer;
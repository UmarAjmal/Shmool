const http = require('http');

const endpoints = [
    '/academic/classes',
    '/academic/sections',
    '/academic'
];

async function testEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    path,
                    statusCode: res.statusCode,
                    data: data.substring(0, 200)
                });
            });
        });

        req.on('error', (error) => {
            reject({ path, error: error.message });
        });

        req.end();
    });
}

async function testAll() {
    console.log('Testing all endpoints...\n');
    for (const endpoint of endpoints) {
        try {
            const result = await testEndpoint(endpoint);
            console.log(`✓ ${result.path}`);
            console.log(`  Status: ${result.statusCode}`);
            console.log(`  Response: ${result.data}...\n`);
        } catch (error) {
            console.log(`✗ ${error.path}`);
            console.log(`  Error: ${error.error}\n`);
        }
    }
    process.exit(0);
}

testAll();

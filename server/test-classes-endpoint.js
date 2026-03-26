const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/academic/classes',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Error:', error.message);
    process.exit(1);
});

req.end();

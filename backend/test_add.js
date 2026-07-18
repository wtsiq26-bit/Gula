const http = require('http');

function makeRequest(options, dataStr) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function run() {
  try {
    console.log("1. Logging in...");
    const loginData = JSON.stringify({ email: "admin@alnoor.com", password: "Secure123!" });
    const loginRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, loginData);
    
    const { token } = JSON.parse(loginRes.body);
    if (!token) throw new Error("No token received: " + loginRes.body);
    console.log("Login successful.");

    console.log("2. Adding medicine...");
    // Create multipart/form-data payload manually
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let payload = '';
    
    const fields = {
      tradeName: 'Test Med Camera',
      barcode: '1234567890123'
    };
    
    for (const [key, value] of Object.entries(fields)) {
      payload += `--${boundary}\r\n`;
      payload += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      payload += `${value}\r\n`;
    }
    payload += `--${boundary}--\r\n`;

    const addRes = await makeRequest({
      hostname: 'localhost', port: 5000, path: '/api/medicines', method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
      }
    }, payload);

    console.log("Add Status:", addRes.status);
    console.log("Add Body:", addRes.body);

  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();

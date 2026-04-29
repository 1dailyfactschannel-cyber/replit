const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

(async () => {
  // Login via Node.js HTTP request
  const loginData = JSON.stringify({ email: 'admin@teamsync.ru', password: 'password123' });
  
  const cookies = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3005/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, (res) => {
      const cookies = res.headers['set-cookie'];
      resolve(cookies || []);
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
  
  console.log('Cookies received:', cookies.length);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  // Set cookies
  await context.addCookies(cookies.map(c => {
    const [nameValue] = c.split(';');
    const [name, value] = nameValue.split('=');
    return { name: name.trim(), value: value.trim(), domain: 'localhost', path: '/' };
  }));
  
  // Navigate to knowledge base
  await page.goto('http://localhost:3005/knowledge-base');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: path.join('test e2e', 'screenshots', 'kb-restructured.png'), fullPage: false });
  console.log('Screenshot saved');
  
  await browser.close();
})();

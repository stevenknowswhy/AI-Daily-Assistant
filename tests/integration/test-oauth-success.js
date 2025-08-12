// Test script to simulate successful OAuth callback and verify redirect
import fetch from 'node-fetch';

async function testSuccessfulOAuthCallback() {
  try {
    console.log('🧪 Testing successful OAuth callback redirect...\n');
    
    // Create a test route that simulates successful OAuth callback
    const testHtml = `
      <html>
        <head>
          <title>OAuth Test</title>
        </head>
        <body>
          <h2>Testing OAuth Redirect</h2>
          <script>
            // Test the exact same logic as the OAuth callback
            const frontendUrl = 'http://localhost:5173';
            console.log('frontendUrl type:', typeof frontendUrl);
            console.log('frontendUrl value:', frontendUrl);
            
            // Test template literal interpolation
            const redirectUrl = \`\${frontendUrl}?auth=success\`;
            console.log('redirectUrl:', redirectUrl);
            
            // Test string concatenation (alternative approach)
            const redirectUrl2 = frontendUrl + '?auth=success';
            console.log('redirectUrl2:', redirectUrl2);
            
            // Test potential object issue
            const testObject = { url: 'http://localhost:5173' };
            const objectUrl = \`\${testObject}?auth=success\`;
            console.log('objectUrl:', objectUrl);
            
            // Show results
            document.body.innerHTML += '<div>Check console for results</div>';
          </script>
        </body>
      </html>
    `;
    
    console.log('Generated test HTML with redirect logic:');
    console.log(testHtml);
    
    // Extract the redirect URLs from the test
    const redirectMatches = testHtml.match(/redirectUrl[^:]*: ([^;]+)/g);
    if (redirectMatches) {
      console.log('\n📍 Extracted redirect URLs:');
      redirectMatches.forEach(match => {
        console.log('  ', match);
      });
    }
    
    // Check for [object Object] patterns
    if (testHtml.includes('[object Object]')) {
      console.log('\n❌ Test HTML contains [object Object] - this indicates the problem!');
    } else {
      console.log('\n✅ Test HTML looks clean - no [object Object] issues');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSuccessfulOAuthCallback();

// Debug script to test OAuth callback template literal interpolation
import fetch from 'node-fetch';

async function debugOAuthCallback() {
  try {
    console.log('🔍 Debugging OAuth callback template literal...\n');
    
    // Test 1: Check the actual OAuth callback response
    console.log('1. Testing OAuth callback with mock code...');
    const response = await fetch('http://localhost:3005/auth/google/callback?code=test_debug_code&scope=test');
    const html = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response length:', html.length);
    
    // Extract all window.location.href assignments
    const locationMatches = html.match(/window\.location\.href\s*=\s*['"](.*?)['"]/g);
    if (locationMatches) {
      console.log('\n📍 Found window.location.href assignments:');
      locationMatches.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match}`);
        
        if (match.includes('[object Object]')) {
          console.log('     ❌ PROBLEM: Contains [object Object]!');
        } else if (match.includes('localhost:5173')) {
          console.log('     ✅ Contains correct frontend URL');
        }
      });
    } else {
      console.log('❌ No window.location.href assignments found');
    }
    
    // Test 2: Check for template literal issues
    console.log('\n2. Testing template literal interpolation...');
    
    // Simulate the exact backend logic
    const frontendUrl = 'http://localhost:5173';
    const nonce = 'test-nonce';
    
    // Test different template literal scenarios
    const scenarios = [
      {
        name: 'Correct interpolation',
        template: `window.location.href = '${frontendUrl}?auth=success';`
      },
      {
        name: 'Object interpolation',
        template: `window.location.href = '${frontendUrl}${{}}?auth=success';`
      },
      {
        name: 'Undefined interpolation', 
        template: `window.location.href = '${frontendUrl}${undefined}';`
      }
    ];
    
    scenarios.forEach(scenario => {
      console.log(`\n   ${scenario.name}:`);
      console.log(`   Template: ${scenario.template}`);
      
      if (scenario.template.includes('[object Object]')) {
        console.log('   ❌ Contains [object Object]!');
      } else {
        console.log('   ✅ Template looks correct');
      }
    });
    
    // Test 3: Check for potential variable issues
    console.log('\n3. Testing variable scenarios...');
    
    const testVars = [
      { name: 'String frontendUrl', value: 'http://localhost:5173' },
      { name: 'Object frontendUrl', value: { url: 'http://localhost:5173' } },
      { name: 'Array frontendUrl', value: ['http://localhost:5173'] }
    ];
    
    testVars.forEach(testVar => {
      const result = `${testVar.value}?auth=success`;
      console.log(`   ${testVar.name}: "${result}"`);
    });
    
    // Test 4: Check the actual HTML response for debugging
    console.log('\n4. Checking HTML response for debugging info...');
    
    if (html.includes('frontendUrl type:')) {
      const typeMatch = html.match(/frontendUrl type:\s*(\w+)/);
      const valueMatch = html.match(/frontendUrl value:\s*([^<]+)/);
      
      if (typeMatch && valueMatch) {
        console.log(`   Frontend URL type: ${typeMatch[1]}`);
        console.log(`   Frontend URL value: ${valueMatch[1]}`);
      }
    }
    
    // Test 5: Look for the specific redirect pattern
    console.log('\n5. Looking for redirect patterns...');
    
    const redirectPatterns = [
      /window\.location\.href\s*=\s*['"](http:\/\/localhost:5173\?auth=success)['"]/,
      /window\.location\.href\s*=\s*['"](http:\/\/localhost:5173\/\[object Object\])['"]/,
      /window\.location\.href\s*=\s*['"](.*?\[object Object\].*?)['"]/
    ];
    
    redirectPatterns.forEach((pattern, index) => {
      const match = html.match(pattern);
      if (match) {
        console.log(`   Pattern ${index + 1} matched: ${match[1]}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugOAuthCallback();

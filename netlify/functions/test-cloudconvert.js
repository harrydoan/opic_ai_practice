const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'CLOUDCONVERT_API_KEY not found in environment variables',
          status: 'FAILED'
        })
      };
    }

    // Test API key by making a simple request to CloudConvert
    const testRes = await fetch('https://api.cloudconvert.com/v2/user', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!testRes.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `CloudConvert API test failed: ${testRes.status} ${testRes.statusText}`,
          status: 'FAILED'
        })
      };
    }

    const userData = await testRes.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        status: 'SUCCESS',
        message: 'CloudConvert API key is valid',
        user: userData.data ? {
          id: userData.data.id,
          username: userData.data.username,
          email: userData.data.email
        } : null
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: `Test failed: ${err.message}`,
        status: 'FAILED'
      })
    };
  }
};
/**
 * LinkedIn OAuth2 Token Generator
 * 
 * This script helps you obtain a LinkedIn access token for testing your application.
 * 
 * Instructions:
 * 1. Replace YOUR_CLIENT_ID and YOUR_CLIENT_SECRET with your actual LinkedIn app credentials
 * 2. Run this script: node get-linkedin-token.js
 * 3. Follow the instructions in the console to complete the OAuth flow
 */

const http = require('http');
const url = require('url');
const querystring = require('querystring');

// === REPLACE THESE WITH YOUR ACTUAL LINKEDIN APP CREDENTIALS ===
const CLIENT_ID = '77j75tl5i0ep2e';
const CLIENT_SECRET = 'WPL_AP1.gHJGvE2e2nO8XhyZ.svNlRQ==';
// =============================================================

const REDIRECT_URI = 'http://localhost:3001/callback';
const STATE = 'linkedin_oauth_state'; // CSRF protection

// Step 1: Redirect user to LinkedIn authorization page
function getAuthorizationUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: STATE,
    scope: 'r_liteprofile w_member_social' // Adjust scopes as needed
  });
  
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

// Step 2: Exchange authorization code for access token
async function exchangeCodeForToken(code) {
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token exchange failed: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await response.json();
    return tokenData;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

// Create a simple server to handle the OAuth callback
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/callback') {
    const { code, state, error } = parsedUrl.query;
    
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>Authorization Error</h1><p>${error}</p>`);
      return;
    }
    
    if (state !== STATE) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>State mismatch error</h1><p>CSRF protection failed.</p>');
      return;
    }
    
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization code missing</h1>');
      return;
    }
    
    try {
      // Exchange the authorization code for an access token
      const tokenData = await exchangeCodeForToken(code);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>Success! LinkedIn Access Token Obtained</h1>
        <p>Copy this token to your .env.local file:</p>
        <pre>LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}</pre>
        <p><strong>Token expires in:</strong> ${tokenData.expires_in} seconds</p>
        <p>You can now close this window and use the token in your application.</p>
      `);
      
      console.log('=== LINKEDIN ACCESS TOKEN ===');
      console.log(`LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}`);
      console.log(`Token expires in: ${tokenData.expires_in} seconds`);
      console.log('=============================');
      
      // Close the server after 30 seconds
      setTimeout(() => {
        server.close();
        console.log('Server closed. You can now stop this script with Ctrl+C');
      }, 30000);
      
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Token Exchange Error</h1><p>${error.message}</p>`);
      console.error('Token exchange error:', error);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>Not Found</h1><p>This endpoint is not available.</p>');
  }
});

// Start the server
server.listen(3001, () => {
  console.log('=== LinkedIn OAuth2 Token Generator ===');
  console.log('1. Make sure you have replaced YOUR_CLIENT_ID and YOUR_CLIENT_SECRET in this file');
  console.log('2. Visit this URL in your browser to start the OAuth flow:');
  console.log(getAuthorizationUrl());
  console.log('3. After authorization, you will be redirected back and your access token will be displayed');
  console.log('4. The server will automatically close after 30 seconds of successful token retrieval');
  console.log('========================================\n');
});

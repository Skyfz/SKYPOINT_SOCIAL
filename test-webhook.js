const axios = require('axios');

// Sample Notion webhook payload for testing
const samplePayload = {
  page_id: "test-page-123",
  page: {
    properties: {
      "Post Text": {
        rich_text: [
          {
            plain_text: "This is a test post from our automation system! 🚀"
          }
        ]
      },
      "Post Media": {
        files: []
      },
      "Scheduled Date": {
        date: {
          start: new Date(Date.now() + 60000).toISOString() // 1 minute from now
        }
      },
      "Team": {
        select: {
          name: "Marketing"
        }
      },
      "Post Notes": {
        rich_text: [
          {
            plain_text: "Test post for automation workflow"
          }
        ]
      },
      "Status": {
        select: {
          name: "pending"
        }
      },
      "Platforms": {
        multi_select: [
          { name: "facebook" },
          { name: "linkedin" }
        ]
      }
    }
  }
};

async function testWebhook() {
  try {
    console.log('Sending test webhook payload...');
    console.log('Payload:', JSON.stringify(samplePayload, null, 2));
    
    const response = await axios.post('http://localhost:3001/api/notion-webhook', samplePayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Webhook response:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
  } catch (error) {
    console.error('\n❌ Error sending webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testWebhook();

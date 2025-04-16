/**
 * Test script to simulate Firebase Cloud Function behavior
 * 
 * This simulates the behavior of the processUserMessage function
 * that is triggered when a new document is created in the conversations collection.
 */

// Import the GoogleGenerativeAI library
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Sample data to test with
const mockEvent = {
  params: {
    conversationId: 'test-conversation-id'
  },
  data: {
    data: () => ({
      prompt: "You are a helpful AI moderator. User: Hello, how are you?",
      chatId: 'test-chat-id',
      aiRole: 'moderator'
    }),
    ref: {
      update: (data) => {
        console.log('Document updated with:', data);
        return Promise.resolve();
      }
    }
  }
};

// Function to test the Gemini API directly
async function testGeminiApi() {
  try {
    console.log('Testing Gemini API directly...');
    
    // Replace with your API key - this should be loaded from environment in production
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDmDfMdjWM0AFCfoOZ8WKQLGT3AeFJP1T8";
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = "Write a one-sentence test response";
    console.log(`Sending prompt: "${prompt}"`);
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('Received response:', response);
    console.log('API test successful!');
    
    return response;
  } catch (error) {
    console.error('Error testing Gemini API:', error);
    return null;
  }
}

// Function to simulate the Cloud Function logic
async function simulateProcessUserMessage(event) {
  try {
    console.log('Simulating processUserMessage function...');
    
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return;
    }
    
    const data = snapshot.data();
    const { prompt, chatId, aiRole } = data;

    if (!prompt) {
      console.error("No prompt provided");
      return null;
    }

    console.log(`Processing user message in chat ${chatId}`, { messageId: event.params.conversationId });

    // Initialize the Gemini API (in a real function, this would use functions.config())
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDmDfMdjWM0AFCfoOZ8WKQLGT3AeFJP1T8";
    if (!apiKey) {
      console.error("Gemini API key not configured");
      await snapshot.ref.update({ 
        response: "I'm sorry, the AI service is not properly configured. Please contact the administrator.",
        error: "API key not configured",
        processedAt: new Date()
      });
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Generate content with the Gemini API
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Store the response in Firestore (simulated)
    await snapshot.ref.update({
      response: response,
      processedAt: new Date()
    });

    console.log(`Added ${aiRole} response to chat ${chatId}`);
    return response;
  } catch (error) {
    console.error("Error generating AI response with Gemini", error);
    
    // Store the error in Firestore (simulated)
    if (event.data) {
      await event.data.ref.update({
        response: "I'm having trouble connecting to my thinking systems. Let's continue while this gets resolved.",
        error: error.message,
        processedAt: new Date()
      });
    }
    
    return null;
  }
}

// Run the tests
async function runTests() {
  console.log('='.repeat(50));
  console.log('STARTING TESTS');
  console.log('='.repeat(50));
  
  // Test 1: Check if the Gemini API works directly
  console.log('\nTest 1: Gemini API Direct Test');
  console.log('-'.repeat(30));
  const apiResponse = await testGeminiApi();
  
  if (apiResponse) {
    console.log('✅ Gemini API is working correctly');
  } else {
    console.log('❌ Gemini API test failed');
  }
  
  // Test 2: Simulate the Cloud Function
  console.log('\nTest 2: Cloud Function Simulation');
  console.log('-'.repeat(30));
  const functionResponse = await simulateProcessUserMessage(mockEvent);
  
  if (functionResponse) {
    console.log('✅ Function simulation successful');
  } else {
    console.log('❌ Function simulation failed');
  }
  
  console.log('\n='.repeat(50));
  console.log('TESTS COMPLETED');
  console.log('='.repeat(50));
}

// Run the tests
runTests(); 
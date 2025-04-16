/**
 * Simple test script for testing the Gemini API directly
 * Using the latest library version
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Run a simple test with Gemini API
async function testGemini() {
  try {
    console.log('Testing Gemini API with the latest library version...');
    
    // Get API key from environment or use default
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDmDfMdjWM0AFCfoOZ8WKQLGT3AeFJP1T8';
    console.log(`Using API key: ${apiKey.substring(0, 10)}...`);
    
    // Configure the generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the model
    console.log('Getting the generative model...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Generate content
    console.log('Generating content...');
    const prompt = 'Write a brief welcome message for a chat app.';
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('\nGenerated response:');
    console.log('------------------');
    console.log(response);
    console.log('------------------');
    
    console.log('\n✅ Gemini API test successful!');
    return true;
  } catch (error) {
    console.error('\n❌ Gemini API test failed with error:');
    console.error(error);
    
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('expired')) {
      console.log('\nThe API key appears to be invalid or expired. Please generate a new API key.');
    } else if (error.message.includes('not found for API version')) {
      console.log('\nThe model name might be incorrect or not available. Try with a different model name.');
      console.log('Common model names: gemini-pro, gemini-pro-vision');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\nPermission denied. Make sure the Gemini API is enabled for your project and the API key has the correct permissions.');
    }
    
    return false;
  }
}

// Run the test
testGemini(); 
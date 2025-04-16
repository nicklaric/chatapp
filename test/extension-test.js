/**
 * Test script to verify the Firebase Extension for Generative AI
 * 
 * This script creates a document in the 'conversations' collection which triggers
 * the Firebase Extension to generate a response using the Gemini API.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyA_As1IWcs3kRoXKeTG7PNF0wxMs6_etJI",
  authDomain: "llm-group-chat.firebaseapp.com",
  projectId: "llm-group-chat",
  storageBucket: "llm-group-chat.firebasestorage.app",
  messagingSenderId: "678550205299",
  appId: "1:678550205299:web:8ea74ad9473e5a33dd8b06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test function to add a document to the 'conversations' collection
async function testExtension() {
  console.log('='.repeat(50));
  console.log('TESTING FIREBASE EXTENSION FOR GENERATIVE AI');
  console.log('='.repeat(50));
  
  try {
    console.log('Creating test conversation document...');
    
    // Create a test prompt
    const prompt = "You are a helpful AI assistant. Answer this question in one short sentence: What is Firebase?";
    
    // Add document to conversations collection
    const conversationRef = await addDoc(collection(db, "conversations"), {
      prompt: prompt,
      createTime: serverTimestamp()
    });
    
    console.log(`Document created with ID: ${conversationRef.id}`);
    console.log('Waiting for extension to process...');
    
    // Wait for the response (max 30 seconds)
    let retries = 0;
    const maxRetries = 30;
    let responseDoc;
    
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      console.log(`Checking for response... (${retries + 1}/${maxRetries})`);
      
      responseDoc = await getDoc(conversationRef);
      
      if (responseDoc.exists()) {
        const data = responseDoc.data();
        console.log(`Document data at retry ${retries + 1}:`, data);
        
        if (data.response) {
          console.log(`✅ Extension responded after ${retries + 1} seconds`);
          console.log('Response:', data.response);
          
          // Check for error information
          if (data.error) {
            console.log('❌ Error information found in response:');
            console.log(data.error);
          } else {
            console.log('\nTest successful! The Firebase Extension is working correctly.');
          }
          
          process.exit(0);
        }
      }
      
      retries++;
    }
    
    console.log('❌ Extension did not respond within the timeout period');
    console.log('Check the Firebase Console for error messages or logs.');
    
  } catch (error) {
    console.error('Error testing extension:', error);
    console.log('❌ Test failed');
  }
}

// Run the test
testExtension(); 
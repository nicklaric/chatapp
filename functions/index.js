/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Initialize Google Gemini API
let genAI;
try {
  // Using Firebase Functions Config
  const apiKey = process.env.GEMINI_APIKEY;
  if (!apiKey) {
    logger.warn("GEMINI_APIKEY environment variable not set - AI features will not work");
  } else {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log("Google GenerativeAI initialized successfully with API key from environment");
  }
} catch (error) {
  logger.error("Error initializing Google GenerativeAI", error);
}

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// This function is triggered when a new message is added to a chat
exports.processUserMessage = onDocumentCreated(
  {
    document: "conversations/{conversationId}",
    region: "us-central1",
    secrets: ["GEMINI_APIKEY"],
    maxInstances: 10 // Limit concurrent executions
  },
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log('No data associated with the event');
        return;
      }
      
      const data = snapshot.data();
      const { prompt, chatId, aiRole, userId } = data;

      // Check for required fields
      if (!prompt) {
        console.error("No prompt provided");
        return null;
      }
      
      if (!userId) {
        console.error("No user ID provided in the request");
        await snapshot.ref.update({
          response: "Authentication required. Please log in to use this service.",
          error: "Missing user authentication",
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      console.log(`Processing user message from user ${userId} in chat ${chatId}`, { messageId: event.params.conversationId });

      // Rate limiting check - get user's requests in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentRequests = await db.collection('conversations')
        .where('userId', '==', userId)
        .where('createTime', '>=', oneHourAgo)
        .get();
      
      // Limit to 30 requests per hour per user
      const MAX_REQUESTS_PER_HOUR = 30;
      if (recentRequests.size >= MAX_REQUESTS_PER_HOUR) {
        console.error(`Rate limit exceeded for user ${userId}: ${recentRequests.size} requests in the last hour`);
        await snapshot.ref.update({
          response: "You've reached your hourly limit for AI responses. Please try again later.",
          error: "Rate limit exceeded",
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      // Get API key from environment config
      const apiKey = process.env.GEMINI_APIKEY;
      if (!apiKey) {
        console.error("Gemini API key not configured");
        await snapshot.ref.update({ 
          response: "I'm sorry, the AI service is not properly configured. Please contact the administrator.",
          error: "API key not configured",
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      // Initialize the Gemini API
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use the gemini-pro model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // Generate content with the Gemini API
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Store the response in Firestore
      await snapshot.ref.update({
        response: response,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Added ${aiRole} response to chat ${chatId}`);
      return response;
    } catch (error) {
      console.error("Error generating AI response with Gemini", error);
      
      // Store the error in Firestore
      if (event.data) {
        await event.data.ref.update({
          response: "I'm having trouble connecting to my thinking systems. Let's continue while this gets resolved.",
          error: error.message,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return null;
    }
  });

// Generate AI response based on role and conversation history
async function generateAIResponse(role, messages) {
  // If Gemini API is not available, use fallback responses
  if (!genAI) {
    return getFallbackResponse(role, messages[messages.length - 1] ? messages[messages.length - 1].content || "" : "");
  }
  
  try {
    // Format conversation history for the AI
    const formattedMessages = messages.map(msg => {
      let prefix = "";
      
      if (msg.type === "user") {
        prefix = `User (${msg.senderName || "Unknown"}): `;
      } else if (msg.type === "ai") {
        prefix = `AI ${msg.sender}: `;
      } else {
        prefix = "System: ";
      }
      
      return prefix + msg.content;
    }).join("\n");
    
    // Create role-specific prompt
    let prompt = "";
    
    switch (role) {
      case "moderator":
        prompt = `You are a helpful AI moderator in a group chat. Your goal is to ensure the conversation remains civil, productive, and inclusive. Keep responses concise and helpful.
          
Chat history:
${formattedMessages}

As the moderator, provide a response that:
- Helps guide the conversation in a productive direction
- Ensures everyone's voice is heard
- Addresses any conflicts diplomatically
- Keeps the conversation on topic
- Is brief and to the point

Your response:`;
        break;
        
      case "planner":
        prompt = `You are an AI planner in a group chat. Your goal is to help organize tasks, create schedules, and track action items. Keep responses concise and actionable.
          
Chat history:
${formattedMessages}

As the planner, provide a response that:
- Identifies and organizes any tasks or plans mentioned
- Suggests timelines or deadlines if appropriate
- Helps structure activities or projects
- Is brief and to the point

Your response:`;
        break;
        
      case "summarizer":
        prompt = `You are an AI summarizer in a group chat. Your goal is to periodically provide concise summaries of the conversation to help everyone stay on the same page. Keep summaries brief and focused on key points.
          
Chat history:
${formattedMessages}

As the summarizer, provide a response that:
- Identifies the main points discussed recently
- Highlights any decisions or conclusions reached
- Tracks the conversation flow
- Is brief and to the point (max 3-4 sentences)

Your response:`;
        break;
        
      default:
        prompt = `You are an AI assistant (${role}) in a group chat. Your goal is to be helpful and provide value to the conversation. Keep responses concise and useful.
          
Chat history:
${formattedMessages}

As the ${role}, provide a helpful response that:
- Adds value to the conversation
- Is relevant to the discussion
- Is brief and to the point

Your response:`;
    }
    
    // Get response from Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Set safety settings
    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    };
    
    const safetySettings = [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ];
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });
    
    const response = result.response.text();
    return response;
  } catch (error) {
    logger.error("Error generating AI response with Gemini", error);
    return getFallbackResponse(role, messages[messages.length - 1] ? messages[messages.length - 1].content || "" : "");
  }
}

// Fallback responses when API is not available
function getFallbackResponse(role, userMessage = "") {
  const userMessageLower = userMessage.toLowerCase();
  
  switch (role) {
    case "moderator":
      if (userMessageLower.includes("fight") || userMessageLower.includes("argue")) {
        return "Let's keep the conversation civil, everyone. Try to focus on understanding each other's perspectives.";
      }
      return "Thank you for sharing. Does anyone else have thoughts on this topic?";
      
    case "planner":
      if (userMessageLower.includes("schedule") || userMessageLower.includes("plan")) {
        return "I notice we're discussing scheduling. Would you like me to create a plan or timeline for this?";
      } else if (userMessageLower.includes("todo") || userMessageLower.includes("task")) {
        return "I've noted that task. I'll add it to our action items list.";
      }
      return "I'm tracking the conversation. Let me know if you need me to organize any tasks or deadlines.";
      
    case "summarizer":
      if (userMessageLower.length > 100) {
        return `Thanks for that detailed message. To summarize: ${userMessage.substring(0, 50)}...`;
      }
      return "I'm collecting key points from the discussion. I'll provide a summary once we have more content.";
      
    default:
      return `As the ${role}, I acknowledge your message and am here to assist.`;
  }
}
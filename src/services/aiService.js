import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { shouldAIIntervene, getAIFallbackResponse } from '../utils/aiUtils';

// AI role definitions with specific prompt templates
export const AI_ROLES = {
  moderator: {
    name: 'Moderator',
    description: 'Helps keep the conversation on track and ensures everyone gets a chance to participate',
    promptTemplate: `You are a helpful AI moderator in a group chat. Your goal is to ensure the conversation remains civil, productive, and inclusive. Keep responses concise and helpful.
    
As the moderator, provide a response that:
- Helps guide the conversation in a productive direction
- Ensures everyone's voice is heard
- Addresses any conflicts diplomatically
- Keeps the conversation on topic
- Is brief and to the point
- NEVER say "Thank you for sharing" or similar generic responses
- Always be specific to the conversation content`,
  },
  
  planner: {
    name: 'Planner',
    description: 'Helps organize tasks, create schedules, and keep track of action items',
    promptTemplate: `You are an AI planner in a group chat. Your goal is to help organize tasks, create schedules, and track action items. Keep responses concise and actionable.
    
As the planner, provide a response that:
- Identifies and organizes any tasks or plans mentioned
- Suggests timelines or deadlines if appropriate
- Helps structure activities or projects
- Is brief and to the point`,
  },
  
  summarizer: {
    name: 'Summarizer',
    description: 'Periodically provides summaries of the conversation to help everyone stay on the same page',
    promptTemplate: `You are an AI summarizer in a group chat. Your goal is to periodically provide concise summaries of the conversation to help everyone stay on the same page.
    
As the summarizer, provide a response that:
- Identifies the main points discussed recently
- Highlights any decisions or conclusions reached
- Tracks the conversation flow
- Is brief and to the point (max 3-4 sentences)`,
  },
  
  educator: {
    name: 'Educator',
    description: 'Provides educational content and explanations on topics that come up in the conversation',
    promptTemplate: `You are an AI educator in a group chat. Your goal is to provide accurate, helpful information and explanations on topics that arise in conversation.
    
As the educator, provide a response that:
- Gives factual, educational information about the topic at hand
- Explains concepts clearly and concisely
- Offers context and background when helpful
- Is brief and to the point`,
  },
};

// Generate an AI response for a specific role
export const generateAIResponse = async (role, messages, chatId) => {
  try {
    if (!AI_ROLES[role]) {
      throw new Error(`Unknown AI role: ${role}`);
    }
    
    // Format chat history for the AI
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
    
    // Create role-specific prompt by combining template with chat history
    const promptWithHistory = `${AI_ROLES[role].promptTemplate}
    
Chat history:
${formattedMessages}

Your response:`;
    
    // Create a document in the conversations collection for the Cloud Function to process
    const conversationRef = await addDoc(collection(db, "conversations"), {
      prompt: promptWithHistory,
      createTime: serverTimestamp(),
      chatId,
      aiRole: role
    });
    
    // Wait for the Cloud Function to process the request (max 30 seconds)
    let retries = 0;
    const maxRetries = 30;
    let responseDoc;
    
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      responseDoc = await getDoc(conversationRef);
      
      if (responseDoc.exists() && responseDoc.data().response) {
        console.log(`Received AI response after ${retries + 1} seconds`);
        return responseDoc.data().response;
      }
      
      retries++;
    }
    
    // If we reach here, the API didn't respond in time
    throw new Error("AI response timeout");
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Return a graceful fallback response
    return getAIFallbackResponse(role);
  }
};

// Create a typing indicator and then replace it with the actual AI response
export const sendAIMessage = async (chatId, aiRole, messages, aiParticipantDetails = null) => {
  try {
    // Extract the latest user message
    const latestMessage = messages[messages.length - 1]?.content || "";
    
    // Create AI participant object with role information
    const aiParticipant = aiParticipantDetails || {
      role: aiRole,
      customMention: null
    };
    
    // Debug logs
    console.log(`[DEBUG] Processing message for AI role: ${aiRole}`);
    console.log(`[DEBUG] AI Participant Details:`, aiParticipant);
    console.log(`[DEBUG] Latest message:`, latestMessage);
    
    // Check if the AI should respond to this message
    const interventionDecision = shouldAIIntervene(messages, aiParticipant, latestMessage);
    
    // Debug logs for decision
    console.log(`[DEBUG] Intervention decision:`, interventionDecision);
    
    // If the AI shouldn't respond, exit early
    if (!interventionDecision.shouldRespond) {
      console.log(`AI ${aiRole} decided not to respond. Reason: ${interventionDecision.reason}`);
      return false;
    }
    
    console.log(`AI ${aiRole} is responding. Reason: ${interventionDecision.reason}`);
    
    // Create a unique ID for the typing message
    const typingId = `typing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add a typing indicator message
    const typingMessageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
      type: 'ai',
      content: '...',
      timestamp: serverTimestamp(),
      sender: aiRole,
      senderName: `AI ${AI_ROLES[aiRole]?.name || aiRole}`,
      isTyping: true,
      typingId
    });
    
    try {
      // Generate the AI response
      const aiResponse = await generateAIResponse(aiRole, messages, chatId);
      
      // INSTEAD OF DELETING: Mark the typing indicator as hidden
      await updateDoc(doc(db, "chats", chatId, "messages", typingMessageRef.id), {
        isHidden: true,
        isTyping: false
      });
      
      // Add the real response
      await addDoc(collection(db, "chats", chatId, "messages"), {
        type: 'ai',
        content: aiResponse,
        timestamp: serverTimestamp(),
        sender: aiRole,
        senderName: `AI ${AI_ROLES[aiRole]?.name || aiRole}`,
        isTyping: false,
        typingId,
        // Include information about why the AI responded
        interventionReason: interventionDecision.reason
      });
      
      return true;
    } catch (error) {
      console.error(`Error generating ${aiRole} response:`, error);
      
      // INSTEAD OF DELETING: Update the typing indicator with an error message
      await updateDoc(doc(db, "chats", chatId, "messages", typingMessageRef.id), {
        content: getAIFallbackResponse(aiRole, interventionDecision.reason),
        isTyping: false
      });
      
      return false;
    }
  } catch (error) {
    console.error('Error with AI message process:', error);
    return false;
  }
}; 
/**
 * AI Utility Functions
 * 
 * Functions for AI participant management, including:
 * - Mention detection (@mention functionality)
 * - Intervention decision logic
 * - Error handling and fallbacks
 */

// Sensitivity level definitions
export const SENSITIVITY_LEVELS = {
  SILENT: 'silent',         // Only responds to @mentions
  CONSERVATIVE: 'conservative', // Minimal automatic intervention
  BALANCED: 'balanced',     // Moderate intervention (responds to clear triggers)
  PROACTIVE: 'proactive'    // Frequent intervention (responds to subtle cues)
};

/**
 * Detects if a message contains a mention for a specific AI role
 * 
 * @param {string} message - The message to check for mentions
 * @param {object} aiParticipant - The AI participant object
 * @param {string} aiParticipant.role - The AI's role (e.g., 'moderator')
 * @param {string} [aiParticipant.customMention] - Custom mention trigger if set
 * @returns {boolean} - True if the message mentions this AI
 */
export const detectMention = (message, aiParticipant) => {
  if (!message || typeof message !== 'string') return false;
  
  const lowerMessage = message.toLowerCase();
  const role = aiParticipant.role.toLowerCase();
  
  // Check for custom mention if available
  if (aiParticipant.customMention) {
    const customTrigger = aiParticipant.customMention.toLowerCase();
    
    // Match @custom-mention or @custommention
    if (lowerMessage.includes(`@${customTrigger}`) || 
        lowerMessage.includes(`@${customTrigger.replace(/[^a-z0-9]/g, '')}`)) {
      return true;
    }
  }
  
  // Check for default mentions based on role
  // Match patterns like @moderator, @mod, etc.
  const defaultTriggers = [
    `@${role}`,
    `@${role.substring(0, 3)}` // Short version like @mod for moderator
  ];
  
  return defaultTriggers.some(trigger => lowerMessage.includes(trigger));
};

/**
 * Decision function to determine if an AI should intervene
 * 
 * @param {Array} messages - Recent conversation messages
 * @param {object} aiParticipant - The AI participant
 * @param {string} newMessage - The latest message that was just added
 * @returns {object} - Decision with format {shouldRespond: boolean, reason: string}
 */
export const shouldAIIntervene = (messages, aiParticipant, newMessage) => {
  try {
    // Get sensitivity level, default to CONSERVATIVE if not specified
    // Note: Convert to lowercase for consistent comparison
    const sensitivityLevel = 
      (aiParticipant.sensitivityLevel && typeof aiParticipant.sensitivityLevel === 'string') 
        ? aiParticipant.sensitivityLevel.toLowerCase() 
        : SENSITIVITY_LEVELS.CONSERVATIVE;
    
    // 1. Always respond if explicitly mentioned
    if (detectMention(newMessage, aiParticipant)) {
      return {
        shouldRespond: true,
        reason: "explicit_mention",
        confidence: 1.0
      };
    }
    
    // If on SILENT mode, only respond to mentions
    if (sensitivityLevel === SENSITIVITY_LEVELS.SILENT) {
      return {
        shouldRespond: false,
        reason: "silent_mode",
        confidence: 1.0
      };
    }
    
    // 2. Role-specific automatic intervention triggers
    let decision;
    
    switch (aiParticipant.role.toLowerCase()) {
      case 'moderator':
        decision = checkModeratorTriggers(messages, newMessage, sensitivityLevel);
        break;
      
      case 'summarizer':
        decision = checkSummarizerTriggers(messages, sensitivityLevel);
        break;
      
      case 'planner':
        decision = checkPlannerTriggers(messages, newMessage, sensitivityLevel);
        break;
        
      default:
        // Other AI roles only respond when mentioned
        decision = {
          shouldRespond: false,
          reason: "no_trigger_for_role",
          confidence: 1.0
        };
    }
    
    return decision;
  } catch (error) {
    console.error('Error in intervention decision logic:', error);
    
    // Fail gracefully - default to not responding when there's an error
    return {
      shouldRespond: false,
      reason: "error_in_decision_logic",
      confidence: 1.0,
      error: error.message
    };
  }
};

/**
 * Check for situations where a moderator should automatically intervene
 */
const checkModeratorTriggers = (messages, newMessage, sensitivityLevel) => {
  // Count messages since moderator last spoke
  let messagesSinceModeratorSpoke = 0;
  let hasModeratorSpoken = false;
  
  // Scan in reverse order until we find moderator message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.type === 'ai' && msg.sender === 'moderator') {
      hasModeratorSpoken = true;
      break;
    }
    messagesSinceModeratorSpoke++;
  }
  
  // If this is the first few messages in a chat and moderator hasn't spoken
  if (!hasModeratorSpoken && messages.length <= 3) {
    return {
      shouldRespond: true,
      reason: "greeting_new_chat",
      confidence: 0.9
    };
  }
  
  // CONSERVATIVE: only basic argument detection
  const lowerMessage = newMessage.toLowerCase();
  
  const argumentIndicators = {
    conservative: [
      'i disagree', 'you\'re wrong', 'that\'s not right', 
      'incorrect', 'you don\'t understand'
    ],
    balanced: [
      'i disagree', 'you\'re wrong', 'that\'s not right', 
      'incorrect', 'you don\'t understand', 'not true',
      'stupid', 'idiot', 'shut up', 'nonsense'
    ],
    proactive: [
      'i disagree', 'you\'re wrong', 'that\'s not right', 
      'incorrect', 'you don\'t understand', 'not true',
      'stupid', 'idiot', 'shut up', 'nonsense', 'no', 
      'never', 'bad idea', 'terrible', 'hate', 'don\'t like',
      'ridiculous', 'bad', 'worst'
    ]
  };
  
  let indicatorsToCheck = argumentIndicators.conservative;
  
  // Determine which indicators to check based on sensitivity
  if (sensitivityLevel === SENSITIVITY_LEVELS.BALANCED) {
    indicatorsToCheck = argumentIndicators.balanced;
  } else if (sensitivityLevel === SENSITIVITY_LEVELS.PROACTIVE) {
    indicatorsToCheck = argumentIndicators.proactive;
    
    // Proactive moderators also respond when someone monologues
    if (messages.length >= 3) {
      const lastThreeMessages = messages.slice(-3);
      const allFromSameUser = lastThreeMessages.every(msg => 
        msg.type === 'user' && msg.sender === lastThreeMessages[0].sender
      );
      
      if (allFromSameUser) {
        return {
          shouldRespond: true,
          reason: "encourage_participation",
          confidence: 0.6
        };
      }
    }
    
    // Proactive moderators should respond occasionally to keep conversation flowing
    const randomResponseChance = 0.3; // 30% chance to respond to any message
    if (Math.random() < randomResponseChance) {
      return {
        shouldRespond: true,
        reason: "proactive_engagement",
        confidence: 0.5
      };
    }
  }
  
  const hasArgumentIndicators = indicatorsToCheck.some(phrase => 
    lowerMessage.includes(phrase)
  );
  
  if (hasArgumentIndicators) {
    return {
      shouldRespond: true,
      reason: "potential_argument",
      confidence: 0.7
    };
  }
  
  // Don't intervene automatically otherwise
  return {
    shouldRespond: false,
    reason: "no_moderator_trigger",
    confidence: 0.8
  };
};

/**
 * Check for situations where a summarizer should automatically intervene
 */
const checkSummarizerTriggers = (messages, sensitivityLevel) => {
  // If we have a significant number of messages without a summary, provide one
  let messageThreshold;
  
  // Adjust threshold based on sensitivity
  switch (sensitivityLevel) {
    case SENSITIVITY_LEVELS.PROACTIVE:
      messageThreshold = 5; // Summarize frequently
      break;
    case SENSITIVITY_LEVELS.BALANCED:
      messageThreshold = 8; // Medium frequency
      break;
    case SENSITIVITY_LEVELS.CONSERVATIVE:
    default:
      messageThreshold = 12; // Less frequent summaries
  }
  
  // Count messages since summarizer last spoke
  let messagesSinceSummary = 0;
  
  // Scan in reverse order until we find summarizer message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.type === 'ai' && msg.sender === 'summarizer') {
      break;
    }
    messagesSinceSummary++;
  }
  
  if (messagesSinceSummary >= messageThreshold) {
    return {
      shouldRespond: true,
      reason: "message_threshold_reached",
      confidence: 0.8
    };
  }
  
  return {
    shouldRespond: false,
    reason: "no_summarizer_trigger",
    confidence: 0.9
  };
};

/**
 * Check for situations where a planner should automatically intervene
 */
const checkPlannerTriggers = (messages, newMessage, sensitivityLevel) => {
  // Detect planning-related keywords
  const lowerMessage = newMessage.toLowerCase();
  
  const planningKeywords = {
    conservative: [
      'schedule', 'plan', 'organize', 'task', 'todo', 'timeline',
      'deadline', 'project', 'due date', 'milestones'
    ],
    balanced: [
      'schedule', 'plan', 'organize', 'task', 'todo', 'timeline',
      'deadline', 'project', 'due date', 'milestones', 'goal',
      'meeting', 'appointment', 'agenda', 'objective'
    ],
    proactive: [
      'schedule', 'plan', 'organize', 'task', 'todo', 'timeline',
      'deadline', 'project', 'due date', 'milestones', 'goal',
      'meeting', 'appointment', 'agenda', 'objective', 'when',
      'how', 'steps', 'process', 'method', 'strategy', 'time',
      'date', 'week', 'month', 'tomorrow', 'next'
    ]
  };
  
  let keywordsToCheck = planningKeywords.conservative;
  
  // Determine which keywords to check based on sensitivity
  if (sensitivityLevel === SENSITIVITY_LEVELS.BALANCED) {
    keywordsToCheck = planningKeywords.balanced;
  } else if (sensitivityLevel === SENSITIVITY_LEVELS.PROACTIVE) {
    keywordsToCheck = planningKeywords.proactive;
  }
  
  const hasPlanningKeywords = keywordsToCheck.some(keyword => 
    lowerMessage.includes(keyword)
  );
  
  if (hasPlanningKeywords) {
    return {
      shouldRespond: true,
      reason: "planning_topic_detected",
      confidence: 0.7
    };
  }
  
  return {
    shouldRespond: false,
    reason: "no_planner_trigger",
    confidence: 0.9
  };
};

/**
 * Generate a fallback response when AI service fails
 * 
 * @param {string} role - The AI role 
 * @param {string} reason - Reason for intervention (if known)
 * @returns {string} Fallback response
 */
export const getAIFallbackResponse = (role, reason = '') => {
  const isExplicitMention = reason === 'explicit_mention';
  
  switch (role.toLowerCase()) {
    case 'moderator':
      return isExplicitMention 
        ? "You called for the moderator. I'm here to help keep the conversation productive."
        : "I noticed the conversation might benefit from some moderation. How can I help?";
      
    case 'summarizer':
      return isExplicitMention
        ? "You asked for a summary. I'll help consolidate the key points from this conversation."
        : "I notice there have been several messages. Here's a quick summary of the main points...";
      
    case 'planner':
      return isExplicitMention
        ? "You called the planner. I can help organize any tasks or deadlines."
        : "I notice planning-related topics. Would you like me to help organize these tasks?";
      
    default:
      return isExplicitMention
        ? `You called for ${role}. How can I assist you?`
        : `I'm the ${role}, jumping in to provide some assistance.`;
  }
}; 
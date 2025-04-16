// Initialize Firebase App Check using window.firebaseServices
document.addEventListener('DOMContentLoaded', () => {
  console.log("[AppJS] DOM loaded.");
  
  // Initialize Firebase App Check
  try {
    if (window.firebaseServices && window.firebaseServices.auth) {
      // Try to get App Check from Firebase services
      const appCheck = window.firebase?.appCheck();
      if (appCheck) {
        appCheck.activate(
          // Replace this with your reCAPTCHA site key
          '6LcabhgrAAAAANBH674IhexQSjYHiINry1-Pt4_F',
          // Optional: Pass options
          {isTokenAutoRefreshEnabled: true}
        );
        console.log("[AppJS] Firebase App Check initialized successfully.");
      } else {
        console.warn("[AppJS] App Check not available in this Firebase version.");
      }
    }
  } catch (error) {
    console.error("[AppJS] Error initializing Firebase App Check:", error);
  }
  
  if (window.firebaseServices) {
    console.log("[AppJS] Firebase services found. Initializing app...");
    initApp(window.firebaseServices);
  } else {
    console.error("[AppJS] Firebase services not found on window!");
    alert("Error initializing Firebase. Check console.");
  }
});

function initApp(firebase) {
  console.log("[AppJS] initApp started.");

  // Use destructured services from firebase object passed in
  const { 
    auth,
    db,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    getDocs,
    limit,
    deleteDoc
  } = firebase;

  // Function to update UI based on user state
  function updateUIAfterAuth(user) {
    console.log('[AppJS] updateUIAfterAuth called. User:', user ? user.uid : 'No user');
    if (user) {
      currentUser = user; // Ensure global state is set
      userName.textContent = user.displayName || user.email || 'Logged In User';
      loginButton.style.display = 'none';
      logoutButton.style.display = 'block';
      welcomeScreen.querySelector('p').textContent = 'You are logged in. Start a new chat or join one!';
      welcomeActionButtons.style.display = 'flex';
    } else {
      // This part should be handled by onAuthStateChanged when user logs out
      currentUser = null;
      userName.textContent = 'Guest';
      loginButton.style.display = 'block';
      logoutButton.style.display = 'none';
      welcomeScreen.querySelector('p').textContent = 'Please log in to start chatting.';
      welcomeActionButtons.style.display = 'none';
      showScreen(welcomeScreen);
    }
  }

  // DOM Elements
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const userName = document.getElementById('user-name');
  const createChatButton = document.getElementById('create-chat-button');
  const joinChatButton = document.getElementById('join-chat-button');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatSetup = document.getElementById('chat-setup');
  const chatRoom = document.getElementById('chat-room');
  const joinForm = document.getElementById('join-form');
  const addInviteButton = document.getElementById('add-invite');
  const inviteEmail = document.getElementById('invite-email');
  const inviteList = document.getElementById('invite-list');
  const startChatButton = document.getElementById('start-chat');
  const messagesContainer = document.getElementById('messages-container');
  const messageInput = document.getElementById('message-input');
  const sendMessageButton = document.getElementById('send-message');
  const inviteMoreButton = document.getElementById('invite-more');
  const joinChatSubmit = document.getElementById('join-chat');
  const chatIdInput = document.getElementById('chat-id');
  const chatTitle = document.getElementById('chat-title');
  const welcomeActionButtons = document.querySelector('#welcome-screen .action-buttons');

  // App State
  let currentUser = null;
  let currentChatId = null;
  let invitedFriends = [];
  let selectedAIs = [];
  let unsubscribeMessages = null;

  // Auth state observer
  console.log("[AppJS] Setting up auth state listener...");
  onAuthStateChanged(auth, (user) => {
    console.log('[AppJS] onAuthStateChanged triggered - User:', user ? user.uid : 'No user');
    // Update UI based on current auth state
    updateUIAfterAuth(user);
  });

  // --- Login with Popup --- 
  console.log("[AppJS] Attaching click listener to login button (popup method)...");
  loginButton.addEventListener('click', () => {
    console.log('[AppJS] Login button clicked, using popup authentication.');
    try {
      if (!auth) {
          console.error('[AppJS] Auth object is not valid! Cannot initiate login.');
          alert('Authentication service not ready. Please refresh.');
          return;
      }
      console.log('[AppJS] Auth object seems valid. Creating provider...');
      const provider = new GoogleAuthProvider();
      console.log('[AppJS] Provider created. Calling signInWithPopup...');
      
      signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            console.log('[AppJS] signInWithPopup successful:', user.email);
            // No need to call updateUIAfterAuth here, 
            // onAuthStateChanged will trigger and handle the UI update.
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          const email = error.customData?.email;
          const credential = GoogleAuthProvider.credentialFromError(error);
          console.error('[AppJS] Error during signInWithPopup:', errorCode, errorMessage, email, credential);
          if (errorCode === 'auth/popup-closed-by-user') {
            alert('Login cancelled.');
          } else if (errorCode === 'auth/popup-blocked') {
            alert('Popup blocked by browser. Please allow popups for this site and try again.');
          } else {
            alert(`Login failed: ${errorMessage}`);
          }
        });
        
      console.log('[AppJS] signInWithPopup called.');
    } catch (e) {
        console.error('[AppJS] Synchronous error in login click handler:', e);
        alert('An unexpected error occurred trying to log in.');
    }
  });
  console.log("[AppJS] Click listener attached.");

  // --- Logout --- 
  logoutButton.addEventListener('click', () => {
    console.log('[AppJS] Logout button clicked');
    signOut(auth).then(() => {
      console.log('[AppJS] Sign-out successful.');
      // Reset app state
      currentChatId = null;
      if (unsubscribeMessages) unsubscribeMessages();
      unsubscribeMessages = null;
      messagesContainer.innerHTML = '';
      invitedFriends = [];
      selectedAIs = [];
      inviteList.innerHTML = '';
      document.querySelectorAll('input[name="ai-role"]').forEach(cb => cb.checked = false);
      // onAuthStateChanged handles UI updates
    }).catch((error) => {
      console.error('[AppJS] Sign-out error:', error);
      alert('Logout failed. Please try again.');
    });
  });

  // --- Core App Logic ---

  createChatButton.addEventListener('click', () => {
    if (!currentUser) {
      alert('Please login first');
      return;
    }
    // Reset chat setup form state
    invitedFriends = [];
    renderInviteList();
    document.querySelectorAll('input[name="ai-role"]').forEach(cb => cb.checked = false);
    inviteEmail.value = '';
    showScreen(chatSetup);
  });

  joinChatButton.addEventListener('click', () => {
    if (!currentUser) {
      alert('Please login first');
      return;
    }
    // Reset join form state
    chatIdInput.value = '';
    showScreen(joinForm);
  });

  addInviteButton.addEventListener('click', () => {
    const email = inviteEmail.value.trim();
    // Basic email validation
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !invitedFriends.includes(email)) {
      invitedFriends.push(email);
      renderInviteList();
      inviteEmail.value = '';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address.');
    } else {
      alert('Email already added.');
    }
  });

  function renderInviteList() {
    inviteList.innerHTML = '';
    invitedFriends.forEach((email, index) => {
      const inviteItem = document.createElement('div');
      inviteItem.className = 'invite-item';
      const emailSpan = document.createElement('span');
      emailSpan.textContent = email;
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.classList.add('remove-invite');
      removeButton.addEventListener('click', () => {
        invitedFriends.splice(index, 1);
        renderInviteList();
      });
      inviteItem.appendChild(emailSpan);
      inviteItem.appendChild(removeButton);
      inviteList.appendChild(inviteItem);
    });
  }

  function getSelectedAIRoles() {
    const aiCheckboxes = document.querySelectorAll('input[name="ai-role"]:checked');
    return Array.from(aiCheckboxes).map(checkbox => checkbox.value);
  }

  startChatButton.addEventListener('click', async () => {
    if (!currentUser) {
      alert('Please login first');
      return;
    }
    
    selectedAIs = getSelectedAIRoles();
    
    console.log('[AppJS] Starting chat creation...');
    try {
      const chatData = {
        createdBy: currentUser.uid,
        creatorName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
        participants: [currentUser.uid, ...invitedFriends],
        aiParticipants: selectedAIs
      };
      console.log('[AppJS] Chat data to save:', chatData);
      const chatRef = await addDoc(collection(db, "chats"), chatData);
      console.log('[AppJS] Chat created with ID:', chatRef.id);
      
      currentChatId = chatRef.id;
      chatTitle.textContent = `Chat: ${currentChatId}`;
      
      // Send initial system message
      const starterName = currentUser.displayName || currentUser.email || 'User';
      await addMessage('system', `Chat started by ${starterName}`);
      
      // Start listening before adding AI welcome message to avoid race conditions
      startListeningToMessages(currentChatId);
      
      // Manually add AI welcome message - simulate only for the first role
      if (selectedAIs.length > 0) {
        const firstAIRole = selectedAIs[0];
        
        // Add AI welcome message directly without generating a response
        await addDoc(collection(db, "chats", currentChatId, "messages"), {
          type: 'ai',
          content: getAIWelcomeMessage(firstAIRole),
          timestamp: serverTimestamp(),
          sender: firstAIRole,
          senderName: `AI ${firstAIRole}`,
          isWelcomeMessage: true // Mark as welcome message
        });
      }
      
      showScreen(chatRoom);
      console.log('[AppJS] Navigated to chat room.');
    } catch (error) {
      console.error('[AppJS] Error creating chat:', error);
      alert('Failed to create chat. Please try again.');
    }
  });

  joinChatSubmit.addEventListener('click', async () => {
    if (!currentUser) {
      alert('Please login first');
      return;
    }

    const chatIdToJoin = chatIdInput.value.trim();
    if (!chatIdToJoin) {
      alert('Please enter a valid Chat ID');
      return;
    }
    
    console.log(`[AppJS] Attempting to join chat ID: ${chatIdToJoin}`);
    try {
      const chatDocRef = doc(db, "chats", chatIdToJoin);
      const chatDocSnap = await getDoc(chatDocRef);
      
      if (!chatDocSnap.exists()) {
        alert('Chat not found');
        console.log('[AppJS] Chat not found.');
        return;
      }
      
      const chatData = chatDocSnap.data();
      console.log('[AppJS] Found chat data:', chatData);

      // Check if current user is already a participant (by UID)
      if (!chatData.participants.includes(currentUser.uid)) {
        console.log('[AppJS] User not in participants, adding...');
        // Add user to participants
        await updateDoc(chatDocRef, {
          participants: arrayUnion(currentUser.uid)
        });
        console.log('[AppJS] User added to participants.');
        
        // Send joined message
        const joinerName = currentUser.displayName || currentUser.email || 'User';
        await addMessage('system', `${joinerName} joined the chat`, null, chatIdToJoin);
        console.log('[AppJS] Sent join message.');
      } else {
        console.log('[AppJS] User already in participants list.');
      }
      
      currentChatId = chatIdToJoin;
      chatTitle.textContent = `Chat: ${currentChatId}`;
      startListeningToMessages(currentChatId);
      showScreen(chatRoom);
      console.log('[AppJS] Navigated to chat room after joining.');
    } catch (error) {
      console.error('[AppJS] Error joining chat:', error);
      alert('Failed to join chat. Please try again.');
    }
  });

  sendMessageButton.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });
  
  inviteMoreButton.addEventListener('click', () => {
    if (!currentChatId) return;
    prompt('Invite others by sharing this Chat ID:', currentChatId);
  });

  async function handleSendMessage() {
    const content = messageInput.value.trim();
    if (!content || !currentChatId || !currentUser) {
        console.log('[AppJS] Cannot send message - missing content, chat ID, or user.');
        return;
    }
    
    console.log(`[AppJS] Sending message: "${content}"`);
    try {
      const senderName = currentUser.displayName || currentUser.email || 'User';
      // Send user message
      await addMessage('user', content, senderName);
      messageInput.value = '';
      
      // Get chat document to determine AI participants
      const chatDocRef = doc(db, "chats", currentChatId);
      const chatDocSnap = await getDoc(chatDocRef);
      
      if (!chatDocSnap.exists()) {
        console.error('[AppJS] Chat not found.');
        return;
      }
      
      const chatData = chatDocSnap.data();
      const aiParticipants = chatData.aiParticipants || [];
      
      if (aiParticipants.length === 0) {
        console.log('[AppJS] No AI participants in this chat.');
        return;
      }
      
      // Get recent messages for context
      const messagesSnapshot = await getDocs(
        query(collection(db, "chats", currentChatId, "messages"), 
              orderBy("timestamp", "desc"), 
              limit(10))
      );
      
      const messages = [];
      messagesSnapshot.forEach(doc => {
        messages.unshift(doc.data()); // Add to beginning to get chronological order
      });
      
      // Generate and add AI responses using the extension
      for (const aiRole of aiParticipants) {
        try {
          console.log(`[AppJS] Generating response for AI role: ${aiRole}`);
          
          // Create a unique ID for this typing message
          const typingId = `typing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Add a "typing" indicator message that will be replaced with the actual response
          const typingMessageData = {
            type: 'ai',
            content: '...',
            timestamp: new Date(), // Use client-side date for immediate display
            sender: aiRole,
            senderName: `AI ${aiRole}`,
            isTyping: true, // Mark as typing indicator
            typingId: typingId // Add a unique ID to match when replacing
          };
          
          // Reference to the typing message
          const typingMessageRef = await addDoc(
            collection(db, "chats", currentChatId, "messages"), 
            typingMessageData
          );
          
          try {
            // Generate the AI response
            console.log(`[AppJS] Generating AI response for role "${aiRole}" with Gemini extension`);
            const aiResponse = await generateAIResponseWithExtension(aiRole, messages, currentChatId);
            
            // NEVER use deleteDoc - instead mark the typing indicator as hidden
            // This avoids issues with Firestore deleteDoc not being available
            const typingDocRef = doc(db, "chats", currentChatId, "messages", typingMessageRef.id);
            await updateDoc(typingDocRef, {
              isHidden: true,
              isTyping: false
            });
            console.log(`[AppJS] Marked typing indicator as hidden`);
            
            // Add the real response as a new message
            await addDoc(collection(db, "chats", currentChatId, "messages"), {
              type: 'ai',
              content: aiResponse,
              timestamp: serverTimestamp(),
              sender: aiRole,
              senderName: `AI ${aiRole}`,
              isTyping: false,
              typingId: typingId
            });
            
            console.log(`[AppJS] Added ${aiRole} response to chat`);
          } catch (error) {
            // If there's an error generating the response, mark the typing indicator as hidden
            console.error(`[AppJS] Error generating ${aiRole} response:`, error);
            
            try {
              // NEVER use deleteDoc - instead update the document
              const typingDocRef = doc(db, "chats", currentChatId, "messages", typingMessageRef.id);
              await updateDoc(typingDocRef, {
                isHidden: true,
                isTyping: false,
                content: "I'm having trouble connecting to my thinking systems. Let's continue while this gets resolved."
              });
              console.log(`[AppJS] Updated typing indicator with error message`);
            } catch (updateError) {
              console.error(`[AppJS] Error updating typing indicator:`, updateError);
            }
          }
        } catch (error) {
          console.error(`[AppJS] Error handling AI response for ${aiRole}:`, error);
        }
        
        // Add small delay between AI responses
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('[AppJS] Error sending message:', error);
      alert('Failed to send message.');
    }
  }

  async function addMessage(type, content, senderName = null, chatId = currentChatId) {
    if (!chatId) {
        console.error('[AppJS] addMessage failed: No chat ID provided.');
        return Promise.reject('No current chat ID');
    }
    if (!currentUser && type === 'user') {
        console.error('[AppJS] addMessage failed: No current user for user message.');
        return Promise.reject('No current user');
    }

    const messageData = {
        type: type, // 'user', 'ai', 'system'
        content: content,
        timestamp: serverTimestamp(),
        sender: type === 'user' ? currentUser.uid : (type === 'ai' ? senderName : null),
        senderName: type === 'user' ? senderName : (type === 'ai' ? `AI ${senderName}` : null)
    };
    
    console.log(`[AppJS] Adding message to chat ${chatId}:`, messageData);
    try {
        const messagesColRef = collection(db, "chats", chatId, "messages");
        const docRef = await addDoc(messagesColRef, messageData);
        console.log(`[AppJS] Message added with ID: ${docRef.id}`);
        return docRef;
    } catch (error) {
        console.error(`[AppJS] Error adding message to chat ${chatId}:`, error);
        throw error;
    }
  }

  function startListeningToMessages(chatId) {
    if (!chatId) {
        console.error('[AppJS] startListeningToMessages failed: No chat ID provided.');
        return;
    }
    if (unsubscribeMessages) {
      console.log('[AppJS] Unsubscribing from previous messages listener.');
      unsubscribeMessages();
    }
    
    console.log(`[AppJS] Starting messages listener for chat ID: ${chatId}`);
    const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      console.log(`[AppJS] Received ${querySnapshot.docs.length} messages snapshot.`);
      messagesContainer.innerHTML = '';
      querySnapshot.forEach((doc) => {
        displayMessage(doc.data());
      });
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, (error) => {
      console.error("[AppJS] Error listening to messages: ", error);
      alert("Error loading messages. Please try refreshing.");
    });
  }

  function displayMessage(message) {
    // Skip hidden messages
    if (message.isHidden) {
      return;
    }
    
    // If we receive a non-typing message with the same typingId as one already on screen,
    // remove the typing one first (defensive coding, should not be needed with deletion approach)
    if (message.typingId && !message.isTyping) {
      const existingTypingMessages = Array.from(messagesContainer.children).filter(el => 
        el.dataset.typingId === message.typingId && 
        el.dataset.isTyping === 'true'
      );
      
      existingTypingMessages.forEach(el => {
        messagesContainer.removeChild(el);
      });
    }
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    let senderText = null;
    switch (message.type) {
      case 'user':
        const isCurrentUser = currentUser && message.sender === currentUser.uid;
        messageElement.classList.add(isCurrentUser ? 'user-message' : 'friend-message');
        senderText = message.senderName || (isCurrentUser ? 'You' : 'Guest');
        break;
      case 'ai':
        messageElement.classList.add('ai-message');
        if (message.isTyping) {
          messageElement.classList.add('typing');
        }
        senderText = message.senderName || `AI ${message.sender}`;
        break;
      case 'system':
        messageElement.classList.add('system-message');
        break;
    }
    
    if (senderText) {
      const senderEl = document.createElement('div');
      senderEl.className = 'message-sender';
      senderEl.textContent = senderText;
      messageElement.appendChild(senderEl);
    }
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    if (message.isTyping) {
      // Create typing indicator with animated dots
      contentEl.innerHTML = '<span class="typing-indicator"><span>.</span><span>.</span><span>.</span></span>';
    } else {
      contentEl.textContent = message.content;
    }
    
    messageElement.appendChild(contentEl);
    
    // Add data attributes for identification
    messageElement.dataset.senderId = message.sender || '';
    messageElement.dataset.isTyping = message.isTyping ? 'true' : 'false';
    if (message.typingId) {
      messageElement.dataset.typingId = message.typingId;
    }
    
    messagesContainer.appendChild(messageElement);
    
    // Always scroll to the bottom when new messages arrive
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function getAIWelcomeMessage(role) {
    switch (role) {
      case 'moderator':
        return "I'm the moderator AI. I'll help keep the conversation on track and make sure everyone gets a chance to participate.";
      case 'planner':
        return "I'm the planner AI. I can help organize tasks, create schedules, and keep track of action items.";
      case 'summarizer':
        return "I'm the summarizer AI. I'll provide periodic summaries of the conversation to help everyone stay on the same page.";
      default:
        return `I'm the ${role} AI. I'm here to assist with this conversation.`;
    }
  }

  // Function to generate AI response using the Gemini extension
  async function generateAIResponseWithExtension(role, messages, chatId) {
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
- NEVER say "Thank you for sharing" or similar generic responses
- Always be specific to the conversation content
- For simple greetings like "hello", respond with a friendly greeting and ask what the person would like to discuss

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
      
      // Use the Gemini extension by adding a document to the conversations collection
      const conversationRef = await addDoc(collection(db, "conversations"), {
        prompt: prompt,
        createTime: serverTimestamp()
      });
      
      // Wait for the response to be generated
      // The extension will update the document with the response field
      let retries = 0;
      const maxRetries = 10; // Reduce wait time to 10 seconds
      let responseDoc;
      
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        responseDoc = await getDoc(conversationRef);
        
        if (responseDoc.exists() && responseDoc.data().response) {
          console.log(`[AppJS] Received AI response after ${retries + 1} seconds`);
          console.log(`[AppJS] Raw response: "${responseDoc.data().response}"`);
          return responseDoc.data().response;
        }
        
        retries++;
      }
      
      // If we reach here, the API didn't respond in time or had an error
      console.error(`[AppJS] Failed to get AI response after ${maxRetries} seconds`);
      
      // Generate a fallback response based on the role and last message
      let lastUserMessage = ""; 
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === "user") {
          lastUserMessage = messages[i].content;
          break;
        }
      }
      
      let fallbackResponse = "";
      switch (role) {
        case "moderator":
          if (lastUserMessage.toLowerCase().includes("hello") || lastUserMessage.toLowerCase().includes("hi")) {
            fallbackResponse = "Hello! Welcome to the chat. What would you like to discuss today?";
          } else {
            fallbackResponse = "I'm listening and following along. Feel free to continue the conversation.";
          }
          break;
        case "planner":
          fallbackResponse = "I'll make a note of that. Do you want to add any more details to your plan?";
          break;
        case "summarizer":
          fallbackResponse = "I'm keeping track of the conversation points. Let me know if you'd like a summary.";
          break;
        default:
          fallbackResponse = "I understand. Please continue and I'll do my best to assist.";
      }
      
      console.log(`[AppJS] Using fallback response: "${fallbackResponse}"`);
      return fallbackResponse;
      
    } catch (error) {
      console.error("[AppJS] Error generating AI response with Gemini extension:", error);
      
      // Return a generic fallback response
      return "I'm having trouble connecting to my thinking systems. Let's continue the conversation while this gets resolved.";
    }
  }

  function showScreen(screenToShow) {
    console.log(`[AppJS] Showing screen: ${screenToShow?.id || 'null'}`);
    const screens = [welcomeScreen, chatSetup, chatRoom, joinForm]; 
    screens.forEach(screen => {
      if (screen) { screen.style.display = 'none'; }
    });
    if (screenToShow) {
      screenToShow.style.display = 'block';
    } else {
      console.error("[AppJS] Attempted to show a null or invalid screen");
      if (welcomeScreen) welcomeScreen.style.display = 'block';
    }
  }
  
  console.log("[AppJS] initApp finished.");
}
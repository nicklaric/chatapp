import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { sendAIMessage } from '../services/aiService';
import Message from '../components/Message';
import MessageInput from '../components/MessageInput';
import ShareInvite from '../components/ShareInvite';

const ChatRoom = () => {
  const { chatId } = useParams();
  const { currentUser } = useAuth();
  const { setCurrentChat } = useChat();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat data
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const chatDocRef = doc(db, 'chats', chatId);
        const chatSnapshot = await getDoc(chatDocRef);
        
        if (!chatSnapshot.exists()) {
          setError('Chat not found');
          navigate('/404');
          return;
        }
        
        const data = chatSnapshot.data();
        
        // Check if user is a participant
        if (!data.participants.includes(currentUser.uid)) {
          setError('You are not a participant in this chat');
          navigate('/');
          return;
        }
        
        setChatData(data);
        setCurrentChat({ id: chatId, ...data });
      } catch (err) {
        console.error('Error fetching chat:', err);
        setError('Failed to load chat data');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      fetchChatData();
    }
    
    return () => setCurrentChat(null);
  }, [chatId, currentUser, navigate, setCurrentChat]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;
    
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = [];
      snapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          ...doc.data(),
          // Convert timestamps to date objects
          timestamp: doc.data().timestamp?.toDate() || new Date()
        });
      });
      
      setMessages(messagesList);
      scrollToBottom();
    }, (err) => {
      console.error('Error listening to messages:', err);
      setError('Failed to load messages');
    });
    
    return unsubscribe;
  }, [chatId]);

  // Handle sending messages
  const handleSendMessage = async (content) => {
    if (!currentUser || !chatId || !content.trim() || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      // Add user message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'user',
        content: content.trim(),
        timestamp: serverTimestamp(),
        sender: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email
      });
      
      // Trigger AI responses for each AI participant
      if (chatData?.aiParticipants && chatData.aiParticipants.length > 0) {
        console.log("[DEBUG-CHATROOM] Chat data:", chatData);
        
        // Get the most recent messages for context (limit to 10 for performance)
        const recentMessages = messages.slice(-10);
        
        // Get the latest user message that was just added
        const newUserMessage = {
          type: 'user',
          content: content.trim(),
          sender: currentUser.uid,
          senderName: currentUser.displayName || currentUser.email
        };
        
        // Process each AI participant asynchronously
        // We don't await here to allow multiple AIs to "think" simultaneously
        for (const aiRole of chatData.aiParticipants) {
          // Check if we have detailed AI participant info with custom mentions
          let aiParticipantDetails = { role: aiRole };
          
          if (chatData.aiParticipantDetails) {
            const details = chatData.aiParticipantDetails.find(p => p.role === aiRole);
            if (details) {
              aiParticipantDetails = details;
            }
          }
          
          console.log(`[DEBUG-CHATROOM] AI ${aiRole} details:`, aiParticipantDetails);
          
          // Send message with full context and latest message for decision
          sendAIMessage(chatId, aiRole, [...recentMessages, newUserMessage], aiParticipantDetails);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Toggle invite panel
  const toggleInvitePanel = () => {
    setShowInvite(!showInvite);
  };

  // UI for loading, error, and chat display
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)]">
      {/* Chat Header */}
      <div className="bg-white shadow-sm rounded-t-lg p-4 border-b">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Chat Room</h1>
          <button 
            onClick={toggleInvitePanel}
            className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            {showInvite ? 'Hide Invite' : 'Invite People'}
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          {chatData?.aiParticipants?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="font-medium">AI Participants:</span>
              {chatData.aiParticipants.map(role => (
                <span 
                  key={role} 
                  className="px-2 py-0.5 bg-secondary bg-opacity-10 text-secondary text-xs rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Invitation Panel */}
        {showInvite && (
          <div className="mt-4">
            <ShareInvite chatId={chatId} />
          </div>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map(message => (
            <Message key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="bg-white shadow-sm rounded-b-lg p-4 border-t">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          disabled={sendingMessage} 
        />
      </div>
    </div>
  );
};

export default ChatRoom; 
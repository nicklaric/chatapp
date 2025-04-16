import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, getDoc, updateDoc, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

// Create context
const ChatContext = createContext();

// Hook to use chat context
export const useChat = () => {
  return useContext(ChatContext);
};

// Provider component
export const ChatProvider = ({ children }) => {
  const [currentChat, setCurrentChat] = useState(null);
  const [userChats, setUserChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Load user's chats
  useEffect(() => {
    if (!currentUser) {
      setUserChats([]);
      setLoading(false);
      return;
    }

    const loadUserChats = async () => {
      setLoading(true);
      try {
        // Query chats where user is a participant
        const q = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const chats = [];
        
        querySnapshot.forEach((doc) => {
          chats.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setUserChats(chats);
      } catch (err) {
        console.error('Error loading chats:', err);
        setError('Failed to load your chat rooms');
      } finally {
        setLoading(false);
      }
    };

    loadUserChats();
  }, [currentUser]);

  // Create a new chat
  const createChat = async (aiParticipants = [], invitedEmails = []) => {
    if (!currentUser) return;
    
    setError('');
    try {
      // All participants (initially just the creator)
      const participants = [currentUser.uid];
      
      // Normalize AI participants structure
      const normalizedAIParticipants = aiParticipants.map(participant => {
        // Handle both the new object format and legacy string format
        if (typeof participant === 'string') {
          return {
            role: participant,
            customMention: null
          };
        }
        
        return {
          role: participant.role,
          customMention: participant.customMention || null,
          sensitivityLevel: participant.sensitivityLevel || 'conservative',
          name: participant.name || null
        };
      });
      
      console.log("[DEBUG-CHAT-CONTEXT] Normalized AI participants:", normalizedAIParticipants);
      
      // For backward compatibility, extract just the role names for aiParticipants array
      const aiParticipantRoles = normalizedAIParticipants.map(p => p.role);
      
      // Create chat document
      const chatRef = await addDoc(collection(db, 'chats'), {
        createdBy: currentUser.uid,
        creatorName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp(),
        participants,
        aiParticipants: aiParticipantRoles,
        aiParticipantDetails: normalizedAIParticipants, // Store full details including custom mentions
        invitedEmails,  // Store invited emails
        invitationLink: true,  // Flag to enable shareable links
      });
      
      // Add initial system message
      await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
        type: 'system',
        content: `Chat created by ${currentUser.displayName || currentUser.email}`,
        timestamp: serverTimestamp(),
        sender: null,
        senderName: null
      });

      // For each invited email, create an invitation record
      for (const email of invitedEmails) {
        await addDoc(collection(db, 'invitations'), {
          chatId: chatRef.id,
          email: email.toLowerCase().trim(),
          createdBy: currentUser.uid,
          creatorName: currentUser.displayName || currentUser.email,
          createdAt: serverTimestamp(),
          status: 'pending'
        });

        // Add a system message about the invitation
        await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
          type: 'system',
          content: `${currentUser.displayName || currentUser.email} invited ${email} to the chat`,
          timestamp: serverTimestamp(),
          sender: null,
          senderName: null
        });
      }
      
      // Navigate to chat room
      navigate(`/chat/${chatRef.id}`);
      
      return chatRef.id;
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat room');
      return null;
    }
  };

  // Join existing chat
  const joinChat = async (chatId) => {
    if (!currentUser) return;
    
    setError('');
    try {
      // Check if chat exists
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        setError('Chat room not found');
        return false;
      }
      
      const chatData = chatSnap.data();
      
      // Check if user is already a participant
      if (chatData.participants.includes(currentUser.uid)) {
        // Already a participant, just navigate
        navigate(`/chat/${chatId}`);
        return true;
      }
      
      // Check if user has a pending invitation by email
      const isInvited = chatData.invitedEmails && 
                        chatData.invitedEmails.some(email => 
                          email.toLowerCase() === currentUser.email.toLowerCase());
      
      if (!isInvited && !chatData.invitationLink) {
        setError('You do not have permission to join this chat');
        return false;
      }
      
      // Update participants to include the user
      await updateDoc(chatRef, {
        participants: [...chatData.participants, currentUser.uid]
      });
      
      // If they were invited by email, update the invitation status
      if (isInvited) {
        // Get invitation document
        const invitationsQuery = query(
          collection(db, 'invitations'),
          where('chatId', '==', chatId),
          where('email', '==', currentUser.email.toLowerCase())
        );
        
        const invitationsSnapshot = await getDocs(invitationsQuery);
        invitationsSnapshot.forEach(async (docSnapshot) => {
          await updateDoc(doc(db, 'invitations', docSnapshot.id), {
            status: 'accepted',
            acceptedAt: serverTimestamp(),
            userId: currentUser.uid
          });
        });
        
        // Remove this email from invitedEmails array
        const updatedEmails = chatData.invitedEmails.filter(
          email => email.toLowerCase() !== currentUser.email.toLowerCase()
        );
        
        await updateDoc(chatRef, {
          invitedEmails: updatedEmails
        });
      }
      
      // Add system message about joining
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'system',
        content: `${currentUser.displayName || currentUser.email} joined the chat`,
        timestamp: serverTimestamp(),
        sender: null,
        senderName: null
      });
      
      // Navigate to chat room
      navigate(`/chat/${chatId}`);
      return true;
    } catch (err) {
      console.error('Error joining chat:', err);
      setError('Failed to join chat room');
      return false;
    }
  };

  // Send a message
  const sendMessage = async (chatId, content) => {
    if (!currentUser || !content.trim()) return;
    
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'user',
        content: content.trim(),
        timestamp: serverTimestamp(),
        sender: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email
      });
      
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return false;
    }
  };

  // Context value
  const value = {
    currentChat,
    setCurrentChat,
    userChats,
    loading,
    error,
    createChat,
    joinChat,
    sendMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 
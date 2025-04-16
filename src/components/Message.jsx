import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Message = ({ message }) => {
  const { currentUser } = useAuth();
  
  // Skip hidden messages
  if (message.isHidden) {
    return null;
  }
  
  // Determine if this is the current user's message
  const isCurrentUser = message.type === 'user' && currentUser?.uid === message.sender;

  // Style based on message type and sender
  const getMessageStyle = () => {
    if (message.type === 'system') {
      return 'bg-gray-100 text-center mx-auto max-w-lg';
    } else if (isCurrentUser) {
      return 'bg-primary text-white ml-auto';
    } else if (message.type === 'user') {
      return 'bg-white border border-gray-300 mr-auto';
    } else if (message.type === 'ai') {
      // Different colors based on AI role could be added here
      return 'bg-secondary text-white mr-auto';
    }
    return 'bg-white border border-gray-300';
  };

  return (
    <div className={`my-2 rounded-lg p-3 max-w-[80%] shadow-sm ${getMessageStyle()}`}>
      {/* Sender info for non-system messages */}
      {message.type !== 'system' && (
        <div className={`font-medium text-sm mb-1 ${isCurrentUser ? 'text-blue-100' : message.type === 'ai' ? 'text-purple-100' : 'text-gray-600'}`}>
          {message.senderName || (isCurrentUser ? 'You' : 'Unknown User')}
        </div>
      )}
      
      {/* Message content */}
      <div className={message.isTyping ? 'animate-pulse' : ''}>
        {message.isTyping ? (
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
      </div>
      
      {/* Timestamp could be added here if needed */}
    </div>
  );
};

export default Message; 
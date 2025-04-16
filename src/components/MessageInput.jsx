import React, { useState } from 'react';

const MessageInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || disabled || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSendMessage(trimmedMessage);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end mt-4">
      <div className="flex-grow relative">
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] max-h-[150px] resize-y"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={disabled}
        />
        <div className="absolute right-2 bottom-2 text-xs text-gray-400">
          Press Shift+Enter for a new line
        </div>
      </div>
      
      <button
        type="submit"
        className="ml-2 bg-primary text-white p-3 rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed h-[60px] w-[60px] flex items-center justify-center"
        disabled={!message.trim() || disabled || isSubmitting}
      >
        {isSubmitting ? (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </form>
  );
};

export default MessageInput; 
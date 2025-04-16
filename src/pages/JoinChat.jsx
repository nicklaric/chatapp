import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';

const JoinChat = () => {
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { joinChat } = useChat();
  const navigate = useNavigate();

  const handleJoinChat = async (e) => {
    e.preventDefault();
    if (!chatId.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const success = await joinChat(chatId.trim());
      if (!success) {
        setError('Failed to join chat. Please check the chat ID and try again.');
      }
      // If successful, the joinChat function navigates to the chat room
    } catch (err) {
      console.error('Error joining chat:', err);
      setError('An error occurred while joining the chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Join a Chat</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleJoinChat}>
          <div className="mb-6">
            <label htmlFor="chatId" className="block text-lg font-medium mb-2">
              Chat ID
            </label>
            <input
              id="chatId"
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter the chat ID to join"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              You need a chat ID to join a specific chat. Ask the chat creator for the ID.
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !chatId.trim()}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Joining...
                </>
              ) : (
                'Join Chat'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinChat; 
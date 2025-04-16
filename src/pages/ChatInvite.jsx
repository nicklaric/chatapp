import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

const ChatInvite = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatId, setChatId] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { joinChat } = useChat();

  // Extract chat ID from URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('id');
    
    if (!id) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }
    
    setChatId(id);
    setLoading(false);
  }, [location]);

  // Handle joining the chat
  const handleJoinChat = async () => {
    if (!chatId) {
      setError('Invalid chat ID');
      return;
    }
    
    setLoading(true);
    try {
      const success = await joinChat(chatId);
      if (!success) {
        setError('Failed to join chat. The invitation may have expired.');
      }
      // If successful, joinChat will navigate to the chat room
    } catch (err) {
      console.error('Error joining chat:', err);
      setError('Failed to join chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Invitation Error</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Link to="/" className="btn btn-primary block text-center">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Chat Invitation</h1>
        <p className="text-gray-600 mb-6">
          You have been invited to join a chat room. Click the button below to accept the invitation.
        </p>
        
        {!currentUser ? (
          <div>
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              Please sign in to join this chat
            </div>
            <Link 
              to="/login" 
              state={{ from: `/chat/invite?id=${chatId}` }}
              className="btn btn-primary block text-center"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <button
            onClick={handleJoinChat}
            disabled={loading}
            className="w-full btn btn-primary flex justify-center items-center"
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
        )}
      </div>
    </div>
  );
};

export default ChatInvite; 
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

const Home = () => {
  const { currentUser } = useAuth();
  const { userChats, loading } = useChat();

  return (
    <div>
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to AI Chat App
        </h1>
        <p className="text-gray-600 mb-6">
          Create group chats with AI participants, invite friends, and have productive conversations.
        </p>

        {!currentUser ? (
          <Link to="/login" className="btn btn-primary">
            Sign In to Get Started
          </Link>
        ) : (
          <div className="flex space-x-4">
            <Link to="/chat/create" className="btn btn-primary">
              Create New Chat
            </Link>
            <Link to="/chat/join" className="btn btn-secondary">
              Join Existing Chat
            </Link>
          </div>
        )}
      </div>

      {currentUser && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your Recent Chats</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : userChats.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {userChats.map(chat => (
                <Link 
                  key={chat.id} 
                  to={`/chat/${chat.id}`}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="font-medium mb-2 truncate">
                    Chat: {chat.id}
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    Created by: {chat.creatorName || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {chat.participants.length} participant(s)
                  </div>
                  {chat.aiParticipants && chat.aiParticipants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {chat.aiParticipants.map(role => (
                        <span 
                          key={role} 
                          className="px-2 py-1 bg-secondary bg-opacity-10 text-secondary text-xs rounded-full"
                        >
                          AI {role}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              You don't have any chat rooms yet. Create a new chat to get started!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home; 
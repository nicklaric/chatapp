import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import AIRoleSelector from '../components/AIRoleSelector';
import { AI_ROLES } from '../services/aiService';
import { SENSITIVITY_LEVELS } from '../utils/aiUtils';

const CreateChat = () => {
  const [selectedAIRoles, setSelectedAIRoles] = useState([]);
  const [customMentions, setCustomMentions] = useState({});
  const [sensitivityLevels, setSensitivityLevels] = useState({});
  const [inviteEmails, setInviteEmails] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { createChat } = useChat();
  const navigate = useNavigate();

  // Toggle AI role selection
  const handleToggleAIRole = (roleId) => {
    setSelectedAIRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
    
    // Set default sensitivity level when adding a role
    if (!selectedAIRoles.includes(roleId)) {
      setSensitivityLevels(prev => ({
        ...prev,
        [roleId]: SENSITIVITY_LEVELS.CONSERVATIVE
      }));
    }
  };

  // Update custom mention for an AI role
  const handleUpdateCustomMention = (roleId, mentionText) => {
    setCustomMentions(prev => ({
      ...prev,
      [roleId]: mentionText.trim() || null
    }));
  };
  
  // Update sensitivity level for an AI role
  const handleUpdateSensitivityLevel = (roleId, level) => {
    // Ensure level is stored as lowercase string for consistent comparison
    setSensitivityLevels(prev => ({
      ...prev,
      [roleId]: level.toLowerCase()
    }));
  };

  // Add email to invites
  const handleAddEmail = () => {
    if (!inviteEmail.trim()) return;
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (inviteEmails.includes(inviteEmail)) {
      setError('This email is already in the invite list');
      return;
    }
    
    setInviteEmails(prev => [...prev, inviteEmail]);
    setInviteEmail('');
    setError('');
  };

  // Remove email from invites
  const handleRemoveEmail = (email) => {
    setInviteEmails(prev => prev.filter(e => e !== email));
  };

  // Create chat with selected AI roles and invited users
  const handleCreateChat = async () => {
    if (selectedAIRoles.length === 0) {
      setError('Please select at least one AI participant');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare AI participants with their custom mentions and sensitivity levels
      const aiParticipantsWithDetails = selectedAIRoles.map(roleId => ({
        role: roleId,
        customMention: customMentions[roleId] || null,
        sensitivityLevel: sensitivityLevels[roleId] || SENSITIVITY_LEVELS.CONSERVATIVE,
        name: AI_ROLES[roleId].name
      }));
      
      const chatId = await createChat(aiParticipantsWithDetails, inviteEmails);
      if (chatId) {
        navigate(`/chat/${chatId}`);
      } else {
        setError('Failed to create chat');
      }
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('An error occurred while creating the chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Create a New Chat</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* AI Role Selection */}
        <AIRoleSelector
          selectedRoles={selectedAIRoles}
          onToggleRole={handleToggleAIRole}
          onUpdateCustomMention={handleUpdateCustomMention}
          onUpdateSensitivityLevel={handleUpdateSensitivityLevel}
        />
        
        {/* Invite Users (Optional) */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Invite People (Optional)</h3>
          <p className="text-gray-600 mb-4">
            You can invite other people to join your chat by email.
          </p>
          
          <div className="flex mb-2">
            <input
              type="email"
              className="flex-grow border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddEmail}
              className="bg-primary text-white px-4 py-2 rounded-r-lg hover:bg-primary-dark"
            >
              Add
            </button>
          </div>
          
          {inviteEmails.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Invites:</h4>
              <div className="flex flex-wrap gap-2">
                {inviteEmails.map(email => (
                  <div 
                    key={email}
                    className="flex items-center bg-gray-100 px-3 py-1 rounded-full"
                  >
                    <span className="text-sm">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Create Chat Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreateChat}
            disabled={loading || selectedAIRoles.length === 0}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Chat'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChat; 
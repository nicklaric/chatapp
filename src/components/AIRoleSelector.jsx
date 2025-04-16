import React, { useState } from 'react';
import { AI_ROLES } from '../services/aiService';
import { SENSITIVITY_LEVELS } from '../utils/aiUtils';

const AIRoleSelector = ({ selectedRoles, onToggleRole, onUpdateCustomMention, onUpdateSensitivityLevel }) => {
  const [expanded, setExpanded] = useState({});
  const [selectedSensitivityLevels, setSelectedSensitivityLevels] = useState({});

  // Toggle expanded state for a role card
  const toggleExpanded = (roleId) => {
    setExpanded(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };
  
  // Handle sensitivity level change
  const handleSensitivityChange = (roleId, level) => {
    setSelectedSensitivityLevels(prev => ({
      ...prev,
      [roleId]: level
    }));
    onUpdateSensitivityLevel(roleId, level);
  };

  // Get human-readable name for sensitivity level
  const getSensitivityName = (level) => {
    switch (level) {
      case SENSITIVITY_LEVELS.SILENT:
        return "Silent - Only responds to @mentions";
      case SENSITIVITY_LEVELS.CONSERVATIVE:
        return "Conservative - Minimal automatic intervention";
      case SENSITIVITY_LEVELS.BALANCED:
        return "Balanced - Moderate intervention";
      case SENSITIVITY_LEVELS.PROACTIVE:
        return "Proactive - Frequent intervention";
      default:
        return "Conservative";
    }
  };

  // Get role-specific description for each sensitivity level
  const getRoleSensitivityDescription = (role, level) => {
    const roleId = role.toLowerCase();
    
    if (level === SENSITIVITY_LEVELS.SILENT) {
      return "Only responds when directly @mentioned";
    }
    
    if (roleId === 'moderator') {
      switch (level) {
        case SENSITIVITY_LEVELS.CONSERVATIVE:
          return "Only steps in for clear disagreements";
        case SENSITIVITY_LEVELS.BALANCED:
          return "Intervenes when discussion becomes heated";
        case SENSITIVITY_LEVELS.PROACTIVE:
          return "Actively manages conversation flow";
        default:
          return "";
      }
    } else if (roleId === 'summarizer') {
      switch (level) {
        case SENSITIVITY_LEVELS.CONSERVATIVE:
          return "Summarizes after many messages (12+)";
        case SENSITIVITY_LEVELS.BALANCED:
          return "Provides regular summaries (every 8 messages)";
        case SENSITIVITY_LEVELS.PROACTIVE:
          return "Frequently recaps conversation (every 5 messages)";
        default:
          return "";
      }
    } else if (roleId === 'planner') {
      switch (level) {
        case SENSITIVITY_LEVELS.CONSERVATIVE:
          return "Responds to explicit planning keywords";
        case SENSITIVITY_LEVELS.BALANCED:
          return "Identifies less obvious planning opportunities";
        case SENSITIVITY_LEVELS.PROACTIVE:
          return "Assists with any potential planning needs";
        default:
          return "";
      }
    }
    
    return "Adjusts how often the AI will intervene without being @mentioned";
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">AI Participants</h3>
      <p className="text-gray-600 mb-4">
        Select AI participants to add to your chat. Each AI has a specific role to help with the conversation.
        When selected, you can customize how to mention them and how actively they should participate.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(AI_ROLES).map(([roleId, role]) => (
          <div 
            key={roleId}
            className={`border rounded-lg p-4 transition-colors
              ${selectedRoles.includes(roleId) 
                ? 'border-primary-light bg-primary-light bg-opacity-10' 
                : 'border-gray-300 hover:border-gray-400'
              }`}
          >
            <div className="flex items-center mb-2 cursor-pointer" onClick={() => onToggleRole(roleId)}>
              <input
                type="checkbox"
                checked={selectedRoles.includes(roleId)}
                onChange={() => onToggleRole(roleId)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                onClick={(e) => e.stopPropagation()}
              />
              <label className="ml-2 text-lg font-medium cursor-pointer">
                {role.name}
              </label>
              
              <button 
                type="button" 
                className="ml-auto text-gray-500 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(roleId);
                }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 transition-transform ${expanded[roleId] ? 'rotate-180' : ''}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 pl-6 mb-2">
              {role.description}
            </p>
            
            {selectedRoles.includes(roleId) && (expanded[roleId] || selectedRoles.length === 1) && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
                {/* Custom mention input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom mention trigger
                  </label>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">@</span>
                    <input
                      type="text"
                      className="flex-grow border border-gray-300 rounded p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={`${role.name.toLowerCase()}`}
                      onChange={(e) => onUpdateCustomMention(roleId, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This is how users can mention this AI in the chat (e.g., @{role.name.toLowerCase()})
                  </p>
                </div>
                
                {/* Sensitivity level selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsiveness level
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => handleSensitivityChange(roleId, e.target.value)}
                    defaultValue={SENSITIVITY_LEVELS.CONSERVATIVE}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Object.values(SENSITIVITY_LEVELS).map(level => (
                      <option key={level} value={level}>
                        {getSensitivityName(level)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {getRoleSensitivityDescription(
                      roleId, 
                      selectedSensitivityLevels[roleId] || SENSITIVITY_LEVELS.CONSERVATIVE
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIRoleSelector; 
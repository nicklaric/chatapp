import React, { useState } from 'react';

const ShareInvite = ({ chatId }) => {
  const [copied, setCopied] = useState(false);

  // Generate the invite URL
  const inviteUrl = `${window.location.origin}/chat/invite?id=${chatId}`;

  // Copy the invite URL to clipboard
  const copyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => {
        console.error('Failed to copy invite URL:', err);
      });
  };
  
  // Share via system share dialog (for mobile devices)
  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my chat!',
          text: 'Join my AI-enhanced group chat!',
          url: inviteUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyInviteUrl();
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-lg font-medium mb-2">Invite Others</h3>
      <p className="text-gray-600 mb-3">
        Share this link with friends to invite them to join this chat
      </p>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-grow relative">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="w-full border border-gray-300 rounded-lg p-2 pr-20 bg-gray-50 focus:outline-none"
            onClick={(e) => e.target.select()}
          />
          <button
            onClick={copyInviteUrl}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-primary hover:text-primary-dark"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        {navigator.share && (
          <button
            onClick={shareInvite}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Share
          </button>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Anyone with this link can join this chat
      </div>
    </div>
  );
};

export default ShareInvite; 
# AI Group Chat

A powerful real-time group chat application with AI participants that can be customized to enhance your conversations.

## Features

### Chat Features
- Create chat rooms with customizable AI participants 
- Invite others via email
- Real-time messaging with Firebase
- User authentication via Google

### AI Capabilities
- **Multiple AI Roles**:
  - **Moderator**: Helps keep conversations civil and productive
  - **Summarizer**: Periodically provides concise summaries
  - **Planner**: Helps organize tasks and schedules
  - **Educator**: Provides educational content on topics

- **Smart Interaction**:
  - **@mention**: Directly mention AI participants (e.g., @moderator)
  - **Custom Triggers**: Set your own mention keywords for each AI
  - **Sensitivity Levels**: Control how proactive each AI should be:
    - **Silent**: Only responds when directly mentioned
    - **Conservative**: Minimal automatic intervention
    - **Balanced**: Moderate intervention
    - **Proactive**: Frequent intervention

## Technologies Used

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions, Hosting)
- **AI Integration**: Google's Gemini API

## Installation

### Prerequisites
- Node.js (v14 or higher)
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud account with Gemini API access

### Setup

1. Clone the repository
   ```
   git clone https://github.com/yourusername/ai-group-chat.git
   cd ai-group-chat
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up Firebase
   ```
   firebase login
   firebase init
   ```

4. Configure environment variables
   Create a `.env` file in the root directory with:
   ```
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

5. Set up Firebase Functions configuration
   ```
   firebase functions:config:set gemini.apikey=your-gemini-api-key
   ```

## Usage

### Development

```
npm start
```

### Production Build

```
npm run build
```

### Deployment

```
npm run deploy
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Project Structure

```
project-root/
 ├── public/                 # Static assets
 ├── src/
  │   ├── components/         # Reusable UI components
  │   ├── contexts/           # React Contexts for state management
  │   ├── firebase/           # Firebase configuration and initialization
  │   ├── pages/              # Page components (e.g., Home, ChatRoom)
  │   ├── services/           # API calls and business logic
  │   ├── utils/              # Utility functions
  │   ├── App.js              # Root component
  │   └── index.js            # Entry point
 ├── .firebaserc             # Firebase project aliases
 ├── firebase.json           # Firebase configuration
 ├── package.json            # Project metadata and dependencies
 └── README.md               # Project documentation
```

## Best Practices

- **Security**: Carefully manage user authentication and access control
- **Performance**: Implement lazy loading and pagination for better performance
- **Error Handling**: Properly handle and display errors to users
- **Testing**: Write unit and integration tests for critical components

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://reactjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Google Gemini API Documentation](https://ai.google.dev/docs)

## Deployment Guide

This application uses Firebase for backend services and hosting. Follow these steps to deploy your application:

### 1. Deploy Firebase Cloud Functions

First, deploy the cloud functions that handle AI message processing:

```bash
# Set the Gemini API key (only needed first time)
firebase functions:config:set gemini.apikey=your_gemini_api_key

# Deploy functions
npm run deploy:functions
```

### 2. Deploy Firebase Hosting

After deploying the functions, deploy the React application to Firebase Hosting:

```bash
# Build and deploy just the hosting
npm run deploy:hosting
```

### 3. Deploy Everything

To deploy both functions and hosting in one command:

```bash
# Build and deploy everything
npm run deploy
```

### Verifying Your Deployment

After deploying, your application will be available at:
- https://your-project-id.web.app
- https://your-project-id.firebaseapp.com

### Troubleshooting Deployment

If you encounter issues during deployment:

1. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

2. Verify your API keys are properly set:
   ```bash
   firebase functions:config:get
   ```

3. Check your Firebase project in the [Firebase Console](https://console.firebase.google.com/)

4. Ensure all necessary APIs are enabled in your [Google Cloud Console](https://console.cloud.google.com/) 

## Security Best Practices

### Critical Security Actions Required

1. **Regenerate Gemini API Key Immediately**
   - The previous Gemini API key was exposed in Git history
   - Generate a new key at [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Update the key in Firebase Functions config:
     ```bash
     firebase functions:config:set gemini.apikey=your_new_api_key
     firebase deploy --only functions
     ```

2. **Clean Git History**
   - The repository contains sensitive information in its history
   - Create a fresh repository without the sensitive history:
     ```bash
     # Create a new branch without history
     git checkout --orphan temp_branch
     
     # Add all files
     git add -A
     
     # Commit
     git commit -m "Initial commit with clean history"
     
     # Delete the old branch
     git branch -D main
     
     # Rename the current branch to main
     git branch -m main
     
     # Force push to remote repository
     git push -f origin main
     ```

3. **Verify Firestore Rules**
   - Ensure Firestore has proper authentication rules
   - Default deny rule is in place
   - All access requires authentication
   - Run security rules tests:
     ```bash
     firebase emulators:start
     # Test security rules with your test suite
     ```

4. **Enable Rate Limiting**
   - Cloud Functions have request limits to prevent abuse
   - Consider additional rate limiting at the application level
   - Monitor API usage regularly

5. **Secure Environment Variables**
   - Never commit `.env` files to Git
   - Use Firebase config for server-side secrets
   - Use `.env.example` with placeholders for documentation

### Ongoing Security Practices

- **Regular Auditing**: Periodically review application security
- **Dependency Updates**: Keep all dependencies up to date with `npm audit`
- **Access Control**: Regularly review who has access to your Firebase project
- **Monitoring**: Set up alerts for unusual API usage or traffic spikes

### IMPORTANT NOTICE ABOUT API KEYS

**NEVER commit API keys or secrets to Git!** Even if you later remove them, they remain in the repository history and can be easily extracted. Always use environment variables or secure secret management solutions. 
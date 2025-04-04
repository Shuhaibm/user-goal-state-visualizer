import React, { useState, useEffect, useRef } from 'react';
import './UserGoalStateTracker.css';

const UserGoalStateTracker = () => {
  // State management
  const [conversationData, setConversationData] = useState({
    user_prompt: "",
    conversation: [],
    beliefStates: []
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInitialState, setShowInitialState] = useState(true); // Start with initial state
  const [jsonInput, setJsonInput] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Refs for scrolling
  const conversationHistoryRef = useRef(null);
  const messageRefs = useRef([]);
  const jsonTextareaRef = useRef(null);

  // Effect to scroll to current message when it changes
  useEffect(() => {
    if (!showInitialState && messageRefs.current[currentIndex] && conversationHistoryRef.current) {
      const container = conversationHistoryRef.current;
      const selectedMessage = messageRefs.current[currentIndex];
      
      // Calculate position to scroll to (center the element in the viewport)
      const containerHeight = container.clientHeight;
      const messageTop = selectedMessage.offsetTop;
      const messageHeight = selectedMessage.clientHeight;
      
      // Center the message in the viewport if possible
      const scrollPosition = messageTop - (containerHeight / 2) + (messageHeight / 2);
      
      // Scroll to the calculated position
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, conversationData, showInitialState]);

  // Initialize messageRefs whenever conversation data changes
  useEffect(() => {
    // Reset the refs array to match the conversation length
    messageRefs.current = messageRefs.current.slice(0, conversationData.conversation.length);
    while (messageRefs.current.length < conversationData.conversation.length) {
      messageRefs.current.push(null);
    }
  }, [conversationData]);

  // Validate JSON as user types
  useEffect(() => {
    const validateJson = () => {
      if (!jsonInput.trim()) {
        setIsJsonValid(true);
        setStatusMessage('');
        return;
      }
      
      try {
        JSON.parse(jsonInput);
        setIsJsonValid(true);
        setStatusMessage('');
      } catch (e) {
        setIsJsonValid(false);
        setStatusMessage(`Invalid JSON: ${e.message}`);
      }
    };
    
    // Use debounce to avoid excessive validation
    const timeoutId = setTimeout(validateJson, 500);
    return () => clearTimeout(timeoutId);
  }, [jsonInput]);

  // Get the current belief state based on currentIndex and showInitialState
  const getCurrentBeliefState = () => {
    if (showInitialState) {
      return conversationData.beliefStates[0];
    }
    return conversationData.beliefStates[currentIndex + 1]; // +1 to account for initial state
  };

  // Navigation functions
  const goNext = () => {
    if (showInitialState) {
      setShowInitialState(false);
      setCurrentIndex(0);
    } else if (currentIndex < conversationData.conversation.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrevious = () => {
    if (currentIndex === 0) {
      setShowInitialState(true);
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if focus is in the textarea
      if (document.activeElement === jsonTextareaRef.current) {
        return;
      }
      
      if (e.key === 'ArrowRight' || e.key === 'n') {
        if (!showInitialState || currentIndex < conversationData.conversation.length - 1) {
          e.preventDefault();
          goNext();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        if (!showInitialState || currentIndex > 0) {
          e.preventDefault();
          goPrevious();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, showInitialState, conversationData.conversation.length]);

  // Helper function to determine status color class
  const getStatusClass = (status) => {
    switch (status) {
      case 'ALIGNED':
        return 'status-aligned';
      case 'INCOMPLETE':
        return 'status-incomplete';
      case 'IN_PROGRESS':
        return 'status-in-progress';
      case 'MISALIGNED':
        return 'status-misaligned';
      case 'INACTIVE':
        return 'status-inactive';
      default:
        return 'status-default';
    }
  };

  // Get status icon based on status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ALIGNED':
        return '✓';
      case 'INCOMPLETE':
        return '⏳';
      case 'IN_PROGRESS':
        return '→';
      case 'MISALIGNED':
        return '✗';
      case 'INACTIVE':
        return '○';
      default:
        return '';
    }
  };

  // Recursive function to render belief state with a clean JSON-like structure
  const renderBeliefState = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object') return null;

    return (
      <div style={{ marginLeft: `${depth * 20}px` }} className="belief-json-structure">
        {Object.entries(obj).map(([key, value], index) => {
          if (typeof value === 'object' && value !== null) {
            return (
              <div key={key} className="belief-item">
                <div className="belief-category">
                  {key}:
                </div>
                {renderBeliefState(value, depth + 1)}
              </div>
            );
          } else {
            return (
              <div key={key} className="belief-item-row">
                <span className="belief-key">{key}:</span>
                <span className={`status-badge ${getStatusClass(value)}`}>
                  {getStatusIcon(value)} {value}
                </span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  // JSON data import handler
  const handleImportJson = () => {
    if (!isJsonValid) {
      alert("Please fix the JSON errors before processing.");
      return;
    }
    
    try {
      const parsedData = JSON.parse(jsonInput);
      let processedData = { 
        conversation: [], 
        beliefStates: [],
        user_prompt: ""
      };

      // Get user prompt if available
      if (parsedData.user_prompt) {
        processedData.user_prompt = parsedData.user_prompt;
      }

      // Handle different JSON formats
      if (parsedData.conversation && parsedData.beliefStates) {
        // Standard format
        processedData.conversation = parsedData.conversation;
        processedData.beliefStates = parsedData.beliefStates;
      } else if (parsedData.conversation && parsedData.user_goal_states) {
        // Format with user_goal_states
        
        // Check if conversation has role/content format
        if (parsedData.conversation.length > 0 && parsedData.conversation[0].role) {
          processedData.conversation = parsedData.conversation.map(item => ({
            speaker: item.role === "user" ? "User" : "Agent",
            utterance: item.content
          }));
        } else {
          processedData.conversation = parsedData.conversation;
        }
        
        // Use user_goal_states for beliefStates
        processedData.beliefStates = parsedData.user_goal_states;
      } else {
        throw new Error("Unsupported JSON format. Requires conversation array and either beliefStates or user_goal_states array.");
      }
      
      // Check if arrays have the expected relationship (belief states = conversation + 1)
      if (processedData.conversation.length + 1 !== processedData.beliefStates.length) {
        setStatusMessage(`Warning: The number of conversation entries (${processedData.conversation.length}) plus one initial state should equal belief states (${processedData.beliefStates.length}).`);
      } else {
        setStatusMessage('JSON processed successfully!');
        
        // Clear the status message after 3 seconds
        setTimeout(() => {
          setStatusMessage('');
        }, 3000);
      }
      
      setConversationData(processedData);
      setCurrentIndex(0);
      setShowInitialState(true); // Start by showing the initial state
    } catch (e) {
      setStatusMessage(`Error: ${e.message}`);
    }
  };

  // Format the user prompt for better readability
  const formatUserPrompt = (prompt) => {
    if (!prompt) return null;
    
    return prompt.split('. ').map((sentence, index) => (
      <p key={index} className="user-prompt-sentence">
        {sentence + (index < prompt.split('. ').length - 1 ? '.' : '')}
      </p>
    ));
  };
  
  // Get speaker class for styling
  const getSpeakerClass = (speaker) => {
    return speaker.toLowerCase() === 'user' ? 'speaker-user' : 'speaker-agent';
  };

  return (
    <div className="goal-tracker-container">
      <h1 className="goal-tracker-title">User Goal State Tracker</h1>
      
      {/* Process JSON button only */}
      <div className="controls-container">
        <div className="button-group">
          <button 
            onClick={handleImportJson}
            className="button button-primary"
            disabled={!isJsonValid && jsonInput.trim() !== ''}
          >
            <span>📥</span> Process JSON
          </button>
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className={`status-message ${isJsonValid ? 'status-success' : 'status-error'}`}>
          {statusMessage}
        </div>
      )}

      {/* JSON input area */}
      <div className="json-input-container">
        <textarea
          ref={jsonTextareaRef}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className={`json-textarea ${!isJsonValid && jsonInput.trim() !== '' ? 'json-error' : ''}`}
          placeholder="Paste your JSON data here..."
        />
      </div>
      
      {/* Navigation Controls - Wrapped for true centering */}
      <div className="navigation-controls-wrapper">
        <div className="navigation-controls">
          <button 
            onClick={goPrevious} 
            disabled={showInitialState}
            className="button button-secondary"
            title="Previous (Left Arrow)"
          >
            ← Previous
          </button>
          <div className="page-indicator">
            {showInitialState 
              ? "Initial State" 
              : `${currentIndex + 1} of ${conversationData.conversation.length}`}
          </div>
          <button 
            onClick={goNext} 
            disabled={!showInitialState && currentIndex === conversationData.conversation.length - 1}
            className="button button-secondary"
            title="Next (Right Arrow)"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="content-container">
        {/* Full Conversation History */}
        <div className="conversation-panel panel">
          <h2 className="panel-title">
            Conversation History
          </h2>
          
          {showInitialState ? (
            <div className="initial-state-container">
              <div className="initial-state-message">
                <h3>Initial User Goal</h3>
                {conversationData.user_prompt ? (
                  <div className="user-prompt">
                    {formatUserPrompt(conversationData.user_prompt)}
                  </div>
                ) : (
                  <p className="no-prompt-message">No initial user goal provided.</p>
                )}
              </div>
            </div>
          ) : (
            <div 
              className="conversation-history" 
              ref={conversationHistoryRef}
            >
              {conversationData.conversation.map((message, index) => (
                <div 
                  key={index} 
                  className={`message-container ${index === currentIndex ? 'current-message' : ''} ${message.speaker.toLowerCase() === 'user' ? 'user-message' : 'agent-message'}`}
                  onClick={() => setCurrentIndex(index)}
                  ref={el => messageRefs.current[index] = el}
                >
                  <div className="message-header">
                    <span className="speaker-label">
                      {message.speaker}
                    </span>
                  </div>
                  <p className="utterance-text">{message.utterance}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Belief state display */}
        <div className="belief-panel panel">
          <h2 className="panel-title">
            User Goal State
            {showInitialState && <span className="state-label">Initial</span>}
          </h2>
          <div className="belief-content">
            {getCurrentBeliefState() ? (
              <div className="json-view">
                {renderBeliefState(getCurrentBeliefState())}
              </div>
            ) : (
              <div className="no-prompt-message">No belief state data available.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Keyboard shortcut tooltip */}
      <div className="keyboard-shortcuts">
        <p>Keyboard shortcuts: <strong>←</strong> Previous | <strong>→</strong> Next | <strong>N</strong> Next | <strong>P</strong> Previous</p>
      </div>
    </div>
  );
};

export default UserGoalStateTracker;
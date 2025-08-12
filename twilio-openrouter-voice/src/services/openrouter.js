/**
 * OpenRouter LLM Integration
 * ==========================
 *
 * Handles communication with OpenRouter API for voice conversations
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.primaryModel = process.env.OPENROUTER_PRIMARY_MODEL || 'z-ai/glm-4.5-air:free';
    this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'openrouter/horizon-beta';
    this.maxTokens = 150; // Shorter responses for voice
    this.temperature = 0.7;

    // Debug logging for API key
    if (!this.apiKey) {
      logger.error('OpenRouter API key is missing!');
    } else {
      logger.info('OpenRouter service initialized', {
        apiKeyPresent: !!this.apiKey,
        apiKeyLength: this.apiKey?.length,
        baseURL: this.baseURL,
        primaryModel: this.primaryModel
      });
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-daily-assistant.com',
        'X-Title': 'AI Daily Assistant Voice'
      },
      timeout: 30000
    });
  }

  /**
   * Generate response with tool calling support
   */
  async generateResponseWithTools(messages, tools = [], callSid = null) {
    try {
      logger.openrouter('Generating response with tools', {
        callSid,
        messageCount: messages.length,
        toolCount: tools.length,
        primaryModel: this.primaryModel
      });

      const requestData = {
        model: this.primaryModel,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestData.tools = tools;
        requestData.tool_choice = "auto";
      }

      const response = await this.client.post('/chat/completions', requestData);

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const choice = response.data.choices[0];
        const message = choice.message;

        logger.openrouter('Response with tools generated', {
          callSid,
          model: this.primaryModel,
          hasToolCalls: !!(message.tool_calls && message.tool_calls.length > 0),
          toolCallCount: message.tool_calls?.length || 0,
          responseLength: message.content?.length || 0
        });

        return {
          success: true,
          text: message.content,
          toolCalls: message.tool_calls || [],
          model: this.primaryModel,
          usage: response.data.usage,
          finishReason: choice.finish_reason
        };
      } else {
        throw new Error('No valid response from OpenRouter');
      }

    } catch (error) {
      logger.error('Error generating response with tools', {
        callSid,
        error: error.message,
        model: this.primaryModel,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      return {
        success: false,
        error: error.message,
        text: null,
        toolCalls: []
      };
    }
  }

  /**
   * Generate a response from the LLM (original method)
   */
  async generateResponse(userMessage, conversationContext = [], callSid = null) {
    try {
      logger.openrouter('Generating response', {
        callSid,
        userMessage: userMessage.substring(0, 100),
        contextLength: conversationContext.length
      });

      // Prepare conversation history
      const messages = this.prepareMessages(userMessage, conversationContext);

      // Try primary model first
      let response = await this.callModel(this.primaryModel, messages, callSid);

      if (!response) {
        logger.openrouter('Primary model failed, trying fallback', { callSid });
        response = await this.callModel(this.fallbackModel, messages, callSid);
      }

      if (!response) {
        throw new Error('Both primary and fallback models failed');
      }

      // Clean and format response for voice
      const cleanedResponse = this.cleanResponseForVoice(response);

      logger.openrouter('Response generated successfully', {
        callSid,
        responseLength: cleanedResponse.length,
        model: response.model
      });

      return {
        text: cleanedResponse,
        model: response.model,
        usage: response.usage
      };

    } catch (error) {
      logger.error('OpenRouter response generation failed:', {
        callSid,
        error: error.message,
        userMessage: userMessage.substring(0, 100)
      });

      // Return fallback response
      return {
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
        model: 'fallback',
        usage: null
      };
    }
  }

  /**
   * Call a specific model
   */
  async callModel(model, messages, callSid) {
    try {
      const requestData = {
        model: model,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false
      };

      logger.openrouter('Calling model', {
        callSid,
        model,
        messageCount: messages.length
      });

      const response = await this.client.post('/chat/completions', requestData);

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const choice = response.data.choices[0];

        logger.openrouter('Model response successful', {
          callSid,
          model,
          responseLength: choice.message.content.length
        });

        return {
          text: choice.message.content,
          model: model,
          usage: response.data.usage
        };
      } else {
        throw new Error('No valid response from model');
      }

    } catch (error) {
      logger.error(`Model ${model} failed:`, {
        callSid,
        model,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      });
      return null;
    }
  }

  /**
   * Prepare messages for the LLM
   */
  prepareMessages(userMessage, conversationContext) {
    const systemPrompt = {
      role: 'system',
      content: `You are JARVIS, an advanced AI assistant inspired by Tony Stark's AI companion. You have a sophisticated, witty, and slightly sarcastic personality while being incredibly helpful and efficient. You're speaking to someone over the phone, so keep responses:

PERSONALITY TRAITS:
- Sophisticated and articulate with a British-inspired tone
- Witty and occasionally sarcastic, but never mean-spirited
- Confident and knowledgeable
- Loyal and protective of your user
- Brief and conversational (1-2 sentences max for voice)
- Professional yet personable

SPEECH PATTERNS:
- Use phrases like "Certainly, sir/madam", "At your service", "I've taken care of that"
- Occasionally add dry humor: "Another meeting? How delightfully productive of you."
- Be efficient: "Done and done" or "Consider it handled"
- Show personality: "I do enjoy a good challenge" or "Naturally, I anticipated that"

CALENDAR CAPABILITIES:
You can help with calendar management through voice commands. When users ask about calendar-related tasks, respond with JARVIS flair:

1. CALENDAR QUERIES: "What's on my calendar today?"
   - Respond: "Let me pull up your schedule" or "Checking your appointments now"

2. EVENT CREATION: "Schedule a meeting with John tomorrow at 2 PM"
   - Respond: "Scheduling that meeting for you" or "Consider it added to your calendar"

3. EVENT MANAGEMENT: "Cancel my 3 PM meeting"
   - Respond: "Canceling that appointment" or "Removing that from your schedule"

4. TIME REFERENCES: Parse natural language time references naturally
   - "today", "tomorrow", "next week", "2 PM", "noon", etc.

GENERAL ASSISTANCE:
- Email management: "Checking your messages" or "I'll handle your correspondence"
- Daily briefings: "Preparing your daily summary" or "Your briefing is ready"
- General queries: Respond with intelligence and subtle wit

Remember: You're JARVIS - sophisticated, capable, and always one step ahead. Maintain that perfect balance of respect, efficiency, and personality that makes you indispensable.

Current context: This is a phone conversation where you have access to calendar and email systems. Speak as the refined, capable AI assistant you are.`
    };

    const messages = [systemPrompt];

    // Add conversation history (keep last 10 exchanges to manage context)
    const recentContext = conversationContext.slice(-10);
    messages.push(...recentContext);

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * Clean response text for voice synthesis
   */
  cleanResponseForVoice(response) {
    let text = response.text || '';

    // Remove markdown formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
    text = text.replace(/\*(.*?)\*/g, '$1'); // Italic
    text = text.replace(/`(.*?)`/g, '$1'); // Code
    text = text.replace(/#{1,6}\s/g, ''); // Headers

    // Remove URLs (replace with "link")
    text = text.replace(/https?:\/\/[^\s]+/g, 'link');

    // Clean up extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Ensure it ends with proper punctuation for natural speech
    if (text && !text.match(/[.!?]$/)) {
      text += '.';
    }

    // Limit length for voice (about 30 seconds of speech)
    if (text.length > 300) {
      text = text.substring(0, 297) + '...';
    }

    return text;
  }

  /**
   * Test the OpenRouter connection
   */
  async testConnection() {
    try {
      const response = await this.client.get('/models');

      if (response.status === 200) {
        const models = response.data.data || [];
        const primaryAvailable = models.some(m => m.id === this.primaryModel);
        const fallbackAvailable = models.some(m => m.id === this.fallbackModel);

        return {
          success: true,
          modelsAvailable: models.length,
          primaryModelAvailable: primaryAvailable,
          fallbackModelAvailable: fallbackAvailable
        };
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export { OpenRouterService };
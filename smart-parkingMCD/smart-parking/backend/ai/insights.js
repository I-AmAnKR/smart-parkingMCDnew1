// backend/ai/insights.js
// AI-powered insights using Anthropic Claude API

const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Call Claude API to analyze parking data
 */
async function callClaudeAPI(prompt, maxTokens = 1000) {
  try {
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error.response?.data || error.message);
    throw new Error('AI analysis failed. Please try again.');
  }
}

/**
 * Generate daily compliance report
 */
async function generateComplianceReport(violations, parkingLots) {
  const prompt = `You are an AI assistant for the Municipal Corporation of Delhi (MCD) analyzing parking violations.

PARKING LOTS DATA:
${JSON.stringify(parkingLots, null, 2)}

VIOLATIONS IN LAST 24 HOURS:
${JSON.stringify(violations, null, 2)}

Please analyze this data and provide:
1. Executive Summary (2-3 sentences)
2. Key Violations Detected (list critical issues)
3. Risk Assessment (low/medium/high for each lot)
4. Recommendations for MCD officials

Keep the report concise, actionable, and in plain English suitable for government officials.`;

  return await callClaudeAPI(prompt, 1500);
}

/**
 * Detect patterns in parking violations
 */
async function detectPatterns(logs) {
  const prompt = `Analyze these parking logs for patterns:

${JSON.stringify(logs.slice(0, 50), null, 2)}

Identify:
1. Repeated overparking incidents (same parking lot)
2. Peak violation hours (which times of day)
3. Any suspicious patterns suggesting deliberate overcrowding
4. Risk score (1-10) for each parking lot

Provide a brief, clear analysis in 5-6 sentences.`;

  return await callClaudeAPI(prompt, 800);
}

/**
 * Answer admin queries about parking data
 */
async function answerQuery(query, context) {
  const prompt = `You are an AI assistant helping MCD officials understand parking data.

CONTEXT (Recent Parking Data):
${JSON.stringify(context, null, 2)}

USER QUERY: "${query}"

Provide a clear, direct answer based on the data. If the data doesn't contain enough information, say so. Keep response under 100 words.`;

  return await callClaudeAPI(prompt, 500);
}

/**
 * Generate violation summary for specific parking lot
 */
async function analyzeParkingLot(parkingLotId, logs, capacity) {
  const prompt = `Analyze this parking lot's performance:

Parking Lot ID: ${parkingLotId}
Max Capacity: ${capacity}

Recent Activity (last 50 logs):
${JSON.stringify(logs, null, 2)}

Provide:
1. Compliance Status (Excellent/Good/Poor/Critical)
2. Violation Frequency
3. Most common violation time
4. Brief recommendation (1-2 sentences)

Keep it concise and actionable.`;

  return await callClaudeAPI(prompt, 600);
}

module.exports = {
  generateComplianceReport,
  detectPatterns,
  answerQuery,
  analyzeParkingLot
};
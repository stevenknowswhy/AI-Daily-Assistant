// Debug regex for Gmail sender matching

const test1 = 'Did I receive an email from John today?';
const test2 = 'Did I receive an email from Sara today?';

// Current regex
const currentRegex = /from\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)(?:\s+(?:today|yesterday|this\s+morning|this\s+afternoon|this\s+evening|tonight|now|earlier)|\s*[?.!]|$)/i;

console.log('=== CURRENT REGEX RESULTS ===');
const match1 = test1.match(currentRegex);
const match2 = test2.match(currentRegex);

console.log('Test 1:', test1);
console.log('Match 1:', match1 ? `"${match1[1]}"` : 'No match');
console.log('');
console.log('Test 2:', test2);
console.log('Match 2:', match2 ? `"${match2[1]}"` : 'No match');

// Better regex - simpler approach
const betterRegex = /from\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i;

console.log('\n=== BETTER REGEX RESULTS ===');
const betterMatch1 = test1.match(betterRegex);
const betterMatch2 = test2.match(betterRegex);

console.log('Test 1:', test1);
console.log('Better Match 1:', betterMatch1 ? `"${betterMatch1[1]}"` : 'No match');
console.log('');
console.log('Test 2:', test2);
console.log('Better Match 2:', betterMatch2 ? `"${betterMatch2[1]}"` : 'No match');

// Test sender matching logic
console.log('\n=== SENDER MATCHING TEST ===');
const senderInfo = 'Feedspot Today <nobody@e.feedspot.com>';
const searchName1 = 'John today';
const searchName2 = 'John';

function extractSenderName(from) {
  if (!from) return '';
  
  // Handle "Name <email>" format
  const nameMatch = from.match(/^"?([^"<]+)"?\s*<.*>$/);
  if (nameMatch) {
    return nameMatch[1].trim();
  }
  
  // Handle "email@domain.com" format
  const emailMatch = from.match(/^([^@]+)@/);
  if (emailMatch) {
    return emailMatch[1].trim();
  }
  
  return from.trim();
}

const extractedName = extractSenderName(senderInfo).toLowerCase();
console.log('Sender Info:', senderInfo);
console.log('Extracted Name:', `"${extractedName}"`);
console.log('Search Name 1 (John today):', `"${searchName1.toLowerCase()}"`);
console.log('Search Name 2 (John):', `"${searchName2.toLowerCase()}"`);

console.log('Match with "John today":', extractedName.includes(searchName1.toLowerCase()));
console.log('Match with "John":', extractedName.includes(searchName2.toLowerCase()));

// Test word splitting
const words1 = searchName1.toLowerCase().split(' ').filter(word => word.length > 1);
const words2 = searchName2.toLowerCase().split(' ').filter(word => word.length > 1);

console.log('Words from "John today":', words1);
console.log('Words from "John":', words2);

console.log('Any word from "John today" in extracted name:', words1.some(word => extractedName.includes(word)));
console.log('Any word from "John" in extracted name:', words2.some(word => extractedName.includes(word)));

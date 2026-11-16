// utils/nlpService.js
const winkNLP = require('wink-nlp');
const model = require('wink-eng-lite-web-model');
const pool = require('../config/db'); // Import DB to fetch dictionary

const nlp = winkNLP(model);
const its = nlp.its;

// ═══════════════════════════════════════════════════════
// DATABASE DICTIONARIES (Loaded on startup)
// ═══════════════════════════════════════════════════════
let VERBS_DICT = new Set();
let COLLECTIVE_NOUNS = new Set();

// Fetch from DB and populate the sets
async function loadDictionaries() {
  try {
    const [verbs] = await pool.query('SELECT base_form FROM verbs_dictionary WHERE is_approved = 1');
    verbs.forEach(v => VERBS_DICT.add(v.base_form.toLowerCase()));

    const [nouns] = await pool.query('SELECT noun FROM collective_nouns_dictionary WHERE is_approved = 1');
    nouns.forEach(n => COLLECTIVE_NOUNS.add(n.noun.toLowerCase()));

    console.log(`✅ NLP Dictionary Loaded: ${VERBS_DICT.size} verbs, ${COLLECTIVE_NOUNS.size} collective nouns.`);
  } catch (err) {
    console.error('❌ Failed to load NLP dictionary:', err);
  }
}
loadDictionaries(); // Run on startup

// ═══════════════════════════════════════════════════════
// VOCABULARY
// ═══════════════════════════════════════════════════════
const SINGULAR_PRONOUNS = new Set(['i', 'me', 'my', 'mine', 'myself', 'she', 'her', 'hers', 'herself', 'he', 'him', 'his', 'himself', 'it', 'its', 'itself']);
const PLURAL_PRONOUNS = new Set(['we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves']);
const AMBIGUOUS_PRONOUNS = new Set(['you', 'your', 'yours', 'yourself', 'yourselves']);
const DETERMINERS = ['the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that'];

// ═══════════════════════════════════════════════════════
// MORPHOLOGY HEURISTICS
// ═══════════════════════════════════════════════════════
function verbLooksSingular(word) {
  const w = word.toLowerCase();
  if (w === 'is' || w === 'has' || w === 'does' || w === 'goes') return true;
  if (w === 'am' || w === 'are' || w === 'were') return false;
  if (w.endsWith('ss')) return false;
  if (w.endsWith('ies')) return true;
  if (w.endsWith('s') && w.length > 2) return true;
  return false;
}

function nounLooksPlural(word) {
  const w = word.toLowerCase();
  if (COLLECTIVE_NOUNS.has(w)) return false;
  if (w.endsWith('ss')) return false;
  if (w.endsWith('ies')) return true;
  if (w.endsWith('s') && w.length > 3) return true;
  return false;
}

function looksLikeVerb(word) {
  const w = word.toLowerCase();
  
  // Check DB Dictionary first
  if (VERBS_DICT.has(w)) return true;
  
  // Fallback to morphology
  if (w.endsWith('s') && w.length > 2 && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return true;
  if (w.endsWith('ed') && w.length > 3) return true;
  if (w.endsWith('ing') && w.length > 4) return true;
  return false;
}

// ═══════════════════════════════════════════════════════
// SVA VALIDATOR
// ═══════════════════════════════════════════════════════
function validateSvaWithNlp(text, question) {
  if (!text || !text.trim()) return { isCorrect: false, reason: 'Empty sentence' };

  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length < (question.min_sentence_length || 1)) return { isCorrect: false, reason: `Too short` };
  if (words.length > (question.max_sentence_length || 50)) return { isCorrect: false, reason: `Too long` };

  
  const doc = nlp.readDoc(text);
  const tokenList = [];
  doc.tokens().each((t) => {
    tokenList.push({ value: t.out(its.value), pos: t.out(its.pos) });
  });

  let mainVerbIndex = -1;
  let mainVerb = null;

  for (let i = 0; i < tokenList.length; i++) {
    if (tokenList[i].pos === 'VERB') { mainVerbIndex = i; mainVerb = tokenList[i].value; break; }
  }

  if (mainVerbIndex === -1) {
    for (let i = 0; i < tokenList.length; i++) {
      if (['is', 'am', 'are', 'was', 'were'].includes(tokenList[i].value.toLowerCase())) {
        mainVerbIndex = i; mainVerb = tokenList[i].value; break;
      }
    }
  }

  if (mainVerbIndex === -1) {
    for (let i = 1; i < tokenList.length; i++) {
      const prev = tokenList[i - 1];
      const current = tokenList[i];
      const curWord = current.value.toLowerCase();
      if (DETERMINERS.includes(prev.value.toLowerCase())) continue;
      if ((prev.pos === 'NOUN' || prev.pos === 'PRON') && current.pos !== 'DET') {
        if (looksLikeVerb(curWord) || current.pos === 'NOUN') {
          mainVerbIndex = i; mainVerb = curWord; break;
        }
      }
    }
  }

  if (mainVerbIndex === -1) return { isCorrect: false, reason: 'No verb found in the sentence' };

  let subject = null;
  let subjectType = null;

  for (let i = 0; i < mainVerbIndex; i++) {
    const w = tokenList[i].value.toLowerCase();
    if (DETERMINERS.includes(w)) continue;
    if (SINGULAR_PRONOUNS.has(w)) { subject = w; subjectType = 'singular'; break; }
    if (PLURAL_PRONOUNS.has(w)) { subject = w; subjectType = 'plural'; break; }
    if (AMBIGUOUS_PRONOUNS.has(w)) { subject = w; subjectType = 'ambiguous'; break; }
  }

  if (!subject) {
    for (let i = 0; i < mainVerbIndex; i++) {
      const w = tokenList[i].value.toLowerCase();
      if (DETERMINERS.includes(w)) continue;
      if (tokenList[i].pos === 'NOUN' || COLLECTIVE_NOUNS.has(w)) {
        subject = w;
        if (COLLECTIVE_NOUNS.has(subject)) subjectType = 'collective';
        else if (nounLooksPlural(subject)) subjectType = 'plural';
        else subjectType = 'singular';
        break;
      }
    }
  }

  if (!subject) return { isCorrect: false, reason: 'No subject found before the verb' };

  const expectedType = (question.subject_type || '').toLowerCase();
  
  if (expectedType === 'singular' && subjectType !== 'singular') return { isCorrect: false, reason: `Expected singular subject, but got "${subject}"` };
  if (expectedType === 'plural' && subjectType !== 'plural') return { isCorrect: false, reason: `Expected plural subject, but got "${subject}"` };
  if (expectedType === 'collective') {
    if (!COLLECTIVE_NOUNS.has(subject)) return { isCorrect: false, reason: `Expected collective noun, but got "${subject}"` };
    subjectType = 'collective';
  }

  if (subjectType === 'ambiguous' || subject.toLowerCase() === 'i') return { isCorrect: true };

  const verbIsSingular = verbLooksSingular(mainVerb);

  if (subjectType === 'singular' && !verbIsSingular) return { isCorrect: false, reason: `Subject "${subject}" is singular, but verb "${mainVerb}" is plural` };
  if (subjectType === 'plural' && verbIsSingular) return { isCorrect: false, reason: `Subject "${subject}" is plural, but verb "${mainVerb}" is singular` };
  
  // Collective nouns can be tricky, but generally singular verbs are expected
  if (subjectType === 'collective' && !verbIsSingular && question.verb_type === 'singular') {
    return { isCorrect: false, reason: `Collective noun "${subject}" should take a singular verb` };
  }

  return { isCorrect: true };
}

// ═══════════════════════════════════════════════════════
// SENTENCE PATTERN VALIDATOR (unchanged)
// ═══════════════════════════════════════════════════════
function validateSentencePatternWithNlp(text, selectedPattern) {
  if (!text || !text.trim()) return { isCorrect: false, reason: 'Empty sentence' };
  if (!selectedPattern) return { isCorrect: false, reason: 'No pattern selected' };

  const cleanText = text.trim();
  const words = cleanText.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/).filter(w => w.length > 0);
  
  if (words.length < 3) return { isCorrect: false, reason: 'Sentence is too short.' };

  // 1. Identify Linking Verbs (winkNLP often misses these)
  const linkingVerbs = ['is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'seem', 'seems', 'seemed', 'look', 'looks', 'looked', 'feel', 'feels', 'felt', 'taste', 'tastes', 'tasted', 'smell', 'smells', 'smelled', 'sound', 'sounds', 'sounded', 'become', 'becomes', 'became', 'grow', 'grows', 'grew', 'turn', 'turns', 'turned'];
  
  let hasLinkingVerb = false;
  let linkingVerbIndex = -1;
  
  for (let i = 0; i < words.length; i++) {
    if (linkingVerbs.includes(words[i])) {
      hasLinkingVerb = true;
      linkingVerbIndex = i;
      break;
    }
  }

  // 2. Use winkNLP to find the main verb (if not a linking verb)
  let hasVerb = false;
  let verbIndex = -1;
  
  const doc = nlp.readDoc(cleanText);
  const tokens = [];
  doc.tokens().each((t) => {
    tokens.push({ word: t.out(its.value).toLowerCase(), pos: t.out(its.pos) });
  });

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].pos === 'VERB' || tokens[i].pos === 'AUX') {
      hasVerb = true;
      verbIndex = i;
      break;
    }
  }

  // 3. Rescue: If no verb found by winkNLP, find the first word after the subject
  if (!hasVerb && !hasLinkingVerb) {
    for (let i = 1; i < words.length; i++) {
      // If it's not a determiner, it might be the verb
      if (!['the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that'].includes(words[i])) {
        hasVerb = true;
        verbIndex = i;
        break;
      }
    }
  }

  if (!hasVerb && !hasLinkingVerb) {
    return { isCorrect: false, reason: 'Sentence must have a verb.' };
  }

  // 4. Find the subject (noun before the verb)
  let hasSubject = false;
  let subjectIndex = -1;
  for (let i = 0; i < (verbIndex !== -1 ? verbIndex : linkingVerbIndex); i++) {
    if (tokens[i] && (tokens[i].pos === 'NOUN' || tokens[i].pos === 'PRON')) {
      hasSubject = true;
      subjectIndex = i;
      break;
    }
  }

  if (!hasSubject) {
    return { isCorrect: false, reason: 'Sentence must have a subject.' };
  }

  // 5. Count nouns after the verb
  let nounAfterVerb = 0;
  const startIdx = verbIndex !== -1 ? verbIndex : linkingVerbIndex;
  for (let i = startIdx + 1; i < words.length; i++) {
    // If the word is a noun, pronoun, or an adjective (for linking verbs), count it
    const t = tokens[i];
    if (t && (t.pos === 'NOUN' || t.pos === 'PRON' || t.pos === 'ADJ')) {
      nounAfterVerb++;
    } else if (!['the', 'a', 'an', 'to'].includes(words[i])) {
      // If winkNLP failed, assume anything after the verb is a noun/adjective
      nounAfterVerb++;
    }
  }

  // 6. Determine actual pattern
  let detectedPattern = 'Unknown';
  
  if (hasLinkingVerb) {
    // Linking verbs are S-LV-C (Complement is required)
    if (nounAfterVerb === 0) {
      return { isCorrect: false, reason: 'S-LV-C requires a complement (adjective or noun) after the linking verb.' };
    }
    detectedPattern = 'S-LV-C';
  } else if (nounAfterVerb > 0) {
    // If there is a noun after the verb, it's S-V-O
    detectedPattern = 'S-V-O';
  } else {
    // If there's no noun after the verb, it's intransitive (S-IV)
    detectedPattern = 'S-IV';
  }

  // 7. Compare with student's choice
  const tag = selectedPattern.replace(/[-\s]/g, '');
  let isCorrect = false;
  let reason = '';

  if (tag === 'SVO' || tag === 'STVO') {
    if (detectedPattern === 'S-V-O') {
      isCorrect = true;
      reason = 'Correct! Your sentence has a Subject, Verb, and Object.';
    } else if (detectedPattern === 'S-IV') {
      isCorrect = false;
      reason = 'S-V-O requires an object (a second noun). Your sentence has no object.';
    } else if (detectedPattern === 'S-LV-C') {
      isCorrect = false;
      reason = 'You selected S-V-O, but the sentence has a linking verb (S-LV-C).';
    }
  } 
  else if (tag === 'SIV') {
    if (detectedPattern === 'S-IV') {
      isCorrect = true;
      reason = 'Correct! Your sentence has a Subject and an Intransitive Verb.';
    } else if (detectedPattern === 'S-V-O') {
      isCorrect = false;
      reason = 'S-IV requires an intransitive verb (no object). Your sentence has an object.';
    } else if (detectedPattern === 'S-LV-C') {
      isCorrect = false;
      reason = 'S-IV requires an action verb, not a linking verb.';
    }
  } 
  else if (tag === 'SLVC') {
    if (detectedPattern === 'S-LV-C') {
      isCorrect = true;
      reason = 'Correct! Your sentence has a Subject, Linking Verb, and Complement.';
    } else if (detectedPattern === 'S-V-O') {
      isCorrect = false;
      reason = 'You selected S-LV-C, but your sentence has an action verb and an object (S-V-O).';
    } else {
      isCorrect = false;
      reason = 'S-LV-C requires a linking verb (is, are, seems, etc.).';
    }
  }

  return { isCorrect, reason, detected_pattern: detectedPattern };
}

module.exports = {
  validateSvaWithNlp,
  validateSentencePatternWithNlp,
  loadDictionaries // Export so we can reload it if a new word is added
};
// utils/nlpService.js
const winkNLP = require('wink-nlp');
const model = require('wink-eng-lite-web-model');
const pool = require('../config/db');
const axios = require('axios'); // 👈 NEW

const nlp = winkNLP(model);
const its = nlp.its;

// ═══════════════════════════════════════════════════════
// CONFIG: Toggle spaCy on/off without changing code
// ═══════════════════════════════════════════════════════
const USE_SPACY = process.env.USE_SPACY !== 'false'; // Default: ON
const SPACY_URL = 'http://localhost:5001/analyze';

// ═══════════════════════════════════════════════════════
// DATABASE DICTIONARIES
// ═══════════════════════════════════════════════════════
let VERBS_DICT = new Set();
let COLLECTIVE_NOUNS = new Set();
let PHRASAL_VERBS_DICT = new Set();

async function loadDictionaries() {
  try {
    const [verbs] = await pool.query('SELECT base_form FROM verbs_dictionary WHERE is_approved = 1');
    verbs.forEach(v => VERBS_DICT.add(v.base_form.toLowerCase()));

    const [nouns] = await pool.query('SELECT noun FROM collective_nouns_dictionary WHERE is_approved = 1');
    nouns.forEach(n => COLLECTIVE_NOUNS.add(n.noun.toLowerCase()));

    // Updated: select the new column name `phrasal`
    const [phrasalVerbs] = await pool.query('SELECT phrasal FROM phrasal_verbs_dictionary WHERE is_approved = 1');
    phrasalVerbs.forEach(pv => PHRASAL_VERBS_DICT.add(pv.phrasal.toLowerCase()));

    console.log(`✅ NLP Dictionary Loaded: ${VERBS_DICT.size} verbs, ${COLLECTIVE_NOUNS.size} collective nouns, ${PHRASAL_VERBS_DICT.size} phrasal verbs.`);

    console.log("🔍 DOES NODE SEE 'pick up'?", PHRASAL_VERBS_DICT.has('pick up'));
    console.log("🔍 DOES NODE SEE 'turn off'?", PHRASAL_VERBS_DICT.has('turn off'));
    console.log("🔍 DOES NODE SEE 'wake up'?", PHRASAL_VERBS_DICT.has('wake up'));
  } catch (err) {
    console.error('❌ Failed to load NLP dictionary:', err);
  }
}

loadDictionaries();

// ═══════════════════════════════════════════════════════
// VOCABULARY (unchanged)
// ═══════════════════════════════════════════════════════
const SINGULAR_PRONOUNS = new Set(['i', 'me', 'my', 'mine', 'myself', 'she', 'her', 'hers', 'herself', 'he', 'him', 'his', 'himself', 'it', 'its', 'itself']);
const PLURAL_PRONOUNS = new Set(['we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves']);
const AMBIGUOUS_PRONOUNS = new Set(['you', 'your', 'yours', 'yourself', 'yourselves']);
const DETERMINERS = ['the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that'];

// ═══════════════════════════════════════════════════════
// MORPHOLOGY HEURISTICS (unchanged)
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
  if (VERBS_DICT.has(w)) return true;
  if (w.endsWith('s') && w.length > 2 && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return true;
  if (w.endsWith('ed') && w.length > 3) return true;
  if (w.endsWith('ing') && w.length > 4) return true;
  return false;
}

// ═══════════════════════════════════════════════════════
// SPACY CALLER
// ═══════════════════════════════════════════════════════
async function callSpaCy(text) {
  if (!USE_SPACY) return null; // Toggle off via env
  try {
    const response = await axios.post(SPACY_URL, { text }, { timeout: 3000 });
    return response.data.tokens;
  } catch (error) {
    console.warn('⚠️ spaCy offline, falling back to winkNLP:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// SVA VALIDATOR — spaCy first, winkNLP fallback
// ═══════════════════════════════════════════════════════
async function validateSvaWithNlp(text, question) {
  if (!text || !text.trim()) return { isCorrect: false, reason: 'Empty sentence' };

  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length < (question.min_sentence_length || 1)) return { isCorrect: false, reason: 'Too short' };
  if (words.length > (question.max_sentence_length || 50)) return { isCorrect: false, reason: 'Too long' };

  // ── TRY SPACY FIRST ──
  const spaCyTokens = await callSpaCy(text);
  if (spaCyTokens) {
    const spaCyResult = validateSvaWithSpaCy(spaCyTokens, question);
    
    // 🚨 FIX: If spaCy fails to parse, fall back to winkNLP instead of returning an error
    if (spaCyResult.reason && spaCyResult.reason.includes("Could not identify")) {
       console.log("⚠️ spaCy could not parse sentence, falling back to winkNLP...");
       return validateSvaWithWink(text, question);
    }
    return spaCyResult;
  }

  // 2. Fallback to winkNLP (Primary Engine)
  return validateSvaWithWink(text, question);
}

// ── spaCy-based SVA logic ──
function validateSvaWithSpaCy(tokens, question) {
  const root = tokens.find(t => t.dep === 'ROOT');

  if (!root) return { isCorrect: false, reason: 'Could not identify the main verb (spaCy).' };

  let subject = tokens.find(t => (t.dep === 'nsubj' || t.dep === 'nsubjpass') && t.head_index === root.id);
   if (!subject) return { isCorrect: false, reason: 'Could not identify the subject of the main verb (spaCy).' };

  if (!root || !subject) {
    return { isCorrect: false, reason: 'Could not identify subject and verb (spaCy).' };
  }

    // 🚨 FIX: Check for compound subjects (e.g., "Ronaldo and Messi")
  const conjunctions = tokens.filter(t => t.dep === 'conj' && t.head_index === subject.id);
  const isCompound = conjunctions.length > 0;




  if (isCompound) {
    // If there are multiple subjects joined by "and", the subject is plural
    subjectIsPlural = true;
    subjectIsSingular = false;
  }

  const subjectWord = subject.text.toLowerCase();
  const verbWord = root.text.toLowerCase();

  // Ambiguous pronouns: always pass
  if (AMBIGUOUS_PRONOUNS.has(subjectWord)) return { isCorrect: true };

  // "I" is special — always singular
  if (subjectWord === 'i') return { isCorrect: true };

  // Collective noun override
  if (COLLECTIVE_NOUNS.has(subjectWord)) {
    if (!root.is_singular) return { isCorrect: false, reason: `Collective noun "${subject.text}" should take a singular verb.` };
    return { isCorrect: true };
  }

  // Expected-type check from question
  const expectedType = (question.subject_type || '').toLowerCase();
  const subjectIsSingular = subject.is_singular || (!subject.is_plural && !nounLooksPlural(subjectWord));
  const subjectIsPlural = subject.is_plural || nounLooksPlural(subjectWord);

  if (expectedType === 'singular' && !subjectIsSingular) return { isCorrect: false, reason: `Expected singular subject, got "${subject.text}"` };
  if (expectedType === 'plural' && !subjectIsPlural) return { isCorrect: false, reason: `Expected plural subject, got "${subject.text}"` };

  // SVA check using morphology
  if (subjectIsSingular && !root.is_singular) {
    return { isCorrect: false, reason: `Subject "${subject.text}" is singular, but verb "${root.text}" is plural.` };
  }
  if (subjectIsPlural && root.is_singular) {
    return { isCorrect: false, reason: `Subject "${subject.text}" is plural, but verb "${root.text}" is singular.` };
  }

  return { isCorrect: true };
}

// ── Original winkNLP SVA logic (unchanged) ──
function validateSvaWithWink(text, question) {
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
  if (subjectType === 'collective' && !verbIsSingular && question.verb_type === 'singular') {
    return { isCorrect: false, reason: `Collective noun "${subject}" should take a singular verb` };
  }

  return { isCorrect: true };
}

// ═══════════════════════════════════════════════════════
// SENTENCE PATTERN VALIDATOR — spaCy first
// ═══════════════════════════════════════════════════════
async function validateSentencePatternWithNlp(text, selectedPattern) {
  if (!text || !text.trim()) return { isCorrect: false, reason: 'Empty sentence' };
  if (!selectedPattern) return { isCorrect: false, reason: 'No pattern selected' };

  // ── TRY SPACY FIRST ──
  const spaCyTokens = await callSpaCy(text);
  if (spaCyTokens) {
    const spaCyResult = validatePatternWithSpaCy(spaCyTokens, selectedPattern);
    
    // 🚨 FIX: Fallback if spaCy can't find the root/subject
    if (spaCyResult.reason && spaCyResult.reason.includes("Could not parse")) {
       console.log("⚠️ spaCy could not parse pattern, falling back to winkNLP...");
       return validatePatternWithWink(text, selectedPattern);
    }
    return spaCyResult;
  }

  // ── FALLBACK: ORIGINAL WINKNLP LOGIC ──
  return validatePatternWithWink(text, selectedPattern);
}

// ── spaCy-based pattern logic ──
function validatePatternWithSpaCy(tokens, selectedPattern) {
  const root = tokens.find(t => t.dep === 'ROOT');
  const subject = tokens.find(t => t.dep === 'nsubj' || t.dep === 'nsubjpass');
  const directObject = tokens.find(t => t.dep === 'dobj' || t.dep === 'obj');
  const attr = tokens.find(t => t.dep === 'attr' || t.dep === 'acomp');
  const indirectObject = tokens.find(t => t.dep === 'iobj');

  if (!root || !subject) {
    return { isCorrect: false, reason: 'Could not parse subject and verb (spaCy).' };
  }

  const linkingVerbs = ['be', 'seem', 'look', 'feel', 'taste', 'smell', 'sound', 'become', 'grow', 'turn'];
  const isLinking = linkingVerbs.includes(root.lemma.toLowerCase());

  let detectedPattern = 'Unknown';
  if (isLinking && attr) {
    detectedPattern = 'S-LV-C';
  } else if (directObject && indirectObject) {
    detectedPattern = 'S-TV-O-O';
  } else if (directObject) {
    detectedPattern = 'S-V-O';
  } else {
    detectedPattern = 'S-IV';
  }

  const tag = selectedPattern.replace(/[-\s]/g, '').toUpperCase();
  let isCorrect = false;
  let reason = '';

  if (tag === 'SVO' || tag === 'STVO') {
    if (detectedPattern === 'S-V-O') { isCorrect = true; reason = 'Correct! Subject-Verb-Object.'; }
    else { reason = `You selected S-V-O, but the sentence is ${detectedPattern}.`; }
  } else if (tag === 'SIV') {
    if (detectedPattern === 'S-IV') { isCorrect = true; reason = 'Correct! Subject-Intransitive Verb.'; }
    else { reason = `You selected S-IV, but the sentence is ${detectedPattern}.`; }
  } else if (tag === 'SLVC') {
    if (detectedPattern === 'S-LV-C') { isCorrect = true; reason = 'Correct! Subject-Linking Verb-Complement.'; }
    else { reason = `You selected S-LV-C, but the sentence is ${detectedPattern}.`; }
  } else if (tag === 'STVOO' || tag === 'SVOO') {
    if (detectedPattern === 'S-TV-O-O') { isCorrect = true; reason = 'Correct! Subject-Verb-Indirect Object-Direct Object.'; }
    else { reason = `You selected S-TV-O-O, but the sentence is ${detectedPattern}.`; }
  }

  return { isCorrect, reason, detected_pattern: detectedPattern };
}

// ── Original winkNLP pattern logic (unchanged) ──
function validatePatternWithWink(text, selectedPattern) {
  const cleanText = text.trim();
  const words = cleanText.toLowerCase().replace(/[.,!?;:]/g, '').split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) return { isCorrect: false, reason: 'Sentence is too short.' };

  const linkingVerbs = ['is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'seem', 'seems', 'seemed', 'look', 'looks', 'looked', 'feel', 'feels', 'felt', 'taste', 'tastes', 'tasted', 'smell', 'smells', 'smelled', 'sound', 'sounds', 'sounded', 'become', 'becomes', 'became', 'grow', 'grows', 'grew', 'turn', 'turns', 'turned'];
  let hasLinkingVerb = false;
  let linkingVerbIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (linkingVerbs.includes(words[i])) { hasLinkingVerb = true; linkingVerbIndex = i; break; }
  }

  let hasVerb = false;
  let verbIndex = -1;
  const doc = nlp.readDoc(cleanText);
  const tokens = [];
  doc.tokens().each((t) => { tokens.push({ word: t.out(its.value).toLowerCase(), pos: t.out(its.pos) }); });

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].pos === 'VERB' || tokens[i].pos === 'AUX') { hasVerb = true; verbIndex = i; break; }
  }

  if (!hasVerb && !hasLinkingVerb) {
    for (let i = 1; i < words.length; i++) {
      if (!DETERMINERS.includes(words[i])) { hasVerb = true; verbIndex = i; break; }
    }
  }

  if (!hasVerb && !hasLinkingVerb) return { isCorrect: false, reason: 'Sentence must have a verb.' };

  let hasSubject = false;
  for (let i = 0; i < (verbIndex !== -1 ? verbIndex : linkingVerbIndex); i++) {
    if (tokens[i] && (tokens[i].pos === 'NOUN' || tokens[i].pos === 'PRON')) { hasSubject = true; break; }
  }
  if (!hasSubject) return { isCorrect: false, reason: 'Sentence must have a subject.' };

  let nounAfterVerb = 0;
  const startIdx = verbIndex !== -1 ? verbIndex : linkingVerbIndex;
  for (let i = startIdx + 1; i < words.length; i++) {
    const t = tokens[i];
    if (t && (t.pos === 'NOUN' || t.pos === 'PRON' || t.pos === 'ADJ')) nounAfterVerb++;
    else if (!DETERMINERS.includes(words[i]) && words[i] !== 'to') nounAfterVerb++;
  }

  let detectedPattern = 'Unknown';
  if (hasLinkingVerb) {
    if (nounAfterVerb === 0) return { isCorrect: false, reason: 'S-LV-C requires a complement after the linking verb.' };
    detectedPattern = 'S-LV-C';
  } else if (nounAfterVerb > 0) {
    detectedPattern = 'S-V-O';
  } else {
    detectedPattern = 'S-IV';
  }

  const tag = selectedPattern.replace(/[-\s]/g, '').toUpperCase();
  let isCorrect = false;
  let reason = '';

  if (tag === 'SVO' || tag === 'STVO') {
    if (detectedPattern === 'S-V-O') { isCorrect = true; reason = 'Correct! S-V-O.'; }
    else { reason = `You selected S-V-O, but the sentence is ${detectedPattern}.`; }
  } else if (tag === 'SIV') {
    if (detectedPattern === 'S-IV') { isCorrect = true; reason = 'Correct! S-IV.'; }
    else { reason = `You selected S-IV, but the sentence is ${detectedPattern}.`; }
  } else if (tag === 'SLVC') {
    if (detectedPattern === 'S-LV-C') { isCorrect = true; reason = 'Correct! S-LV-C.'; }
    else { reason = `You selected S-LV-C, but the sentence is ${detectedPattern}.`; }
  }

  return { isCorrect, reason, detected_pattern: detectedPattern };
}

// ── Phrasal Verb Detection using winkNLP ──
// ── Phrasal Verb Detection using winkNLP ──
async function validatePhrasalVerbWithNlp(text, studentTypedVerb) {
  if (!text || !text.trim()) return { isCorrect: false, reason: 'Empty sentence', detectedVerb: null };
  if (!studentTypedVerb || !studentTypedVerb.trim()) {
    return { isCorrect: false, reason: 'You must identify the phrasal verb.', detectedVerb: null };
  }

  const cleanVerb = studentTypedVerb.trim().toLowerCase();
  const spaCyTokens = await callSpaCy(text);
  let systemDetectedVerb = null;
  let systemDetectedLemma = null;

  // 1. Find the phrasal verb in the sentence using spaCy
  if (spaCyTokens) {
    for (let i = 0; i < spaCyTokens.length - 1; i++) {
      const current = spaCyTokens[i];
      const next = spaCyTokens[i + 1];

      // If the current word is a verb, check the next word immediately
      if (current.pos === 'VERB' || current.pos === 'AUX') {
        
        // 2-word check (e.g., "pick up")
        let potentialPhrasalVerb = `${current.lemma.toLowerCase()} ${next.text.toLowerCase()}`;
        
        if (PHRASAL_VERBS_DICT.has(potentialPhrasalVerb)) {
          systemDetectedVerb = `${current.text} ${next.text}`; // e.g., "picked up"
          systemDetectedLemma = potentialPhrasalVerb; // e.g., "pick up"
          break; 
        }

        // 3-word check (e.g., "look forward to")
        if (i + 2 < spaCyTokens.length) {
          const nextNext = spaCyTokens[i + 2];
          const threeWord = `${potentialPhrasalVerb} ${nextNext.text.toLowerCase()}`;
          if (PHRASAL_VERBS_DICT.has(threeWord)) {
            systemDetectedVerb = `${current.text} ${next.text} ${nextNext.text}`;
            systemDetectedLemma = threeWord;
            break;
          }
        }
      }
    }
  }

  // 2. Fallback to winkNLP (Simplified)
  if (!systemDetectedVerb) {
    const doc = nlp.readDoc(text);
    const tokens = [];
    doc.tokens().each((t) => {
      tokens.push({ value: t.out(its.value).toLowerCase(), pos: t.out(its.pos), lemma: t.out(its.lemma).toLowerCase() });
    });

    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];

      if (current.pos === 'VERB' || current.pos === 'AUX') {
        let potentialPhrasalVerb = `${current.lemma} ${next.value}`; 
        if (PHRASAL_VERBS_DICT.has(potentialPhrasalVerb)) {
          systemDetectedVerb = `${current.value} ${next.value}`;
          systemDetectedLemma = potentialPhrasalVerb;
          break; 
        }

        if (i + 2 < tokens.length) {
          const nextNext = tokens[i + 2];
          const threeWord = `${potentialPhrasalVerb} ${nextNext.value}`;
          if (PHRASAL_VERBS_DICT.has(threeWord)) {
            systemDetectedVerb = `${current.value} ${next.value} ${nextNext.value}`;
            systemDetectedLemma = threeWord;
            break;
          }
        }
      }
    }
  }

  // 3. Compare the student's answer
  let isCorrect = false;
  let reason = '';

  if (!systemDetectedVerb) {
    isCorrect = false;
    reason = `No valid phrasal verb from the dictionary was detected in your sentence.`;
  } else {
    // Lemmatize the student's typed answer
    let studentLemma = cleanVerb;
    if (spaCyTokens) {
      const studentWords = cleanVerb.split(' ');
      const studentLemmaParts = [];
      for (const word of studentWords) {
        // Handle words like "looking" -> "look"
        const token = spaCyTokens.find(t => t.text.toLowerCase() === word);
        if (token) {
          studentLemmaParts.push(token.lemma.toLowerCase());
        } else {
          studentLemmaParts.push(word); 
        }
      }
      studentLemma = studentLemmaParts.join(' ');
    }

    // Check if student's typed answer matches the detected lemma or exact verb
    if (studentLemma === systemDetectedLemma || cleanVerb === systemDetectedVerb.toLowerCase()) {
      isCorrect = true;
      reason = `Correct! The system detected the phrasal verb "${systemDetectedVerb}".`;
    } else {
      isCorrect = false;
      reason = `You typed "${studentTypedVerb}", but the valid phrasal verb in your sentence is "${systemDetectedVerb}".`;
    }
  }

  return { isCorrect, reason, detectedVerb: systemDetectedVerb };
}
module.exports = {
  validateSvaWithNlp,
  validateSentencePatternWithNlp,
  validatePhrasalVerbWithNlp,
  loadDictionaries
};
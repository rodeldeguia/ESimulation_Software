// utils/nlpService.js
const winkNLP = require('wink-nlp');
const model = require('wink-eng-lite-web-model');

const nlp = winkNLP(model);
const its = nlp.its;

// ═══════════════════════════════════════════════════════
// VOCABULARY
// ═══════════════════════════════════════════════════════

const SINGULAR_PRONOUNS = new Set(['i', 'me', 'my', 'mine', 'myself', 'she', 'her', 'hers', 'herself', 'he', 'him', 'his', 'himself', 'it', 'its', 'itself']);
const PLURAL_PRONOUNS = new Set(['we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves']);
const AMBIGUOUS_PRONOUNS = new Set(['you', 'your', 'yours', 'yourself', 'yourselves']);  // can be singular or plural

const COLLECTIVE_NOUNS = new Set(['team', 'family', 'class', 'group', 'committee', 'crowd', 'audience', 'staff', 'band', 'crew', 'public', 'government']);

// Verbs that are always plural (base form, "I/you/they/we walk")
const BASE_VERBS_EXCEPTIONS = new Set(['am', 'are', 'were', 'be', 'been', 'being']);

// ═══════════════════════════════════════════════════════
// MORPHOLOGY HEURISTICS
// ═══════════════════════════════════════════════════════

// Does this verb look like 3rd-person singular? (walks, eats, runs)
function verbLooksSingular(word) {
  const w = word.toLowerCase();
  if (w === 'is' || w === 'has' || w === 'does' || w === 'goes') return true;
  if (w === 'am' || w === 'are' || w === 'were') return false;  // plural auxiliary
  if (w.endsWith('ss')) return false;
  if (w.endsWith('ies')) return true;
  if (w.endsWith('s') && w.length > 2) return true;
  return false;
}

// Does this verb look like base/plural form? (walk, eat, run)
function verbLooksPlural(word) {
  return !verbLooksSingular(word);
}

// Does this noun look plural? (dogs, students) — but avoid false positives
function nounLooksPlural(word) {
  const w = word.toLowerCase();
  if (COLLECTIVE_NOUNS.has(w)) return false;   // collective nouns take singular verbs
  if (w.endsWith('ss')) return false;          // class, boss (singular)
  if (w.endsWith('ies')) return true;          // studies → plural
  if (w.endsWith('s') && w.length > 3) return true;   // dogs → plural
  return false;
}

// ═══════════════════════════════════════════════════════
// SVA VALIDATOR
// ═══════════════════════════════════════════════════════

// ─── Helper: does this word look like a verb? (morphological check) ───
function looksLikeVerb(word) {
  const w = word.toLowerCase();
  const commonVerbs = [
    'run','walk','study','read','cook','play','work','eat','sleep','talk','sing','dance',
    'swim','write','draw','paint','teach','learn','help','call','ask','answer','travel',
    'fly','drive','clean','fix','build','make','think','know','see','hear','watch','look',
    'give','take','bring','send','open','close','start','stop','love','like','want','need',
    'have','do','go','come','live','stay','feel','seem','become','begin','end','try','use',
    'find','lose','win','buy','sell','pay','cost','laugh','cry','smile','jump','climb',
    'carry','push','pull','hold','throw','catch','meet','join','leave','enter','arrive'
  ];
  if (commonVerbs.includes(w)) return true;
  if (w.endsWith('s') && w.length > 2 && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return true;
  if (w.endsWith('ed') && w.length > 3) return true;
  if (w.endsWith('ing') && w.length > 4) return true;
  return false;
}

function validateSvaWithNlp(text, question) {
  if (!text || !text.trim()) {
    return { isCorrect: false, reason: 'Empty sentence' };
  }

  // 1. Word count
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length < (question.min_sentence_length || 1)) {
    return { isCorrect: false, reason: `Too short — need at least ${question.min_sentence_length} words` };
  }
  if (words.length > (question.max_sentence_length || 50)) {
    return { isCorrect: false, reason: `Too long — max ${question.max_sentence_length} words` };
  }

  // 2. Parse with NLP
  const doc = nlp.readDoc(text);
  if (doc.sentences().out().length === 0) {
    return { isCorrect: false, reason: 'Could not parse as a sentence' };
  }

  const tokenList = [];
  doc.tokens().each((t) => {
    tokenList.push({ value: t.out(its.value), pos: t.out(its.pos) });
  });

  // 3. Find main verb — NLP VERB → copula → morphological rescue
  let mainVerbIndex = -1;
  let mainVerb = null;

  // 3a. NLP VERB tag
  for (let i = 0; i < tokenList.length; i++) {
    if (tokenList[i].pos === 'VERB') {
      mainVerbIndex = i; mainVerb = tokenList[i].value; break;
    }
  }

  // 3b. Copula fallback
  if (mainVerbIndex === -1) {
    for (let i = 0; i < tokenList.length; i++) {
      if (['is', 'am', 'are', 'was', 'were'].includes(tokenList[i].value.toLowerCase())) {
        mainVerbIndex = i; mainVerb = tokenList[i].value; break;
      }
    }
  }

  // 3c. VERB RESCUE — morphological fallback when NLP fails
  if (mainVerbIndex === -1) {
    for (let i = 2; i < tokenList.length; i++) {
      const curWord = tokenList[i].value.toLowerCase();
      const prev = tokenList[i - 1];
      const prevPrev = tokenList[i - 2];

      // Skip articles/determiners/prepositions
      if (['the','a','an','my','your','his','her','our','their','this','that','some','many',
           'in','on','at','to','of','for','from','by','with','and','or','but'].includes(curWord)) continue;

      // Need subject-like token before
      const hasSubjectBefore = prev.pos === 'NOUN' || prev.pos === 'PRON' || prevPrev.pos === 'NOUN' || prevPrev.pos === 'PRON';

      if (hasSubjectBefore && looksLikeVerb(curWord)) {
        mainVerbIndex = i;
        mainVerb = tokenList[i].value;
        break;
      }
    }
  }

  if (mainVerbIndex === -1) {
    return { isCorrect: false, reason: 'No verb found in the sentence' };
  }

  // 4. Find subject BEFORE the verb
  let subject = null;
  let subjectType = null;

  for (let i = 0; i < mainVerbIndex; i++) {
    const w = tokenList[i].value.toLowerCase();
    if (SINGULAR_PRONOUNS.has(w)) { subject = w; subjectType = 'singular'; break; }
    if (PLURAL_PRONOUNS.has(w))   { subject = w; subjectType = 'plural'; break; }
    if (AMBIGUOUS_PRONOUNS.has(w)) { subject = w; subjectType = 'ambiguous'; break; }
  }

  if (!subject) {
    for (let i = 0; i < mainVerbIndex; i++) {
      if (tokenList[i].pos === 'NOUN') {
        subject = tokenList[i].value.toLowerCase();
        if (COLLECTIVE_NOUNS.has(subject)) subjectType = 'singular';
        else if (nounLooksPlural(subject)) subjectType = 'plural';
        else subjectType = 'singular';
        break;
      }
    }
  }

  if (!subject) {
    return { isCorrect: false, reason: 'No subject found before the verb' };
  }

  // 5. Check expected subject type
  const expectedType = (question.subject_type || '').toLowerCase();
  if (expectedType === 'singular' && subjectType === 'plural') {
    return { isCorrect: false, reason: `Expected a singular subject, but "${subject}" is plural` };
  }
  if (expectedType === 'plural' && subjectType === 'singular') {
    return { isCorrect: false, reason: `Expected a plural subject, but "${subject}" is singular` };
  }
  if (expectedType === 'collective') {
    if (!COLLECTIVE_NOUNS.has(subject)) {
      return { isCorrect: false, reason: `Expected a collective noun, but got "${subject}"` };
    }
    subjectType = 'singular';
  }

  // 6. Agreement (I/you exempt)
  if (subjectType === 'ambiguous' || subject.toLowerCase() === 'i') {
    return { isCorrect: true };
  }

  const verbIsSingular = verbLooksSingular(mainVerb);
  if (subjectType === 'singular' && !verbIsSingular) {
    return { isCorrect: false, reason: `Subject "${subject}" is singular, but verb "${mainVerb}" is plural` };
  }
  if (subjectType === 'plural' && verbIsSingular) {
    return { isCorrect: false, reason: `Subject "${subject}" is plural, but verb "${mainVerb}" is singular` };
  }

  return { isCorrect: true };
}

// Common base verbs that can be ambiguous (noun vs verb)
// function isLikelyBaseVerb(word) {
//   // Common verbs that can be confused with nouns
//   const commonVerbs = ['run', 'walk', 'study', 'read', 'cook', 'play', 'work', 'eat', 'sleep', 'talk', 'sing', 'dance', 'swim', 'write', 'draw', 'paint', 'teach', 'learn', 'help', 'call', 'ask', 'answer'];
//   return commonVerbs.includes(word.toLowerCase());
// }

// ═══════════════════════════════════════════════════════
// SENTENCE PATTERN VALIDATOR
// ═══════════════════════════════════════════════════════

function validateSentencePatternWithNlp(text, selectedPattern, question) {
  if (!text || !text.trim()) {
    return { isCorrect: false, reason: 'Empty sentence' };
  }
  if (!selectedPattern) {
    return { isCorrect: false, reason: 'Please select a pattern' };
  }

  // 1. Word count
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length < (question.min_sentence_length || 1)) {
    return { isCorrect: false, reason: `Too short — need at least ${question.min_sentence_length} words` };
  }
  if (words.length > (question.max_sentence_length || 50)) {
    return { isCorrect: false, reason: `Too long — max ${question.max_sentence_length} words` };
  }

  // 2. Pattern must match
  const selected = String(selectedPattern).trim().toUpperCase();
  const target = String(question.target_pattern).trim().toUpperCase();
  if (selected !== target) {
    return { isCorrect: false, reason: `Wrong pattern. Correct is: ${question.target_pattern}` };
  }

  // 3. Parse with NLP
  const doc = nlp.readDoc(text);
  const tokenList = [];
  doc.tokens().each((t) => {
    tokenList.push({ value: t.out(its.value).toLowerCase(), pos: t.out(its.pos) });
  });

  const posList = tokenList.map(t => t.pos);
  const nounCount = posList.filter(p => p === 'NOUN').length;
  const pronCount = posList.filter(p => p === 'PRON').length;
  const verbCount = posList.filter(p => p === 'VERB' || p === 'AUX').length;
  const adjCount = posList.filter(p => p === 'ADJ').length;

  const hasLinkingVerb = tokenList.some(t =>
    ['is', 'am', 'are', 'was', 'were', 'seem', 'seems', 'seemed', 'become', 'becomes', 'became', 'look', 'looks', 'looked', 'feel', 'feels', 'felt'].includes(t.value)
  );

  // 4. Pattern-specific checks
  const tag = target.replace(/[-\s]/g, '');   // "S-V-O" → "SVO"

  if (tag === 'SVO' || tag === 'STVO') {
    // Needs subject + verb + object (noun after verb)
    if (verbCount === 0) {
      return { isCorrect: false, reason: 'S-V-O requires a verb' };
    }
    if (nounCount < 2 && pronCount < 2) {
      return { isCorrect: false, reason: 'S-V-O requires a subject AND an object (noun after the verb)' };
    }
    if (hasLinkingVerb && adjCount > 0) {
      return { isCorrect: false, reason: 'Looks like S-LV-C (linking verb + adjective), not S-V-O' };
    }
  }

  if (tag === 'SIV') {
    // Subject + intransitive verb — NO object after verb
    if (verbCount === 0) {
      return { isCorrect: false, reason: 'S-IV requires a verb' };
    }
    if (hasLinkingVerb) {
      return { isCorrect: false, reason: 'Looks like S-LV-C (linking verb), not S-IV' };
    }
    // Count nouns AFTER the verb — should be 0 for intransitive
    const verbIdx = posList.findIndex(p => p === 'VERB');
    if (verbIdx >= 0) {
      const nounsAfterVerb = posList.slice(verbIdx + 1).filter(p => p === 'NOUN').length;
      if (nounsAfterVerb > 0) {
        return { isCorrect: false, reason: 'S-IV should not have an object (noun) after the verb' };
      }
    }
  }

  if (tag === 'SLVC') {
    // Subject + Linking Verb + Complement
    if (!hasLinkingVerb) {
      return { isCorrect: false, reason: 'S-LV-C requires a linking verb (is, are, seems, becomes, feels, etc.)' };
    }
    if (adjCount === 0 && nounCount < 2 && pronCount < 2) {
      // Need a complement (adjective or noun) after the linking verb
      return { isCorrect: false, reason: 'S-LV-C requires a complement (adjective or noun after the linking verb)' };
    }
  }

  return { isCorrect: true };
}

module.exports = {
  validateSvaWithNlp,
  validateSentencePatternWithNlp
};
// tests/sva-nlp.test.js
// Automated test suite for SVA NLP validation
// Run: node tests/sva-nlp.test.js

const NlpService = require('../utils/nlpService');

// ─── Test cases ───
// Each: { text, question, expected, why }

const SINGULAR_Q = {
  subject_type: 'singular',
  verb_type: 'singular',
  min_sentence_length: 3,
  max_sentence_length: 15
};

const PLURAL_Q = {
  subject_type: 'plural',
  verb_type: 'plural',
  min_sentence_length: 3,
  max_sentence_length: 15
};

const COLLECTIVE_Q = {
  subject_type: 'collective',
  verb_type: 'singular',
  min_sentence_length: 3,
  max_sentence_length: 15
};

const svaTests = [
  // ─── CORRECT SINGULAR ───
  { text: "She walks to school every day.",  question: SINGULAR_Q, expected: true,  why: "Singular pronoun + singular verb" },
  { text: "He eats breakfast every morning.", question: SINGULAR_Q, expected: true,  why: "Singular pronoun + singular verb" },
  { text: "It works perfectly fine.",         question: SINGULAR_Q, expected: true,  why: "Singular pronoun + singular verb" },
  { text: "The dog runs fast.",               question: SINGULAR_Q, expected: true,  why: "Singular noun + singular verb" },
  { text: "My mother cooks dinner.",          question: SINGULAR_Q, expected: true,  why: "Singular noun + singular verb" },

  // ─── CORRECT PLURAL ───
  { text: "They walk to school every day.",   question: PLURAL_Q,   expected: true,  why: "Plural pronoun + plural verb" },
  { text: "We eat dinner together.",           question: PLURAL_Q,   expected: true,  why: "Plural pronoun + plural verb" },
  { text: "The dogs run fast.",                question: PLURAL_Q,   expected: true,  why: "Plural noun + plural verb" },
  { text: "The students study hard.",          question: PLURAL_Q,   expected: true,  why: "Plural noun + plural verb" },

  // ─── WRONG SINGULAR ───
  { text: "She walk to school every day.",    question: SINGULAR_Q, expected: false, why: "Singular pronoun + PLURAL verb (walk instead of walks)" },
  { text: "He eat breakfast every morning.",  question: SINGULAR_Q, expected: false, why: "Singular pronoun + PLURAL verb" },
  { text: "The dog run fast.",                question: SINGULAR_Q, expected: false, why: "Singular noun + PLURAL verb" },

  // ─── WRONG PLURAL ───
  { text: "They walks to school every day.",  question: PLURAL_Q,   expected: false, why: "Plural pronoun + SINGULAR verb (walks instead of walk)" },
  { text: "We eats dinner together.",          question: PLURAL_Q,   expected: false, why: "Plural pronoun + SINGULAR verb" },
  { text: "The dogs runs fast.",               question: PLURAL_Q,   expected: false, why: "Plural noun + SINGULAR verb" },

  // ─── SUBJECT TYPE MISMATCH ───
  { text: "They walk to school every day.",   question: SINGULAR_Q, expected: false, why: "Question asks singular, but 'they' is plural" },
  { text: "She walks to school every day.",   question: PLURAL_Q,   expected: false, why: "Question asks plural, but 'she' is singular" },

  // ─── COLLECTIVE ───
  { text: "The team plays well together.",     question: COLLECTIVE_Q, expected: true,  why: "Collective noun + singular verb" },
  { text: "The family eats dinner.",           question: COLLECTIVE_Q, expected: true,  why: "Collective noun + singular verb" },
  { text: "The team play well together.",      question: COLLECTIVE_Q, expected: false, why: "Collective noun + plural verb (should be 'plays')" },
  { text: "The dog runs fast.",                question: COLLECTIVE_Q, expected: false, why: "Not a collective noun" },

  // ─── SPECIAL PRONOUNS (I / You) ───
  { text: "I walk to school every day.",       question: SINGULAR_Q, expected: true,  why: "I always takes base verb form" },
  { text: "I am happy today.",                 question: SINGULAR_Q, expected: true,  why: "I + am (special)" },
  { text: "You walk to school every day.",     question: SINGULAR_Q, expected: true,  why: "You takes base form regardless" },
  { text: "You are kind.",                     question: SINGULAR_Q, expected: true,  why: "You + are" },

  // ─── NOT A SENTENCE ───
  { text: "School every day.",                 question: SINGULAR_Q, expected: false, why: "No verb" },
  { text: "Runs fast.",                        question: SINGULAR_Q, expected: false, why: "No subject" },

  // ─── WORD COUNT ───
  { text: "She runs.",                         question: { ...SINGULAR_Q, min_sentence_length: 5 }, expected: false, why: "Too short (2 words < 5)" }
];

// ─── Test runner ───
function runTests() {
  let passed = 0, failed = 0;
  const failures = [];

  console.log('\n═══════════════════════════════════════');
  console.log('  SVA NLP VALIDATION TEST SUITE');
  console.log('═══════════════════════════════════════\n');

  for (const test of svaTests) {
    const result = NlpService.validateSvaWithNlp(test.text, test.question);
    const ok = result.isCorrect === test.expected;

    if (ok) {
      passed++;
      console.log(`✅ "${test.text}"`);
      console.log(`   Expected: ${test.expected ? 'PASS' : 'FAIL'}, got: ${result.isCorrect ? 'PASS' : 'FAIL'}`);
    } else {
      failed++;
      failures.push(test);
      console.log(`❌ "${test.text}"`);
      console.log(`   Expected: ${test.expected ? 'PASS' : 'FAIL'}, got: ${result.isCorrect ? 'PASS' : 'FAIL'}`);
      console.log(`   Why: ${test.why}`);
      console.log(`   Actual reason: ${result.reason || '(none)'}`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${svaTests.length} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════\n');

  if (failed > 0) {
    console.log('FAILURES:');
    failures.forEach(f => console.log(`  - "${f.text}" (${f.why})`));
  }
}

runTests();
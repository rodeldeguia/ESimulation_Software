// test-nlp.js
const winkNLP = require('wink-nlp');
const model = require('wink-eng-lite-web-model');

const nlp = winkNLP(model);
const its = nlp.its;

function analyze(sentence) {
  console.log(`\n=== "${sentence}" ===`);

  const doc = nlp.readDoc(sentence);

  // 1. Tokens with POS tags
  const tokens = doc.tokens().out();
  const posTags = doc.tokens().out(its.pos);
  const values = doc.tokens().out(its.value);

  console.log('Tokens + POS:');
  tokens.forEach((tok, i) => {
    console.log(`  ${values[i].padEnd(15)} → ${posTags[i]}`);
  });

  // 2. Is it a sentence?
  console.log('Sentences detected:', doc.sentences().out().length);
}

// Test cases
    analyze('She walks to school every day.');        // singular + singular ✅
analyze('She walk to school every day.');         // singular + plural ❌
analyze('They walk to school every day.');        // plural + plural ✅
analyze('They walks to school every day.');       // plural + singular ❌
analyze('The team plays well together.');         // collective ✅
analyze('He go to the store.');                   // singular + plural ❌
analyze('I am happy.');                           // I + am ✅
analyze('You are kind.');                         // You + are ✅
analyze('The dog runs fast.');                    // singular noun ✅
analyze('The dogs run fast.');                    // plural noun ✅
analyze('The dogs runs fast.');                   // plural + singular ❌
analyze('School every day.');                     // no verb ❌            // Singular, WRONG verb
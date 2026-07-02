const KNOWN_CONCEPTS = [
  'Linear Equations',
  'Area Calculation',
  'Trigonometry',
  'Quadratic Factorization',
  'Pythagorean Theorem',
  'Calculus Differentiation',
  'Probability',
  'System of Linear Equations',
  'Calculus Integration',
];

export const conceptToPdfSlug = (concept) =>
  String(concept || 'general_mathematics').toLowerCase().replace(/\s+/g, '_');

export const buildPracticePdfPath = (concept) =>
  `/practice_tests_pdf/${conceptToPdfSlug(concept)}_practice_test.pdf`;

export const buildPracticePdfUrl = (concept, baseUrl = '') => {
  const path = buildPracticePdfPath(concept);
  return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
};

export const extractWeakConcepts = (mistakes, limit = 3) => {
  const counts = {};
  (mistakes || []).forEach((m) => {
    const concept = m.conceptMissed || m.concept;
    if (!concept) return;
    counts[concept] = (counts[concept] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([concept, mistakeCount]) => ({
      concept,
      mistakeCount,
      practicePdfPath: buildPracticePdfPath(concept),
      hasPracticePdf: KNOWN_CONCEPTS.some(
        (c) => c.toLowerCase() === concept.toLowerCase()
      ),
    }));
};

export const buildFallbackParentMessage = ({ studentName, score, weakConcepts, pdfUrls }) => {
  const concepts = weakConcepts.map((c) => c.concept).join(', ') || 'key math topics';
  const pdfLines = pdfUrls.length
    ? `\n\n📚 Practice worksheets:\n${pdfUrls.map((u) => `• ${u}`).join('\n')}`
    : '';

  return {
    hindi: `प्रिय अभिभावक,\n\n${studentName} ने हाल की परीक्षा में ${score}% अंक प्राप्त किए। कृपया ${concepts} पर 15 मिनट अभ्यास करवाएँ।${pdfLines ? '\n\nअभ्यास PDF लिंक संलग्न हैं।' : ''}\n\n— शिक्षक`,
    english: `Dear Parent,\n\n${studentName} scored ${score}% on the recent test. Please help them practice ${concepts} for 15 minutes at home.${pdfLines}\n\n— Teacher`,
    whatsappText: `📚 Shiksha Setu Update\n\n${studentName} scored ${score}% on the recent test.\n\n🎯 Focus areas: ${concepts}\n\nPlease help with 15 min daily practice at home.${pdfLines}\n\n— Your child's teacher`,
    smsText: `Shiksha Setu: ${studentName} scored ${score}%. Practice ${concepts} 15 min/day.${pdfUrls[0] ? ` Worksheet: ${pdfUrls[0]}` : ''}`,
    ivrText: `नमस्ते। Shiksha Setu से संदेश। ${studentName} ने परीक्षा में ${score} प्रतिशत अंक प्राप्त किए। कृपया ${concepts} पर प्रतिदिन पंद्रह मिनट अभ्यास करवाएँ। धन्यवाद।`,
  };
};

export const buildFallbackTeacherAction = (concept) => {
  const actions = {
    'Linear Equations': 'Re-teach balance method for solving ax + b = c with 2 worked examples',
    'Area Calculation': 'Review area formulas for rectangle, triangle, and circle with visual models',
    'Trigonometry': 'Re-teach sin/cos/tan ratios using a right triangle diagram',
    'Quadratic Factorization': 'Practice factorising x² + bx + c with 3 guided examples',
    'Pythagorean Theorem': 'Re-teach a² + b² = c² with real-world measurement example',
    'Calculus Differentiation': 'Review power rule with step-by-step differentiation',
    Probability: 'Re-teach basic probability with coin and dice examples',
    'System of Linear Equations': 'Practice substitution method with 2 simultaneous equations',
    'Calculus Integration': 'Review basic integration rules with 2 practice problems',
  };
  return actions[concept] || `Re-teach ${concept} with 2 worked examples and a short practice set`;
};

export const PASSWORD_RULES = [
    { id: 'length', label: 'En az 8 karakter',  test: p => p.length >= 8 },
    { id: 'letter', label: 'En az 1 harf',       test: p => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(p) },
    { id: 'digit',  label: 'En az 1 rakam',      test: p => /\d/.test(p) },
];

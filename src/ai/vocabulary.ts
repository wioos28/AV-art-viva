/**
 * vocabulary.ts
 * -------------
 * Từ điển cho AI rule-based: style, layout, chủ thể, màu, hình dạng.
 * Mỗi mục có: từ khoá (en/vi) + độ tin cậy (trọng số).
 */

/* ------------------------------ Style ------------------------------ */

export interface VocabularyEntry {
  keywords: string[];
  weight: number;
}

export const STYLE_VOCAB: Record<string, VocabularyEntry> = {
  neon: { keywords: ['neon', 'glow', 'glowing', 'đèn', 'sáng đèn', 'lân tinh', 'phosphor', 'tia laser'], weight: 1 },
  minimal: { keywords: ['minimal', 'tối giản', 'đơn giản', 'simple', 'clean', 'whitespace', 'tinh gọn', 'zen', 'tối đa'], weight: 0.9 },
  gradient: { keywords: ['gradient', 'chuyển màu', 'ombre', 'màu chuyển', 'gradient'], weight: 1 },
  geometric: { keywords: ['geometric', 'hình học', 'đối xứng', 'symmetric', 'tessellation', 'khối lập', 'tam giác'], weight: 0.9 },
  organic: { keywords: ['organic', 'hữu cơ', 'flowing', 'uốn lượn', 'mềm mại', 'curvy'], weight: 0.9 },
  'line-art': { keywords: ['line art', 'linework', 'sketch', 'phác thảo', 'outline', 'đường nét', 'viền', 'kẻ'], weight: 0.9 },
  retro: { keywords: ['retro', 'vintage', '90s', '80s', 'synthwave', 'miami', 'old school', 'cổ điển'], weight: 0.9 },
  futuristic: { keywords: ['futuristic', 'tương lai', 'cyber', 'sci-fi', 'khoa học viễn tưởng', 'robot', 'hoàng kim'], weight: 0.9 },
  nature: { keywords: ['nature', 'thiên nhiên', 'forest', 'rừng', 'mountain', 'núi', 'plant', 'cây', 'ocean', 'biển', 'hills', 'đồi'], weight: 0.85 },
  cosmic: { keywords: ['cosmic', 'thiên hà', 'galaxy', 'nebula', 'tinh vân', 'vũ trụ', 'universe', 'ngân hà'], weight: 1 },
  flat: { keywords: ['flat', 'phẳng', 'cartoon', 'hoạt hình', 'illustration', 'minh hoạ', 'vector art'], weight: 0.8 },
  abstract: { keywords: ['abstract', 'trừu tượng', 'surreal', 'siêu thực', 'chaos', 'hỗn loạn'], weight: 0.8 },
};

/* ------------------------------ Layout ------------------------------ */

export const LAYOUT_VOCAB: Record<string, VocabularyEntry> = {
  grid: { keywords: ['grid', 'lưới', 'ô vuông', 'mosaic', 'khảm', 'tiles', 'pattern'], weight: 1 },
  radial: { keywords: ['radial', 'sunburst', 'mandala', 'tia nắng', 'xoay quanh', 'tập trung tâm', 'rays', 'around center'], weight: 1 },
  diagonal: { keywords: ['diagonal', 'chéo', 'nghiêng', 'slanted', 'zigzag', 'xoắn'], weight: 0.9 },
  horizontal: { keywords: ['horizontal', 'ngang', 'horizon', 'chân trời', 'sunset line', 'nằm ngang'], weight: 0.9 },
  vertical: { keywords: ['vertical', 'dọc', 'đứng', 'tall'], weight: 0.9 },
  centered: { keywords: ['centered', 'trung tâm', 'giữa', 'symmetric', 'đối xứng', 'cân bằng', 'balance', 'hero', 'lớn giữa'], weight: 0.9 },
  spread: { keywords: ['scattered', 'rải rác', 'random', 'ngẫu nhiên', 'chaos', 'hỗn loạn', 'spread', 'nhiều'], weight: 0.85 },
};

/* ----------------------------- Subject ----------------------------- */

export const SUBJECT_VOCAB: Record<string, VocabularyEntry> = {
  sun: { keywords: ['sun', 'mặt trời', 'sunrise', 'bình minh', 'sunset', 'hoàng hôn', 'nắng', 'ngày nắng'], weight: 1 },
  moon: { keywords: ['moon', 'mặt trăng', 'trăng', 'crescent', 'trăng khuyết'], weight: 1 },
  star: { keywords: ['star', 'ngôi sao', 'sao', 'sparkle', 'lấp lánh', 'sao băng', 'constellation'], weight: 0.9 },
  heart: { keywords: ['heart', 'trái tim', 'tim', 'tình yêu', 'love', 'yêu thương', 'valentine'], weight: 1 },
  mountain: { keywords: ['mountain', 'núi', 'hill', 'đồi', 'landscape', 'phong cảnh', 'alps', 'đỉnh'], weight: 1 },
  tree: { keywords: ['tree', 'cây', 'forest', 'rừng', 'plant', 'cây cỏ', 'pine', 'thông', 'leaf', 'lá'], weight: 0.9 },
  flower: { keywords: ['flower', 'hoa', 'rose', 'hồng', 'blossom', 'tulip', 'sen', 'cúc', 'mẫu đơn'], weight: 1 },
  cat: { keywords: ['cat', 'mèo', 'kitten', 'mèo con', 'dog', 'cún', 'chó', 'puppy', 'fox', 'cáo'], weight: 1 },
  bird: { keywords: ['bird', 'chim', 'owl', 'cú', 'dove', 'bồ câu', 'swallow', 'nhạn'], weight: 1 },
  fish: { keywords: ['fish', 'cá', 'whale', 'cá voi', 'dolphin', 'cá heo', 'biển sâu'], weight: 1 },
  beach: { keywords: ['beach', 'bờ biển', 'bãi biển', 'biển', 'sea', 'ocean', 'đại dương', 'coast', 'bờ cát', 'cát', 'sand', 'island', 'đảo', 'sóng', 'wave', 'vịnh'], weight: 1 },
  house: { keywords: ['house', 'ngôi nhà', 'home', 'castle', 'lâu đài', 'building', 'tòa nhà', 'làng quê', 'village'], weight: 1 },
  cloud: { keywords: ['cloud', 'mây', 'sky', 'bầu trời', 'rainbow', 'cầu vồng', 'bầu trời trong'], weight: 0.9 },
  rocket: { keywords: ['rocket', 'tên lửa', 'space', 'vũ trụ', 'astronaut', 'phi hành gia', 'shuttle'], weight: 1 },
  planet: { keywords: ['planet', 'hành tinh', 'trái đất', 'earth', 'sao hỏa', 'mars', 'saturn', 'thổ tinh'], weight: 1 },
  lightning: { keywords: ['lightning', 'sấm', 'chớp', 'tia sét', 'energy', 'năng lượng', 'storm', 'bão'], weight: 0.9 },
  diamond: { keywords: ['diamond', 'kim cương', 'đá quý', 'gem', 'pha lê', 'crystal', 'jewel'], weight: 1 },
  leaf: { keywords: ['leaf', 'lá', 'sprout', 'mầm', 'cây con', 'branch', 'cành'], weight: 0.9 },
  person: { keywords: ['person', 'người', 'man', 'đàn ông', 'woman', 'phụ nữ', 'girl', 'boy', 'cô gái', 'chàng trai', 'face', 'khuôn mặt', 'bé'], weight: 0.85 },
  snowflake: { keywords: ['snow', 'tuyết', 'winter', 'mùa đông', 'ice', 'băng', 'snowflake', 'bông tuyết'], weight: 1 },
};

/* ------------------------------ Color ------------------------------ */

export const COLOR_VOCAB: Record<string, string> = {
  red: '#e23b3b', crimson: '#dc143c', scarlet: '#ff2400',
  'đỏ': '#e23b3b', 'đỏ tươi': '#ff2d55', 'đỏ thẫm': '#a41623',
  blue: '#2e6dff', 'xanh dương': '#2e6dff', 'xanh da trời': '#6fb1ff',
  'xanh nước biển': '#0f4c81', navy: '#1b2a4a', 'xanh than': '#1b2a4a',
  green: '#2fa35c', 'xanh lá': '#2fa35c', 'xanh lá cây': '#2fa35c',
  'xanh cây': '#3cae6c', emerald: '#2ecc71', mint: '#8fe3c0',
  'xanh bạc hà': '#8fe3c0', lime: '#a3d02b', olive: '#8a7f2d',
  yellow: '#ffd23f', 'vàng': '#ffd23f', 'vàng nắng': '#ffc82e', gold: '#f5b301',
  orange: '#ff8c42', 'cam': '#ff8c42', 'da cam': '#ff8c42', tangerine: '#ff7b29',
  purple: '#8c52ff', 'tím': '#8c52ff', violet: '#8a2be2', lavender: '#d6b8ff',
  indigo: '#3f51b5', 'chàm': '#3f51b5',
  pink: '#ff5fa2', 'hồng': '#ff5fa2', 'hồng cánh sen': '#ff8fc7', magenta: '#d81b60',
  black: '#1a1a1a', 'đen': '#1a1a1a', onyx: '#121212',
  white: '#ffffff', 'trắng': '#ffffff', ivory: '#f5f2e6', 'ngà': '#f5f2e6',
  beige: '#e8ddc5', 'be': '#e8ddc5', cream: '#f8f0dc', 'kem': '#f8f0dc',
  gray: '#9e9e9e', 'xám': '#9e9e9e', grey: '#9e9e9e', silver: '#c0c0c0', 'bạc': '#c0c0c0',
  brown: '#8b5a2b', 'nâu': '#8b5a2b', chocolate: '#5a3a22', 'nâu đất': '#7a5c43', tan: '#c9a86a',
  cyan: '#00d4c8', 'xanh lơ': '#00d4c8', teal: '#1f8a86', 'xanh mòng két': '#1f8a86',
  turquoise: '#40e0d0', 'ngọc lam': '#40e0d0', coral: '#ff6f61', 'san hô': '#ff6f61',
  peach: '#ffdab9', 'đào': '#ffdab9', maroon: '#7b1e2b', rose: '#e0527a',
  skyblue: '#8ec5ff',
};

/** Từ khoá báo màu nền. */
export const BACKGROUND_MARKERS = ['background', 'nền', 'đằng sau', 'phía sau', 'bg'];

/** Từ khoá báo kiểu bố cục hỗn loạn. */
export const CHAOS_WORDS = new Set([
  'scattered', 'random', 'chaos', 'hỗn loạn', 'ngẫu nhiên', 'rải rác', 'organic', 'tự do', 'freeform',
]);

/* ------------------------------ Shapes ------------------------------ */

export interface ShapeKeyword {
  kind: 'rect' | 'circle' | 'ellipse' | 'line' | 'star' | 'triangle' | 'polygon' | 'text';
  keywords: string[];
}

export const SHAPE_KEYWORDS: ShapeKeyword[] = [
  { kind: 'rect', keywords: ['square', 'hình vuông', 'rectangle', 'hình chữ nhật', 'khối vuông', 'ô vuông'] },
  { kind: 'circle', keywords: ['circle', 'hình tròn', 'vòng tròn', 'tròn', 'disc', 'sphere'] },
  { kind: 'ellipse', keywords: ['ellipse', 'bầu dục', 'oval', 'hình ovan', 'trứng'] },
  { kind: 'line', keywords: ['line', 'đường thẳng', 'đường kẻ', 'stripe', 'sọc', 'streak'] },
  { kind: 'star', keywords: ['star', 'sao', 'ngôi sao'] },
  { kind: 'triangle', keywords: ['triangle', 'tam giác', 'hình tam giác'] },
  { kind: 'polygon', keywords: ['polygon', 'đa giác', 'hexagon', 'lục giác', 'pentagon', 'ngũ giác', 'diamond', 'kim cương'] },
  { kind: 'text', keywords: ['text', 'chữ', 'typography', 'tiêu đề', 'letter', 'word', 'từ'] },
];

/** Tên gọi mặc định của các style để hiển thị. */
export const STYLE_LABELS: Record<string, string> = {
  neon: 'Neon Glow',
  minimal: 'Minimal',
  gradient: 'Gradient',
  geometric: 'Geometric',
  organic: 'Organic',
  'line-art': 'Line Art',
  retro: 'Retro / Synthwave',
  futuristic: 'Futuristic',
  nature: 'Nature',
  cosmic: 'Cosmic',
  flat: 'Flat Illustration',
  abstract: 'Abstract',
};

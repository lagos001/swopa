const { useEffect, useRef, useState } = React;

const APP_LOGO = './logo.png';
const CATEGORY_ORDER = [
  'tops',
  'bottoms',
  'shoes',
  'accessories',
  'underwear-pajamas',
  'swimwear',
];

const CATEGORY_META = {
  shoes: { label: 'Zapatos', singular: 'shoe', tint: '#634832', icon: 'shoes' },
  bottoms: { label: 'Bottoms', singular: 'bottom', tint: '#634832', icon: 'bottoms' },
  tops: { label: 'Tops', singular: 'top', tint: '#634832', icon: 'tops' },
  accessories: { label: 'Accesorios', singular: 'accessory', tint: '#634832', icon: 'accessories' },
  'underwear-pajamas': { label: 'Ropa interior y pijamas', singular: 'sleep piece', tint: '#634832', icon: 'sleep' },
  swimwear: { label: 'Trajes de baño', singular: 'swim piece', tint: '#634832', icon: 'swim' },
};

const NAV_ITEMS = [
  { id: 'discover', label: 'Swopa', icon: 'discover' },
  { id: 'filters', label: 'Filtrar', icon: 'tops' },
  { id: 'wardrobe', label: 'Closet', icon: 'wardrobe' },
  { id: 'cart', label: 'Bag', icon: 'cart' },
  { id: 'profile', label: 'Perfil', icon: 'profile' },
];

const NAV_ICON_FILES = {
  discover: './icons/search.png',
  filters: './icons/filter.png',
  wardrobe: './icons/closet.png',
  cart: './icons/bag.png',
  profile: './icons/profile.png',
};

const CATEGORY_ICON_FILES = {
  shoes: './icons/shoes.png',
  bottoms: './icons/bottoms.png',
  tops: './icons/tops.png',
  accessories: './icons/accesories.png',
  'underwear-pajamas': './icons/pj.png',
  swimwear: './icons/swimwear.png',
};

const FLY_DISTANCE = 560;
const SWIPE_FLING_MS = 220;
const TAP_SLOP_PX = 22;
const TAP_MAX_MS = 500;
const HORIZONTAL_COMMIT = 92;
const VERTICAL_COMMIT = 96;
const ROW_ACTION_THRESHOLD = 90;
const ALPHA_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const SIZE_PREFERENCE_OPTIONS = {
  tops: [...ALPHA_SIZE_ORDER],
  bottoms: ['32', '34', '36', '38', '40', '42', '44', '46'],
  shoes: ['35', '36', '37', '38', '39', '40', '41', '42'],
};
const DEFAULT_SIZE_PREFERENCES = {
  tops: 'S',
  bottoms: '36',
  shoes: '38',
};
const SIZE_PREFERENCES_STORAGE_KEY = 'swopa-size-preferences';

function encodeSvg(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((char) => `${char}${char}`).join('') : value;
  const number = parseInt(full, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatPrice(value, currency = 'CLP') {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function titleCase(text) {
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function truncateByWords(text, maxLength = 32) {
  const cleanText = (text || '').trim();
  if (cleanText.length <= maxLength) return cleanText;
  const words = cleanText.split(/\s+/);
  const result = [];
  let currentLength = 0;
  words.forEach((word) => {
    const nextLength = currentLength + word.length + (result.length ? 1 : 0);
    if (nextLength <= maxLength) {
      result.push(word);
      currentLength = nextLength;
    }
  });
  return result.length ? result.join(' ') : words[0];
}

function truncateRowProductName(name) {
  return truncateByWords(name, 22);
}

function formatDisplayBrand(product) {
  return titleCase((product?.brand || product?.source || '').toLowerCase());
}

function normalizeSizeLabel(size) {
  const normalized = (size || '').toString().trim().toUpperCase();
  if (normalized === 'XXL') return '2XL';
  if (normalized === 'XXXL') return '3XL';
  return normalized;
}

function getDisplaySizeLabel(size) {
  const normalized = normalizeSizeLabel(size);
  if (ALPHA_SIZE_ORDER.includes(normalized) || /^-?\d+(\.\d+)?$/.test(normalized)) return normalized;
  if (normalized === 'ONE SIZE' || normalized === 'ÚNICA' || normalized === 'UNICA') return 'One size';
  return (size || '').toString().trim();
}

function sortAvailableSizesForDisplay(sizes) {
  const uniqueSizes = [...new Map((sizes || [])
    .map((size) => [getDisplaySizeLabel(size), getDisplaySizeLabel(size)])
    .filter(([label]) => Boolean(label))).values()];

  return uniqueSizes.sort((a, b) => {
    const normalizedA = normalizeSizeLabel(a);
    const normalizedB = normalizeSizeLabel(b);
    const alphaA = ALPHA_SIZE_ORDER.indexOf(normalizedA);
    const alphaB = ALPHA_SIZE_ORDER.indexOf(normalizedB);
    if (alphaA >= 0 || alphaB >= 0) {
      if (alphaA < 0) return 1;
      if (alphaB < 0) return -1;
      return alphaA - alphaB;
    }
    const numericA = /^-?\d+(\.\d+)?$/.test(normalizedA);
    const numericB = /^-?\d+(\.\d+)?$/.test(normalizedB);
    if (numericA || numericB) {
      if (!numericA) return 1;
      if (!numericB) return -1;
      return Number.parseFloat(normalizedA) - Number.parseFloat(normalizedB);
    }
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
  });
}

function getSizePreferenceGroup(categoryId) {
  if (categoryId === 'tops') return 'tops';
  if (categoryId === 'bottoms') return 'bottoms';
  if (categoryId === 'shoes') return 'shoes';
  return '';
}

function sortNumericSizes(sizes) {
  return [...sizes].sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b));
}

function getFourSizeWindow(order, preferredIndex) {
  if (order.length <= 4) return order;
  const lastIndex = order.length - 1;
  const smallerCount = preferredIndex;
  const largerCount = lastIndex - preferredIndex;

  if (smallerCount === 0) return order.slice(0, 4);
  if (largerCount === 0) return order.slice(Math.max(0, preferredIndex - 3), preferredIndex + 1);
  if (largerCount === 1) return order.slice(Math.max(0, preferredIndex - 2), preferredIndex + 2);
  return order.slice(Math.max(0, preferredIndex - 1), preferredIndex + 3);
}

function loadSizePreferences() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SIZE_PREFERENCES_STORAGE_KEY) || '{}');
    return {
      tops: normalizeSizeLabel(parsed.tops || DEFAULT_SIZE_PREFERENCES.tops),
      bottoms: (parsed.bottoms || DEFAULT_SIZE_PREFERENCES.bottoms).toString().trim(),
      shoes: (parsed.shoes || DEFAULT_SIZE_PREFERENCES.shoes).toString().trim(),
    };
  } catch (error) {
    return { ...DEFAULT_SIZE_PREFERENCES };
  }
}

function getDisplaySizeOptions(availableSizes, categoryId, preferredSizes) {
  const normalizedAvailable = availableSizes.map(normalizeSizeLabel).filter(Boolean);
  const uniqueAvailable = [...new Set(normalizedAvailable)];
  const preferenceGroup = getSizePreferenceGroup(categoryId);

  if (preferenceGroup) {
    const order = SIZE_PREFERENCE_OPTIONS[preferenceGroup];
    const preferredValue = normalizeSizeLabel(preferredSizes?.[preferenceGroup] || DEFAULT_SIZE_PREFERENCES[preferenceGroup]);
    const fallbackValue = order.find((size) => uniqueAvailable.includes(size)) || order[0];
    const preferredIndex = Math.max(0, order.indexOf(order.includes(preferredValue) ? preferredValue : fallbackValue));
    return getFourSizeWindow(order, preferredIndex).map((size) => ({
      label: size,
      value: size,
      available: uniqueAvailable.includes(size),
    }));
  }

  const alphaIndexes = uniqueAvailable
    .map((size) => ALPHA_SIZE_ORDER.indexOf(size))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  if (alphaIndexes.length > 0) {
    const startIndex = alphaIndexes[0];
    return ALPHA_SIZE_ORDER.slice(startIndex, startIndex + 4).map((size) => ({
      label: size,
      value: size,
      available: uniqueAvailable.includes(size),
    }));
  }

  if (uniqueAvailable.length && uniqueAvailable.every((size) => /^-?\d+(\.\d+)?$/.test(size))) {
    return sortNumericSizes(uniqueAvailable).slice(0, 4).map((size) => ({
      label: size,
      value: size,
      available: true,
    }));
  }

  return uniqueAvailable.slice(0, 4).map((size) => ({
    label: size,
    value: size,
    available: true,
  }));
}

function buildDetailBullets(product) {
  const blockedTerms = ['modelo', 'país de origen', 'origen', 'materiales', 'material:', 'composición', 'color'];
  const details = (product.details || []).filter((detail) => {
    const normalized = (detail || '').toLowerCase();
    return normalized && !blockedTerms.some((term) => normalized.includes(term));
  });

  if (product.materials?.length) {
    details.push(`Materiales: ${product.materials.join(' · ')}`);
  }

  return details;
}

function buildFashionIllustration(product, variantIndex = 0) {
  const meta = CATEGORY_META[product.category];
  const accent = product.palette?.[variantIndex % product.palette.length] || meta.tint;
  const secondary = product.palette?.[(variantIndex + 1) % product.palette.length] || '#8a6a4f';
  const surface = product.palette?.[(variantIndex + 2) % product.palette.length] || '#ece0d1';
  const highlight = rgba(accent, 0.18);
  const accentSoft = rgba(accent, 0.32);
  const brand = product.brand.toUpperCase();
  const store = product.source.toUpperCase();
  const title = product.name.toUpperCase();
  const badge = product.badge.toUpperCase();

  const silhouettes = {
    shoes: `
      <g transform="translate(72 168)">
        <path d="M38 86c28 0 44-10 82-10 20 0 56 11 64 11 13 0 20 5 20 14 0 18-18 29-42 29H32C11 130 0 118 0 101c0-9 8-15 21-15 7 0 10 0 17-1z" fill="${accent}" />
        <path d="M69 45c15 10 31 31 34 45H38c3-20 8-38 14-50l17 5z" fill="${secondary}" />
        <path d="M119 44c18 8 37 23 48 45h-60c-3-18-10-34-19-47l31 2z" fill="${accentSoft}" />
        <path d="M25 109h154" stroke="${rgba('#ece0d1', 0.64)}" stroke-width="5" stroke-linecap="round" />
        <path d="M79 63h28M122 63h24" stroke="${rgba('#ece0d1', 0.72)}" stroke-width="4" stroke-linecap="round" />
      </g>
    `,
    bottoms: `
      <g transform="translate(72 70)">
        <path d="M32 0h120l-16 208H92L78 104 64 208H20L32 0z" fill="${accent}" />
        <path d="M48 0h88l-7 54H55L48 0z" fill="${secondary}" opacity="0.88" />
        <path d="M78 102l12 106M105 102l13 106" stroke="${rgba('#ece0d1', 0.4)}" stroke-width="5" stroke-linecap="round" />
      </g>
    `,
    tops: `
      <g transform="translate(48 50)">
        <path d="M92 0c22 0 44 14 52 38l42 27-24 42-21-14v128H43V93l-21 14L0 65l43-27C50 14 70 0 92 0z" fill="${accent}" />
        <path d="M92 23c18 0 33 11 39 30H54c6-19 20-30 38-30z" fill="${secondary}" />
        <path d="M92 53c18 0 30 13 30 32v136H62V85c0-19 12-32 30-32z" fill="${accentSoft}" />
        <path d="M65 96c9 6 18 9 27 9s18-3 27-9" stroke="${rgba('#ece0d1', 0.52)}" stroke-width="5" stroke-linecap="round" />
      </g>
    `,
    accessories: `
      <g transform="translate(78 76)">
        <path d="M32 42c0-24 18-42 42-42h40c24 0 42 18 42 42v102c0 17-13 30-30 30H62c-17 0-30-13-30-30V42z" fill="${accent}" />
        <path d="M58 42c0-20 16-36 36-36s36 16 36 36" stroke="${secondary}" stroke-width="12" stroke-linecap="round" fill="none" />
        <rect x="51" y="68" width="86" height="12" rx="6" fill="${rgba('#ece0d1', 0.62)}" />
        <circle cx="94" cy="112" r="15" fill="${rgba('#ece0d1', 0.18)}" />
      </g>
    `,
    sleep: `
      <g transform="translate(64 46)">
        <path d="M66 0h74c14 0 26 12 26 26v22h-34l-11-18H84L73 48H40V26C40 12 52 0 66 0z" fill="${secondary}" />
        <path d="M40 48h126v162H109v-86H97v86H40V48z" fill="${accent}" />
        <path d="M13 64l27-16v104H13c-7 0-13-6-13-13V77c0-5 3-10 7-13l6 0zM193 64l-27-16v104h27c7 0 13-6 13-13V77c0-5-3-10-7-13h-6z" fill="${accentSoft}" />
        <path d="M72 76h62M72 102h62" stroke="${rgba('#ece0d1', 0.54)}" stroke-width="5" stroke-linecap="round" />
      </g>
    `,
    swim: `
      <g transform="translate(96 46)">
        <path d="M50 0c26 0 46 18 46 50v34c0 13 6 25 16 33l11 9-22 25-14-12c-8-7-13-17-15-28l-6 0c-2 11-7 21-15 28l-14 12-22-25 11-9c10-8 16-20 16-33V50C42 18 62 0 88 0H50z" fill="${accent}" />
        <path d="M59 19h35c12 0 22 10 22 22v22H37V41c0-12 10-22 22-22z" fill="${secondary}" />
        <path d="M67 112h18" stroke="${rgba('#ece0d1', 0.58)}" stroke-width="5" stroke-linecap="round" />
      </g>
    `,
  };

  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 440">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${surface}" />
          <stop offset="58%" stop-color="#ece0d1" />
          <stop offset="100%" stop-color="${rgba(accent, 0.18)}" />
        </linearGradient>
        <linearGradient id="card" x1="10%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${highlight}" />
          <stop offset="100%" stop-color="${rgba(secondary, 0.18)}" />
        </linearGradient>
      </defs>
      <rect width="320" height="440" rx="34" fill="url(#bg)" />
      <circle cx="260" cy="70" r="88" fill="${rgba(secondary, 0.18)}" />
      <circle cx="68" cy="362" r="94" fill="${rgba(accent, 0.08)}" />
      <rect x="16" y="16" width="288" height="408" rx="28" fill="url(#card)" stroke="${rgba('#ece0d1', 0.85)}" />
      <text x="30" y="42" fill="${rgba('#24120f', 0.56)}" font-family="Manrope, Arial, sans-serif" font-size="11" letter-spacing="2">${brand}</text>
      <text x="30" y="58" fill="${rgba('#24120f', 0.34)}" font-family="Manrope, Arial, sans-serif" font-size="9" letter-spacing="1.6">${store}</text>
      ${silhouettes[meta.icon]}
      <text x="30" y="336" fill="${rgba('#24120f', 0.32)}" font-family="Manrope, Arial, sans-serif" font-size="10" letter-spacing="2">${badge}</text>
      <text x="30" y="362" fill="#24120f" font-family="Manrope, Arial, sans-serif" font-weight="800" font-size="19">${titleCase(product.name)}</text>
      <text x="30" y="390" fill="${rgba('#24120f', 0.56)}" font-family="Manrope, Arial, sans-serif" font-size="12">${product.availableColors.join(' / ')}</text>
    </svg>
  `);
}

function makeImages(product, photoCount = 3) {
  return Array.from({ length: photoCount }, (_, index) => buildFashionIllustration(product, index));
}

function createProduct(config) {
  const product = { currency: 'CLP', fallbackImages: [], ...config };
  const generated = makeImages(product, config.generatedPhotoCount || 3);
  product.images = config.images && config.images.length ? config.images : generated;
  product.fallbackImages = config.images && config.images.length ? generated : [];
  return product;
}

const SCRAPED_CATALOG = Array.isArray(window.__SWOPA_SCRAPED_CATALOG__) ? window.__SWOPA_SCRAPED_CATALOG__ : [];

function buildMockCatalog() {
  return [
    createProduct({
      id: 'top-americanino-zip', name: 'Polerón cierre algodón premium', brand: 'Americanino', source: 'Falabella', category: 'tops', price: 29990,
      images: ['./poleron 1.webp', './poleron 2.webp', './poleron 3.webp', './poleron 4.webp', './poleron 5.webp'],
      shortDescription: 'Polerón con cierre limpio y caída relajada para capas ligeras.',
      longDescription: 'Inspirado en fichas retail chilenas de básicos premium, este polerón mezcla una silueta relajada con acabados limpios, tacto suave y un look editorial que funciona desde la mañana hasta la noche.',
      materials: ['100% algodón', 'Interior suavizado', 'Puños acanalados'],
      details: ['Cierre frontal completo', 'Capucha estructurada', 'Bolsillos tipo canguro', 'Largo a la cadera'],
      availableSizes: ['XS', 'S', 'M', 'L'], availableColors: ['Terracotta', 'Ivory', 'Espresso'], sourceUrl: 'https://www.americanino.cl/americanino-cl/product/883673661/Poleron-Algodon-Mujer-Americanino/883673663', modelCode: 'F3PLA308ZH', fit: 'Relaxed fit', origin: 'China', mood: 'Soft layering', badge: 'Top pick', highlights: ['Ideal para media estación', 'Peso medio', 'Fácil de combinar'], palette: ['#e86b58', '#ffd7c8', '#fef4ef'],
    }),
    createProduct({
      id: 'top-americanino-fleece', name: 'Polerón brushed weekend', brand: 'Americanino', source: 'Americanino', category: 'tops', price: 34990,
      images: ['./poleran 1.webp', './poleran 2.webp', './poleran 3.webp', './poleran 4.webp'],
      shortDescription: 'Volumen suave y tacto afelpado para looks effortless.',
      longDescription: 'Una pieza pensada para un clóset urbano y cómodo. El cuerpo conserva estructura visual mientras el interior brushed suma calidez ligera y sensación premium.',
      materials: ['Mezcla algodón premium', 'Felpa interior', 'Terminación peached'],
      details: ['Cuello con caída suave', 'Hombro levemente caído', 'Terminación limpia en ruedo', 'Look minimal'],
      availableSizes: ['S', 'M', 'L', 'XL'], availableColors: ['Oat', 'Brick', 'Charcoal'], sourceUrl: 'https://www.americanino.cl/americanino-cl/product/883673355/poleron-mujer-americanino/883673361', modelCode: 'F3PLA128ZH', fit: 'Regular relaxed', origin: 'China', mood: 'Elevated casual', badge: 'New in', highlights: ['Look editorial', 'Tacto suave', 'Uso diario'], palette: ['#d95b4b', '#ffcfbc', '#fff4ee'],
    }),
    createProduct({
      id: 'top-studio-tee', name: 'Polera rib studio contour', brand: 'Lena Studio', source: 'Marketplace Feed', category: 'tops', price: 16990,
      shortDescription: 'Polera entallada de algodón rib con cuello limpio.',
      longDescription: 'Una base esencial con inspiración fashion-tech: tela rib de tacto suave, ajuste favorecedor y paleta cálida pensada para combinar con denim, sastrería o capas de punto.',
      materials: ['95% algodón', '5% elastano', 'Rib elástico'],
      details: ['Cuello redondo reforzado', 'Manga corta limpia', 'Largo regular', 'Textura sutil'],
      availableSizes: ['XS', 'S', 'M', 'L'], availableColors: ['Porcelain', 'Coral', 'Mocha'], sourceUrl: 'https://example.com/products/top-studio-tee', modelCode: 'LS-TOP-204', fit: 'Slim fit', origin: 'Perú', mood: 'Daily essential', badge: 'Wardrobe base', highlights: ['Liviana', 'Capas fáciles', 'Mantiene forma'], palette: ['#ef6c58', '#ffd5cc', '#fff7f1'],
    }),
    createProduct({
      id: 'bottom-tailored-pleat', name: 'Pantalón pleat city fluid', brand: 'Nómade Edit', source: 'Paris', category: 'bottoms', price: 38990,
      shortDescription: 'Pantalón fluido de pinzas con cintura alta y caída pulida.',
      longDescription: 'Diseñado para verse nítido en movimiento, este pantalón de pinzas aporta una silueta alargada y una vibra contemporánea que cruza oficina, café y salida nocturna sin esfuerzo.',
      materials: ['72% viscosa', '24% poliéster', '4% elastano'],
      details: ['Cintura alta', 'Pierna ancha', 'Cierre oculto', 'Pinzas delanteras'],
      availableSizes: ['34', '36', '38', '40'], availableColors: ['Sand', 'Rust', 'Black'], sourceUrl: 'https://example.com/products/bottom-tailored-pleat', modelCode: 'NE-BTM-118', fit: 'Wide leg', origin: 'Colombia', mood: 'Sharp and fluid', badge: 'City edit', highlights: ['Caída elegante', 'No se marca', 'Versátil'], palette: ['#f2784a', '#ffd3b8', '#fff2e8'],
    }),
    createProduct({
      id: 'bottom-denim-slim', name: 'Jeans straight amber wash', brand: 'Aire Denim', source: 'Falabella', category: 'bottoms', price: 42990,
      shortDescription: 'Denim recto de tiro medio con lavado ámbar suave.',
      longDescription: 'Un straight-leg pensado para un styling limpio: estructura firme, lavado cálido y un fit fácil que abraza la estética contemporánea sin perder comodidad.',
      materials: ['98% algodón', '2% elastano', 'Denim mid-weight'],
      details: ['Tiro medio', 'Pierna recta', 'Cinco bolsillos', 'Lavado ámbar'],
      availableSizes: ['36', '38', '40', '42'], availableColors: ['Amber wash', 'Coal wash'], sourceUrl: 'https://example.com/products/bottom-denim-slim', modelCode: 'AD-BTM-392', fit: 'Straight fit', origin: 'Bangladesh', mood: 'Off-duty polish', badge: 'Editor pick', highlights: ['Denim firme', 'Look premium', 'Uso diario'], palette: ['#e3693f', '#ffe0c5', '#fff4eb'],
    }),
    createProduct({
      id: 'bottom-knit-short', name: 'Short knit lounge line', brand: 'Casa Claro', source: 'Marketplace Feed', category: 'bottoms', price: 18990,
      shortDescription: 'Short tejido con pretina cómoda y textura suave.',
      longDescription: 'Una prenda corta con lenguaje de resort minimalista: tejido flexible, cintura cómoda y tonos cálidos que hacen match con camisetas, trajes de baño o capas ligeras.',
      materials: ['60% algodón', '40% modal'],
      details: ['Pretina elástica', 'Textura knit fina', 'Bolsillos laterales', 'Largo medio'],
      availableSizes: ['S', 'M', 'L'], availableColors: ['Clay', 'Cream'], sourceUrl: 'https://example.com/products/bottom-knit-short', modelCode: 'CC-BTM-010', fit: 'Relaxed short', origin: 'Perú', mood: 'Soft resort', badge: 'Travel ready', highlights: ['Liviano', 'Flexible', 'Secado rápido'], palette: ['#ff8e4e', '#ffe2cb', '#fff5ef'],
    }),
    createProduct({
      id: 'shoe-sneaker-flare', name: 'Sneaker flare panel low', brand: 'Marea', source: 'Falabella', category: 'shoes', price: 55990,
      shortDescription: 'Sneaker baja con paneles suaves y acento tonal.',
      longDescription: 'Una silueta deportiva refinada con capas suaves, suela flexible y combinación de tonos crema y terracota pensada para un armario neutro con un punto de energía.',
      materials: ['Cuero sintético premium', 'Suela EVA', 'Forro textil'],
      details: ['Perfil bajo', 'Cordones tonales', 'Capellada panelada', 'Plantilla comfort'],
      availableSizes: ['36', '37', '38', '39', '40'], availableColors: ['Cream', 'Terracotta', 'Cocoa'], sourceUrl: 'https://example.com/products/shoe-sneaker-flare', modelCode: 'MR-SHO-611', fit: 'True to size', origin: 'Vietnam', mood: 'Sport minimal', badge: 'Best seller', highlights: ['Muy combinable', 'Liviana', 'Uso urbano'], palette: ['#ee693b', '#ffd9bf', '#ece0d1'],
    }),
    createProduct({
      id: 'shoe-slide-sun', name: 'Slide soft curve sunset', brand: 'Costa Frame', source: 'Paris', category: 'shoes', price: 28990,
      shortDescription: 'Sandalia slide con curva limpia y plantilla acolchada.',
      longDescription: 'Una slide estilizada para climas cálidos y rutinas urbanas. La planta acolchada y el upper curvo le dan una lectura moderna y limpia, perfecta para resortwear o denim relajado.',
      materials: ['Upper sintético soft-touch', 'Planta acolchada', 'Suela flexible'],
      details: ['Slip-on', 'Puntera abierta', 'Perfil bajo', 'Agarre texturizado'],
      availableSizes: ['35', '36', '37', '38', '39'], availableColors: ['Apricot', 'Ivory'], sourceUrl: 'https://example.com/products/shoe-slide-sun', modelCode: 'CF-SHO-081', fit: 'True to size', origin: 'Brasil', mood: 'Warm weather ease', badge: 'Resort', highlights: ['Cómoda', 'Minimal', 'Ligera'], palette: ['#634832', '#b39a83', '#ece0d1'],
    }),
    createProduct({
      id: 'shoe-boot-clean', name: 'Boot ankle clean structure', brand: 'Senda Studio', source: 'Marketplace Feed', category: 'shoes', price: 74990,
      shortDescription: 'Botín limpio de caña corta con punta estilizada.',
      longDescription: 'Una bota de silueta depurada para elevar bases simples. El perfil estrecho y el taco bajo permiten usarla con pantalones rectos, faldas midi o piezas de denim más relajadas.',
      materials: ['Cuero vegano mate', 'Suela TR', 'Forro suave'],
      details: ['Caña al tobillo', 'Cierre lateral oculto', 'Taco bajo', 'Punta afinada'],
      availableSizes: ['36', '37', '38', '39'], availableColors: ['Cinnamon', 'Black'], sourceUrl: 'https://example.com/products/shoe-boot-clean', modelCode: 'SS-SHO-941', fit: 'Slim profile', origin: 'México', mood: 'Modern structure', badge: 'Sharp lines', highlights: ['Refina el look', 'Perfil limpio', 'Buena estabilidad'], palette: ['#d95f37', '#ffd8c5', '#fff1ea'],
    }),
    createProduct({
      id: 'accessory-bag-curve', name: 'Shoulder bag curve mini', brand: 'Rosa Norte', source: 'Falabella', category: 'accessories', price: 31990,
      shortDescription: 'Mini bag al hombro con silueta curva y acabado mate.',
      longDescription: 'Compacta pero funcional, esta shoulder bag propone una línea curva muy actual y acabados suaves que elevan un look monocromático o denim con una vibra más cuidada.',
      materials: ['PU premium', 'Forro textil', 'Herrajes mate'],
      details: ['Correa ajustable', 'Cierre superior', 'Bolsillo interno', 'Base estructurada'],
      availableSizes: ['One size'], availableColors: ['Cherry clay', 'Bone'], sourceUrl: 'https://example.com/products/accessory-bag-curve', modelCode: 'RN-ACC-432', fit: 'Compact carry', origin: 'China', mood: 'Mini statement', badge: 'Trending', highlights: ['Tamaño ideal', 'Muy combinable', 'Liviana'], palette: ['#eb5c49', '#ffd7cb', '#fff4ef'],
    }),
    createProduct({
      id: 'accessory-shades-soft', name: 'Oval shades soft amber', brand: 'Lumen', source: 'Marketplace Feed', category: 'accessories', price: 22990,
      shortDescription: 'Anteojos ovalados con tono cálido y marco limpio.',
      longDescription: 'Un acento pequeño con gran impacto visual. Su marco ovalado y cristal ámbar suman una lectura sofisticada y ligeramente retro sin sentirse pesado.',
      materials: ['Acetato ligero', 'Lentes UV400', 'Bisagras metálicas'],
      details: ['Marco ovalado', 'Puente suave', 'Patillas delgadas', 'Protección UV'],
      availableSizes: ['One size'], availableColors: ['Amber', 'Smoke'], sourceUrl: 'https://example.com/products/accessory-shades-soft', modelCode: 'LU-ACC-119', fit: 'Universal fit', origin: 'China', mood: 'Quiet statement', badge: 'Sunny edit', highlights: ['Ligeros', 'Elevan el look', 'Fácil de combinar'], palette: ['#634832', '#b39a83', '#ece0d1'],
    }),
    createProduct({
      id: 'accessory-chain-pearl', name: 'Layered chain pearl drop', brand: 'Atelier Mina', source: 'Paris', category: 'accessories', price: 18990,
      shortDescription: 'Collar en capas con perla orgánica y brillo suave.',
      longDescription: 'El tipo de accesorio que transforma una camiseta simple en un outfit más trabajado. Capas delicadas, brillo controlado y perla orgánica para sumar textura visual.',
      materials: ['Baño dorado', 'Perla sintética', 'Cierre regulable'],
      details: ['Doble cadena', 'Caída ligera', 'Ajustable', 'Peso bajo'],
      availableSizes: ['One size'], availableColors: ['Gold', 'Pearl'], sourceUrl: 'https://example.com/products/accessory-chain-pearl', modelCode: 'AM-ACC-066', fit: 'Adjustable', origin: 'Chile', mood: 'Glow detail', badge: 'Giftable', highlights: ['Sutil', 'Pulido', 'Muy versátil'], palette: ['#f2762e', '#ffe4b9', '#fff8ed'],
    }),
    createProduct({
      id: 'sleep-set-cloud', name: 'Set pijama modal cloud touch', brand: 'Casa Claro', source: 'Marketplace Feed', category: 'underwear-pajamas', price: 26990,
      shortDescription: 'Set de pijama modal con tacto nube y líneas limpias.',
      longDescription: 'Pensado para descansar con estilo, este set combina una caída suave y una paleta serena con costuras discretas y una sensación fresca sobre la piel.',
      materials: ['93% modal', '7% elastano'],
      details: ['Camisa abotonada', 'Pantalón recto', 'Pretina suave', 'Tacto frío'],
      availableSizes: ['S', 'M', 'L'], availableColors: ['Blush', 'Bone', 'Espresso piping'], sourceUrl: 'https://example.com/products/sleep-set-cloud', modelCode: 'CC-SLP-203', fit: 'Relaxed set', origin: 'Perú', mood: 'Soft rest', badge: 'Night edit', highlights: ['Muy suave', 'Respirable', 'Look premium'], palette: ['#ff9a74', '#ffe4da', '#fff7f3'],
    }),
    createProduct({
      id: 'sleep-bralette-soft', name: 'Bralette second skin rib', brand: 'Aura Daily', source: 'Falabella', category: 'underwear-pajamas', price: 14990,
      shortDescription: 'Bralette de rib elástico con soporte ligero y cómodo.',
      longDescription: 'Un básico íntimo con enfoque en confort y líneas suaves. Rib flexible, elástico ancho y una lectura minimalista que lo vuelve práctico y bonito a la vez.',
      materials: ['92% algodón', '8% elastano'],
      details: ['Sin aro', 'Breteles regulables', 'Elástico suave', 'Cobertura media'],
      availableSizes: ['S', 'M', 'L'], availableColors: ['Terracotta', 'Sand'], sourceUrl: 'https://example.com/products/sleep-bralette-soft', modelCode: 'AD-SLP-080', fit: 'Soft support', origin: 'Colombia', mood: 'Comfort core', badge: 'Daily wear', highlights: ['Cómodo', 'Flexible', 'Bajo perfil'], palette: ['#eb6748', '#ffdcd0', '#fff5f2'],
    }),
    createProduct({
      id: 'sleep-robe-light', name: 'Bata waffle morning glow', brand: 'Lena Home', source: 'Paris', category: 'underwear-pajamas', price: 32990,
      shortDescription: 'Bata waffle ligera con cinturón y textura fresca.',
      longDescription: 'La capa perfecta para mañanas lentas o noches ligeras. Su textura waffle aporta profundidad visual sin volumen excesivo y se siente fresca sobre pijamas o ropa interior.',
      materials: ['100% algodón waffle'],
      details: ['Cinturón removible', 'Bolsillos delanteros', 'Manga amplia', 'Largo midi'],
      availableSizes: ['S/M', 'L/XL'], availableColors: ['Warm ivory', 'Clay stripe'], sourceUrl: 'https://example.com/products/sleep-robe-light', modelCode: 'LH-SLP-344', fit: 'Relaxed robe', origin: 'India', mood: 'Morning ritual', badge: 'Home luxe', highlights: ['Textura linda', 'Liviana', 'Respirable'], palette: ['#ff8654', '#ffe5d2', '#fff7f2'],
    }),
    createProduct({
      id: 'swim-onepiece-line', name: 'One-piece contour tide', brand: 'Costa Frame', source: 'Falabella', category: 'swimwear', price: 35990,
      shortDescription: 'Traje de baño entero con líneas limpias y compresión suave.',
      longDescription: 'Diseñado para verse tan bien dentro como fuera del agua. Su silueta limpia y el tono cálido lo hacen funcionar con camisas abiertas, shorts tejidos o sandalias minimalistas.',
      materials: ['78% poliamida reciclada', '22% elastano'],
      details: ['Escote redondo', 'Espalda profunda', 'Forro completo', 'Secado rápido'],
      availableSizes: ['S', 'M', 'L'], availableColors: ['Burnt orange', 'Chocolate'], sourceUrl: 'https://example.com/products/swim-onepiece-line', modelCode: 'CF-SWM-520', fit: 'Body contour', origin: 'Brasil', mood: 'Resort minimal', badge: 'Summer drop', highlights: ['Favorecedor', 'Buen soporte', 'Secado rápido'], palette: ['#ef6b33', '#ffd6bf', '#fff4eb'],
    }),
    createProduct({
      id: 'swim-bikini-rib', name: 'Bikini rib sunset set', brand: 'Salina', source: 'Marketplace Feed', category: 'swimwear', price: 24990,
      shortDescription: 'Bikini de rib con top limpio y bottom de tiro medio.',
      longDescription: 'Un set de verano con textura suficiente para sentirse especial, pero con una construcción simple y muy usable. La vibra es cálida, moderna y muy fácil de estilizar.',
      materials: ['80% nylon', '20% elastano'],
      details: ['Textura rib', 'Top de soporte medio', 'Bottom tiro medio', 'Forro suave'],
      availableSizes: ['XS', 'S', 'M', 'L'], availableColors: ['Papaya', 'Sand'], sourceUrl: 'https://example.com/products/swim-bikini-rib', modelCode: 'SA-SWM-114', fit: 'Medium support', origin: 'Colombia', mood: 'Sun ready', badge: 'Pool day', highlights: ['Liviano', 'Secado rápido', 'Textura linda'], palette: ['#ff8342', '#ffd9bf', '#fff6ee'],
    }),
    createProduct({
      id: 'swim-coverup-knit', name: 'Cover-up knit shore line', brand: 'Arenas', source: 'Paris', category: 'swimwear', price: 27990,
      shortDescription: 'Vestido cover-up tejido con líneas verticales y caída ligera.',
      longDescription: 'Una capa resort que se siente pulida y relajada al mismo tiempo. El tejido abierto deja respirar el look y suma una dimensión premium sobre bikinis o enteritos.',
      materials: ['55% algodón', '45% acrílico soft'],
      details: ['Tejido abierto', 'Largo mini', 'Caída recta', 'Manga corta'],
      availableSizes: ['S/M', 'M/L'], availableColors: ['Ecru', 'Terracotta stripe'], sourceUrl: 'https://example.com/products/swim-coverup-knit', modelCode: 'AR-SWM-302', fit: 'Straight fit', origin: 'Perú', mood: 'Beach city', badge: 'Layer up', highlights: ['Seca rápido', 'Muy versátil', 'Textura elegante'], palette: ['#f06a45', '#ffe0ce', '#fff6f1'],
    }),
  ];
}

function buildCatalog() {
  if (SCRAPED_CATALOG.length) {
    return SCRAPED_CATALOG.map((product) => createProduct(product));
  }
  return buildMockCatalog();
}

const CATALOG = buildCatalog();

function getProductById(id) {
  return CATALOG.find((product) => product.id === id);
}

function getCategoryCounts(productIds) {
  return CATEGORY_ORDER.reduce((accumulator, category) => {
    accumulator[category] = productIds.reduce((count, id) => {
      const product = getProductById(id);
      return product && product.category === category ? count + 1 : count;
    }, 0);
    return accumulator;
  }, {});
}

function getProductsFromIds(ids) {
  return ids.map(getProductById).filter(Boolean);
}

function getStoryImages(product) {
  return [...(product?.images || []), ...(product?.fallbackImages || [])].filter(Boolean);
}

function createCartKey(productId, size) {
  return `${productId}::${size}`;
}

function parseCartKey(key) {
  const separator = key.indexOf('::');
  return {
    productId: key.slice(0, separator),
    size: key.slice(separator + 2),
  };
}

function addCartEntry(productId, size, previous) {
  const key = createCartKey(productId, size);
  if (previous.includes(key)) {
    return previous;
  }
  return [...previous, key];
}

function getCartItems(keys) {
  return keys
    .map((key) => {
      const parsed = parseCartKey(key);
      const product = getProductById(parsed.productId);
      if (!product) return null;
      return { key, product, size: parsed.size };
    })
    .filter(Boolean);
}

function createUniqueList(nextValue, previous) {
  if (previous.includes(nextValue)) {
    return previous;
  }
  return [...previous, nextValue];
}

function removeFromList(value, previous) {
  return previous.filter((item) => item !== value);
}
function iconPath(name) {
  switch (name) {
    case 'discover':
      return <><circle cx="11" cy="11" r="5.5" /><path d="M15 15l4 4" strokeWidth="2.2" strokeLinecap="round" fill="none" /></>;
    case 'filters':
      return <path d="M4 6h16l-6 5v6l-4 2v-8L4 6z" />;
    case 'wardrobe':
      return <><path d="M6 8.5c0-1.5 1-2.5 2.5-2.5 1.2 0 2 .6 2.5 1.7.5-1.1 1.3-1.7 2.5-1.7C15 6 16 7 16 8.5c0 1.2-.7 2.1-1.8 2.6L19 17H5l4.8-5.9C8.7 10.6 8 9.7 8 8.5z" /><path d="M4.5 17h15" strokeWidth="2" strokeLinecap="round" fill="none" /><path d="M12 4V2.6c0-.7-.6-1.3-1.3-1.3S9.4 1.9 9.4 2.6" strokeWidth="2" strokeLinecap="round" fill="none" /></>;
    case 'cart':
      return <><path d="M4 5h2l1.5 8.5a2 2 0 0 0 2 1.6H17a2 2 0 0 0 2-1.5L20.4 8H8.2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><circle cx="10" cy="18.5" r="1.4" /><circle cx="17.2" cy="18.5" r="1.4" /></>;
    case 'profile':
      return <><circle cx="12" cy="8" r="3.5" /><path d="M5 19c1.8-3 4.3-4.5 7-4.5s5.2 1.5 7 4.5" strokeWidth="2" strokeLinecap="round" fill="none" /></>;
    case 'heart':
      return <path d="M12 20.5s-7-4.4-9.2-8.7C1 8.8 3 5 6.7 5c2.2 0 4 1.1 5.3 2.8C13.3 6.1 15 5 17.3 5 21 5 23 8.8 21.2 11.8 19 16.1 12 20.5 12 20.5z" />;
    case 'close':
      return <path d="M6 6l12 12M18 6 6 18" strokeWidth="2.5" strokeLinecap="round" fill="none" />;
    case 'plus-cart':
      return <><path d="M4 6h2l1.5 8.5a2 2 0 0 0 2 1.6H17a2 2 0 0 0 2-1.5L20.3 9H8.3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M12 5v4M10 7h4" strokeWidth="2" strokeLinecap="round" fill="none" /></>;
    case 'spark':
      return <path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3z" />;
    case 'arrow-left':
      return <path d="M14.5 5.5 8 12l6.5 6.5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
    case 'undo':
      return <path d="M9 7 5 11l4 4M5 11h9a5 5 0 1 1-3.8 8.2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
    case 'chevron-down':
      return <path d="M6 9.5 12 15l6-5.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
    case 'settings':
      return <><path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" fill="none" /><circle cx="8" cy="7" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="11" cy="17" r="2" /></>;
    case 'bell':
      return <><path d="M12 4a4 4 0 0 0-4 4v2.2c0 .9-.3 1.7-.8 2.4L5.8 14a1 1 0 0 0 .7 1.7h11a1 1 0 0 0 .7-1.7l-1.4-1.4a3.6 3.6 0 0 1-.8-2.4V8a4 4 0 0 0-4-4z" /><path d="M9.5 18a2.5 2.5 0 0 0 5 0" strokeWidth="2" strokeLinecap="round" fill="none" /></>;
    case 'check':
      return <path d="M6 12.5 10 16l8-9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
    case 'tops':
      return <path d="M9 4c1.7 0 3 1.2 3 2.7C12 5.2 13.3 4 15 4c1.4 0 2.7.8 3.3 2.1L21 8l-2.3 4-2.7-1.6V20H8v-9.6L5.3 12 3 8l2.7-1.9C6.3 4.8 7.6 4 9 4z" />;
    case 'bottoms':
      return <path d="M7 4h10l-1.2 16h-3.4L12 11l-.4 9H8.2L7 4z" />;
    case 'shoes':
      return <path d="M6 15c1.8 0 3.4-.7 5.8-.7 1.4 0 3.5.7 4.4.7 1.4 0 2.8.9 2.8 2.4S18 20 16 20H7.5C5.6 20 4 18.6 4 16.8 4 15.8 4.8 15 6 15zm3.5-7 3.2 1.4c1.1.5 2 1.3 2.5 2.5H9.1c-.1-1.2.1-2.5.4-3.9z" />;
    case 'accessories':
      return <><path d="M7 9c0-2.8 2.2-5 5-5s5 2.2 5 5v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z" /><path d="M9 9c0-1.7 1.3-3 3-3s3 1.3 3 3" strokeWidth="2" strokeLinecap="round" fill="none" /></>;
    case 'sleep':
      return <><path d="M8 5h8a3 3 0 0 1 3 3v2h-3l-1.4-2H9.4L8 10H5V8a3 3 0 0 1 3-3z" /><path d="M5 10h14v9H5z" /></>;
    case 'swim':
      return <path d="M9 4h6c2.8 0 5 2.2 5 5v3c0 1.7.7 3.3 1.9 4.4L20 18.5 17 21l-1.8-1.6c-1-.9-1.5-2.1-1.6-3.4h-3.2c-.1 1.3-.6 2.5-1.6 3.4L7 21l-3-2.5 1.1-2.1A6.2 6.2 0 0 0 7 12V9c0-2.8 2.2-5 5-5z" />;
    default:
      return <circle cx="12" cy="12" r="5" />;
  }
}

function AppIcon({ name, size = 22, stroke = 'currentColor', fill = 'currentColor' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={fill} stroke={stroke} strokeLinejoin="round">{iconPath(name)}</svg>;
}

function CategoryImageIcon({ categoryId, label }) {
  return <img src={CATEGORY_ICON_FILES[categoryId]} alt="" className="category-image-icon" aria-hidden="true" />;
}

function NavImageIcon({ itemId, label }) {
  return <img src={NAV_ICON_FILES[itemId]} alt="" className="nav-image-icon" aria-hidden="true" />;
}

function SafeImage({ sources, alt, className }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const safeSources = sources.filter(Boolean);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources.join('|')]);

  return (
    <img
      src={safeSources[Math.min(sourceIndex, safeSources.length - 1)]}
      alt={alt}
      className={className}
      draggable="false"
      onError={() => setSourceIndex((current) => Math.min(current + 1, safeSources.length - 1))}
    />
  );
}

function TopBar({ likedCount, activeTab, onOpenNotifications }) {
  const isDiscover = activeTab === 'discover';
  return (
    <header className={`app-topbar ${isDiscover ? 'app-topbar--discover' : ''}`}>
      <div className="brand-block">
        <img src={APP_LOGO} alt="" className="brand-mark" />
        <div className="brand-copy"><div className="brand-name">SWOPA</div></div>
      </div>
      <div className="topbar-actions">
        <button type="button" className="chip-icon-button" aria-label="Notificaciones" onClick={onOpenNotifications}>
          <img src="./icons/noti.png" alt="" className="notification-icon" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function NotificationsPanel({ open, settings, onToggle, onClose }) {
  const options = [
    {
      id: 'sizeRestock',
      title: 'Tallas',
      copy: 'Te avisaremos cuando una prenda vuelva a estar disponible en tu talla.',
    },
    {
      id: 'discounts',
      title: 'Descuentos',
      copy: 'Te aviseramos cuando una prenda en tu closet este con descuento.',
    },
    {
      id: 'soldOut',
      title: 'Agotados',
      copy: 'Te avisaremos cuando una prenda este a punto de agotarse.',
    },
  ];

  return (
    <div
      className={`notifications-panel ${open ? 'notifications-panel--open' : ''}`}
      role="dialog"
      aria-modal="true"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="notifications-panel__card" onPointerDown={(event) => event.stopPropagation()}>
        <div className="notifications-panel__header">
          <div>
            <h2 className="notifications-panel__title">Notificaciones</h2>
            <p className="notifications-panel__copy">Elige qué quieres que Swopa te avise. ;)</p>
          </div>
          <button type="button" className="notifications-panel__close" onClick={onClose} aria-label="Cerrar notificaciones">
            <AppIcon name="close" size={16} fill="none" stroke="currentColor" />
          </button>
        </div>
        <div className="notifications-panel__list">
          {options.map((option) => (
            <div className="notifications-panel__row" key={option.id}>
              <div className="notifications-panel__row-copy">
                <h3>{option.title}</h3>
                <p>{option.copy}</p>
              </div>
              <label className="switch" aria-label={option.title}>
                <input type="checkbox" checked={Boolean(settings[option.id])} onChange={() => onToggle(option.id)} />
                <span className="slider"></span>
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ icon, title, copy, actions }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon"><AppIcon name={icon} size={28} /></div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__copy">{copy}</p>
      {actions ? <div className="empty-state__actions">{actions}</div> : null}
    </div>
  );
}

function DetailSheet({ product, open, onClose, onSaveToWardrobe, onAddToCart }) {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const pointerId = useRef(null);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setDragOffset(0);
      setDragging(false);
      pointerId.current = null;
      dragOffsetRef.current = 0;
    }
  }, [open, product?.id]);

  if (!product) return null;
  const detailBullets = buildDetailBullets(product);
  const displaySizes = sortAvailableSizesForDisplay(product.availableSizes);

  function handleGrabStart(event) {
    if (!open) return;
    pointerId.current = event.pointerId;
    startY.current = event.clientY;
    setDragging(true);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) {}
  }

  function handleGrabMove(event) {
    if (!open || event.pointerId !== pointerId.current) return;
    const nextOffset = event.clientY - startY.current;
    dragOffsetRef.current = Math.max(-24, nextOffset);
    setDragOffset(dragOffsetRef.current);
  }

  function handleGrabEnd(event) {
    if (event.pointerId !== pointerId.current) return;
    pointerId.current = null;
    setDragging(false);
    if (dragOffsetRef.current > 120) {
      dragOffsetRef.current = 0;
      setDragOffset(0);
      onClose();
      return;
    }
    dragOffsetRef.current = 0;
    setDragOffset(0);
  }

  return (
    <div
      className={`detail-sheet ${open ? 'detail-sheet--open' : ''}`}
      role="dialog"
      aria-modal="false"
      onPointerDown={(event) => {
        if (!open || dragging) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="detail-sheet__frame" style={{ transform: open ? `translate3d(0, ${dragOffset}px, 0)` : 'translate3d(0, calc(100% + 24px), 0)', transition: dragging ? 'none' : undefined }}>
        <div className="detail-sheet__inner" onPointerDown={(event) => event.stopPropagation()}>
          <div
            className="detail-sheet__grab"
            onPointerDown={handleGrabStart}
            onPointerMove={handleGrabMove}
            onPointerUp={handleGrabEnd}
            onPointerCancel={handleGrabEnd}
            onLostPointerCapture={handleGrabEnd}
          >
            <div className="detail-sheet__handle" />
          </div>
          <div className="detail-sheet__content">
            <div
              className="detail-sheet__header"
              onPointerDown={handleGrabStart}
              onPointerMove={handleGrabMove}
              onPointerUp={handleGrabEnd}
              onPointerCancel={handleGrabEnd}
              onLostPointerCapture={handleGrabEnd}
            >
              <div className="detail-sheet__title-group"><h3>{product.name}</h3><p>{product.brand} · {product.source}</p></div>
              <div className="detail-sheet__price">{formatPrice(product.price, product.currency)}</div>
            </div>
            <div className="sheet-chip-row">{displaySizes.map((size) => <button type="button" key={size} className="sheet-chip">{size}</button>)}</div>
            <div className="sheet-list">{detailBullets.map((detail) => <div className="sheet-list__item" key={detail}><span className="sheet-list__dot" /><span>{detail}</span></div>)}</div>
            <div className="empty-state__actions" style={{ marginTop: 18 }}>
              <button type="button" className="primary-button" onClick={() => onSaveToWardrobe(product.id)}><AppIcon name="heart" size={18} />Añadir al closet</button>
              <button type="button" className="secondary-button" onClick={() => onAddToCart(product.id)}><img src={NAV_ICON_FILES.cart} alt="" className="button-bag-icon" aria-hidden="true" />Añadir directo a tu bag</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageStoryViewer({ product, open, initialIndex, originRect, onClose }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const pointerId = useRef(null);
  const startPoint = useRef({ x: 0, y: 0 });
  const closeTimer = useRef(null);
  const images = getStoryImages(product);
  const safeInitialIndex = Math.min(initialIndex || 0, Math.max(0, images.length - 1));

  useEffect(() => {
    if (!open || !product) return undefined;
    setPhotoIndex(safeInitialIndex);
    setDrag({ x: 0, y: 0 });
    setDragging(false);
    setExpanded(false);
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setExpanded(true));
    });
    return () => cancelAnimationFrame(firstFrame);
  }, [open, product?.id, safeInitialIndex]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  if (!open || !product || images.length === 0) return null;

  const rect = originRect || { top: window.innerHeight * 0.32, left: window.innerWidth * 0.5 - 30, width: 60, height: 80 };
  const dragDistance = Math.hypot(drag.x, drag.y);
  const overlayOpacity = expanded ? Math.max(0.22, 1 - dragDistance / 260) : 0;
  const dragScale = dragging ? Math.max(0.88, 1 - dragDistance / 900) : 1;

  function requestClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setExpanded(false);
    setDragging(false);
    setDrag({ x: 0, y: 0 });
    closeTimer.current = window.setTimeout(() => onClose(), 240);
  }

  function handlePointerDown(event) {
    pointerId.current = event.pointerId;
    startPoint.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) {}
  }

  function handlePointerMove(event) {
    if (event.pointerId !== pointerId.current) return;
    setDrag({ x: event.clientX - startPoint.current.x, y: event.clientY - startPoint.current.y });
  }

  function handlePointerEnd(event) {
    if (event.pointerId !== pointerId.current) return;
    pointerId.current = null;
    const dx = event.clientX - startPoint.current.x;
    const dy = event.clientY - startPoint.current.y;
    const distance = Math.hypot(dx, dy);
    setDragging(false);
    if (distance > 56) {
      requestClose();
      return;
    }
    setDrag({ x: 0, y: 0 });
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;
    if (relativeX < bounds.width / 2) {
      setPhotoIndex((current) => Math.max(current - 1, 0));
    } else {
      setPhotoIndex((current) => Math.min(current + 1, images.length - 1));
    }
  }

  return (
    <div className="story-viewer" style={{ opacity: overlayOpacity }} onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div
        className={`story-viewer__frame ${expanded ? 'story-viewer__frame--open' : ''}`}
        style={expanded ? { transform: `translate3d(${drag.x}px, ${drag.y}px, 0) scale(${dragScale})` } : { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: '10px' }}
      >
        <div className="story-viewer__chrome">
          <div className="photo-progress photo-progress--viewer">
            {images.map((image, index) => (
              <div className="photo-progress__segment" key={`${product.id}-${image}-${index}`}>
                <span style={{ transform: `scaleX(${index <= photoIndex ? 1 : 0})` }} />
              </div>
            ))}
          </div>
          <button type="button" className="story-viewer__close" onClick={requestClose} aria-label="Cerrar visor">
            <AppIcon name="close" size={18} fill="none" stroke="currentColor" />
          </button>
        </div>
        <div
          className="story-viewer__surface"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
        >
          <SafeImage
            sources={[images[photoIndex], ...images.filter((image, index) => index !== photoIndex)]}
            alt={product.name}
            className="story-viewer__image"
          />
          <div className="story-viewer__shade" />
          <div className="story-viewer__meta">
            <div className="story-viewer__brand">{product.brand} · {product.source}</div>
            <div className="story-viewer__name">{product.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscoverCard({ product, nextProducts, photoIndex, setPhotoIndex, onLike, onDismiss, onExpand, onUndo, canUndo }) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState('');
  const [instantLayout, setInstantLayout] = useState(false);
  const cardRef = useRef(null);
  const activePointerId = useRef(null);
  const pointerActive = useRef(false);
  const startPointer = useRef({ x: 0, y: 0, t: 0 });
  const maxDist = useRef(0);

  useEffect(() => {
    setDrag({ x: 0, y: 0 });
    setDragging(false);
    setExiting('');
    setInstantLayout(false);
    setPhotoIndex(0);
  }, [product.id]);

  function finishSwipe(direction) {
    if (exiting) return;
    setExiting(direction);
    setDragging(false);
    setDrag({ x: direction === 'right' ? FLY_DISTANCE : -FLY_DISTANCE, y: direction === 'right' ? -24 : 24 });
    window.setTimeout(() => {
      setInstantLayout(true);
      direction === 'right' ? onLike(product.id) : onDismiss(product.id);
      requestAnimationFrame(() => requestAnimationFrame(() => setInstantLayout(false)));
    }, SWIPE_FLING_MS);
  }

  function triggerSwipe(direction, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (exiting) return;
    setDragging(false);
    setDrag({ x: direction === 'right' ? HORIZONTAL_COMMIT + 18 : -(HORIZONTAL_COMMIT + 18), y: 0 });
    window.setTimeout(() => finishSwipe(direction), 16);
  }

  function resetGesture() {
    pointerActive.current = false;
    activePointerId.current = null;
    setDragging(false);
    if (!exiting) setDrag({ x: 0, y: 0 });
  }

  function handlePointerDown(event) {
    if (exiting) return;
    if (pointerActive.current) resetGesture();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) {}
    activePointerId.current = event.pointerId;
    pointerActive.current = true;
    startPointer.current = { x: event.clientX, y: event.clientY, t: Date.now() };
    maxDist.current = 0;
    setDragging(true);
    setDrag({ x: 0, y: 0 });
  }

  function handlePointerMove(event) {
    if (!pointerActive.current || event.pointerId !== activePointerId.current || exiting) return;
    const dx = event.clientX - startPointer.current.x;
    const dy = event.clientY - startPointer.current.y;
    maxDist.current = Math.max(maxDist.current, Math.hypot(dx, dy));
    setDrag({ x: dx, y: dy });
  }

  function handlePointerUp(event) {
    if (!pointerActive.current || event.pointerId !== activePointerId.current || exiting) return;
    pointerActive.current = false;
    activePointerId.current = null;
    const dx = event.clientX - startPointer.current.x;
    const dy = event.clientY - startPointer.current.y;
    const peakDist = Math.max(maxDist.current, Math.hypot(dx, dy));
    const elapsed = Date.now() - startPointer.current.t;
    const isTap = peakDist <= TAP_SLOP_PX && elapsed < TAP_MAX_MS;
    setDragging(false);

    if (isTap) {
      const bounds = cardRef.current?.getBoundingClientRect();
      if (bounds) {
        const relativeX = event.clientX - bounds.left;
        if (relativeX < bounds.width / 2) setPhotoIndex((current) => Math.max(0, current - 1));
        else setPhotoIndex((current) => Math.min(product.images.length - 1, current + 1));
      }
      setDrag({ x: 0, y: 0 });
      return;
    }

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX > HORIZONTAL_COMMIT && absX > absY) { finishSwipe(dx > 0 ? 'right' : 'left'); return; }
    if (dy < -VERTICAL_COMMIT && absY > absX) { setDrag({ x: 0, y: 0 }); onExpand(); return; }
    setDrag({ x: 0, y: 0 });
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId.current) return;
    resetGesture();
  }

  const rotation = drag.x * 0.04;
  const transition = dragging || instantLayout ? 'none' : exiting ? `transform ${SWIPE_FLING_MS}ms linear` : 'transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1)';
  const likeOpacity = Math.min(1, Math.max(0, (drag.x - 24) / 120));
  const nopeOpacity = Math.min(1, Math.max(0, (-drag.x - 24) / 120));
  const imageSources = [product.images[photoIndex], ...product.fallbackImages];
  const stackProgress = Math.min(1, Math.abs(drag.x) / 180);

  return (
    <div className="deck-shell">
      <div className="deck-stack">
        {nextProducts[0] ? (
          <div
            key={nextProducts[0].id}
            className="deck-card-preview deck-card-preview--primary"
            style={{
              transform: `translate3d(0, ${14 - stackProgress * 14}px, 0) scale(${0.968 + stackProgress * 0.032})`,
              opacity: 0.92,
              transition: dragging || instantLayout ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease',
            }}
          >
            <SafeImage
              sources={[nextProducts[0].images[0], ...nextProducts[0].fallbackImages]}
              alt={nextProducts[0].name}
              className="deck-card__image deck-card__image--preview"
            />
            <div className="deck-card__topfade deck-card__topfade--preview" />
          </div>
        ) : null}
        <div
          ref={cardRef}
          className="deck-card"
          role="button"
          tabIndex={0}
          aria-label={`Tarjeta de ${product.name}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={resetGesture}
          style={{ transform: `translate3d(${drag.x}px, ${drag.y * 0.18}px, 0) rotate(${rotation}deg)`, transition, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          <SafeImage sources={imageSources} alt={product.name} className="deck-card__image" />
          <div className="deck-card__topfade" />
          <div className="deck-card__body">
            <div>
              <div className="photo-progress">{product.images.map((image, index) => <div className="photo-progress__segment" key={`${product.id}-${image}-${index}`}><span style={{ transform: `scaleX(${index <= photoIndex ? 1 : 0})` }} /></div>)}</div>
              <div className="deck-card__badge-row" style={{ marginTop: 14 }}>
                <div className="floating-badge">{CATEGORY_META[product.category].label}</div>
              </div>
            </div>
            <div className="deck-card__overlay">
              <div className="product-meta">
                <div className="product-meta__topline"><h2 className="product-meta__title">{truncateByWords(product.name)}</h2><div className="product-meta__price">{formatPrice(product.price, product.currency)}</div></div>
                <div className="product-meta__brand"><span>{product.brand}</span><span>·</span><span>{product.source}</span></div>
              </div>
              <div className="card-actions-wrap">
                <div className="card-actions">
                  <button type="button" className="action-button action-button--dismiss" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => triggerSwipe('left', event)} aria-label="Descartar prenda"><AppIcon name="close" size={26} fill="none" stroke="currentColor" /></button>
                  <button type="button" className="action-button action-button--like" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => triggerSwipe('right', event)} aria-label="Guardar prenda"><AppIcon name="heart" size={26} /></button>
                </div>
                <button type="button" className="card-undo-button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onUndo(); }} disabled={!canUndo} aria-label="Deshacer última acción">
                  <AppIcon name="undo" size={17} fill="none" stroke="currentColor" />
                </button>
                <button type="button" className="card-expand-button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onExpand(); }} aria-label="Ver más información">
                  <AppIcon name="chevron-down" size={18} fill="none" stroke="currentColor" />
                </button>
              </div>
            </div>
          </div>
          <div className="gesture-stamp gesture-stamp--like" style={{ opacity: likeOpacity }} aria-hidden="true">
            <AppIcon name="heart" size={34} />
          </div>
          <div className="gesture-stamp gesture-stamp--nope" style={{ opacity: nopeOpacity }} aria-hidden="true">
            <AppIcon name="close" size={34} fill="none" stroke="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
}
function DiscoverScreen({ products, selectedCategories, onResetFilters, onGoToFilters, onResetDismissed, onLike, onDismiss, cartCount, likedCount, onAddToCart, onUndo, canUndo }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [detailProductId, setDetailProductId] = useState('');
  const activeProduct = products[0];
  const categoryMatches = CATALOG.filter((product) => selectedCategories.includes(product.category));
  const detailProduct = detailProductId ? getProductById(detailProductId) : activeProduct || null;
  const allCategoriesSelected = selectedCategories.length === CATEGORY_ORDER.length;

  useEffect(() => {
    setPhotoIndex(0);
    if (!activeProduct) setDetailProductId('');
  }, [activeProduct?.id]);

  return (
    <div className="screen screen--discover">
      <section className="discover-layout discover-layout--immersive">
        {selectedCategories.length === 0 ? (
          <div className="discover-empty-wrap">
            <EmptyState icon="tops" title="Ups!" copy="Debes activar algún filtro de búsqueda para ver productos." actions={<button type="button" className="primary-button" onClick={onGoToFilters}>Filtros</button>} />
          </div>
        ) : categoryMatches.length === 0 ? (
          <div className="discover-empty-wrap">
            <EmptyState icon="discover" title="No hay prendas para estos filtros" copy="Prueba activando más categorías para descubrir nuevas prendas." actions={<button type="button" className="primary-button" onClick={onResetFilters}>Ampliar filtros</button>} />
          </div>
        ) : products.length === 0 ? (
          <div className="discover-empty-wrap">
            <EmptyState icon="discover" title={allCategoriesSelected ? "Ya no queda más por ver, vuelve en otro momento cuando hayan nuevos productos." : "No queda más ropa por ver"} actions={allCategoriesSelected ? null : <button type="button" className="primary-button" onClick={onGoToFilters}>Cambiar filtros</button>} />
          </div>
        ) : (
          <DiscoverCard key={activeProduct.id} product={activeProduct} nextProducts={products.slice(1, 3)} photoIndex={photoIndex} setPhotoIndex={setPhotoIndex} onLike={onLike} onDismiss={onDismiss} onExpand={() => setDetailProductId(activeProduct.id)} onUndo={onUndo} canUndo={canUndo} />
        )}
      </section>
      <DetailSheet product={detailProduct} open={Boolean(detailProductId)} onClose={() => setDetailProductId('')} onSaveToWardrobe={(productId) => { onLike(productId); setDetailProductId(''); }} onAddToCart={(productId) => { onAddToCart(productId, undefined, { trackUndo: true }); setDetailProductId(''); }} />
    </div>
  );
}

function FiltersScreen({ selectedCategories, onToggleCategory, onSelectAll, products }) {
  const allSelected = selectedCategories.length === CATEGORY_ORDER.length;
  return (
    <div className="screen screen--filters">
      <section className="filters-panel">
        <div className="filters-header">
          <h1 className="filters-title">Qué buscas hoy, <span className="accent-script">Martina</span></h1>
          <button type="button" className={`filters-selectall ${allSelected ? 'filters-selectall--active' : ''}`} onClick={onSelectAll} aria-pressed={allSelected}>
            <span>{allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}</span>
            <span className={`filters-selectall__box ${allSelected ? 'filters-selectall__box--active' : ''}`}>
              {allSelected ? <AppIcon name="check" size={14} fill="none" stroke="currentColor" /> : null}
            </span>
          </button>
        </div>
        <div className="category-grid category-grid--filters">
          {CATEGORY_ORDER.map((categoryId) => {
            const meta = CATEGORY_META[categoryId];
            const selected = selectedCategories.includes(categoryId);
            return (
              <button type="button" key={categoryId} className={`category-tile category-tile--filters ${selected ? 'category-tile--selected' : 'category-tile--off'}`} onClick={() => onToggleCategory(categoryId)} aria-pressed={selected}>
                <span className="category-tile__icon category-tile__icon--filters"><CategoryImageIcon categoryId={categoryId} label={meta.label} /></span>
                <div className="category-tile__name category-tile__name--filters">{meta.label}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SwipeRow({ product, onRemove, onAddToCart, alreadyInCart, cartSize, onOpenViewer, activePickerId, onPickerFocus, onPickerReset, sizePreferences }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSize, setPendingSize] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [showCartSize, setShowCartSize] = useState(false);
  const pointerId = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const successTimeoutRef = useRef(null);
  const sizeOptions = getDisplaySizeOptions(product.availableSizes, product.category, sizePreferences);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activePickerId !== product.id && pickerOpen) {
      setPendingSize('');
      setPickerOpen(false);
      setSuccessOpen(false);
      setLocked(false);
      setOffset(0);
    }
  }, [activePickerId, pickerOpen, product.id]);

  useEffect(() => {
    if (!cartSize) setShowCartSize(false);
  }, [cartSize]);

  function showSuccessState() {
    setSuccessOpen(true);
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessOpen(false);
      setPendingSize('');
      setPickerOpen(false);
      setLocked(false);
      setOffset(0);
      onPickerReset();
    }, 950);
  }

  function resetRow() {
    pointerId.current = null;
    setDragging(false);
    if (!locked && !pickerOpen && !successOpen) setOffset(0);
  }

  function handlePointerDown(event) {
    if (activePickerId && activePickerId !== product.id) {
      onPickerReset();
    }
    if (locked || pickerOpen || successOpen) return;
    pointerId.current = event.pointerId;
    startX.current = event.clientX;
    startY.current = event.clientY;
    setDragging(true);
  }

  function handlePointerMove(event) {
    if (locked || pickerOpen || successOpen || event.pointerId !== pointerId.current) return;
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      resetRow();
      return;
    }
    setOffset(Math.max(-120, Math.min(120, dx)));
  }

  function handlePointerUp(event) {
    if (locked || pickerOpen || successOpen || event.pointerId !== pointerId.current) return;
    setDragging(false);
    pointerId.current = null;
    if (offset > ROW_ACTION_THRESHOLD) {
      setLocked(true); setOffset(132); window.setTimeout(() => onRemove(product.id), 160); return;
    }
    if (offset < -ROW_ACTION_THRESHOLD) {
      if (product.availableSizes.length <= 1) {
        const immediateSize = product.availableSizes[0] || 'One size';
        onAddToCart(product.id, immediateSize);
        showSuccessState();
      } else {
        setOffset(0);
        setPickerOpen(true);
        onPickerFocus(product.id);
      }
      return;
    }
    setOffset(0);
  }

  function handleClosePicker() {
    setPendingSize('');
    setPickerOpen(false);
    setSuccessOpen(false);
    setLocked(false);
    setOffset(0);
    onPickerReset();
  }

  function handleSizeSelect(size) {
    if (pendingSize) return;
    setPendingSize(size);
    window.setTimeout(() => {
      onAddToCart(product.id, size);
      showSuccessState();
    }, 180);
  }

  return (
    <div className={`swipe-row ${pickerOpen || successOpen ? 'swipe-row--picker-open' : ''}`}>
      <div className="swipe-row__actions" aria-hidden="true" style={{ opacity: pickerOpen || successOpen ? 0 : Math.min(1, Math.abs(offset) / 28), transition: dragging ? 'none' : 'opacity 160ms ease' }}><div className="swipe-row__action swipe-row__action--remove">Quitar</div><div className="swipe-row__action swipe-row__action--cart">{alreadyInCart ? 'En carrito' : 'Agregar al carrito'}</div></div>
      <div className="swipe-row__card" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={resetRow} onLostPointerCapture={resetRow} style={{ transform: `translate3d(${offset}px, 0, 0)`, transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1)' }}>
        <div className="thumb-stack thumb-stack--wardrobe">
          <button type="button" className="thumb-launcher" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpenViewer(product.id, 0, event.currentTarget.getBoundingClientRect()); }} aria-label={`Ver fotos de ${product.name}`}>
            <SafeImage sources={[product.images[0], ...product.fallbackImages]} alt={product.name} className="swipe-row__thumb" />
          </button>
          {cartSize ? (
            <button
              type="button"
              className={`cart-presence-badge ${showCartSize ? 'cart-presence-badge--size' : ''}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setShowCartSize((current) => !current);
              }}
              aria-label={`Esta prenda está en el bag en talla ${cartSize}`}
            >
              {showCartSize ? <span>{cartSize}</span> : <img src={NAV_ICON_FILES.cart} alt="" className="cart-presence-badge__icon" aria-hidden="true" />}
            </button>
          ) : null}
        </div>
        <div className="swipe-row__copy">
          <button type="button" className="product-title-button swipe-row__title" onClick={(event) => { event.stopPropagation(); onOpenViewer(product.id, 0, event.currentTarget.getBoundingClientRect()); }}>
            {truncateRowProductName(product.name)}
          </button>
          <div className="swipe-row__subtitle">{formatDisplayBrand(product)}</div>
        </div>
        <div className="swipe-row__price">{formatPrice(product.price, product.currency)}</div>
      </div>
      <div className={`swipe-row__picker ${pickerOpen || successOpen ? 'swipe-row__picker--open' : ''}`}>
        {successOpen ? (
          <div className="swipe-row__success">¡Agregado al carrito!</div>
        ) : (
          <>
            <button type="button" className="swipe-row__picker-close" onClick={handleClosePicker} aria-label="Cerrar selector de talla">
              <AppIcon name="close" size={14} fill="none" stroke="currentColor" />
            </button>
            <div className="swipe-row__picker-sizes">
              {sizeOptions.map((sizeOption) => (
                <button type="button" key={sizeOption.label} className={`swipe-row__size-chip ${pendingSize === sizeOption.value ? 'swipe-row__size-chip--active' : ''} ${sizeOption.available ? '' : 'swipe-row__size-chip--disabled'}`} onClick={() => { if (sizeOption.available) handleSizeSelect(sizeOption.value); }} disabled={!sizeOption.available} aria-disabled={!sizeOption.available}>
                  {sizeOption.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WardrobeScreen({ likedProducts, cartItems, selectedCategory, onSelectCategory, onBack, onRemoveLike, onAddToCart, onOpenViewer, sizePreferences }) {
  const counts = getCategoryCounts(likedProducts.map((product) => product.id));
  const cartProductIds = new Set(cartItems.map((entry) => entry.product.id));
  const cartSizeByProductId = cartItems.reduce((lookup, entry) => {
    if (!lookup[entry.product.id]) lookup[entry.product.id] = entry.size;
    return lookup;
  }, {});
  const [activePickerId, setActivePickerId] = useState('');

  useEffect(() => {
    setActivePickerId('');
  }, [selectedCategory]);

  if (selectedCategory) {
    const meta = CATEGORY_META[selectedCategory];
    const categoryProducts = likedProducts.filter((product) => product.category === selectedCategory);
    return (
      <div className="screen">
        <section className="screen-intro">
          <button type="button" className="back-row" onClick={onBack}><AppIcon name="arrow-left" size={16} fill="none" stroke="currentColor" />Volver a tu clóset</button>
          <h1 className="screen-title screen-title--serif">{meta.label}</h1>
          <p className="screen-description">Desliza a la derecha para quitar la prenda o a la izquierda para llevarla a tu carrito.</p>
        </section>
          <section className="category-list">
            {categoryProducts.length === 0 ? <EmptyState icon={meta.icon} title={`Aún no guardas ${meta.label.toLowerCase()}`} copy="Guarda prendas en Swopa para empezar a llenar esta categoría." /> : categoryProducts.map((product) => <SwipeRow key={product.id} product={product} alreadyInCart={cartProductIds.has(product.id)} cartSize={cartSizeByProductId[product.id]} onRemove={onRemoveLike} onAddToCart={onAddToCart} onOpenViewer={onOpenViewer} activePickerId={activePickerId} onPickerFocus={setActivePickerId} onPickerReset={() => setActivePickerId('')} sizePreferences={sizePreferences} />)}
          </section>
        </div>
      );
  }

  return (
    <div className="screen screen--wardrobe">
      <section className="wardrobe-panel">
        <div className="filters-header">
          <h1 className="filters-title">Tu clóset, <span className="accent-script">Martina</span></h1>
        </div>
        <section className="wardrobe-grid wardrobe-grid--dashboard">
          {CATEGORY_ORDER.map((categoryId) => {
            const meta = CATEGORY_META[categoryId];
            const hasItems = counts[categoryId] > 0;
            return (
              <button
                type="button"
                key={categoryId}
                className={`wardrobe-bucket wardrobe-bucket--dashboard ${hasItems ? 'wardrobe-bucket--active' : 'wardrobe-bucket--empty'}`}
                onClick={() => onSelectCategory(categoryId)}
              >
                <span className="wardrobe-bucket__icon wardrobe-bucket__icon--dashboard"><CategoryImageIcon categoryId={categoryId} label={meta.label} /></span>
                <div className="wardrobe-bucket__name wardrobe-bucket__name--dashboard">{meta.label}</div>
                {hasItems ? <div className="wardrobe-bucket__caption wardrobe-bucket__caption--dashboard">{counts[categoryId]} {pluralize(counts[categoryId], 'piece', 'pieces')}</div> : null}
                {hasItems ? <span className="bucket-badge">{counts[categoryId]}</span> : null}
              </button>
            );
          })}
        </section>
      </section>
    </div>
  );
}
function CartScreen({ cartItems, onRemove, onOpenViewer }) {
  const subtotal = cartItems.reduce((sum, entry) => sum + entry.product.price, 0);
  return (
    <div className="screen">
      <section className="screen-intro">
        <h1 className="screen-title">Carrito</h1>
        <p className="screen-description">Para esas prendas que ya van sí o sí.</p>
      </section>
        {cartItems.length === 0 ? <EmptyState icon="cart" title="Aún no tienes prendas en tu carrito" copy="Agrega prendas desde tu clóset o desde el detalle para armar tu selección." /> : (
          <>
            <section className="cart-list">
              {cartItems.map((entry) => (
                <div key={entry.key} className="cart-row">
                  <button type="button" className="thumb-launcher" onClick={(event) => onOpenViewer(entry.product.id, 0, event.currentTarget.getBoundingClientRect())} aria-label={`Ver fotos de ${entry.product.name}`}>
                    <SafeImage sources={[entry.product.images[0], ...entry.product.fallbackImages]} alt={entry.product.name} className="cart-row__thumb" />
                  </button>
                  <div className="cart-row__copy">
                    <button type="button" className="product-title-button cart-row__title" onClick={(event) => onOpenViewer(entry.product.id, 0, event.currentTarget.getBoundingClientRect())}>
                      {truncateRowProductName(entry.product.name)}
                    </button>
                    <div className="cart-row__subtitle">{formatDisplayBrand(entry.product)} · Talla {entry.size}</div>
                  </div>
                  <div className="cart-row__price">{formatPrice(entry.product.price, entry.product.currency)}</div>
                  <button type="button" className="cart-row__remove" onClick={() => onRemove(entry.key)} aria-label={`Quitar ${entry.product.name} talla ${entry.size}`}><AppIcon name="close" size={16} fill="none" stroke="currentColor" /></button>
                </div>
              ))}
            </section>
            <div className="cart-summary">
              <div className="cart-summary__row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <div className="cart-summary__row" style={{ marginTop: 10 }}><span>{cartItems.length} tallas seleccionadas</span><span>Próximamente</span></div>
            </div>
          </>
        )}
    </div>
  );
}

function SizeWheel({ label, options, value, open, onChange }) {
  const listRef = useRef(null);
  const itemRefs = useRef({});

  useEffect(() => {
    if (!open) return;
    const activeItem = itemRefs.current[value];
    if (activeItem) activeItem.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [open, value]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !open) return undefined;
    let settleTimer = null;

    function handleScroll() {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const listRect = list.getBoundingClientRect();
        const listCenter = listRect.top + (listRect.height / 2);
        let closestValue = value;
        let closestDistance = Number.POSITIVE_INFINITY;
        options.forEach((option) => {
          const node = itemRefs.current[option];
          if (!node) return;
          const rect = node.getBoundingClientRect();
          const center = rect.top + (rect.height / 2);
          const distance = Math.abs(center - listCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestValue = option;
          }
        });
        if (closestValue !== value) onChange(closestValue);
      }, 70);
    }

    list.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      list.removeEventListener('scroll', handleScroll);
      if (settleTimer) window.clearTimeout(settleTimer);
    };
  }, [open, options, onChange, value]);

  return (
    <div className="size-wheel">
      <div className="size-wheel__label">{label}</div>
      <div className="size-wheel__frame">
        <div className="size-wheel__highlight" aria-hidden="true" />
        <div className="size-wheel__list" ref={listRef}>
          <div className="size-wheel__spacer" aria-hidden="true" />
          {options.map((option) => (
            <button
              type="button"
              key={option}
              ref={(node) => { itemRefs.current[option] = node; }}
              className={`size-wheel__option ${value === option ? 'size-wheel__option--active' : ''}`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
          <div className="size-wheel__spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function SizePreferencesSheet({ open, preferences, hasChanges, confirmOpen, onChange, onSave, onRequestClose, onDismissConfirm, onConfirmDiscard }) {
  return (
    <div
      className={`size-sheet ${open ? 'size-sheet--open' : ''}`}
      role="dialog"
      aria-modal="true"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onRequestClose();
      }}
    >
      <div className="size-sheet__panel" onPointerDown={(event) => event.stopPropagation()}>
        <div className="size-sheet__header">
          <div>
            <h3 className="size-sheet__title">Ajustar tallas</h3>
          </div>
          <button type="button" className="size-sheet__close" onClick={onRequestClose} aria-label="Cerrar ajuste de tallas">
            <AppIcon name="close" size={16} fill="none" stroke="currentColor" />
          </button>
        </div>
        <div className="size-sheet__wheels">
          <SizeWheel label="Tops" options={SIZE_PREFERENCE_OPTIONS.tops} value={preferences.tops} open={open} onChange={(value) => onChange('tops', value)} />
          <SizeWheel label="Bottoms" options={SIZE_PREFERENCE_OPTIONS.bottoms} value={preferences.bottoms} open={open} onChange={(value) => onChange('bottoms', value)} />
          <SizeWheel label="Zapatos" options={SIZE_PREFERENCE_OPTIONS.shoes} value={preferences.shoes} open={open} onChange={(value) => onChange('shoes', value)} />
        </div>
        <div className="size-sheet__footer">
          <button type="button" className={`size-sheet__save ${hasChanges ? 'size-sheet__save--active' : 'size-sheet__save--disabled'}`} onClick={onSave} disabled={!hasChanges}>
            Guardar
          </button>
        </div>
        {confirmOpen ? (
          <div className="size-sheet-confirm">
            <div className="size-sheet-confirm__card">
              <p className="size-sheet-confirm__copy">No se están guardando los cambios de talla.</p>
              <div className="size-sheet-confirm__actions">
                <button type="button" className="size-sheet-confirm__button size-sheet-confirm__button--ghost" onClick={onConfirmDiscard}>No guardar tallas</button>
                <button type="button" className="size-sheet-confirm__button size-sheet-confirm__button--accent" onClick={onSave}>Guardar tallas</button>
              </div>
              <button type="button" className="size-sheet-confirm__cancel" onClick={onDismissConfirm}>Seguir editando</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProfileScreen({ sizePreferences, onUpdateSizePreference }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState(sizePreferences);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) {
      setDraftPreferences(sizePreferences);
      setConfirmOpen(false);
    }
  }, [sizePreferences, sheetOpen]);

  const hasChanges = (
    draftPreferences.tops !== sizePreferences.tops
    || draftPreferences.bottoms !== sizePreferences.bottoms
    || draftPreferences.shoes !== sizePreferences.shoes
  );

  function handleOpenSheet() {
    setDraftPreferences(sizePreferences);
    setConfirmOpen(false);
    setSheetOpen(true);
  }

  function handleRequestCloseSheet() {
    if (hasChanges) {
      setConfirmOpen(true);
      return;
    }
    setSheetOpen(false);
  }

  function handleDismissConfirm() {
    setConfirmOpen(false);
  }

  function handleDiscardChanges() {
    setDraftPreferences(sizePreferences);
    setConfirmOpen(false);
    setSheetOpen(false);
  }

  function handleSavePreferences() {
    onUpdateSizePreference('tops', draftPreferences.tops);
    onUpdateSizePreference('bottoms', draftPreferences.bottoms);
    onUpdateSizePreference('shoes', draftPreferences.shoes);
    setConfirmOpen(false);
    setSheetOpen(false);
  }

  return (
    <div className="screen">
      <section className="screen-intro">
        <h1 className="screen-title">Perfil</h1>
      </section>
      <div className="profile-card">
        <div className="profile-card__header">
          <div className="avatar-badge"><AppIcon name="profile" size={30} fill="none" stroke="currentColor" /></div>
          <h2><span className="profile-card__greeting">Hola,</span><span className="profile-card__name">Martina</span></h2>
        </div>
        <p>Ajusta tus tallas para una mayor facilidad al agregar tu bag.</p>
        <div className="profile-size-grid">
          <div className="profile-size-card"><span>Tops</span><strong>{sizePreferences.tops}</strong></div>
          <div className="profile-size-card"><span>Bottoms</span><strong>{sizePreferences.bottoms}</strong></div>
          <div className="profile-size-card"><span>Zapatos</span><strong>{sizePreferences.shoes}</strong></div>
        </div>
        <button type="button" className="settings-button" onClick={handleOpenSheet}><AppIcon name="settings" size={18} fill="none" stroke="currentColor" />Ajustar tallas</button>
        <button type="button" className="logout-button"><AppIcon name="close" size={18} fill="none" stroke="currentColor" />Cerrar sesión</button>
      </div>
      <SizePreferencesSheet
        open={sheetOpen}
        preferences={draftPreferences}
        hasChanges={hasChanges}
        confirmOpen={confirmOpen}
        onChange={(group, value) => setDraftPreferences((current) => ({ ...current, [group]: value }))}
        onSave={handleSavePreferences}
        onRequestClose={handleRequestCloseSheet}
        onDismissConfirm={handleDismissConfirm}
        onConfirmDiscard={handleDiscardChanges}
      />
    </div>
  );
}

function BottomNav({ activeTab, onChange, likedCount, cartCount }) {
  return (
    <nav className="app-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const badgeCount = item.id === 'wardrobe' ? likedCount : item.id === 'cart' ? cartCount : 0;
        const active = item.id === activeTab;
        return (
          <button type="button" key={item.id} className={`nav-item ${active ? 'nav-item--active' : ''}`} onClick={() => onChange(item.id)}>
            <NavImageIcon itemId={item.id} label={item.label} />
            <span className="nav-item__label">{item.label}</span>
            {badgeCount > 0 ? <span className="nav-badge">{badgeCount}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

function SwopaApp() {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedCategories, setSelectedCategories] = useState([...CATEGORY_ORDER]);
  const [likedIds, setLikedIds] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [cartKeys, setCartKeys] = useState([]);
  const [wardrobeCategory, setWardrobeCategory] = useState('');
  const [viewerState, setViewerState] = useState({ productId: '', index: 0, rect: null });
  const [sizePreferences, setSizePreferences] = useState(() => loadSizePreferences());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
    sizeRestock: true,
    discounts: true,
    soldOut: false,
  });

  const likedProducts = getProductsFromIds(likedIds);
  const cartItems = getCartItems(cartKeys);
  const discoverProducts = CATALOG.filter((product) => {
    if (!selectedCategories.includes(product.category)) return false;
    if (likedIds.includes(product.id)) return false;
    if (dismissedIds.includes(product.id)) return false;
    return true;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIZE_PREFERENCES_STORAGE_KEY, JSON.stringify(sizePreferences));
    } catch (error) {}
  }, [sizePreferences]);

  function trackUndoAction(action) {
    setUndoStack((current) => [...current.slice(-9), action]);
  }

  function handleLike(productId, options = {}) {
    if (options.trackUndo !== false && !likedIds.includes(productId)) {
      trackUndoAction({ type: 'like', productId });
    }
    setLikedIds((current) => createUniqueList(productId, current));
    setDismissedIds((current) => removeFromList(productId, current));
  }

  function handleDismiss(productId, options = {}) {
    if (options.trackUndo !== false && !dismissedIds.includes(productId)) {
      trackUndoAction({ type: 'dismiss', productId });
    }
    setDismissedIds((current) => createUniqueList(productId, current));
  }

  function handleAddToCart(productId, size, options = {}) {
    const product = getProductById(productId);
    const resolvedSize = size || product?.availableSizes?.[0] || 'One size';
    const cartKey = createCartKey(productId, resolvedSize);
    if (options.trackUndo && !cartKeys.includes(cartKey)) {
      trackUndoAction({ type: 'cart', cartKey });
    }
    setCartKeys((current) => addCartEntry(productId, resolvedSize, current));
  }

  function handleRemoveFromCart(cartKey) {
    setCartKeys((current) => removeFromList(cartKey, current));
  }

  function handleRemoveLike(productId) {
    setLikedIds((current) => removeFromList(productId, current));
  }

  function handleOpenViewer(productId, index, rect) {
    setViewerState({ productId, index, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } });
  }

  function handleCloseViewer() {
    setViewerState({ productId: '', index: 0, rect: null });
  }

  function handleToggleCategory(categoryId) {
    setSelectedCategories((current) => (
      current.includes(categoryId)
        ? current.filter((value) => value !== categoryId)
        : [...current, categoryId].sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
    ));
  }

  function handleToggleAllCategories() {
    setSelectedCategories((current) => current.length === CATEGORY_ORDER.length ? [] : [...CATEGORY_ORDER]);
  }

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    if (tabId !== 'wardrobe') setWardrobeCategory('');
  }

  function handleUpdateSizePreference(group, value) {
    setSizePreferences((current) => ({ ...current, [group]: value }));
  }

  function handleToggleNotification(settingId) {
    setNotificationSettings((current) => ({ ...current, [settingId]: !current[settingId] }));
  }

  function handleUndoLastDiscoverAction() {
    const lastAction = undoStack[undoStack.length - 1];
    if (!lastAction) return;
    setUndoStack((current) => current.slice(0, -1));
    if (lastAction.type === 'like') {
      setLikedIds((current) => removeFromList(lastAction.productId, current));
      setDismissedIds((current) => removeFromList(lastAction.productId, current));
      return;
    }
    if (lastAction.type === 'dismiss') {
      setDismissedIds((current) => removeFromList(lastAction.productId, current));
      return;
    }
    if (lastAction.type === 'cart') {
      setCartKeys((current) => removeFromList(lastAction.cartKey, current));
    }
  }

  let screen = null;
  if (activeTab === 'discover') {
    screen = <DiscoverScreen products={discoverProducts} selectedCategories={selectedCategories} likedCount={likedIds.length} cartCount={cartKeys.length} onLike={handleLike} onDismiss={handleDismiss} onResetFilters={() => setSelectedCategories([...CATEGORY_ORDER])} onGoToFilters={() => setActiveTab('filters')} onResetDismissed={() => setDismissedIds([])} onAddToCart={handleAddToCart} onUndo={handleUndoLastDiscoverAction} canUndo={undoStack.length > 0} />;
  } else if (activeTab === 'filters') {
    screen = <FiltersScreen selectedCategories={selectedCategories} onToggleCategory={handleToggleCategory} onSelectAll={handleToggleAllCategories} products={CATALOG} />;
  } else if (activeTab === 'wardrobe') {
    screen = <WardrobeScreen likedProducts={likedProducts} cartItems={cartItems} selectedCategory={wardrobeCategory} onSelectCategory={setWardrobeCategory} onBack={() => setWardrobeCategory('')} onRemoveLike={handleRemoveLike} onAddToCart={handleAddToCart} onOpenViewer={handleOpenViewer} sizePreferences={sizePreferences} />;
  } else if (activeTab === 'cart') {
    screen = <CartScreen cartItems={cartItems} onRemove={handleRemoveFromCart} onOpenViewer={handleOpenViewer} />;
  } else {
    screen = <ProfileScreen sizePreferences={sizePreferences} onUpdateSizePreference={handleUpdateSizePreference} />;
  }

  return (
    <div className={`app-shell ${activeTab === 'discover' ? 'app-shell--discover' : ''}`}>
      <div className="app-gradient" />
      <TopBar likedCount={likedIds.length} activeTab={activeTab} onOpenNotifications={() => setNotificationsOpen(true)} />
      <main className={`app-content ${activeTab === 'discover' ? 'app-content--discover' : ''} ${activeTab === 'filters' ? 'app-content--filters' : ''} ${activeTab === 'wardrobe' ? 'app-content--wardrobe' : ''} ${activeTab === 'wardrobe' && wardrobeCategory ? 'app-content--wardrobe-detail' : ''} ${activeTab === 'cart' ? 'app-content--cart' : ''}`}>{screen}</main>
      <BottomNav activeTab={activeTab} onChange={handleTabChange} likedCount={likedIds.length} cartCount={cartKeys.length} />
      <ImageStoryViewer product={viewerState.productId ? getProductById(viewerState.productId) : null} open={Boolean(viewerState.productId)} initialIndex={viewerState.index} originRect={viewerState.rect} onClose={handleCloseViewer} />
      <NotificationsPanel open={notificationsOpen} settings={notificationSettings} onToggle={handleToggleNotification} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SwopaApp />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}



// 胶卷品牌常量定义
export interface Brand {
  name: string;      // 英文名称
  displayName: string; // 中文名称
  logoUrl: string;    // LOGO链接
}

// 常见品牌列表
export const commonBrands: Brand[] = [
  { name: 'FUJIFILM', displayName: '富士', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774608830532.webp' },
  { name: 'Kodak', displayName: '柯达', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774609038242.webp' },
  { name: 'Lucky', displayName: '乐凯', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774605924805.webp' },
  { name: 'Agfa', displayName: '爱克发', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774609367814.webp' },
  { name: 'LOMOGRAPHY', displayName: '乐魔', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774610093361.webp' },
  { name: 'Leica', displayName: '徕卡', logoUrl: 'https://img.072199.xyz/file/FilmAlbum/Films/1774609923703.webp' }
];

// 品牌映射表，用于中英文转换
export const brandMap: Record<string, string> = {
  'FUJIFILM': '富士',
  'Kodak': '柯达',
  'Lucky': '乐凯',
  'Agfa': '爱克发',
  'LOMOGRAPHY': '乐魔',
  'Leica': '徕卡',
  '富士': 'FUJIFILM',
  '柯达': 'Kodak',
  '乐凯': 'Lucky',
  '爱克发': 'Agfa',
  '乐魔': 'LOMOGRAPHY',
  '徕卡': 'Leica'
};

// 获取品牌的显示名称（中英文）
export const getBrandDisplayName = (brand: string): string => {
  const displayName = brandMap[brand] || brand;
  return `${brand} (${displayName})`;
};

// 搜索胶卷型号时同时匹配中英文品牌名
export const filterFilmStocks = <T extends { brand: string }>(stocks: T[], searchTerm: string): T[] => {
  if (!searchTerm) return stocks;
  
  const searchLower = searchTerm.toLowerCase();
  return stocks.filter(stock => {
    // 匹配英文品牌名
    if (stock.brand.toLowerCase().includes(searchLower)) return true;
    // 匹配中文品牌名
    const chineseBrand = brandMap[stock.brand];
    if (chineseBrand && chineseBrand.toLowerCase().includes(searchLower)) return true;
    return false;
  });
};

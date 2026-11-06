import {
  Backpack,
  BookOpen,
  Camera,
  CookingPot,
  Gamepad2,
  Headphones,
  House,
  Laptop,
  Lightbulb,
  Monitor,
  Package,
  Plug,
  Shirt,
  Smartphone,
  ToyBrick,
  Volleyball,
  Watch,
} from 'lucide-react';

/** Icons admins can pick for a category. The key is what gets stored in the database. */
export const CATEGORY_ICONS = {
  smartphone: { Icon: Smartphone, label: 'Điện thoại' },
  laptop: { Icon: Laptop, label: 'Laptop' },
  headphones: { Icon: Headphones, label: 'Âm thanh' },
  watch: { Icon: Watch, label: 'Đồng hồ' },
  lightbulb: { Icon: Lightbulb, label: 'Đèn, nhà thông minh' },
  gamepad: { Icon: Gamepad2, label: 'Gaming' },
  camera: { Icon: Camera, label: 'Máy ảnh' },
  plug: { Icon: Plug, label: 'Phụ kiện' },
  monitor: { Icon: Monitor, label: 'Màn hình' },
  backpack: { Icon: Backpack, label: 'Balo, túi' },
  house: { Icon: House, label: 'Gia dụng' },
  shirt: { Icon: Shirt, label: 'Thời trang' },
  book: { Icon: BookOpen, label: 'Sách' },
  toy: { Icon: ToyBrick, label: 'Đồ chơi' },
  sport: { Icon: Volleyball, label: 'Thể thao' },
  kitchen: { Icon: CookingPot, label: 'Nhà bếp' },
  package: { Icon: Package, label: 'Khác' },
};

// Older data stored emoji; map them to the matching icon.
const EMOJI = {
  '📱': 'smartphone', '📲': 'smartphone', '💻': 'laptop', '🎧': 'headphones', '⌚': 'watch', '💡': 'lightbulb',
  '🎮': 'gamepad', '📷': 'camera', '🔌': 'plug', '🖥️': 'monitor', '🖥': 'monitor', '🎒': 'backpack', '🏠': 'house',
  '👕': 'shirt', '📚': 'book', '🧸': 'toy', '⚽': 'sport', '🍳': 'kitchen', '📦': 'package',
};

/** Returns a key of CATEGORY_ICONS for a stored value (icon key or old emoji). */
export function categoryIconKey(value) {
  if (CATEGORY_ICONS[value]) return value;
  return EMOJI[value?.trim()] || 'package';
}

export function resolveCategoryIcon(value) {
  return CATEGORY_ICONS[categoryIconKey(value)].Icon;
}

export default function CategoryIcon({ icon, className = 'size-4', ...props }) {
  const Icon = resolveCategoryIcon(icon);
  return <Icon className={className} strokeWidth={1.75} aria-hidden {...props} />;
}

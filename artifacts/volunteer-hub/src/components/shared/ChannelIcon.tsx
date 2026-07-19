import {
  Megaphone,
  Compass,
  Shield,
  ClipboardList,
  MessageCircle,
  FileText,
  Layers,
  Package,
  Laptop,
  Headphones,
  Radio,
  Users,
  MessageSquare,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  pr: Megaphone,
  sherpa: Compass,
  admin: Shield,
  'registration desk': ClipboardList,
  'registration': ClipboardList,
  feedback: MessageCircle,
  'content specialist': FileText,
  'content': FileText,
  'track managers': Layers,
  'track': Layers,
  'tshirt distribution': Package,
  'tshirt': Package,
  't-shirt': Package,
  'sap for me': Laptop,
  'sap': Laptop,
  'support acc': Headphones,
  'support': Headphones,
  broadcast: Radio,
  general: Users,
};

interface ChannelIconProps {
  slug: string;
  name: string;
  className?: string;
}

export default function ChannelIcon({ slug, name, className = 'w-4 h-4' }: ChannelIconProps) {
  const key = slug.toLowerCase();
  const nameKey = name.toLowerCase();

  // Try exact slug match first, then name match, then partial match
  const Icon =
    ICON_MAP[key] ??
    ICON_MAP[nameKey] ??
    Object.entries(ICON_MAP).find(([k]) => key.includes(k) || nameKey.includes(k))?.[1] ??
    MessageSquare;

  return <Icon className={className} />;
}

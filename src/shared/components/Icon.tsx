import {
  House, Leaf, Map, CalendarDays, BookOpen, Package, CircleDollarSign,
  ListChecks, ChartColumn, Bot, UserRound, Bell, Plus, ArrowRight, ArrowLeft,
  ChevronDown, LogOut, TriangleAlert, Droplet, History, MessageSquare,
  LockKeyhole, Search, Eye, EyeOff, Mail, Globe, LogIn, X, Hand, Menu,
  LoaderCircle, CircleHelp, Pencil, RotateCcw, Save, UserRoundPlus, ShieldCheck,
  Phone, Check, Award, Sparkles, Star, TrendingUp, Sprout, ExternalLink, FileText,
  Sun, Moon, ChevronLeft, ChevronRight, SlidersHorizontal, Maximize2,
  Activity, Layers, Zap, Database, Building2, Trash2, Weight, FlaskConical, Grip,
  type LucideIcon, type LucideProps,
} from 'lucide-react';

// Explicit imports keep the bundle limited to the icons used by this app.
const icons: Record<string, LucideIcon> = {
  home: House, leaf: Leaf, plots: Map, calendar: CalendarDays, book: BookOpen,
  box: Package, money: CircleDollarSign, check: ListChecks, report: ChartColumn,
  bot: Bot, user: UserRound, bell: Bell, plus: Plus, arrow: ArrowRight,
  'arrow-left': ArrowLeft, chevron: ChevronDown, logout: LogOut,
  warning: TriangleAlert, drop: Droplet, history: History, message: MessageSquare,
  lock: LockKeyhole, search: Search, eye: Eye, 'eye-off': EyeOff,
  mail: Mail, globe: Globe, login: LogIn, close: X, hand: Hand,
  loader: LoaderCircle, edit: Pencil, refresh: RotateCcw, save: Save,
  'user-plus': UserRoundPlus, shield: ShieldCheck, menu: Menu,
  phone: Phone, 'check-circle': Check, award: Award, sparkles: Sparkles,
  star: Star, 'trending-up': TrendingUp, sprout: Sprout,
  'external-link': ExternalLink, 'file-text': FileText,
  sun: Sun, moon: Moon, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight,
  filter: SlidersHorizontal, expand: Maximize2,
  activity: Activity, layers: Layers, zap: Zap, database: Database, building: Building2, trash: Trash2,
  weight: Weight, flask: FlaskConical, granules: Grip, help: CircleHelp,
};

export function Icon({ name, className, ...props }: LucideProps & { name: string }) {
  const LucideComponent = icons[name] ?? CircleHelp;
  return <LucideComponent
    size={18}
    strokeWidth={1.7}
    aria-hidden={props['aria-label'] || props['aria-labelledby'] ? undefined : true}
    focusable="false"
    {...props}
    className={['ui-icon', className].filter(Boolean).join(' ')}
  />;
}

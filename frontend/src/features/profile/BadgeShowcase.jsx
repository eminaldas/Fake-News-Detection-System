import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Award, Search, BarChart2, Shield, Star, Cpu, Zap,
  MessageSquare, TrendingUp, Users, Calendar,
  Trophy, FileSearch, UserCheck, ThumbsUp, CalendarCheck,
  ShieldCheck, Globe, Globe2, Newspaper, BookOpen, Microscope, Music,
  DollarSign, Link as LinkIcon, Plus,
} from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import GamificationService from '../../services/gamification.service';

const SLOT_COUNT = 3;
const SLOT_SIZE  = 68;

const S  = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const BD = { borderColor: 'var(--color-terminal-border-raw)' };

/* badge_definitions.py'deki `icon` alanıyla birebir eşleşir — her rozet kendi
   anlamına uygun tekil ikonu gösterir, geneleşmiş Award/Zap fallback'i yok. */
const ICON_MAP = {
  User, Search, FileSearch, BarChart2, Shield, Star, Cpu,
  TrendingUp, MessageSquare, Zap, Link: LinkIcon, Award, Users,
  Calendar, CalendarCheck, ShieldCheck, ThumbsUp, UserCheck,
  Newspaper, BookOpen, Trophy, DollarSign,
  Globe, Globe2, Microscope, Music,
};

function getIcon(name) {
  return ICON_MAP[name] ?? Award;
}

function resolveColor(color) {
  const cssVars = {
    'var(--color-text-muted)':    '#6b7280',
    'var(--color-accent-blue)':   '#3b82f6',
    'var(--color-brand-primary)': '#10b981',
    'var(--color-accent-amber)':  '#f59e0b',
  };
  return cssVars[color] ?? color;
}

/* ── Köşe çentikleri (keskin) — sitenin geri kalanıyla aynı Corner dili ── */
function Corner() {
  return (
    <>
      <div className="absolute top-0 left-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute top-0 left-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
    </>
  );
}

export default function BadgeShowcase({ showcase = [], isOwnProfile = false }) {
  const [descMap, setDescMap] = useState({});

  useEffect(() => {
    GamificationService.getBadgeCatalog()
      .then(catalog => {
        const map = {};
        catalog.forEach(b => { map[b.key] = b.description; });
        setDescMap(map);
      })
      .catch(() => {});
  }, []);

  if (!isOwnProfile && showcase.length === 0) return null;

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => showcase[i] ?? null);

  return (
    <div className="relative border" style={S}>
      <Corner />
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={BD}>
        <Award className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
        <span className="font-manrope font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Rozetler
        </span>
        {isOwnProfile && (
          <Link to="/badges"
                className="ml-auto font-mono text-[10px] transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-brand-primary)' }}>
            tümü →
          </Link>
        )}
      </div>

      <div className="flex items-start gap-2.5 p-4 flex-wrap">
        {slots.map((badge, i) => {
          if (!badge) {
            return isOwnProfile ? (
              <Link
                key={`empty-${i}`}
                to="/badges"
                className="flex flex-col items-center justify-center gap-1 border border-dashed transition-colors hover:border-solid"
                style={{ width: SLOT_SIZE, height: SLOT_SIZE, borderColor: 'var(--color-terminal-border-raw)', color: 'var(--color-text-muted)' }}
              >
                <Plus size={16} />
                <span className="font-mono text-[8px] uppercase tracking-wider">Rozet</span>
              </Link>
            ) : null;
          }

          const color = resolveColor(badge.color);
          const Icon  = getIcon(badge.icon);

          return (
            <Tooltip key={badge.key} content={descMap[badge.key] ?? badge.name} side="top" maxWidth={220}>
              <div className="relative flex flex-col items-center justify-center gap-1 border overflow-hidden transition-colors"
                   style={{ width: SLOT_SIZE, height: SLOT_SIZE, borderColor: color, background: 'var(--color-terminal-surface)' }}>
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
                <Icon size={20} style={{ color, marginTop: 3 }} />
                <span className="font-mono font-bold text-center w-full truncate px-1"
                      style={{ fontSize: '8px', color }}>
                  {badge.name}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

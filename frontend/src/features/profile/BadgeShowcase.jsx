import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Search, BarChart2, Shield, Star, Cpu, Zap,
  MessageSquare, TrendingUp, Users, Calendar, Crown,
  Trophy, FileSearch, UserCheck, ThumbsUp, CalendarCheck,
  ShieldCheck, Globe, Link as LinkIcon, Plus,
} from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import GamificationService from '../../services/gamification.service';

const SLOT_COUNT = 3;

const ICON_MAP = {
  User: Award, Search, FileSearch, BarChart2, Shield, Star, Cpu,
  TrendingUp, MessageSquare, Zap, Link: LinkIcon, Award, Users,
  Calendar, CalendarCheck, ShieldCheck, ThumbsUp, UserCheck,
  Newspaper: Award, BookOpen: Award, Trophy, DollarSign: TrendingUp,
  Globe, Globe2: Globe, Microscope: Cpu, Music: Zap,
  Bird: Zap, Crown,
};

function getIcon(name) {
  return ICON_MAP[name] ?? Award;
}

/* Renk → tier (badge_definitions.py color değerleriyle eşleşir) */
function getTier(color = '') {
  if (!color || color.includes('text-muted')) return 1;
  if (color.includes('accent-blue') || color.includes('brand-primary')) return 2;
  if (color.includes('accent-amber') || color === '#f59e0b') return 3;
  if (color === '#a855f7') return 4;
  if (color === '#ef4444') return 5;
  return 2;
}

/* Tier → boyut */
const TIER_SIZE = { 1: 72, 2: 76, 3: 84, 4: 88, 5: 96 };
const TIER_ICON = { 1: 18, 2: 20, 3: 24, 4: 26, 5: 28 };
const TIER_BORDER = { 1: '1px solid', 2: '1.5px solid', 3: '2px solid', 4: '2px solid', 5: '2px solid' };
const TIER_CORNER = { 1: 0, 2: 10, 3: 14, 4: 16, 5: 18 };
const TIER_ANIM = { 1: '4s', 2: '3.5s', 3: '3s', 4: '3s', 5: '2.8s' };

/* Tier → arka plan gradyanı */
function bgGradient(color, tier) {
  const map = {
    1: `${color}08`,
    2: `linear-gradient(135deg, ${color}10, ${color}18)`,
    3: `linear-gradient(135deg, ${color}12, ${color}22, ${color}12)`,
    4: `linear-gradient(135deg, ${color}10, ${color}20, ${color}10)`,
    5: `linear-gradient(135deg, ${color}12, ${color}22, ${color}12)`,
  };
  return map[tier] ?? map[2];
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

function Corner({ size, color, all = false }) {
  if (!size) return null;
  const s = { position: 'absolute', width: size, height: size };
  const b = `2px solid ${color}`;
  const corners = [
    { top: 0, left: 0,      borderTop: b, borderLeft: b },
    { top: 0, right: 0,     borderTop: b, borderRight: b },
    { bottom: 0, left: 0,   borderBottom: b, borderLeft: b },
    { bottom: 0, right: 0,  borderBottom: b, borderRight: b },
  ];
  const show = all ? corners : [corners[0], corners[3]];
  return show.map((c, i) => <div key={i} style={{ ...s, ...c }} />);
}

function Dot({ color, size = 4, all = false }) {
  const pos = [
    { top: 4, left: 4 }, { top: 4, right: 4 },
    { bottom: 4, left: 4 }, { bottom: 4, right: 4 },
  ];
  const show = all ? pos : [pos[0], pos[3]];
  return show.map((p, i) => (
    <div key={i} style={{ position: 'absolute', width: size, height: size, background: color, ...p }} />
  ));
}

function Orb({ color }) {
  return (
    <div style={{
      position: 'absolute', width: '65%', height: '65%', borderRadius: '50%',
      background: `radial-gradient(circle, ${color}28 0%, transparent 70%)`,
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      animation: 'badge-orb 2s ease-in-out infinite',
    }} />
  );
}

function Ring({ color }) {
  return (
    <div style={{
      position: 'absolute', width: '75%', height: '75%', borderRadius: '50%',
      border: `1px solid ${color}30`,
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    }} />
  );
}

function DiagLines({ color }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(45deg, transparent 44%, ${color}15 50%, transparent 56%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(-45deg, transparent 44%, ${color}15 50%, transparent 56%)` }} />
    </>
  );
}

function CrossLines({ color }) {
  return (
    <>
      <div style={{ position: 'absolute', top: '50%', left: 4, right: 4, height: 1, background: `linear-gradient(90deg, transparent, ${color}45, transparent)` }} />
      <div style={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: 1, background: `linear-gradient(180deg, transparent, ${color}45, transparent)` }} />
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
    <>
      <style>{`
        @keyframes badge-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        @keyframes badge-orb {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes badge-glow {
          0%,100% { box-shadow: 0 0 6px 1px var(--bg), inset 0 0 10px var(--bg); }
          50%      { box-shadow: 0 0 16px 5px var(--bg), inset 0 0 18px var(--bg); }
        }
        .badge-slot-new:hover { transform: scale(1.1) translateY(-3px) !important; transition: transform 0.2s; }
      `}</style>

      <div>
        <p className="font-manrope font-bold text-sm mb-3"
           style={{ color: 'var(--color-text-primary)' }}>Rozetler</p>
        <div className="flex items-end gap-3 flex-wrap">
          {slots.map((badge, i) => {
            if (!badge) {
              return isOwnProfile ? (
                <Link
                  key={`empty-${i}`}
                  to="/badges"
                  className="flex flex-col items-center justify-center border border-dashed transition-all hover:border-solid hover:scale-105"
                  style={{ width: 76, height: 76, borderColor: 'var(--color-brand-primary)', color: 'var(--color-brand-primary)', opacity: 0.4 }}
                >
                  <Plus size={18} />
                  <span className="font-mono text-[9px] mt-1.5">Rozet</span>
                </Link>
              ) : null;
            }

            const raw   = badge.color;
            const color = resolveColor(raw);
            const tier  = getTier(raw);
            const size  = TIER_SIZE[tier];
            const iSize = TIER_ICON[tier];
            const cSize = TIER_CORNER[tier];
            const Icon  = getIcon(badge.icon);
            const allCorners = tier >= 3;
            const animDur = TIER_ANIM[tier];

            const boxShadow = tier >= 4
              ? undefined
              : undefined;

            const containerStyle = {
              width: size, height: size,
              border: TIER_BORDER[tier],
              borderColor: color,
              background: bgGradient(color, tier),
              position: 'relative',
              overflow: 'hidden',
              cursor: 'default',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: `badge-float ${animDur} ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
              ...(tier >= 4 && {
                '--bg': `${color}35`,
                animation: `badge-float ${animDur} ease-in-out infinite, badge-glow 2.5s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s, ${i * 0.3}s`,
              }),
            };

            return (
              <Tooltip key={badge.key} content={descMap[badge.key] ?? badge.name} side="top" maxWidth={220}>
                <div className="badge-slot-new" style={containerStyle}>
                  <Corner size={cSize} color={color} all={allCorners} />
                  {tier >= 3 && <Dot color={color} size={tier >= 5 ? 4 : 3} all={tier >= 5} />}
                  {tier >= 4 && <Orb color={color} />}
                  {tier >= 5 && <Ring color={color} />}
                  {tier >= 5 && <DiagLines color={color} />}
                  {tier === 4 && <CrossLines color={color} />}

                  <Icon
                    size={iSize}
                    style={{
                      color,
                      filter: tier >= 3 ? `drop-shadow(0 0 ${tier * 2}px ${color})` : 'none',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  />
                  <span
                    className="font-mono font-bold text-center w-full truncate px-1"
                    style={{
                      fontSize: tier >= 5 ? '8px' : '8px',
                      letterSpacing: tier >= 5 ? '0.5px' : 0,
                      fontWeight: tier >= 5 ? 900 : 700,
                      color,
                      marginTop: 5,
                      position: 'relative',
                      zIndex: 2,
                    }}
                  >
                    {badge.name}
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </>
  );
}

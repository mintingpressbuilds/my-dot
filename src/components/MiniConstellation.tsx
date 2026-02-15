'use client';

interface FriendDot {
  id: string;
  slug: string;
  name: string;
  color: string;
  mutual?: boolean;
}

interface MiniConstellationProps {
  friends: FriendDot[];
  centerColor: string;
  onFriendClick?: (slug: string) => void;
}

export default function MiniConstellation({ friends, centerColor, onFriendClick }: MiniConstellationProps) {
  if (friends.length === 0) return null;

  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 40;
  const dotRadius = 6;
  const centerRadius = 8;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
    >
      {/* connection lines */}
      {friends.map((f, i) => {
        const angle = (i / friends.length) * Math.PI * 2 - Math.PI / 2;
        const fx = cx + Math.cos(angle) * radius;
        const fy = cy + Math.sin(angle) * radius;
        return (
          <line
            key={`line-${f.id}`}
            x1={cx}
            y1={cy}
            x2={fx}
            y2={fy}
            stroke={f.color}
            strokeOpacity={f.mutual ? 0.2 : 0.08}
            strokeWidth={1}
          />
        );
      })}

      {/* center dot */}
      <circle cx={cx} cy={cy} r={centerRadius} fill={centerColor} opacity={0.8} />
      <circle cx={cx} cy={cy} r={centerRadius * 0.4} fill="#fff" opacity={0.9} />

      {/* friend dots */}
      {friends.map((f, i) => {
        const angle = (i / friends.length) * Math.PI * 2 - Math.PI / 2;
        const fx = cx + Math.cos(angle) * radius;
        const fy = cy + Math.sin(angle) * radius;
        return (
          <g
            key={f.id}
            onClick={() => onFriendClick?.(f.slug)}
            style={{ cursor: onFriendClick ? 'pointer' : 'default' }}
          >
            <circle
              cx={fx}
              cy={fy}
              r={dotRadius}
              fill={f.color}
              opacity={f.mutual ? 0.9 : 0.6}
            />
            <circle
              cx={fx}
              cy={fy}
              r={dotRadius * 0.35}
              fill="#fff"
              opacity={f.mutual ? 0.8 : 0.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

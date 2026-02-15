import { PALETTE, VIBES } from './colors';
import type { Vibe } from './colors';

export interface DotData {
  id: number;
  name: string;
  color: string;
  line: string;
  vibe: Vibe;
  link: string;
  px: number;
  py: number;
  pz: number;
  hx: number;
  hy: number;
  hz: number;
  vx: number;
  vy: number;
  vz: number;
  friends: number[];
  grabbed: boolean;
}

const NAMES = [
  'kai','luna','sage','river','ember','nova','wren','atlas','iris','orion',
  'maya','felix','jade','leo','cleo','milo','aria','sol','zara','finn',
  'rosa','alex','eden','juno','theo','lila','omar','noa','sky','ren',
  'nina','cole','ivy','max','eva','sam','drew','jules','rain','ash',
  'liv','nell','kira','tao','vera','nico','lea','otto','mara','yuki',
  'zoe','remy','alba','lars','faye','moss','cora','beau','esme','kit',
  'opal','rhys','tess','wolf','ari','cruz','dara','elio','gael','hana',
  'idris','jace','lark','mika','suki','bria','yael','lux','asa','rue',
  'lyra','cass','moe','pax','zia','jin','uri','dag','pip','neo',
  'aya','zen','ike','oak','cal','emi','jan','lex','val',
];

const PHRASES = [
  'building something nobody asked for',
  'running on coffee and vibes',
  'probably outside',
  'lost in a rabbit hole',
  'making things that glow',
  'somewhere between here and there',
  'collecting sunsets',
  'too many browser tabs',
  'chasing the feeling',
  'learning to slow down',
  'night owl energy',
  'garden variety human',
  'thinking about the ocean',
  'always curious never bored',
  'one more commit',
  'permanent beginner',
  'overwatering my plants',
  'forgetting to eat lunch',
  'museum legs',
  'in my reading era',
  'half-finished playlists',
  '3am ideas',
];

export function generateDots(count: number = 250): DotData[] {
  const dots: DotData[] = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 20 + Math.random() * 80;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    dots.push({
      id: i,
      name: NAMES[i % NAMES.length],
      color: PALETTE[~~(Math.random() * PALETTE.length)],
      line: PHRASES[~~(Math.random() * PHRASES.length)],
      vibe: VIBES[~~(Math.random() * VIBES.length)],
      link: '',
      px: x, py: y, pz: z,
      hx: x, hy: y, hz: z,
      vx: 0, vy: 0, vz: 0,
      friends: [],
      grabbed: false,
    });
  }

  // assign 1-3 random friends per dot
  for (let i = 0; i < dots.length; i++) {
    const n = 1 + ~~(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const fi = ~~(Math.random() * dots.length);
      if (fi !== i) dots[i].friends.push(fi);
    }
  }

  return dots;
}

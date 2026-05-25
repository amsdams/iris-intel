import type {IntelEntityData, IntelMapData, IntelTeam, PortalDetailsData} from './parsers/intel-types';
import type {Field, Link, Plext, Portal} from './store';

export interface MockPortalEntityOptions {
  guid?: string;
  timestamp?: number;
  team?: IntelTeam;
  latE6?: number;
  lngE6?: number;
  level?: number;
  health?: number;
  resCount?: number;
  image?: string;
  name?: string;
  ornaments?: string[];
  visited?: boolean;
  captured?: boolean;
  scoutControlled?: string;
  address?: string;
  ownerGuid?: string;
  ownerTeam?: string;
  history?: number;
}

export interface MockLinkEntityOptions {
  guid?: string;
  timestamp?: number;
  team?: IntelTeam;
  fromPortalGuid?: string;
  fromLatE6?: number;
  fromLngE6?: number;
  toPortalGuid?: string;
  toLatE6?: number;
  toLngE6?: number;
}

export interface MockFieldEntityOptions {
  guid?: string;
  timestamp?: number;
  team?: IntelTeam;
  anchors?: [string, number, number][];
}

export interface MockPortalDetailsOptions extends MockPortalEntityOptions {
  mods?: [string, string, string, Record<string, string>][];
  resonators?: [string, number, number][];
  owner?: string;
  hasMissionsStartingHere?: boolean;
}

export interface MockPlextOptions {
  id?: string;
  time?: number;
  text?: string;
  team?: string;
  categories?: number;
  type?: Plext['type'];
  player?: string;
  portalName?: string;
  latE6?: number;
  lngE6?: number;
  markup?: Plext['markup'];
}

export function mockIntelMapData(
  gameEntities: [string, number, IntelEntityData][],
  tileKey = 'tile_key',
): IntelMapData {
  return {
    result: {
      map: {
        [tileKey]: {gameEntities},
      },
    },
  };
}

export function mockIntelPortalEntity(options: MockPortalEntityOptions = {}): [string, number, IntelEntityData] {
  const {
    guid = 'portal_guid',
    timestamp = 123456789,
    team = 'E',
    latE6 = 52038381,
    lngE6 = 4368969,
    level = 5,
    health = 100,
    resCount = 8,
    image = 'ImageUrl',
    name = 'Portal',
    ornaments = [],
    visited = false,
    captured = false,
    scoutControlled = '',
    address = 'address',
    ownerGuid = 'owner_guid',
    ownerTeam = 'team',
    history = 0,
  } = options;

  return [
    guid,
    timestamp,
    [
      'p',
      team,
      latE6,
      lngE6,
      level,
      health,
      resCount,
      image,
      name,
      ornaments,
      visited,
      captured,
      scoutControlled,
      address,
      0,
      0,
      ownerGuid,
      ownerTeam,
      history,
    ],
  ];
}

export function mockIntelLinkEntity(options: MockLinkEntityOptions = {}): [string, number, IntelEntityData] {
  const {
    guid = 'link_guid',
    timestamp = 123456789,
    team = 'E',
    fromPortalGuid = 'from_portal_guid',
    fromLatE6 = 52038381,
    fromLngE6 = 4368969,
    toPortalGuid = 'to_portal_guid',
    toLatE6 = 52035845,
    toLngE6 = 4366433,
  } = options;

  return [
    guid,
    timestamp,
    ['e', team, fromPortalGuid, fromLatE6, fromLngE6, toPortalGuid, toLatE6, toLngE6],
  ];
}

export function mockIntelFieldEntity(options: MockFieldEntityOptions = {}): [string, number, IntelEntityData] {
  const {
    guid = 'field_guid',
    timestamp = 123456789,
    team = 'R',
    anchors = [
      ['p1_guid', 52026035, 4371883],
      ['p2_guid', 52023990, 4367998],
      ['p3_guid', 52024231, 4374069],
    ],
  } = options;

  return [guid, timestamp, ['r', team, anchors]];
}

export function mockPortalDetailsData(options: MockPortalDetailsOptions = {}): PortalDetailsData {
  const portal = mockIntelPortalEntity(options)[2] as Extract<IntelEntityData, ['p', ...unknown[]]>;
  return {
    result: [
      'p',
      portal[1],
      portal[2],
      portal[3],
      portal[4],
      portal[5],
      portal[6],
      portal[7],
      portal[8],
      portal[9],
      Boolean(options.hasMissionsStartingHere),
      false,
      portal[12],
      portal[13],
      options.mods ?? [],
      options.resonators ?? [],
      options.owner ?? 'owner',
      '',
      portal[18],
    ],
  };
}

export function mockPortal(options: Partial<Portal> = {}): Portal {
  return {
    id: 'portal-a',
    lat: 52,
    lng: 4,
    team: 'E',
    ...options,
  };
}

export function mockLink(options: Partial<Link> = {}): Link {
  return {
    id: 'link-a',
    fromPortalId: 'portal-a',
    toPortalId: 'portal-b',
    team: 'E',
    fromLat: 52,
    fromLng: 4,
    toLat: 53,
    toLng: 5,
    ...options,
  };
}

export function mockField(options: Partial<Field> = {}): Field {
  return {
    id: 'field-a',
    team: 'E',
    points: [
      {portalId: 'portal-a', lat: 52, lng: 4},
      {portalId: 'portal-b', lat: 53, lng: 5},
      {portalId: 'portal-c', lat: 54, lng: 6},
    ],
    ...options,
  };
}

export function mockPlext(options: MockPlextOptions = {}): Plext {
  const {
    id = 'plext-1',
    time = 1000,
    text = ' deployed a Resonator on ',
    team = 'E',
    categories = 1,
    type = 'PLAYER_GENERATED',
    player = 'agent',
    portalName = 'Portal A',
    latE6 = 52000000,
    lngE6 = 4000000,
    markup,
  } = options;

  return {
    id,
    time,
    text,
    team,
    categories,
    type,
    markup: markup ?? [
      ['PLAYER', {plain: player, team}],
      ['TEXT', {plain: text}],
      ['PORTAL', {name: portalName, latE6, lngE6}],
    ],
  };
}

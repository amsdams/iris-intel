import { describe, it, expect } from 'vitest';
import { EntityParser } from './EntityParser';
import { IntelMapData, IntelEntityData } from './intel-types';

describe('EntityParser', () => {
  it('should extract portals from links even if they are not in gameEntities as portals', () => {
    const data: IntelMapData = {
      result: {
        map: {
          "tile_key": {
            gameEntities: [
              [
                "link_guid",
                123456789,
                [
                  "e",
                  "E",
                  "from_portal_guid",
                  52038381,
                  4368969,
                  "to_portal_guid",
                  52035845,
                  4366433
                ] as unknown as IntelEntityData
              ]
            ]
          }
        }
      }
    };

    const { portals, links } = EntityParser.parse(data);

    expect(links).toHaveLength(1);
    expect(portals).toHaveLength(2);
    
    const fromPortal = portals.find(p => p.id === 'from_portal_guid');
    expect(fromPortal).toBeDefined();
    expect(fromPortal?.lat).toBe(52.038381);
    expect(fromPortal?.lng).toBe(4.368969);
    expect(fromPortal?.team).toBe('E');

    const toPortal = portals.find(p => p.id === 'to_portal_guid');
    expect(toPortal).toBeDefined();
    expect(toPortal?.lat).toBe(52.035845);
    expect(toPortal?.lng).toBe(4.366433);
    expect(toPortal?.team).toBe('E');
  });

  it('should extract portals from fields', () => {
    const data: IntelMapData = {
      result: {
        map: {
          "tile_key": {
            gameEntities: [
              [
                "field_guid",
                123456789,
                [
                  "r",
                  "R",
                  [
                    ["p1_guid", 52026035, 4371883],
                    ["p2_guid", 52023990, 4367998],
                    ["p3_guid", 52024231, 4374069]
                  ]
                ] as unknown as IntelEntityData
              ]
            ]
          }
        }
      }
    };

    const { portals, fields } = EntityParser.parse(data);

    expect(fields).toHaveLength(1);
    expect(portals).toHaveLength(3);
    
    expect(portals.map(p => p.id)).toContain('p1_guid');
    expect(portals.map(p => p.id)).toContain('p2_guid');
    expect(portals.map(p => p.id)).toContain('p3_guid');
  });

  it('should not overwrite detailed portal data with placeholder data', () => {
    const data: IntelMapData = {
      result: {
        map: {
          "tile_key": {
            gameEntities: [
              [
                "portal_guid",
                123456789,
                [
                  "p",
                  "E",
                  52038381,
                  4368969,
                  5, // level
                  100, // health
                  8, // resCount
                  "ImageUrl",
                  "Name",
                  [], // ornaments
                  true, // visited
                  false, // captured
                  "scout", // scoutControlled
                  "address",
                  0, // unknown
                  0, // unknown
                  "guid",
                  "team",
                  1 // history
                ] as unknown as IntelEntityData
              ],
              [
                "link_guid",
                123456789,
                [
                  "e",
                  "E",
                  "portal_guid",
                  52038381,
                  4368969,
                  "other_guid",
                  52035845,
                  4366433
                ] as unknown as IntelEntityData
              ]
            ]
          }
        }
      }
    };

    const { portals } = EntityParser.parse(data);

    expect(portals).toHaveLength(2);
    const portal = portals.find(p => p.id === 'portal_guid');
    expect(portal?.level).toBe(5); // Should have data from 'p' entity
    expect(portal?.visited).toBe(true);
    expect(portal?.captured).toBe(false);
    expect(portal?.scanned).toBe(true);
    expect(portal?.scoutControlled).toBe(true);
  });

  it('should parse direct portal history flags from map entities without history bits', () => {
    const data: IntelMapData = {
      result: {
        map: {
          "tile_key": {
            gameEntities: [
              [
                "direct_history_portal_guid",
                123456789,
                [
                  "p",
                  "E",
                  52038381,
                  4368969,
                  5,
                  100,
                  8,
                  "ImageUrl",
                  "Name",
                  [],
                  false,
                  true,
                  "",
                  "address",
                  0,
                  0,
                  "guid",
                  "team"
                ] as unknown as IntelEntityData
              ]
            ]
          }
        }
      }
    };

    const { portals } = EntityParser.parse(data);
    const portal = portals.find(p => p.id === 'direct_history_portal_guid');

    expect(portal?.visited).toBe(false);
    expect(portal?.captured).toBe(true);
    expect(portal?.scanned).toBe(false);
    expect(portal?.scoutControlled).toBe(false);
  });

  it('should parse portal history bits for visited captured and scanned', () => {
    const data: IntelMapData = {
      result: {
        map: {
          "tile_key": {
            gameEntities: [
              [
                "history_portal_guid",
                123456789,
                [
                  "p",
                  "R",
                  52038381,
                  4368969,
                  6,
                  95,
                  8,
                  "ImageUrl",
                  "History Portal",
                  [],
                  false,
                  false,
                  "scout",
                  "address",
                  0,
                  0,
                  "guid",
                  "team",
                  7
                ] as unknown as IntelEntityData
              ]
            ]
          }
        }
      }
    };

    const { portals } = EntityParser.parse(data);
    const portal = portals.find(p => p.id === 'history_portal_guid');

    expect(portal?.visited).toBe(true);
    expect(portal?.captured).toBe(true);
    expect(portal?.scanned).toBe(true);
    expect(portal?.scoutControlled).toBe(true);
  });
});

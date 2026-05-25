import { describe, it, expect } from 'vitest';
import { EntityParser } from './EntityParser';
import {mockIntelFieldEntity, mockIntelLinkEntity, mockIntelMapData, mockIntelPortalEntity} from '../mock-intel';

describe('EntityParser', () => {
  it('should extract portals from links even if they are not in gameEntities as portals', () => {
    const data = mockIntelMapData([mockIntelLinkEntity()]);

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
    const data = mockIntelMapData([mockIntelFieldEntity()]);

    const { portals, fields } = EntityParser.parse(data);

    expect(fields).toHaveLength(1);
    expect(portals).toHaveLength(3);
    
    expect(portals.map(p => p.id)).toContain('p1_guid');
    expect(portals.map(p => p.id)).toContain('p2_guid');
    expect(portals.map(p => p.id)).toContain('p3_guid');
  });

  it('should not overwrite detailed portal data with placeholder data', () => {
    const data = mockIntelMapData([
      mockIntelPortalEntity({
        guid: 'portal_guid',
        name: 'Name',
        visited: true,
        captured: false,
        scoutControlled: 'scout',
        ownerGuid: 'guid',
        history: 1,
      }),
      mockIntelLinkEntity({fromPortalGuid: 'portal_guid', toPortalGuid: 'other_guid'}),
    ]);

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
    const data = mockIntelMapData([
      mockIntelPortalEntity({
        guid: 'direct_history_portal_guid',
        captured: true,
        history: 0,
      }),
    ]);

    const { portals } = EntityParser.parse(data);
    const portal = portals.find(p => p.id === 'direct_history_portal_guid');

    expect(portal?.visited).toBe(false);
    expect(portal?.captured).toBe(true);
    expect(portal?.scanned).toBe(false);
    expect(portal?.scoutControlled).toBe(false);
  });

  it('should parse portal history bits for visited captured and scanned', () => {
    const data = mockIntelMapData([
      mockIntelPortalEntity({
        guid: 'history_portal_guid',
        team: 'R',
        level: 6,
        health: 95,
        name: 'History Portal',
        scoutControlled: 'scout',
        history: 7,
      }),
    ]);

    const { portals } = EntityParser.parse(data);
    const portal = portals.find(p => p.id === 'history_portal_guid');

    expect(portal?.visited).toBe(true);
    expect(portal?.captured).toBe(true);
    expect(portal?.scanned).toBe(true);
    expect(portal?.scoutControlled).toBe(true);
  });
});

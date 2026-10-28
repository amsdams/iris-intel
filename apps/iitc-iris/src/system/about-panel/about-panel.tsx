import {h, type ComponentChildren} from 'preact';
import {ClearButton} from '../../ui/clear-button';
import {Panel, PanelBody, PanelHeader, PanelTitle} from '../../ui/panel';
import {Section} from '../../ui/section';
import iitcLicense from '../../../assets/licenses/IITC-CE.txt?raw';
import leafletLicense from '../../../assets/licenses/Leaflet.txt?raw';
import preactLicense from '../../../../../node_modules/preact/LICENSE?raw';
import maplibreLicense from '../../../../../node_modules/maplibre-gl/LICENSE.txt?raw';
import maplibreLeafletLicense from '../../../../../node_modules/@maplibre/maplibre-gl-leaflet/LICENSE?raw';
import projectLicense from '../../../../../LICENSE?raw';
import './about-panel.css';

const REPOSITORY = 'https://github.com/amsdams/iris-intel';
const IITC = 'https://github.com/IITC-CE/ingress-intel-total-conversion';

function SourceLink({href, children}: {href: string; children: ComponentChildren}): h.JSX.Element {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function AboutPanel({closeAbout}: {closeAbout: () => void}): h.JSX.Element {
  return (
    <Panel aria-label="About IRIS" className="iitc-iris-about-panel">
      <PanelHeader>
        <PanelTitle>About IRIS</PanelTitle>
        <span className="iitc-iris-panel-header-actions">
          <ClearButton onClick={closeAbout} title="Close about" aria-label="Close about" />
        </span>
      </PanelHeader>
      <PanelBody>
        <Section>
          <p>IRIS is an independent Ingress Intel companion, built on the work of the IITC community.</p>
          <p><SourceLink href={REPOSITORY}>Source code</SourceLink>{' · '}
            <SourceLink href={`${REPOSITORY}/releases/tag/latest`}>Releases</SourceLink>{' · '}
            <SourceLink href={`${REPOSITORY}/issues`}>Report an issue</SourceLink></p>
          <p>Not affiliated with or endorsed by Niantic.</p>
        </Section>
        <Section titleHeading="Credits">
          <p>Thank you to <SourceLink href={IITC}>IITC and IITC-CE</SourceLink>, Stefan Breunig,
            Jon Atkins, and all their contributors and maintainers for the foundation, map behavior and assets.</p>
          <p>Our feature ports and adaptations draw on plugins by breunigs (Draw Tools and Player Activity Tracker),
            jonatkins (Missions), mcben (Cross Links), yenky (Portal Count), teo96 (Portals List),
            Costaspap (Localized Scoreboard), rongou (Portal Level Numbers), xelio (Keys and Keys on Map),
            vita10gy (level and recharge highlighters), and Johtaja (portal history highlighter).</p>
          <p>Inventory behavior was also informed by Live Inventory by EisFrei and DanielOnDiordna,
            and KuKuInventory by elkuku.</p>
          <p>Built with Preact, Leaflet and MapLibre. Maps provided by OpenFreeMap and OpenStreetMap contributors;
            provider attribution is also shown on the map.</p>
          <p><SourceLink href={`${REPOSITORY}/blob/main/CREDITS.md`}>Full credits and original sources</SourceLink></p>
        </Section>
        <Section titleHeading="Licenses">
          <p>IRIS is distributed under GPL-3.0. Third-party code and assets retain their own notices below.</p>
          {[
            ['IRIS — GPL-3.0', projectLicense],
            ['IITC / IITC-CE — ISC', iitcLicense],
            ['Leaflet — BSD-2-Clause', leafletLicense],
            ['Preact — MIT', preactLicense],
            ['MapLibre GL JS — license and bundled notices', maplibreLicense],
            ['MapLibre GL Leaflet — ISC', maplibreLeafletLicense],
          ].map(([label, text]) => (
            <details key={label}>
              <summary>{label}</summary>
              <pre>{text}</pre>
            </details>
          ))}
        </Section>
      </PanelBody>
    </Panel>
  );
}

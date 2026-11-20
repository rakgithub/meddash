import { BODY_REGIONS, type BodyRegion } from "../../utils/bodyRegions";
import styles from "./BodyMap.module.css";

interface BodyMapProps {
  onSelect: (region: BodyRegion) => void;
}

/**
 * A way to start without the words for a symptom. The outline is decoration; the regions are real buttons,
 * and on a small screen they become a plain list.
 */
export function BodyMap({ onSelect }: BodyMapProps) {
  return (
    <section className={styles.root} aria-labelledby="body-map-heading">
      <h3 id="body-map-heading" className={styles.heading}>
        Or show me where it bothers you
      </h3>
      <div className={styles.stage}>
        <svg className={styles.outline} viewBox="0 0 240 460" aria-hidden="true" focusable="false">
          <circle cx="120" cy="44" r="30" />
          <rect x="108" y="72" width="24" height="26" rx="6" />
          <path d="M86 112Q86 98 108 98H132Q154 98 154 112L150 250H90Z" />
          <rect x="58" y="104" width="22" height="134" rx="11" />
          <rect x="160" y="104" width="22" height="134" rx="11" />
          <rect x="90" y="256" width="29" height="192" rx="14" />
          <rect x="121" y="256" width="29" height="192" rx="14" />
        </svg>
        <ul className={styles.regions}>
          {BODY_REGIONS.map((region) => (
            <li key={region.id} className={`${styles.region} ${styles[region.id]}`}>
              <button className={styles.button} type="button" onClick={() => onSelect(region)}>
                <span className={styles.dot} aria-hidden="true" />
                {region.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

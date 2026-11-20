import type { Facets } from "../../types";
import { formatPrice } from "../../utils/formatPrice";
import styles from "./PriceHistogram.module.css";

interface PriceHistogramProps {
  spread: NonNullable<Facets["price"]>;
  /** The applied price range, as filter strings; bars inside it are highlighted. */
  min: string;
  max: string;
}

const HEIGHT = 36;
const BAR = 10;
const GAP = 3;

/** How many products sit at each price, so a range can be picked by eye. */
export function PriceHistogram({ spread, min, max }: PriceHistogramProps) {
  const low = min ? Number(min) : -Infinity;
  const high = max ? Number(max) : Infinity;
  const tallest = Math.max(...spread.buckets.map((b) => b.count));
  const width = spread.buckets.length * (BAR + GAP) - GAP;

  return (
    <div className={styles.histogram}>
      {/* "none" stretches the bars to the column width instead of centring a small drawing. */}
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={styles.chart}
        aria-hidden="true"
      >
        {spread.buckets.map((b, i) => {
          const height = b.count === 0 ? 2 : Math.max(4, (b.count / tallest) * HEIGHT);
          const inRange = b.to >= low && b.from <= high;
          return (
            <rect
              key={b.from}
              x={i * (BAR + GAP)}
              y={HEIGHT - height}
              width={BAR}
              height={height}
              className={inRange && b.count > 0 ? styles.inRange : styles.bar}
            />
          );
        })}
      </svg>
      <p className={styles.caption}>
        {formatPrice(spread.min)} – {formatPrice(spread.max)}
      </p>
    </div>
  );
}

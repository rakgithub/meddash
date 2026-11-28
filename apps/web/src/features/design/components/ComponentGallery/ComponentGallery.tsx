import {
  Badge,
  Button,
  Chip,
  IconButton,
  Notice,
  SearchField,
  TextField,
} from "@meddash/design-system/components";
import { useState, type ReactNode } from "react";
import styles from "./ComponentGallery.module.css";

const PLUS = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 8h9M8 3.5v9" />
  </svg>
);
const ARROW = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 16V4M5 9l5-5 5 5" />
  </svg>
);

function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className={styles.specimen}>
      <h3 className={styles.name}>{name}</h3>
      <div className={styles.states}>{children}</div>
    </div>
  );
}

/** Every `@meddash/design-system` component in each of its states, in the current theme. */
export function ComponentGallery() {
  const [category, setCategory] = useState("allergy");

  return (
    <div className={styles.gallery}>
      <Specimen name="Button">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
        <Button busy>Placing order…</Button>
        <Button href="/design" variant="secondary">
          As a link
        </Button>
      </Specimen>

      <Specimen name="IconButton">
        <IconButton label="Increase (ghost)" icon={PLUS} />
        <IconButton label="Increase (small)" size="sm" icon={PLUS} />
        <IconButton label="Send" variant="primary" size="sm" icon={ARROW} />
        <IconButton label="Send (disabled)" variant="primary" size="sm" icon={ARROW} disabled />
      </Specimen>

      <Specimen name="Chip">
        {["allergy", "sleep"].map((slug) => (
          <Chip
            key={slug}
            pressed={category === slug}
            meta={slug === "allergy" ? 12 : 4}
            onClick={() => setCategory(slug)}
          >
            {slug === "allergy" ? "Allergy" : "Sleep"}
          </Chip>
        ))}
        <Chip variant="accent">A few days</Chip>
        <Chip disabled>Disabled</Chip>
      </Specimen>

      <Specimen name="Badge">
        <Badge>Cancelled</Badge>
        <Badge tone="accent">Paid</Badge>
        <Badge tone="caution">Awaiting payment</Badge>
        <Badge tone="danger">Payment failed</Badge>
        <Badge variant="count" label="3 items">
          {3}
        </Badge>
        <Badge variant="count" label="120 items">
          {120}
        </Badge>
      </Specimen>

      <Specimen name="TextField and SearchField">
        <div className={styles.fields}>
          <TextField
            label="Email"
            placeholder="you@example.com"
            hint="We send your receipt here."
          />
          <TextField
            label="Password"
            type="password"
            defaultValue="short"
            error="Use at least 8 characters."
          />
          <TextField label="Disabled" disabled defaultValue="Can't change this" />
          <SearchField label="Search medicines" placeholder="Name or symptom" />
        </div>
      </Specimen>

      <Specimen name="Notice">
        <div className={styles.notices}>
          <Notice tone="info" title="Good to know">
            Take it with food to settle your stomach.
          </Notice>
          <Notice tone="caution" title="Check with a pharmacist first">
            It can interact with blood thinners.
          </Notice>
          <Notice tone="danger" title="Call 112 now">
            Chest pain with breathlessness needs help straight away.
          </Notice>
        </div>
      </Specimen>
    </div>
  );
}

import type { MessagePart } from "../types";

type AlertPart = Extract<MessagePart, { kind: "alert" }>;

interface RedFlag {
  /** What the user described, as it is named back to them. */
  label: string;
  match: (text: string) => boolean;
  body?: string;
}

const pattern = (re: RegExp) => (text: string) => re.test(text);

const DEFAULT_BODY =
  "Please don’t wait to see if it gets better. Call 112 now if it is sudden or severe, " +
  "otherwise contact your GP or the out-of-hours service (116 117) today.";

/**
 * Symptoms that need a doctor, not a product. Matching errs on the side of caution: "no chest pain"
 * still matches, because a missed emergency costs far more than an unneeded warning.
 */
const RED_FLAGS: RedFlag[] = [
  {
    label: "chest pain",
    match: pattern(/chest (?:pain|tight|pressure|hurts)|pain in (?:my|the) chest/i),
  },
  {
    label: "trouble breathing",
    match: pattern(
      /(?:can'?t|cannot|trouble|difficulty|hard to|struggling to) (?:breath|catch my breath)|short(?:ness)? of breath|breathless/i,
    ),
  },
  {
    label: "signs of a stroke",
    match: pattern(/stroke|droop|slurred speech|(?:numb|weak)(?:ness)? on one side/i),
  },
  {
    label: "a fever in a baby",
    match: (text) =>
      /\b(?:baby|infant|newborn|\d+[- ]?(?:week|month)s?[- ]old)\b/i.test(text) &&
      /fever|temperature|\bhot\b/i.test(text),
  },
  {
    label: "blood in vomit or stool",
    match: pattern(
      /(?:blood|bloody).{0,25}(?:vomit|sick|stool|poo|diarrh)|(?:vomit|stool|poo)\w*.{0,25}blood|black,? tarry/i,
    ),
  },
  {
    label: "thoughts of suicide or self-harm",
    match: pattern(
      /suicid|kill myself|end (?:my life|it all)|want to die|self[- ]harm|hurt(?:ing)? myself/i,
    ),
    body:
      "You don’t have to go through this alone. Call 112 if you are in danger now. " +
      "The Telefonseelsorge is free and open day and night on 0800 111 0 111.",
  },
];

/** The urgent alert for the first red flag in the user's text, or nothing if there is none. */
export function redFlagAlert(text: string): AlertPart | undefined {
  const flag = RED_FLAGS.find((f) => f.match(text));
  if (!flag) return undefined;
  return {
    kind: "alert",
    level: "urgent",
    title: `This needs a doctor now: you mentioned ${flag.label}`,
    body: flag.body ?? DEFAULT_BODY,
  };
}

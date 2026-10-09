import { Fragment, type ElementType } from "react";

/**
 * Heading whose words fly in one by one when it scrolls into view (like generation.x5.ru).
 * Works with the global <Reveal/> observer via data-reveal; without JS the text is simply visible.
 * Wrap words in *asterisks* to give them the gold accent — one word or several: «*как мы строим*».
 */
export function Words({ text, as: Tag = "h2", className = "title title--lg" }: { text: string; as?: ElementType; className?: string }) {
  const words = text.split(" ");
  let inAccent = false;
  const parts = words.map((w) => {
    const starts = w.startsWith("*");
    const ends = w.endsWith("*") && (w.length > 1 || !starts);
    const accent = inAccent || starts;
    if (starts && !ends) inAccent = true;
    if (ends) inAccent = false;
    return { accent, word: w.replace(/^\*|\*$/g, "") };
  });
  return (
    <Tag className={`${className} words`} data-reveal aria-label={text.replace(/\*/g, "")}>
      {parts.map(({ accent, word }, i) => {
        return (
          <Fragment key={i}>
            <span className="w" aria-hidden style={{ ["--i" as string]: i }}>
              <span className={accent ? "accent" : undefined}>{word}</span>
            </span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </Tag>
  );
}

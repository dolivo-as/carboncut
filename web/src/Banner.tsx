import { FACTOR_VERSION } from "@calc/factors";

/** Synlig merking av testversjon. Ikke role=alert – det er ingen alarm ved lasting. */
export function Banner() {
  return (
    <div className="banner">
      Testversjon – estimerte tall, faktorversjon {FACTOR_VERSION}
    </div>
  );
}

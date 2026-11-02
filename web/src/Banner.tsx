import { FACTOR_VERSION } from "@calc/factors";

export function Banner() {
  return (
    <div role="alert" className="bg-amber-400 text-amber-950 px-4 py-3 text-center font-semibold">
      Testversjon – estimerte tall, faktorversjon {FACTOR_VERSION}
    </div>
  );
}

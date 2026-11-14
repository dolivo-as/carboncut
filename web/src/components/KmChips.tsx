import { KM_HURTIGVALG } from "../flowLogic";
import { parseNum } from "../format";

export function KmChips({ value, onPick }: { value: string; onPick: (km: number) => void }) {
  const n = parseNum(value);
  return (
    <div className="qk" role="group" aria-label="Hurtigvalg for kilometer">
      {KM_HURTIGVALG.map((km) => (
        <button
          key={km}
          type="button"
          aria-pressed={n === km}
          onClick={() => onPick(km)}
        >
          {km}
        </button>
      ))}
    </div>
  );
}

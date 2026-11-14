import { fmtDate } from "../format";
import { Qr } from "./Qr";

/** Tekst på A4-plakaten. Stegene følger lenkeflyten (LinkTrip): reisemåte → «Neste» → avstand → «Send inn». */
export const PLAKAT_TEKST = {
  tittel: "Registrer jobbreisen din",
  steg: [
    "Skann QR-koden med kameraet på mobilen.",
    "Velg reisemåte og trykk «Neste».",
    "Skriv inn avstanden én vei og trykk «Send inn».",
  ],
  personvern: "Bare jobbreiser. Du trenger ikke logge inn, og navnet ditt lagres ikke.",
  lenkeIntro: "Kan du ikke skanne? Skriv inn adressen:",
} as const;

/**
 * Utskriftsvennlig A4-plakat (én side): prosjektnavn, stor QR-kode, tre steg og lenken som tekst.
 * Vises bare ved utskrift (body.skriver-plakat, se index.css). Alltid svart på hvitt, uavhengig av tema.
 */
export function Plakat({ navn, url, gyldigTil }: { navn: string; url: string; gyldigTil: string }) {
  return (
    <div className="plakat" data-testid="plakat">
      <p className="plakat-merke">CarbonCut</p>
      <h1 className="plakat-tittel">{PLAKAT_TEKST.tittel}</h1>
      <p className="plakat-prosjekt">{navn}</p>
      <Qr text={url} label={`QR-kode for registrering på ${navn}`} border={4} className="plakat-qr" />
      <ol className="plakat-steg">
        {PLAKAT_TEKST.steg.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p className="plakat-personvern">{PLAKAT_TEKST.personvern}</p>
      <p className="plakat-lenke"><span>{PLAKAT_TEKST.lenkeIntro}</span><br />{url}</p>
      <p className="plakat-gyldig">Gyldig til {fmtDate(gyldigTil)}</p>
    </div>
  );
}

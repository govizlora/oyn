import { ceramic } from "@oyn/ceramic";
import { useSurface } from "@oyn/surface";
import "./card.css";

export function Card() {
  const ref = useSurface({ appearance: ceramic, props: {} });
  return (
    <section className="sculpture-page card-page" aria-labelledby="card-title">
      <header className="sculpture-heading">
        <div>
          <a href="./" className="sculpture-logo">
            oyn
          </a>
          <span>SURFACE / CERAMIC</span>
        </div>
      </header>
      <div className="sculpture-title">
        <h1 id="card-title">Card</h1>
      </div>
      <div className="card-stage">
        <div className="card-specimen" ref={ref} />
      </div>
    </section>
  );
}

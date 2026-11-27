import { Article } from "../../article";
import { pageMeta } from "../../meta";
export const metadata = pageMeta(
  "About OYN — WebGPU materials for native HTML",
  "Explore Ceramic and Particle, two WebGPU materials for native HTML elements. Use OYN with plain DOM or React.",
  "/about/",
);
export default function About() {
  return (
    <Article>
      <h1>UI you can feel</h1>
      <p>
        OYN brings WebGPU materials to native HTML. A button keeps its text,
        keyboard focus, and click behavior while a shader draws its surface. Use
        OYN with plain DOM or React.
      </p>
      <h2>Materials</h2>
      <dl>
        <dt>Ceramic</dt>
        <dd>
          Raise a button to catch the light, or recess a track to hold a shadow.
        </dd>
        <dt>Particle</dt>
        <dd>
          Show loading content as fine grains that scatter when the content is
          ready.
        </dd>
      </dl>
      <p>
        OYN is a work in progress. <a href="/">Try the Ceramic study</a>, or
        <a href="https://github.com/govizlora/oyn">
          explore the source on GitHub
        </a>
        .
      </p>
    </Article>
  );
}

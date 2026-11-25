import { useState } from "react";
import { createRoot } from "react-dom/client";
import { OynProvider } from "oyn/react";
import { ReliefLogo } from "@oyn/ui/relief-logo";
import svg from "@oyn/ui/relief-logo.svg?url";

function Study() {
  const [angle, setAngle] = useState(0);
  return <main style={{margin:"auto",maxWidth:1120,padding:"clamp(20px,5vw,72px)",fontFamily:"Helvetica Neue,Arial,sans-serif",color:"#202020",background:"white"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",borderBottom:"1px solid #ccc",paddingBottom:16}}>
      <a href="./" style={{color:"inherit"}}>OYN / Atelier</a><span>Brand study</span>
    </header>
    <h1 style={{fontWeight:400,letterSpacing:"-.06em",fontSize:"clamp(32px,5vw,64px)"}}>Mountain relief</h1>
    <OynProvider><ReliefLogo lightAngle={angle}/></OynProvider>
    <footer style={{display:"flex",flexWrap:"wrap",justifyContent:"space-between",gap:18,borderTop:"1px solid #ccc",paddingTop:20}}>
      <label>Light angle　<input type="range" min="-180" max="180" value={angle} onChange={e=>setAngle(+e.target.value)}/>　{angle}°</label>
      <a style={{color:"inherit"}} href={svg} download="oyn-relief.svg">Download vector master</a>
    </footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Study/>);

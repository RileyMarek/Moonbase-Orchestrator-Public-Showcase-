/** Resolution-independent instrumentation and custom A.S.T.R.O lettering. */
export function Wordmark() {
  return <svg className="astro-wordmark" viewBox="0 0 642 74" aria-hidden="true">
    <g fill="currentColor">
      <path d="M0 70 43 2H55L100 70H82L48 19 17 70Z"/>
      <path d="M139 2H220V16H156V28H210L221 39V58L209 70H139V56H203V43H151L139 32Z"/>
      <path d="M259 2H343V16H259ZM294 23H309V70H294Z"/>
      <path fillRule="evenodd" d="M382 2H451L462 13V33L451 44H423L465 70H440L398 44V70H382ZM398 16V30H446V16Z"/>
      <path fillRule="evenodd" d="M515 2H578L590 14V58L578 70H515L503 58V14ZM521 16 518 19V53L521 56H572L575 53V19L572 16Z"/>
      {[112,233,356,478].map(x=><path key={x} d={`M${x} 56h13v14h-13Z`}/>)}
      <path d="M604 3h13v3h-5v10h-3V6h-5Zm17 0h3l4 7 4-7h3v13h-3V8l-4 6-4-6v8h-3Z"/>
    </g>
    <g stroke="#777" strokeWidth=".65" fill="none"><path d="m43 2 7 6M139 12l6-7M386 4l8 10M506 14l10 4M577 3l-5 11"/></g>
  </svg>;
}

export function CircuitFrame({ open = false }: { open?: boolean }) {
  return <svg className="circuit-frame" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
    <g fill="none" vectorEffect="non-scaling-stroke">
      <path className="frame-fine" d={open ? 'M0 47V26L27 0H184L197 8H337L357 25H400M400 267L369 299H233L218 289H68L46 267H0' : 'M0 47V26L27 0H184L197 8H337L357 25H399V132M400 167V267L369 299H233L218 289H68L46 267H0V103'}/>
      <path className="frame-heavy" d={open ? 'M0 32L29 4H102M269 8H339L359 27H400M400 266L368 295H307' : 'M0 65V32L29 4H102M269 8H339L359 27H393M398 217V266L368 295H307M117 290H68L45 268H8'}/>
      <path className="frame-echo" d={open ? 'M0 37L35 13H74M253 0H344L370 19H400M400 263L365 286H324' : 'M8 76V37L35 13H74M253 0H344L370 19H400M390 235V263L365 286H324M98 299H60L36 278H0'}/>
      <path className="frame-accent" d="M106 4H131M398 186V210M209 289H231"/>
    </g>
    {!open && <path className="frame-wedge" d="M380 1h20v16h-6ZM0 285h10l14 15H0Z"/>}
    <g className="frame-terminal"><circle cx="184" cy="0" r="2"/><circle cx="0" cy="103" r="2"/><circle cx="233" cy="299" r="2"/></g>
  </svg>;
}

export function CircuitBackdrop() {
  return <svg className="circuit-backdrop" viewBox="0 0 1200 900" preserveAspectRatio="none" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
      <path d="M0 80H192L219 107V546L247 574H630L667 611H1198M0 93H185L208 117V551L239 585H624L657 618H1200"/>
      <path d="M956 0V325L932 349V805L908 829H483L459 855H0M967 0V330L944 356V812L916 840H489L464 866H0"/>
      <circle cx="192" cy="80" r="4"/><circle cx="630" cy="574" r="4"/><circle cx="489" cy="840" r="4"/>
      <circle cx="290" cy="690" r="190" opacity=".25"/><circle cx="290" cy="690" r="175" opacity=".25"/>
    </g>
    <path d="M0 534H103L126 557H191L216 582H0Z" fill="#161616"/><path d="M1138 430h62v144h-20l-42-42Z" fill="#ff751a"/>
  </svg>;
}

type Point = { x: number; y: number; z: number };
function spherePoint(latitude: number, longitude: number): Point {
  const lat = latitude * Math.PI / 180;
  const lon = longitude * Math.PI / 180;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const tilt = .22;
  return { x:138 + (x*Math.cos(tilt)-y*Math.sin(tilt))*83, y:108 + (x*Math.sin(tilt)+y*Math.cos(tilt))*83, z };
}
const globeFaces = Array.from({length:18},(_,row)=>Array.from({length:36},(_,col)=>{
  const vertices = [spherePoint(row*10-90,col*10),spherePoint(row*10-80,col*10),spherePoint(row*10-80,col*10+10),spherePoint(row*10-90,col*10+10)];
  const depth = vertices.reduce((sum,p)=>sum+p.z,0)/4;
  const shade = Math.round(25 + depth*20 + (Math.sin(row*3.1+col*2.7)+1)*8);
  return {points:vertices.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),depth,shade};
})).flat().filter(face=>face.depth>0).sort((a,b)=>a.depth-b.depth);
const networkNodes = [[-65,10],[-40,-55],[-20,30],[5,-42],[20,65],[40,-15],[63,20],[6,4]].map(([lat,lon])=>spherePoint(lat,lon));

export function Globe() {
  return <svg viewBox="0 0 280 225" className="globe" role="img" aria-label="Faceted orbital sphere with connected tracking nodes, illustrative">
    <defs><radialGradient id="astro-sphere-light" cx="30%" cy="24%"><stop stopColor="#dddddd" stopOpacity=".36"/><stop offset=".6" stopColor="#000" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".55"/></radialGradient></defs>
    <g fill="none" stroke="#595959" strokeWidth=".45"><circle cx="138" cy="108" r="97" strokeDasharray="1 3"/><circle cx="138" cy="108" r="93"/><ellipse cx="138" cy="108" rx="106" ry="77" transform="rotate(-33 138 108)"/><path d="M24 108H252M138 6V210"/></g>
    <circle cx="138" cy="108" r="83" fill="#181818"/>
    <g stroke="#cccccc" strokeOpacity=".35" strokeWidth=".45">{globeFaces.map((face,i)=><polygon key={i} points={face.points} fill={`rgb(${face.shade},${face.shade+1},${face.shade})`}/>)}</g>
    <circle cx="138" cy="108" r="83" fill="url(#astro-sphere-light)"/>
    <g fill="none" stroke="#dddddd" strokeWidth=".6" opacity=".65"><ellipse cx="138" cy="108" rx="87" ry="36" transform="rotate(-28 138 108)"/><ellipse cx="138" cy="108" rx="85" ry="54" transform="rotate(60 138 108)"/>{networkNodes.map((point,i)=><path key={i} d={`M${point.x},${point.y}L${networkNodes[(i+2)%networkNodes.length].x},${networkNodes[(i+2)%networkNodes.length].y}`}/>)}</g>
    {networkNodes.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i%3===0?3.3:2} fill="#f2f2f2"/>)}
    <g fill="none" stroke="#ff7428" strokeWidth=".7"><circle cx="143" cy="109" r="11"/><circle cx="143" cy="109" r="22" opacity=".8"/><circle cx="143" cy="109" r="34" opacity=".4"/></g><circle cx="143" cy="109" r="5" fill="#ff6627"/><circle cx="143" cy="109" r="2" fill="#fff"/>
    <g fill="#181818"><circle cx="138" cy="15" r="3"/><circle cx="231" cy="105" r="3"/><circle cx="64" cy="48" r="2.5"/><circle cx="88" cy="190" r="2.5"/></g>
    <g stroke="#3a3a3a" strokeWidth=".7">{Array.from({length:16},(_,i)=><path key={i} d={`M252 ${35+i*9}h${i%3===0?7:4}`}/>)}<path d="M253 35V170"/></g>
    <g fill="#656565" fontFamily="monospace" fontSize="6"><text x="14" y="25">SAT / 01</text><text x="211" y="200">FOV 120°</text><text x="91" y="222" letterSpacing="5">01 02 03</text></g>
    <path d="M99 212h29m9 0h16" stroke="#181818" strokeWidth="3"/><path d="M155 212h18" stroke="#ff751a" strokeWidth="3"/>
  </svg>;
}

function terrainPoint(row: number, col: number) {
  const x = (col-20)/20;
  const z = (row-13)/13;
  const peak = (cx:number,cz:number,spread:number,height:number)=>height*Math.exp(-((x-cx)**2+(z-cz)**2)/spread);
  const ridges = peak(-.4,-.12,.045,65)+peak(.15,.2,.08,88)+peak(.65,-.35,.035,60)+peak(-.7,.6,.06,32);
  const noise = (Math.sin(col*2.6+row*1.1)*Math.cos(row*2.2-col*.3)*3 + Math.sin(col*.8+row*1.4)*5) * (.4+ridges/65);
  return {x:210+x*153+z*49,y:128+z*34-x*14-ridges-noise};
}
const terrainRows = Array.from({length:27},(_,r)=>Array.from({length:41},(_,c)=>terrainPoint(r,c)));
const toPoints = (points:{x:number;y:number}[])=>points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export function Terrain() {
  return <svg viewBox="0 0 420 188" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Perspective wireframe mountain terrain, illustrative">
    <defs><linearGradient id="terrain-fog" x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".16"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient></defs>
    <g stroke="#d2d2d2" strokeWidth=".6" fill="none" opacity=".21">{Array.from({length:12},(_,i)=><path key={i} d={`M${i*38} 18V175M10 ${i*14+16}H410`}/>)}</g>
    <g fill="url(#terrain-fog)" stroke="#d7d7d7" strokeWidth=".55">{terrainRows.map((row,i)=><polyline key={i} points={toPoints(row)} opacity={.3+i/40}/>)}</g>
    <g fill="none" stroke="#e6e6e6" strokeWidth=".45" opacity=".65">{Array.from({length:41},(_,c)=><polyline key={c} points={toPoints(terrainRows.map(row=>row[c]))}/>)}</g>
    <g stroke="#ff792d" fill="none" strokeWidth=".7"><path d="M205 48v102M181 104h48"/><circle cx="205" cy="104" r="8"/></g><circle cx="205" cy="104" r="2.5" fill="#fff"/>
    <path d="M16 28V16h25M379 16h25v12M16 155v17h25M379 172h25v-17" stroke="#e6e6e6" fill="none"/>
    <g fill="#ddd" fontFamily="monospace" fontSize="6"><text x="22" y="31">ELEVATION / MESH 03</text><text x="338" y="163">N ↑</text></g>
  </svg>;
}

/** Sharp feline silhouette with two oval eyes; deliberately no mouth. */
export function CatUnitIcon() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" role="img" aria-label="Cat unit">
    <path d="M3.5 10 2.5 1.8 9 6.5a11 11 0 0 1 6 0l6.5-4.7-1 8.2c1.2 2 1.4 5.6-.2 8-1.6 2.3-4.8 3.4-8.3 3.4s-6.7-1.1-8.3-3.4c-1.6-2.4-1.4-6-.2-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"/>
    <ellipse cx="8.3" cy="13.4" rx="1.3" ry="2.3" fill="currentColor"/>
    <ellipse cx="15.7" cy="13.4" rx="1.3" ry="2.3" fill="currentColor"/>
  </svg>;
}

export function HumanoidIcon({size=22}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12 4 3H2v16m25-7 1-9h2v16M7 10c1-7 17-7 18 0M12 5l-.5 4m8.5-4 .5 4"/>
    <rect x="5" y="9" width="22" height="20" rx="6"/><rect x="8" y="13" width="16" height="12" rx="4" fill="currentColor" stroke="none"/>
    <ellipse cx="12.5" cy="17.5" rx="1.1" ry="2" fill="var(--paper, #d8d9d6)" stroke="none"/><ellipse cx="19.5" cy="17.5" rx="1.1" ry="2" fill="var(--paper, #d8d9d6)" stroke="none"/>
    <path d="M13 21q3 3 6 0" stroke="var(--paper, #d8d9d6)" strokeLinecap="round"/><ellipse cx="3" cy="19" rx="2" ry="3"/><ellipse cx="29" cy="19" rx="2" ry="3"/>
  </svg>;
}

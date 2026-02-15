'use client';

import { rgba } from '@/lib/colors';
import type { DotData } from '@/lib/data';

function escH(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getThemeCSS(theme: string, color: string): string {
  switch (theme) {
    case 'glass':
      return `.card{border-radius:24px;overflow:hidden;position:relative;background:rgba(255,255,255,0.03);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,0.08);box-shadow:0 40px 100px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)}`;
    case 'neon':
      return `.card{border-radius:24px;overflow:hidden;position:relative;background:#050508;border:1px solid ${color};box-shadow:0 0 15px ${rgba(color, 0.3)},0 0 60px ${rgba(color, 0.1)},inset 0 0 30px ${rgba(color, 0.05)}}
.nm{color:${color}!important;text-shadow:0 0 20px ${rgba(color, 0.6)},0 0 40px ${rgba(color, 0.3)}!important}
.ln{color:rgba(255,255,255,.5)!important}
.vb{color:${rgba(color, 0.3)}!important}`;
    case 'minimal':
      return `.card{border-radius:0;overflow:hidden;position:relative;background:#000;border:none;box-shadow:none}
.inner{padding:60px!important;justify-content:flex-end}
.nm{font-size:48px!important}`;
    case 'gradient':
      return `.card{border-radius:24px;overflow:hidden;position:relative;background:linear-gradient(145deg,${color} 0%,${rgba(color, 0.4)} 40%,#0a0a12 100%);border:none;box-shadow:0 40px 100px rgba(0,0,0,.5)}
.nm{color:#fff!important}
.ln{color:rgba(255,255,255,.6)!important}`;
    case 'noise':
      return `.card{border-radius:24px;overflow:hidden;position:relative;background:#0a0a10;box-shadow:0 40px 100px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.04)}
.nm{color:#f0e8d8!important}
.ln{color:rgba(200,190,170,.45)!important}`;
    default:
      return `.card{border-radius:24px;overflow:hidden;position:relative;box-shadow:0 40px 100px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.04)}`;
  }
}

function getThemeScript(theme: string, name: string, color: string): string {
  const cRgba18 = rgba(color, 0.18);
  const cRgba05 = rgba(color, 0.05);
  const cRgba07 = rgba(color, 0.07);
  const cRgba10 = rgba(color, 0.1);
  const cRgba03 = rgba(color, 0.03);
  const safeName = name.replace(/"/g, '\\"');

  switch (theme) {
    case 'glass': {
      const cRgba06 = rgba(color, 0.06);
      return `var c=document.getElementById("bg"),x=c.getContext("2d");
c.width=760;c.height=1000;c.style.width="380px";c.style.height="500px";x.scale(2,2);
x.fillStyle="#0a0a12";x.fillRect(0,0,380,500);
var g=x.createRadialGradient(190,200,0,190,250,380);
g.addColorStop(0,"${cRgba06}");g.addColorStop(1,"transparent");
x.fillStyle=g;x.fillRect(0,0,380,500);`;
    }
    case 'neon':
    case 'minimal':
    case 'gradient':
      // These themes don't use canvas backdrop
      return `var c=document.getElementById("bg");if(c)c.style.display="none";`;
    case 'noise':
      return `var c=document.getElementById("bg"),x=c.getContext("2d");
c.width=760;c.height=1000;c.style.width="380px";c.style.height="500px";x.scale(2,2);
var s=0;"${safeName}".split("").forEach(function(c,i){s+=c.charCodeAt(0)*(i+1)});
function r(){s=(s*16807)%2147483647;return(s-1)/2147483646}
x.fillStyle="#0a0a10";x.fillRect(0,0,380,500);
var gx=380*(.2+r()*.5),gy=500*(.15+r()*.35);
var g=x.createRadialGradient(gx,gy,0,190,250,304);
g.addColorStop(0,"${cRgba10}");g.addColorStop(.4,"${cRgba03}");g.addColorStop(1,"transparent");
x.fillStyle=g;x.fillRect(0,0,380,500);
var d=x.getImageData(0,0,760,1000);for(var i=0;i<d.data.length;i+=4){var n=(Math.random()-.5)*30;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n}x.putImageData(d,0,0);
x.fillStyle="rgba(0,0,0,0.02)";for(var y=0;y<500;y+=3){x.fillRect(0,y,380,1)}
var vg=x.createRadialGradient(190,250,95,190,250,266);
vg.addColorStop(0,"transparent");vg.addColorStop(1,"rgba(0,0,0,0.4)");
x.fillStyle=vg;x.fillRect(0,0,380,500);`;
    default:
      return `var c=document.getElementById("bg"),x=c.getContext("2d");
c.width=760;c.height=1000;c.style.width="380px";c.style.height="500px";x.scale(2,2);
var s=0;"${safeName}".split("").forEach(function(c,i){s+=c.charCodeAt(0)*(i+1)});
function r(){s=(s*16807)%2147483647;return(s-1)/2147483646}
x.fillStyle="#0a0a12";x.fillRect(0,0,380,500);
var gx=380*(.2+r()*.5),gy=500*(.15+r()*.35);
var g=x.createRadialGradient(gx,gy,0,190,250,304);
g.addColorStop(0,"${cRgba18}");g.addColorStop(.4,"${cRgba05}");g.addColorStop(1,"transparent");
x.fillStyle=g;x.fillRect(0,0,380,500);
for(var i=0;i<6;i++){var ox=r()*380,oy=r()*500,or=30+r()*100,og=x.createRadialGradient(ox,oy,0,ox,oy,or);og.addColorStop(0,"${cRgba07}");og.addColorStop(1,"transparent");x.fillStyle=og;x.fillRect(0,0,380,500)}
var d=x.getImageData(0,0,760,1000);for(var i=0;i<d.data.length;i+=4){var n=(Math.random()-.5)*14;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n}x.putImageData(d,0,0);`;
  }
}

export function exportDotHtml(dot: DotData & { slug?: string }): void {
  const theme = dot.theme || 'default';
  const n = escH(dot.name);
  const l = escH(dot.line);
  const v = escH(dot.vibe);
  const isMinimal = theme === 'minimal';

  const lnk = dot.link && !isMinimal
    ? '<a class="lk" href="' + escH(dot.link) + '" target="_blank">' + escH(dot.link.replace(/https?:\/\//, '')) + '</a>'
    : '';

  const footer = isMinimal ? '' :
    '<div class="bt"><div class="vb">' + v + '</div><div class="br">my dot.</div></div>';

  const parts: string[] = [];
  parts.push('<!DOCTYPE html><html lang="en"><head>');
  parts.push('<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">');
  parts.push('<title>' + n + ' \u2014 my dot.<\/title>');
  parts.push('<style>');
  parts.push("@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@200;300;400;500&family=Instrument+Serif:ital@0;1&display=swap');");
  parts.push('*{margin:0;padding:0;box-sizing:border-box}');
  parts.push("body{background:#030305;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;overflow:hidden}");
  parts.push('.wrap{width:min(380px,90vw);position:relative}');
  parts.push(getThemeCSS(theme, dot.color));
  parts.push('canvas{position:absolute;inset:0;width:100%;height:100%;display:block}');
  parts.push('.inner{position:relative;z-index:2;padding:48px 36px 36px;min-height:440px;display:flex;flex-direction:column}');
  parts.push(".nm{font-family:'Instrument Serif',serif;font-size:38px;font-style:italic;color:#fff;letter-spacing:-.5px;margin-bottom:8px;text-shadow:0 2px 30px rgba(0,0,0,.4)}");
  parts.push('.ln{font-size:14px;color:rgba(255,255,255,.45);font-weight:300;line-height:1.7;margin-bottom:auto}');
  parts.push('.lk{font-size:11px;color:rgba(255,255,255,.3);text-decoration:none;margin-top:28px;display:block}');
  parts.push('.lk:hover{color:rgba(255,255,255,.6)}');
  parts.push('.bt{display:flex;justify-content:space-between;margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,.05)}');
  parts.push('.vb{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.15);font-weight:300}');
  parts.push(".br{font-family:'Instrument Serif',serif;font-style:italic;font-size:11px;color:rgba(255,255,255,.12)}");
  parts.push('.sh{text-align:center;margin-top:20px;font-size:11px;color:rgba(255,255,255,.15);letter-spacing:1px}');
  parts.push('.sh a{color:rgba(255,255,255,.25)}');
  parts.push('<\/style><\/head><body>');
  parts.push('<div class="wrap"><div class="card"><canvas id="bg"><\/canvas>');
  parts.push('<div class="inner">');
  parts.push('<div class="nm">' + n + '<\/div>');
  parts.push('<div class="ln">' + l + '<\/div>');
  parts.push(lnk);
  parts.push(footer);
  parts.push('<\/div><\/div>');
  const ref = dot.slug || dot.name.toLowerCase().replace(/\s+/g, '-');
  parts.push('<div class="sh">made with <a href="https://mydot.space?ref=' + escH(ref) + '">my dot.<\/a><\/div>');
  parts.push('<\/div>');
  parts.push('<script>');
  parts.push(getThemeScript(theme, dot.name, dot.color));
  parts.push('<\/script><\/body><\/html>');

  const blob = new Blob([parts.join('\n')], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = dot.name.toLowerCase().replace(/\s+/g, '-') + '.dot.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

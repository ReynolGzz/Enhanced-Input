//! Minimal, dependency-free HTTP server that powers the OBS "streamer overlay".
//!
//! It serves two routes on `127.0.0.1`:
//!   - `GET /state`   -> JSON snapshot of the live controller input (engine.live()).
//!   - everything else -> the overlay HTML page (polls `/state` and draws the pad).
//!
//! OBS loads `http://127.0.0.1:<port>/overlay?style=white|black` as a Browser
//! Source. The page background is transparent, so only the controller shows.
//! Live highlights appear while the engine is running. The controller art is a
//! generic, copyright-safe shape (no brand logos).

use crate::engine::Engine;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Arc;

/// Bind a localhost port (prefers a stable one so OBS URLs survive restarts).
fn bind() -> Option<(TcpListener, u16)> {
    for port in [47620u16, 47621, 47622, 47623, 0] {
        if let Ok(l) = TcpListener::bind(("127.0.0.1", port)) {
            let p = l.local_addr().ok()?.port();
            return Some((l, p));
        }
    }
    None
}

/// Start the overlay server on a background thread. Returns the bound port
/// (or 0 if it could not bind).
pub fn start(engine: Arc<Engine>) -> u16 {
    let Some((listener, port)) = bind() else {
        return 0;
    };
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let eng = Arc::clone(&engine);
            std::thread::spawn(move || {
                let _ = handle(stream, &eng);
            });
        }
    });
    port
}

fn handle(mut s: TcpStream, engine: &Engine) -> std::io::Result<()> {
    let mut buf = [0u8; 2048];
    let n = s.read(&mut buf)?;
    let req = String::from_utf8_lossy(&buf[..n]);
    let path = req.split_whitespace().nth(1).unwrap_or("/");

    if path.starts_with("/state") {
        let body = serde_json::to_string(&engine.live()).unwrap_or_else(|_| "{}".into());
        write_resp(&mut s, "application/json", body.as_bytes())
    } else {
        write_resp(&mut s, "text/html; charset=utf-8", OVERLAY_HTML.as_bytes())
    }
}

fn write_resp(s: &mut TcpStream, ctype: &str, body: &[u8]) -> std::io::Result<()> {
    let head = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: {ctype}\r\nContent-Length: {}\r\n\
         Access-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        body.len()
    );
    s.write_all(head.as_bytes())?;
    s.write_all(body)?;
    s.flush()
}

const OVERLAY_HTML: &str = r##"<!doctype html>
<html><head><meta charset="utf-8"><title>Enhanced Input Overlay</title>
<style>
  html,body{margin:0;height:100%;background:transparent;overflow:hidden;}
  .wrap{display:grid;place-items:center;height:100vh;}
  svg{width:78vmin;height:auto;filter:drop-shadow(0 6px 16px rgba(0,0,0,.35));}
  body[data-style="white"]{--fill:#ededed;--line:#2b2b2b;--btn:#3a3a3a;--hl:#19c37d;}
  body[data-style="black"]{--fill:#1b1b1b;--line:#666;--btn:#9a9a9a;--hl:#19c37d;}
  .shell{fill:var(--fill);stroke:var(--line);stroke-width:2;}
  .ln{stroke:var(--line);stroke-width:1.5;fill:none;}
  [data-btn]{fill:var(--btn);transition:fill .04s;}
  [data-btn].on{fill:var(--hl);}
  .trig{fill:var(--btn);opacity:.25;}
  .stick{fill:var(--btn);stroke:var(--line);stroke-width:1.2;}
  .stick.on{fill:var(--hl);}
</style></head>
<body>
<div class="wrap">
<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">
  <!-- triggers -->
  <rect id="lt" class="trig" x="50" y="20" width="26" height="8" rx="4"/>
  <rect id="rt" class="trig" x="164" y="20" width="26" height="8" rx="4"/>
  <!-- bumpers -->
  <rect data-btn="lb" x="50" y="32" width="26" height="7" rx="3.5"/>
  <rect data-btn="rb" x="164" y="32" width="26" height="7" rx="3.5"/>
  <!-- shell -->
  <path class="shell" d="M120 44c-20 0-26 8-34 10-12-4-24-8-36-4C32 56 18 84 26 110c6 16 24 22 36 10 8-8 14-18 24-22h68c10 4 16 14 24 22 12 12 30 6 36-10 8-26-6-54-24-60-12-4-24 0-36 4-8-2-14-10-34-10Z"/>
  <!-- d-pad -->
  <rect data-btn="up" x="58" y="84" width="7" height="11" rx="2"/>
  <rect data-btn="down" x="58" y="99" width="7" height="11" rx="2"/>
  <rect data-btn="left" x="50" y="92" width="11" height="7" rx="2"/>
  <rect data-btn="right" x="62" y="92" width="11" height="7" rx="2"/>
  <!-- face buttons (y top, x left, b right, a bottom) -->
  <circle data-btn="y" cx="182" cy="86" r="5.5"/>
  <circle data-btn="x" cx="172" cy="96" r="5.5"/>
  <circle data-btn="b" cx="192" cy="96" r="5.5"/>
  <circle data-btn="a" cx="182" cy="106" r="5.5"/>
  <!-- menu cluster -->
  <circle data-btn="back" cx="106" cy="74" r="3.5"/>
  <circle data-btn="guide" cx="120" cy="72" r="4.5"/>
  <circle data-btn="start" cx="134" cy="74" r="3.5"/>
  <!-- sticks -->
  <g id="ls"><circle class="stick" cx="100" cy="116" r="11"/></g>
  <g id="rs"><circle class="stick" cx="150" cy="116" r="11"/></g>
</svg>
</div>
<script>
  var style = new URLSearchParams(location.search).get('style') || 'white';
  document.body.dataset.style = (style === 'black') ? 'black' : 'white';
  var R = 7; // px of stick travel in viewBox units
  function setStick(id, x, y, pressed){
    var g = document.getElementById(id);
    if(!g) return;
    g.setAttribute('transform','translate('+(x*R).toFixed(2)+','+(-y*R).toFixed(2)+')');
    g.querySelector('.stick').classList.toggle('on', !!pressed);
  }
  async function tick(){
    try{
      var s = await (await fetch('/state',{cache:'no-store'})).json();
      var pressed = new Set(s.pressed || []);
      document.querySelectorAll('[data-btn]').forEach(function(el){
        el.classList.toggle('on', pressed.has(el.getAttribute('data-btn')));
      });
      setStick('ls', s.inLx||0, s.inLy||0, pressed.has('ls'));
      setStick('rs', s.inRx||0, s.inRy||0, pressed.has('rs'));
      var lt = document.getElementById('lt'); if(lt) lt.style.opacity = 0.25 + 0.75*(s.lt||0);
      var rt = document.getElementById('rt'); if(rt) rt.style.opacity = 0.25 + 0.75*(s.rt||0);
    }catch(e){}
  }
  setInterval(tick, 50); tick();
</script>
</body></html>
"##;

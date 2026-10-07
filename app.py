import os, re, json, uuid, subprocess, time
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

BASE = os.path.dirname(os.path.abspath(__file__))
UP = os.path.join(BASE, "workspace"); os.makedirs(UP, exist_ok=True)
app = Flask(__name__, static_folder=os.path.join(BASE, "static"), static_url_path="/static")
app.config['MAX_CONTENT_LENGTH'] = 150 * 1024 * 1024
CORS(app)
_model = {}

def run(cmd, cwd=None): return subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
def P(n): return os.path.join(UP, os.path.basename(n))

def cleanup_old_files():
    """Deletes files in workspace older than 30 minutes to save disk space."""
    try:
        now = time.time()
        for f in os.listdir(UP):
            fp = os.path.join(UP, f)
            if os.path.isfile(fp) and now - os.path.getmtime(fp) > 1800:
                os.remove(fp)
    except Exception:
        pass

@app.get("/")
def index(): return send_from_directory(os.path.join(BASE, "templates"), "index.html")

@app.get("/media/<name>")
def media(name): return send_file(P(name), conditional=True)

@app.post("/api/upload")
def upload():
    cleanup_old_files()
    f = request.files["file"]
    fid = uuid.uuid4().hex[:10] + os.path.splitext(f.filename)[1].lower()
    path = P(fid)
    f.save(path)
    
    r = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", path])
    j = json.loads(r.stdout or "{}")
    dur = float(j.get("format", {}).get("duration", 0))
    
    # Limit video length to 3 minutes (180 seconds) for free servers
    if dur > 180:
        os.remove(path)
        return jsonify(error="Video is too long. Max length is 3 minutes for the free tier."), 400

    st = j.get("streams", [])
    v = next((s for s in st if s["codec_type"] == "video"), {})
    return jsonify(id=fid, w=v.get("width", 0), h=v.get("height", 0), dur=dur,
                   audio=any(s["codec_type"] == "audio" for s in st))

@app.post("/api/transcribe")
def transcribe():
    try: from faster_whisper import WhisperModel
    except ImportError: return jsonify(error="Run: pip install faster-whisper"), 501
    d = request.json; m = d.get("model", "base")
    if m not in _model: _model[m] = WhisperModel(m, compute_type="int8")
    segs, _ = _model[m].transcribe(P(d["id"]), word_timestamps=True, vad_filter=True)
    words = [{"t": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for s in segs for w in s.words if w.word.strip()]
    return jsonify(words=words)

@app.post("/api/silence")
def silence():
    d = request.json
    r = run(["ffmpeg", "-i", P(d["id"]), "-af", "silencedetect=noise=%sdB:d=%s" % (d.get("db", -30), d.get("min", 0.4)), "-f", "null", "-"])
    a = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    b = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return jsonify(cuts=[[max(s, 0), e] for s, e in zip(a, b)])

def bgr(h): h = h.lstrip("#"); return "&H00%s%s%s&" % (h[4:6], h[2:4], h[0:2])
def ts(t):
    c = int(round(max(t, 0) * 100)); return "%d:%02d:%02d.%02d" % (c // 360000, c // 6000 % 60, c // 100 % 60, c % 100)

def remap(cuts):
    def m(t):
        off = 0
        for s, e in cuts:
            if t >= e: off += e - s
            elif t > s: off += t - s
        return t - off
    return m

def keep(cuts, dur):
    k, p = [], 0
    for s, e in sorted(cuts):
        if s > p + .05: k.append((p, s))
        p = max(p, e)
    if dur - p > .05: k.append((p, dur))
    return k or [(0, dur)]

def make_ass(groups, st, W, H, m):
    fs = round(H * st["size"] / 100); out = round(fs * st["sw"] / 100)
    o = ("[Script Info]\nScriptType: v4.00+\nPlayResX: %d\nPlayResY: %d\n\n[V4+ Styles]\n"
         "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n"
         "Style: D,%s,%d,%s,&H000000FF&,%s,&H00000000&,-1,0,0,0,100,100,0,0,1,%d,0,5,40,40,40,1\n\n"
         "[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n") % (
        W, H, st["font"], fs, bgr(st["color"]), bgr(st["stroke"]), out)
    pos = "{\\an5\\pos(%d,%d)}" % (W // 2, round(H * st["y"] / 100))
    HI, LO = "{\\c%s}" % bgr(st["hi"]), "{\\c%s}" % bgr(st["color"])
    for g in groups:
        ws = g["words"]
        tx = [re.sub(r"[{}\\]", "", w["t"]) for w in ws]
        if st.get("upper"): tx = [x.upper() for x in tx]
        for i in range(len(ws)):
            a = ws[i]["s"] if i else g["s"]
            b = ws[i + 1]["s"] if i + 1 < len(ws) else g["e"]
            s, e = m(a), m(b)
            if e - s < .02: continue
            body = " ".join(HI + x + LO if j == i else x for j, x in enumerate(tx))
            o += "Dialogue: 0,%s,%s,D,,0,0,0,,%s%s\n" % (ts(s), ts(e), pos, body)
    return o

@app.post("/api/export")
def export():
    d = request.json; W, H = d["W"], d["H"]; hasA = d.get("audio", True)
    cuts = [c for c in d.get("cuts", [])]
    ks = keep(cuts, d["dur"]); n = len(ks)
    base = uuid.uuid4().hex[:8]; assn, outn = base + ".ass", "out_" + base + ".mp4"
    open(P(assn), "w", encoding="utf-8").write(make_ass(d["groups"], d["style"], W, H, remap(cuts)))
    f = []
    for i, (s, e) in enumerate(ks):
        f.append("[0:v]trim=%.3f:%.3f,setpts=PTS-STARTPTS[v%d]" % (s, e, i))
        if hasA: f.append("[0:a]atrim=%.3f:%.3f,asetpts=PTS-STARTPTS[a%d]" % (s, e, i))
    cat = "".join("[v%d]" % i + ("[a%d]" % i if hasA else "") for i in range(n))
    f.append("%sconcat=n=%d:v=1:a=%d[vc]%s" % (cat, n, 1 if hasA else 0, "[ac]" if hasA else ""))
    if d["fit"] == "fill":
        f.append("[vc]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1[vf]" % (W, H, W, H))
    else:
        f.append("[vc]split[b][g];[b]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,boxblur=30:5[bb];"
                 "[g]scale=%d:%d:force_original_aspect_ratio=decrease[ff];[bb][ff]overlay=(W-w)/2:(H-h)/2,setsar=1[vf]" % (W, H, W, H, W, H))
    f.append("[vf]ass=%s[vo]" % assn)
    cmd = ["ffmpeg", "-y", "-i", os.path.basename(d["id"]), "-filter_complex", ";".join(f), "-map", "[vo]"] + \
          (["-map", "[ac]"] if hasA else []) + ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outn]
    r = run(cmd, cwd=UP)
    
    # Clean up the .ass subtitle script file immediately after rendering
    try: os.remove(P(assn))
    except Exception: pass

    if r.returncode: return jsonify(error=r.stderr[-400:]), 500
    return jsonify(url="/media/" + outn, name=outn)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False)
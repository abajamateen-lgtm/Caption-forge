import os, re, json, uuid, subprocess, time
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

BASE = os.path.dirname(os.path.abspath(__file__))
UP = os.path.join(BASE, "workspace"); os.makedirs(UP, exist_ok=True)
app = Flask(__name__, static_folder=os.path.join(BASE, "static"), static_url_path="/static")
app.config['MAX_CONTENT_LENGTH'] = 150 * 1024 * 1024
CORS(app)
_model = {}
MODELS = {"tiny", "base", "small"}
HEX = re.compile(r"^#?[0-9a-fA-F]{6}$")
GONE = "Your session expired (files are cleared after 30 min). Please re-upload the video."

def run(cmd, cwd=None): return subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
def P(n): return os.path.join(UP, os.path.basename(str(n)))

def touch(n):
    """Keep a file alive while the person is still editing it."""
    try: os.utime(P(n))
    except OSError: pass

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
def media(name):
    if not os.path.isfile(P(name)): return jsonify(error=GONE), 404
    touch(name)
    return send_file(P(name), conditional=True)

@app.post("/api/upload")
def upload():
    cleanup_old_files()
    f = request.files["file"]
    fid = uuid.uuid4().hex[:10] + os.path.splitext(f.filename)[1].lower()
    path = P(fid)
    f.save(path)

    r = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", path])
    try: j = json.loads(r.stdout or "{}")
    except ValueError: j = {}
    try: dur = float(j.get("format", {}).get("duration", 0))
    except (TypeError, ValueError): dur = 0

    if dur <= 0:
        os.remove(path)
        return jsonify(error="Couldn't read that video. Try an MP4 or MOV."), 400
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
    except ImportError: return jsonify(error="faster-whisper is not installed on the server"), 501
    d = request.json; m = d.get("model", "base")
    if m not in MODELS: m = "base"
    if not os.path.isfile(P(d["id"])): return jsonify(error=GONE), 410
    touch(d["id"])
    if m not in _model: _model[m] = WhisperModel(m, compute_type="int8")
    segs, _ = _model[m].transcribe(P(d["id"]), word_timestamps=True, vad_filter=True)
    words = [{"t": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for s in segs for w in s.words if w.word.strip()]
    return jsonify(words=words)

@app.post("/api/silence")
def silence():
    d = request.json
    if not os.path.isfile(P(d["id"])): return jsonify(error=GONE), 410
    touch(d["id"])
    r = run(["ffmpeg", "-i", P(d["id"]), "-af", "silencedetect=noise=%sdB:d=%s" % (float(d.get("db", -30)), float(d.get("min", 0.4))), "-f", "null", "-"])
    a = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    b = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return jsonify(cuts=[[max(s, 0), e] for s, e in zip(a, b)])

def bgr(h, a=0):
    """#RRGGBB (+ ASS alpha 0=opaque..255=clear) -> &HAABBGGRR&"""
    h = (h if isinstance(h, str) and HEX.match(h) else "#FFFFFF").lstrip("#")
    return "&H%02X%s%s%s&" % (a, h[4:6], h[2:4], h[0:2])

def ts(t):
    c = int(round(max(t, 0) * 100)); return "%d:%02d:%02d.%02d" % (c // 360000, c // 6000 % 60, c // 100 % 60, c % 100)

def tcase(t, mode):
    if mode == "upper": return t.upper()
    if mode == "lower": return t.lower()
    if mode == "title": return t[:1].upper() + t[1:].lower()
    return t

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

def num(x, d=0):
    try: return float(x)
    except (TypeError, ValueError): return d

def make_ass(groups, st, W, H, m):
    font = re.sub(r"[,\r\n{}\\]", "", str(st.get("font", "Anton")))[:60] or "Anton"
    fs = max(8, round(H * num(st.get("size"), 6) / 100))
    shadow = round(fs * num(st.get("sh"), 0) / 100)
    bold = -1 if st.get("bold") else 0
    if st.get("box"):
        # opaque box: libass draws it with the outline colour, Outline = padding
        bs, out = 3, round(fs * .16)
        alpha = round(255 * (1 - min(max(num(st.get("boxa"), 70), 0), 100) / 100))
        outc = bgr(st.get("boxc", "#000000"), alpha)
    else:
        bs, out = 1, round(fs * num(st.get("sw"), 0) / 100)
        outc = bgr(st.get("stroke", "#000000"))
    o = ("[Script Info]\nScriptType: v4.00+\nPlayResX: %d\nPlayResY: %d\n\n[V4+ Styles]\n"
         "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n"
         "Style: D,%s,%d,%s,&H000000FF&,%s,&H80000000&,%d,0,0,0,100,100,0,0,%d,%d,%d,5,40,40,40,1\n\n"
         "[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n") % (
        W, H, font, fs, bgr(st.get("color")), outc, bold, bs, out, shadow)
    pos = "{\\an5\\pos(%d,%d)}" % (W // 2, round(H * num(st.get("y"), 70) / 100))
    hl = st.get("hl", True)
    pop = bool(hl and st.get("pop"))
    HI = "{\\c%s%s}" % (bgr(st.get("hi")), "\\fscx115\\fscy115" if pop else "")
    LO = "{\\c%s%s}" % (bgr(st.get("color")), "\\fscx100\\fscy100" if pop else "")
    mode = st.get("case") or ("upper" if st.get("upper") else "none")
    for g in sorted(groups, key=lambda g: g["s"]):
        ws = g.get("words") or []
        if not ws: continue
        tx = [tcase(re.sub(r"[{}\\]", "", w["t"]), mode) for w in ws]
        for i in range(len(ws)):
            a = ws[i]["s"] if i else g["s"]
            b = ws[i + 1]["s"] if i + 1 < len(ws) else g["e"]
            s, e = m(a), m(b)
            if e - s < .02: continue
            body = " ".join(HI + x + LO if (hl and j == i) else x for j, x in enumerate(tx))
            if st.get("box"):
                # libass draws one box per colour run, so draw the box once on layer 0
                # (invisible text) and put the coloured text on layer 1 with no border.
                o += "Dialogue: 0,%s,%s,D,,0,0,0,,%s{\\1a&HFF&\\shad0}%s\n" % (ts(s), ts(e), pos, " ".join(tx))
                o += "Dialogue: 1,%s,%s,D,,0,0,0,,%s{\\bord0\\shad0}%s\n" % (ts(s), ts(e), pos, body)
            else:
                o += "Dialogue: 0,%s,%s,D,,0,0,0,,%s%s\n" % (ts(s), ts(e), pos, body)
    return o

@app.post("/api/export")
def export():
    d = request.json; W, H = int(d["W"]), int(d["H"]); hasA = d.get("audio", True)
    if not (100 <= W <= 4000 and 100 <= H <= 4000): return jsonify(error="Bad output size"), 400
    if not os.path.isfile(P(d["id"])): return jsonify(error=GONE), 410
    touch(d["id"])
    dur = num(d["dur"])
    cuts = [c for c in d.get("cuts", [])]
    ks = keep(cuts, dur); n = len(ks)
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

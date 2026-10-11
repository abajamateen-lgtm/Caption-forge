FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fontconfig curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Caption fonts. The server burns captions with these, and the browser preview
# loads the same fonts from Google Fonts, so what you see is what you export.
RUN mkdir -p /usr/share/fonts/truetype/captionforge && cd /usr/share/fonts/truetype/captionforge \
    && for u in ofl/anton/Anton-Regular.ttf ofl/bangers/Bangers-Regular.ttf ofl/bebasneue/BebasNeue-Regular.ttf \
                apache/luckiestguy/LuckiestGuy-Regular.ttf apache/permanentmarker/PermanentMarker-Regular.ttf; do \
         curl -fsSLO "https://github.com/google/fonts/raw/main/$u"; \
       done \
    && fc-cache -f

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download Whisper models so the first request doesn't lag
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', compute_type='int8'); WhisperModel('base', compute_type='int8')"

EXPOSE 7860
# --timeout matters: gunicorn's default is 30s and kills the worker mid-transcribe/export
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "4", "--timeout", "600", "app:app"]

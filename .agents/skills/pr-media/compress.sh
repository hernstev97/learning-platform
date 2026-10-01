#!/usr/bin/env bash
# Compress a screenshot or screen recording for a GitHub pull request.
#
#   compress.sh <low|medium|high> <input> [--crop WxH+X+Y] [--from SEC] [--to SEC] [-o OUTPUT]
#
# Images become WebP (low, medium) or lossless PNG (high). Everything else is
# treated as video and becomes H.264 MP4 without audio. Nothing is upscaled and
# the frame rate is never raised above the source's.
set -euo pipefail

usage() {
  sed -n '4p' "$0" | sed 's/^#   //' >&2
  exit 2
}

[[ $# -ge 2 ]] || usage
tier=$1 input=$2
shift 2
crop="" from="" to="" output=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --crop) crop=$2; shift 2 ;;
    --from) from=$2; shift 2 ;;
    --to) to=$2; shift 2 ;;
    -o) output=$2; shift 2 ;;
    *) usage ;;
  esac
done

case $tier in
  low) max_width=1280 webp_quality=80 fps=15 crf=32 ;;
  medium) max_width=1920 webp_quality=90 fps=30 crf=26 ;;
  high) max_width=3840 webp_quality="" fps=60 crf=18 ;;
  *) usage ;;
esac

[[ -f $input ]] || { echo "No such file: $input" >&2; exit 1; }
if [[ -n $crop && ! $crop =~ ^([0-9]+)x([0-9]+)\+([0-9]+)\+([0-9]+)$ ]]; then
  echo "--crop must look like WxH+X+Y, e.g. 800x400+120+64" >&2
  exit 2
fi

base=${input%.*}
shopt -s nocasematch
case $input in
  *.png | *.jpg | *.jpeg | *.webp | *.bmp | *.tif | *.tiff) kind=image ;;
  *) kind=video ;;
esac

if [[ $kind == image ]]; then
  args=("$input")
  [[ -n $crop ]] && args+=(-crop "$crop" +repage)
  if [[ $tier == high ]]; then
    output=${output:-$base.$tier.png}
    args+=(-define png:compression-level=9 "$output")
  else
    output=${output:-$base.$tier.webp}
    args+=(-resize "${max_width}x>" -quality "$webp_quality"
      -define webp:method=6 -define webp:use-sharp-yuv=true "$output")
  fi
  magick "${args[@]}"
  magick identify -format "%f  %wx%h  " "$output"
else
  output=${output:-$base.$tier.mp4}
  # Variable-frame-rate recordings report odd r_frame_rate values; avg_frame_rate is reliable.
  source_fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of csv=p=0 "$input")
  fps=$(awk -v s="$source_fps" -v cap="$fps" 'BEGIN {
    split(s, p, "/"); f = (p[2] > 0) ? p[1] / p[2] : 0
    if (f <= 0 || f > cap) f = cap
    printf "%.3f", f
  }')

  filters=()
  [[ -n $crop ]] && filters+=("crop=${BASH_REMATCH[1]}:${BASH_REMATCH[2]}:${BASH_REMATCH[3]}:${BASH_REMATCH[4]}")
  filters+=(
    "fps=$fps"
    "scale='trunc(min(iw,$max_width)/2)*2':-2:flags=lanczos:out_color_matrix=bt709:out_range=tv"
    "format=yuv420p"
    # ffmpeg's default RGB conversion uses BT.601, which browsers render with
    # visibly shifted hues. Encoder-level -color_* flags are ignored by recent
    # ffmpeg, so the tags have to be set on the frames.
    "setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"
  )
  vf=$(IFS=,; echo "${filters[*]}")

  trim=()
  [[ -n $from ]] && trim+=(-ss "$from")
  [[ -n $to ]] && trim+=(-to "$to")
  ffmpeg -v error -y ${trim[@]+"${trim[@]}"} -i "$input" -an -vf "$vf" \
    -c:v libx264 -preset slow -crf "$crf" -movflags +faststart "$output"
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,avg_frame_rate:format=duration \
    -of default=nw=1 "$output" | tr '\n' ' '
fi

bytes=$(stat -c %s "$output" 2>/dev/null || stat -f %z "$output")
echo "$((bytes / 1024)) KB  $output"
if ((bytes > 10 * 1024 * 1024)); then
  echo "Over 10 MB: GitHub rejects images this large, and videos on free plans. Shorten or crop it." >&2
fi

#!/bin/sh
# 『偉人と自分。』告知動画 3分版を組み立てる
set -e
cd "$(dirname "$0")"
FFMPEG="/c/Users/user/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe"
V_DIR="../app/assets"
G_DIR="../app/assets/guide"

# 各スライドの尺 (秒)
declare -A DUR=(
  ["s1-title"]=18
  ["s2-quote-chopin"]=16
  ["s3-quote-dazai"]=12
  ["s4-quote-beethoven"]=12
  ["s5-intro"]=16
  ["s6-brand"]=16
  ["s7-feature1"]=16
  ["s8-feature2"]=16
  ["s9-feature3"]=14
  ["s10-closing"]=14
  ["s11-cta"]=14
)
ORDER=(s1-title s2-quote-chopin s3-quote-dazai s4-quote-beethoven s5-intro s6-brand s7-feature1 s8-feature2 s9-feature3 s10-closing s11-cta)

# 各スライドを個別MP4に変換（Ken Burns風の軽いズーム）
rm -f scene-*.mp4 concat-list.txt
for name in "${ORDER[@]}"; do
  d=${DUR[$name]}
  frames=$((d * 30))
  echo "→ scene: $name ($d秒)"
  # zoompan で毎フレーム微妙にズーム（Ken Burns）
  "$FFMPEG" -y -loop 1 -i "${name}.jpg" \
    -vf "scale=3840:2160,zoompan=z='min(zoom+0.0006,1.15)':d=${frames}:s=1920x1080:fps=30,format=yuv420p" \
    -t "$d" -r 30 -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p \
    -loglevel error "scene-${name}.mp4"
  echo "file 'scene-${name}.mp4'" >> concat-list.txt
done

# 全シーンを連結（フェード込み）
echo "→ concatenating scenes..."
"$FFMPEG" -y -f concat -safe 0 -i concat-list.txt -c copy scenes-raw.mp4

# BGM合成（home-bgm を無限ループして、長さをビデオに合わせる、フェードイン・アウト付き）
TOTAL_DUR=$(( ${DUR[s1-title]} + ${DUR[s2-quote-chopin]} + ${DUR[s3-quote-dazai]} + ${DUR[s4-quote-beethoven]} + ${DUR[s5-intro]} + ${DUR[s6-brand]} + ${DUR[s7-feature1]} + ${DUR[s8-feature2]} + ${DUR[s9-feature3]} + ${DUR[s10-closing]} + ${DUR[s11-cta]} ))
echo "→ total duration: ${TOTAL_DUR}s"
echo "→ mixing BGM..."
"$FFMPEG" -y -i scenes-raw.mp4 -stream_loop -1 -i "${V_DIR}/home-bgm.mp3" \
  -filter_complex "[1:a]volume=0.35,afade=t=in:st=0:d=2,afade=t=out:st=$((TOTAL_DUR-3)):d=3[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest -t "$TOTAL_DUR" \
  -loglevel error "ijin-to-jibun-promo-3min.mp4"

echo ""
echo "✓ done: video-output/ijin-to-jibun-promo-3min.mp4"
ls -lh ijin-to-jibun-promo-3min.mp4

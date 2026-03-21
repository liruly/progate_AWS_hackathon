/** 自由記述から気分タグを推測（簡易キーワード） */
export function guessMoodFromText(text) {
  const t = text.trim();
  if (!t) return null;
  const s = t.toLowerCase();
  if (/甘|あま|スイーツ|デザート|sweet|チョコ|ケーキ/.test(s)) return "sweet";
  if (/辛|から|スパイシー|spicy|カレー|キムチ|ラー油/.test(s)) return "spicy";
  if (/酸|すっぱ|レモン|サワー|sour|酢|ビネガー/.test(s)) return "sour";
  if (/さっぱ|すっきり|refresh|爽|スッキリ|すっ/.test(s)) return "refreshing";
  return null;
}

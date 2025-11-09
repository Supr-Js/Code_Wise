// src/utils/patch.js
// Very small unified-diff applier (line-based). Supports multiple hunks.
export function applyUnifiedDiff(originalText, diffText) {
  if (!diffText || !String(diffText).trim()) return null;
  try {
    const origLines = originalText.split(/\r?\n/);
    const out = [];
    let i = 0; // pointer in original
    const lines = diffText.split(/\r?\n/);

    function parseHunkHeader(h) {
      // @@ -l,s +l,s @@
      const m = h.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (!m) return null;
      const [, a, aLen, b, bLen] = m;
      return {
        aStart: parseInt(a, 10),
        aLen: aLen ? parseInt(aLen, 10) : 1,
        bStart: parseInt(b, 10),
        bLen: bLen ? parseInt(bLen, 10) : 1,
      };
    }

    let k = 0;
    while (k < lines.length) {
      const line = lines[k];

      if (!line) { k++; continue; }

      if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        k++; continue; // file headers
      }

      if (line.startsWith('@@')) {
        const h = parseHunkHeader(line);
        if (!h) return null;

        // copy unchanged lines before hunk start
        const targetIndex = h.aStart - 1; // 1-based
        while (i < targetIndex) out.push(origLines[i++]);

        k++; // move to hunk body
        while (k < lines.length && !lines[k].startsWith('@@')) {
          const body = lines[k];

          if (body.startsWith(' ')) { // context
            out.push(origLines[i] ?? "");
            i++;
          } else if (body.startsWith('-')) { // remove from original
            i++;
          } else if (body.startsWith('+')) { // add to output
            out.push(body.slice(1));
          } else if (body.startsWith('\\ No newline at end of file')) {
            // ignore
          } else if (body.startsWith('--- ') || body.startsWith('+++ ')) {
            // next file header (rare in single patch); break hunk
            break;
          } else {
            // Unknown line kind → fail softly
            return null;
          }
          k++;
        }
        continue;
      }

      // skip any stray lines
      k++;
    }

    // copy remaining original
    while (i < origLines.length) out.push(origLines[i++]);

    return out.join('\n');
  } catch {
    return null;
  }
}
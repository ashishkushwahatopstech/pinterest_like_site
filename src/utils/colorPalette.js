/**
 * Extracts dominant color palette from image URL using HTML5 Canvas & RGB quantization.
 * Returns an array of 5 hex color strings.
 */
export const extractColorPalette = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = (canvas.width = 100);
        const height = (canvas.height = 100);

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height).data;

        const colorMap = {};
        for (let i = 0; i < imageData.length; i += 16) { // Sample every 4th pixel
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 125) continue; // Skip transparent

          // Quantize color to step of 32
          const qR = Math.floor(r / 32) * 32;
          const qG = Math.floor(g / 32) * 32;
          const qB = Math.floor(b / 32) * 32;

          const key = `${qR},${qG},${qB}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }

        // Sort by frequency
        const sortedColors = Object.keys(colorMap)
          .sort((a, b) => colorMap[b] - colorMap[a])
          .slice(0, 5);

        const hexPalette = sortedColors.map((rgbStr) => {
          const [r, g, b] = rgbStr.split(',').map(Number);
          return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
        });

        // Fallback if not enough colors extracted
        while (hexPalette.length < 5) {
          hexPalette.push('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
        }

        resolve(hexPalette);
      } catch (err) {
        // Fallback default harmonious palette
        resolve(['#ff3366', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']);
      }
    };

    img.onerror = () => {
      resolve(['#ff3366', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']);
    };

    img.src = imageUrl;
  });
};

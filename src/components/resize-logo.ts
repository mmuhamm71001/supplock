'use client';

// Shrinks an image to at most `max` px on its longest side and returns a PNG file.
export function resizeLogo(file: File | undefined | null, max = 240): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(new File([b], 'logo.png', { type: 'image/png' })) : reject(new Error('Could not read that image.'))), 'image/png');
    };
    img.src = url;
  });
}

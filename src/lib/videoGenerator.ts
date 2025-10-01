interface KanjiVideoData {
  kanji: string;
  meaning: string;
  category: string;
  difficulty: string;
  totalStrokes: number;
  usageExample: {
    word: string;
    reading: string;
    translation: string;
  };
}

interface SceneImage {
  blob: Blob;
  duration: number;
  sceneName: string;
}

export async function generateKanjiVideoScenes(data: KanjiVideoData): Promise<SceneImage[]> {
  const scenes: SceneImage[] = [];

  scenes.push(await generateScene1());
  scenes.push(await generateScene2(data.category));
  scenes.push(await generateScene3(data.kanji, data.totalStrokes));
  scenes.push(await generateScene4(data.usageExample));
  scenes.push(await generateScene5(data.kanji, data.meaning, data.difficulty));

  return scenes;
}

async function generateScene1(): Promise<{ blob: Blob; duration: number; sceneName: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Today's Kanji", canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '60px sans-serif';
    ctx.fillText("Can you write this?", canvas.width / 2, canvas.height / 2 + 80);

    canvas.toBlob((blob) => {
      resolve({ blob: blob!, duration: 1.0, sceneName: 'opening' });
    }, 'image/png');
  });
}

async function generateScene2(category: string): Promise<{ blob: Blob; duration: number; sceneName: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 70px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Why this Kanji?", canvas.width / 2, canvas.height / 2 - 100);

    ctx.font = 'bold 90px sans-serif';
    ctx.fillText(`Category: ${category.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + 100);

    canvas.toBlob((blob) => {
      resolve({ blob: blob!, duration: 3.0, sceneName: 'category' });
    }, 'image/png');
  });
}

async function generateScene3(kanji: string, totalStrokes: number): Promise<{ blob: Blob; duration: number; sceneName: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(200, 180, 150, 0.2)';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        120,
        120
      );
    }

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 500px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kanji, canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText(`Stroke 1/${totalStrokes}`, canvas.width / 2, canvas.height - 150);

    canvas.toBlob((blob) => {
      resolve({ blob: blob!, duration: 10.0, sceneName: 'strokes' });
    }, 'image/png');
  });
}

async function generateScene4(usageExample: { word: string; reading: string; translation: string }): Promise<{ blob: Blob; duration: number; sceneName: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 70px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("How to use it?", canvas.width / 2, canvas.height / 2 - 200);

    ctx.font = 'bold 90px serif';
    ctx.fillText(usageExample.word, canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '60px sans-serif';
    ctx.fillText(usageExample.reading, canvas.width / 2, canvas.height / 2 + 80);

    ctx.font = '55px sans-serif';
    ctx.fillText(usageExample.translation, canvas.width / 2, canvas.height / 2 + 200);

    canvas.toBlob((blob) => {
      resolve({ blob: blob!, duration: 3.0, sceneName: 'usage' });
    }, 'image/png');
  });
}

async function generateScene5(kanji: string, meaning: string, difficulty: string): Promise<{ blob: Blob; duration: number; sceneName: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${kanji} = ${meaning}`, canvas.width / 2, canvas.height / 2 - 150);

    ctx.font = 'bold 70px sans-serif';
    ctx.fillText(`Level: ${difficulty}`, canvas.width / 2, canvas.height / 2 + 50);

    ctx.font = '50px sans-serif';
    ctx.fillText("Share if you learned", canvas.width / 2, canvas.height / 2 + 200);
    ctx.fillText("something new!", canvas.width / 2, canvas.height / 2 + 280);

    canvas.toBlob((blob) => {
      resolve({ blob: blob!, duration: 3.0, sceneName: 'conclusion' });
    }, 'image/png');
  });
}

export async function downloadScenes(scenes: SceneImage[], kanji: string) {
  const zip = await createZip(scenes, kanji);
  const url = URL.createObjectURL(zip);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KanjiFlow_${kanji}_${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function createZip(scenes: SceneImage[], kanji: string): Promise<Blob> {
  const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
  const zip = new JSZip();

  scenes.forEach((scene, index) => {
    zip.file(`scene_${index + 1}_${scene.sceneName}_${scene.duration}s.png`, scene.blob);
  });

  const instructions = `KanjiFlow Video Instructions
Kanji: ${kanji}
Total Duration: 20 seconds

Scenes:
${scenes.map((s, i) => `${i + 1}. ${s.sceneName} (${s.duration}s)`).join('\n')}

To create the final video:
1. Import all PNG files into your video editor (CapCut, iMovie, Premiere, etc.)
2. Arrange scenes in order (scene_1 to scene_5)
3. Set each scene duration according to the filename
4. Add Lo-fi Japanese music as background
5. Add text-to-speech narration if desired
6. Export as MP4 (1080x1920, 30fps)
`;

  zip.file('README.txt', instructions);

  return await zip.generateAsync({ type: 'blob' });
}

export async function downloadVideo(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

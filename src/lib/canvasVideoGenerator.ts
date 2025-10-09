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

export async function generateKanjiVideo(data: KanjiVideoData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  const frames: ImageData[] = [];
  const fps = 30;
  const totalDuration = 20;
  const totalFrames = fps * totalDuration;

  const sceneDurations = [
    { name: 'opening', duration: 1, frames: fps * 1 },
    { name: 'category', duration: 3, frames: fps * 3 },
    { name: 'strokes', duration: 10, frames: fps * 10 },
    { name: 'usage', duration: 3, frames: fps * 3 },
    { name: 'conclusion', duration: 3, frames: fps * 3 }
  ];

  let currentFrame = 0;

  for (const scene of sceneDurations) {
    for (let i = 0; i < scene.frames; i++) {
      const progress = i / scene.frames;

      switch (scene.name) {
        case 'opening':
          drawOpeningScene(ctx, canvas, progress);
          break;
        case 'category':
          drawCategoryScene(ctx, canvas, data.category, progress);
          break;
        case 'strokes':
          drawStrokesScene(ctx, canvas, data.kanji, data.totalStrokes, progress);
          break;
        case 'usage':
          drawUsageScene(ctx, canvas, data.usageExample, progress);
          break;
        case 'conclusion':
          drawConclusionScene(ctx, canvas, data.kanji, data.meaning, data.difficulty, progress);
          break;
      }

      frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      currentFrame++;
    }
  }

  return await createWebMVideo(frames, canvas.width, canvas.height, fps);
}

function drawOpeningScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const opacity = Math.min(progress * 2, 1);
  ctx.globalAlpha = opacity;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Today's Kanji", canvas.width / 2, canvas.height / 2 - 50);

  ctx.font = '60px sans-serif';
  ctx.fillText("Can you write this?", canvas.width / 2, canvas.height / 2 + 80);

  ctx.globalAlpha = 1;
}

function drawCategoryScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, category: string, progress: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = 0.8 + (Math.sin(progress * Math.PI) * 0.2);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 70px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("Why this Kanji?", canvas.width / 2, canvas.height / 2 - 100);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 90px sans-serif';
  ctx.fillText(`Category: ${category.toUpperCase()}`, canvas.width / 2, canvas.height / 2 + 100);

  ctx.restore();
}

function drawStrokesScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kanji: string, totalStrokes: number, progress: number) {
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(200, 180, 150, 0.2)';
  for (let i = 0; i < 20; i++) {
    const seed = i * 137.508;
    ctx.fillRect(
      (Math.sin(seed) * 0.5 + 0.5) * canvas.width,
      (Math.cos(seed) * 0.5 + 0.5) * canvas.height,
      120,
      120
    );
  }

  const strokeProgress = progress;
  ctx.globalAlpha = strokeProgress;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 500px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kanji, canvas.width / 2, canvas.height / 2);

  ctx.globalAlpha = 1;

  const currentStroke = Math.floor(progress * totalStrokes) + 1;
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText(`Stroke ${Math.min(currentStroke, totalStrokes)}/${totalStrokes}`, canvas.width / 2, canvas.height - 150);
}

function drawUsageScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, usageExample: { word: string; reading: string; translation: string }, progress: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const slideIn = Math.min(progress * 1.5, 1);
  const offset = (1 - slideIn) * 200;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 70px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("How to use it?", canvas.width / 2, canvas.height / 2 - 200 - offset);

  ctx.font = 'bold 90px serif';
  ctx.fillText(usageExample.word, canvas.width / 2, canvas.height / 2 - 50);

  ctx.font = '60px sans-serif';
  ctx.fillText(usageExample.reading, canvas.width / 2, canvas.height / 2 + 80);

  ctx.font = '55px sans-serif';
  ctx.fillText(usageExample.translation, canvas.width / 2, canvas.height / 2 + 200 + offset);
}

function drawConclusionScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kanji: string, meaning: string, difficulty: string, progress: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.05;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 120px serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${kanji} = ${meaning}`, canvas.width / 2, canvas.height / 2 - 150);

  ctx.font = 'bold 70px sans-serif';
  ctx.fillText(`Level: ${difficulty}`, canvas.width / 2, canvas.height / 2 + 50);

  ctx.font = '50px sans-serif';
  ctx.fillText("Share if you learned", canvas.width / 2, canvas.height / 2 + 200);
  ctx.fillText("something new!", canvas.width / 2, canvas.height / 2 + 280);

  ctx.restore();
}

async function createWebMVideo(frames: ImageData[], width: number, height: number, fps: number): Promise<Blob> {
  const stream = new MediaStream();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const canvasStream = canvas.captureStream(fps);
  canvasStream.getTracks().forEach(track => stream.addTrack(track));

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000
  });

  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.onerror = (e) => {
      reject(e);
    };

    mediaRecorder.start();

    let frameIndex = 0;
    const frameInterval = 1000 / fps;

    const drawNextFrame = () => {
      if (frameIndex < frames.length) {
        ctx.putImageData(frames[frameIndex], 0, 0);
        frameIndex++;
        setTimeout(drawNextFrame, frameInterval);
      } else {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }
    };

    drawNextFrame();
  });
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

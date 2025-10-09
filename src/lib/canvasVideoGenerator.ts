import { AudioGenerator, mergeVideoAndAudio } from './audioGenerator';

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

export async function generateKanjiVideo(data: KanjiVideoData, withAudio: boolean = true): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  const quizOptions = generateQuizOptions(data.meaning);

  const fps = 30;
  const sceneDurations = [
    { name: 'hook', duration: 2, frames: fps * 2 },
    { name: 'quiz', duration: 4, frames: fps * 4 },
    { name: 'reveal', duration: 5, frames: fps * 5 },
    { name: 'meaning', duration: 5, frames: fps * 5 },
    { name: 'trivia', duration: 4, frames: fps * 4 }
  ];

  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp8',
    videoBitsPerSecond: 2500000
  });

  const chunks: Blob[] = [];

  const videoPromise = new Promise<Blob>((resolve, reject) => {
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
  });

  mediaRecorder.start();

  for (const scene of sceneDurations) {
    for (let i = 0; i < scene.frames; i++) {
      const progress = i / scene.frames;

      switch (scene.name) {
        case 'hook':
          drawHookScene(ctx, canvas, data.kanji, progress);
          break;
        case 'quiz':
          drawQuizScene(ctx, canvas, data.kanji, quizOptions, progress);
          break;
        case 'reveal':
          drawRevealScene(ctx, canvas, data.kanji, data.meaning, progress);
          break;
        case 'meaning':
          drawMeaningScene(ctx, canvas, data.kanji, data.meaning, data.usageExample, progress);
          break;
        case 'trivia':
          drawTriviaScene(ctx, canvas, data.category, data.difficulty, progress);
          break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    }
  }

  mediaRecorder.stop();
  stream.getTracks().forEach(track => track.stop());

  const videoBlob = await videoPromise;

  canvas.width = 0;
  canvas.height = 0;

  if (!withAudio) {
    return videoBlob;
  }

  try {
    const audioGen = new AudioGenerator();
    const audioBuffer = await audioGen.createMasterAudioTrack(20, data.totalStrokes);
    const audioBlob = await audioGen.audioBufferToWav(audioBuffer);

    const finalVideo = await mergeVideoAndAudio(videoBlob, audioBlob);
    return finalVideo;
  } catch (error) {
    console.warn('Audio generation failed, returning video without audio:', error);
    return videoBlob;
  }
}

function drawHookScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kanji: string, progress: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = 0.5 + progress * 0.5;
  const opacity = Math.min(progress * 2, 1);

  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 70px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Can you read this?', canvas.width / 2, canvas.height / 2 - 300);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 600px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kanji, 0, 0);
  ctx.restore();

  ctx.fillStyle = '#FF6B6B';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('🤔', canvas.width / 2, canvas.height / 2 + 400);

  ctx.globalAlpha = 1;
}

function drawQuizScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kanji: string, options: string[], progress: number) {
  ctx.fillStyle = '#0f3460';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 400px serif';
  ctx.textAlign = 'center';
  ctx.fillText(kanji, canvas.width / 2, 500);

  const colors = ['#e94560', '#16213e', '#533483'];
  const letters = ['A', 'B', 'C'];

  const slideIn = Math.min(progress * 2, 1);
  const offset = (1 - slideIn) * 300;

  for (let i = 0; i < 3; i++) {
    const y = 900 + i * 280;
    const boxOffset = i * 50;

    ctx.fillStyle = colors[i];
    ctx.fillRect(100, y - 80 + offset + boxOffset, 880, 200);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(letters[i], 150, y + 40 + offset + boxOffset);

    ctx.font = '60px sans-serif';
    ctx.fillText(options[i], 280, y + 40 + offset + boxOffset);
  }

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Think fast! ⏱️', canvas.width / 2, 750);
}

function generateQuizOptions(correctMeaning: string): string[] {
  const wrongOptions = [
    'Love', 'Dream', 'Heart', 'Hope', 'Peace', 'Joy', 'Light', 'Star',
    'Moon', 'Sun', 'Rain', 'Wind', 'Fire', 'Water', 'Tree', 'Flower',
    'Bird', 'Fish', 'Mountain', 'River', 'Sky', 'Cloud', 'Thunder', 'Snow'
  ].filter(opt => opt.toLowerCase() !== correctMeaning.toLowerCase());

  const shuffled = wrongOptions.sort(() => Math.random() - 0.5);
  const options = [correctMeaning, shuffled[0], shuffled[1]];
  return options.sort(() => Math.random() - 0.5);
}

function drawRevealScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kanji: string, meaning: string, progress: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (progress < 0.3) {
    const circleProgress = progress / 0.3;
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 150 * circleProgress, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = circleProgress;
    ctx.fillText('✓', canvas.width / 2, canvas.height / 2);
    ctx.globalAlpha = 1;
  } else {
    const scale = 1 + Math.sin((progress - 0.3) * Math.PI * 3) * 0.1;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 - 200);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 450px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kanji, 0, 0);
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 100px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('=', canvas.width / 2, canvas.height / 2 + 250);

    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 120px sans-serif';
    ctx.fillText(meaning.toUpperCase(), canvas.width / 2, canvas.height / 2 + 450);
  }
}

function drawOldStrokesScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kanji: string, totalStrokes: number, progress: number) {
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

  const strokeDuration = 1 / totalStrokes;
  const holdTime = 0.7;
  const transitionTime = 0.3;

  const currentStrokeIndex = Math.floor(progress * totalStrokes);
  const progressInCurrentStroke = (progress * totalStrokes) - currentStrokeIndex;

  let strokesToShow = currentStrokeIndex;
  let opacity = 1.0;

  if (progressInCurrentStroke < holdTime) {
    strokesToShow = currentStrokeIndex;
    opacity = 1.0;
  } else {
    const transitionProgress = (progressInCurrentStroke - holdTime) / transitionTime;
    strokesToShow = currentStrokeIndex;
    opacity = 1.0;

    const nextStrokeOpacity = transitionProgress;

    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 500px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.font = 'bold 500px serif';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = '#000000';
    tempCtx.fillText(kanji, tempCanvas.width / 2, tempCanvas.height / 2);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const maskData = createStrokeMask(imageData, currentStrokeIndex, totalStrokes);
    tempCtx.putImageData(maskData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);

    if (nextStrokeOpacity > 0 && currentStrokeIndex + 1 < totalStrokes) {
      const nextTempCanvas = document.createElement('canvas');
      nextTempCanvas.width = canvas.width;
      nextTempCanvas.height = canvas.height;
      const nextTempCtx = nextTempCanvas.getContext('2d')!;

      nextTempCtx.font = 'bold 500px serif';
      nextTempCtx.textAlign = 'center';
      nextTempCtx.textBaseline = 'middle';
      nextTempCtx.fillStyle = '#000000';
      nextTempCtx.fillText(kanji, nextTempCanvas.width / 2, nextTempCanvas.height / 2);

      const nextImageData = nextTempCtx.getImageData(0, 0, nextTempCanvas.width, nextTempCanvas.height);
      const nextMaskData = createStrokeMask(nextImageData, currentStrokeIndex + 1, totalStrokes);
      nextTempCtx.clearRect(0, 0, nextTempCanvas.width, nextTempCanvas.height);
      nextTempCtx.putImageData(nextMaskData, 0, 0);

      ctx.globalAlpha = nextStrokeOpacity;
      ctx.drawImage(nextTempCanvas, 0, 0);
    }

    ctx.restore();

    const displayStroke = Math.min(currentStrokeIndex + 1, totalStrokes);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText(`Stroke ${displayStroke}/${totalStrokes}`, canvas.width / 2, canvas.height - 150);
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 500px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d')!;

  tempCtx.font = 'bold 500px serif';
  tempCtx.textAlign = 'center';
  tempCtx.textBaseline = 'middle';
  tempCtx.fillStyle = '#000000';
  tempCtx.fillText(kanji, tempCanvas.width / 2, tempCanvas.height / 2);

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const maskData = createStrokeMask(imageData, strokesToShow, totalStrokes);
  tempCtx.putImageData(maskData, 0, 0);

  ctx.drawImage(tempCanvas, 0, 0);
  ctx.restore();

  const displayStroke = Math.min(strokesToShow + 1, totalStrokes);
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText(`Stroke ${displayStroke}/${totalStrokes}`, canvas.width / 2, canvas.height - 150);
}

function createStrokeMask(imageData: ImageData, currentStroke: number, totalStrokes: number): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const result = new ImageData(width, height);
  const resultData = result.data;

  const regions: {pixels: number[], x: number, y: number}[] = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 128 && !visited[y * width + x]) {
        const region = floodFill(data, visited, x, y, width, height);
        if (region.length > 100) {
          const centerX = region.reduce((sum, p) => sum + (p % width), 0) / region.length;
          const centerY = region.reduce((sum, p) => sum + Math.floor(p / width), 0) / region.length;
          regions.push({pixels: region, x: centerX, y: centerY});
        }
      }
    }
  }

  regions.sort((a, b) => {
    const diffY = a.y - b.y;
    if (Math.abs(diffY) > height * 0.1) return diffY;
    return a.x - b.x;
  });

  const strokesPerRegion = Math.max(1, Math.floor(totalStrokes / Math.max(1, regions.length)));
  const regionsToShow = Math.min(Math.ceil((currentStroke + 1) / strokesPerRegion), regions.length);

  for (let i = 0; i < regionsToShow && i < regions.length; i++) {
    const region = regions[i];
    for (const pixelIndex of region.pixels) {
      const srcIdx = pixelIndex * 4;
      resultData[srcIdx] = data[srcIdx];
      resultData[srcIdx + 1] = data[srcIdx + 1];
      resultData[srcIdx + 2] = data[srcIdx + 2];
      resultData[srcIdx + 3] = data[srcIdx + 3];
    }
  }

  return result;
}

function floodFill(data: Uint8ClampedArray, visited: Uint8Array, startX: number, startY: number, width: number, height: number): number[] {
  const stack = [{x: startX, y: startY}];
  const region: number[] = [];

  while (stack.length > 0) {
    const {x, y} = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) continue;

    const idx = pixelIndex * 4;
    if (data[idx + 3] <= 128) continue;

    visited[pixelIndex] = 1;
    region.push(pixelIndex);

    stack.push({x: x + 1, y});
    stack.push({x: x - 1, y});
    stack.push({x, y: y + 1});
    stack.push({x, y: y - 1});
  }

  return region;
}

function drawMeaningScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kanji: string, meaning: string, usageExample: { word: string; reading: string; translation: string }, progress: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#833ab4');
  gradient.addColorStop(0.5, '#fd1d1d');
  gradient.addColorStop(1, '#fcb045');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 75px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Real Life Usage:', canvas.width / 2, 250);

  const bounce = 1 + Math.sin(progress * Math.PI * 6) * 0.03;
  ctx.save();
  ctx.translate(canvas.width / 2, 550);
  ctx.scale(bounce, bounce);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 150px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(usageExample.word, 0, 0);
  ctx.restore();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '70px sans-serif';
  ctx.fillText(usageExample.reading, canvas.width / 2, 750);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 65px sans-serif';
  const translation = usageExample.translation;
  if (translation.length > 30) {
    const mid = translation.lastIndexOf(' ', translation.length / 2);
    ctx.fillText(translation.substring(0, mid), canvas.width / 2, 950);
    ctx.fillText(translation.substring(mid + 1), canvas.width / 2, 1050);
  } else {
    ctx.fillText(translation, canvas.width / 2, 1000);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '55px sans-serif';
  ctx.fillText('💡', canvas.width / 2, 1300);
}

function drawTriviaScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, category: string, difficulty: string, progress: number) {
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 50; i++) {
    const x = (Math.sin(i * 0.5 + progress * 5) * 0.5 + 0.5) * canvas.width;
    const y = (Math.cos(i * 0.3 + progress * 3) * 0.5 + 0.5) * canvas.height;
    const size = 3 + Math.sin(progress * 10 + i) * 2;
    ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(progress * 8 + i) * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.08;

  ctx.save();
  ctx.translate(canvas.width / 2, 400);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 70px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ Fun Fact ✨', 0, 0);
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 65px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Category:', canvas.width / 2, 650);

  ctx.fillStyle = '#4ECDC4';
  ctx.font = 'bold 85px sans-serif';
  ctx.fillText(category.toUpperCase(), canvas.width / 2, 800);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 65px sans-serif';
  ctx.fillText('Difficulty:', canvas.width / 2, 1050);

  const difficultyColor = difficulty.toLowerCase() === 'beginner' ? '#4CAF50' :
                          difficulty.toLowerCase() === 'intermediate' ? '#FF9800' : '#F44336';
  ctx.fillStyle = difficultyColor;
  ctx.font = 'bold 85px sans-serif';
  ctx.fillText(difficulty.toUpperCase(), canvas.width / 2, 1200);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('👆 Follow for daily kanji!', canvas.width / 2, 1550);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '50px sans-serif';
  ctx.fillText('Share if this helped! 🔄', canvas.width / 2, 1700);
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

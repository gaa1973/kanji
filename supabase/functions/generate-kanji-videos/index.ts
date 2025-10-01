import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KanjiVideoRequest {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { kanjiList } = await req.json();

    if (!kanjiList || !Array.isArray(kanjiList) || kanjiList.length === 0) {
      return new Response(
        JSON.stringify({ error: "kanjiList is required and must be a non-empty array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

    for (const kanjiData of kanjiList as KanjiVideoRequest[]) {
      console.log(`Processing kanji: ${kanjiData.kanji}`);

      const backgroundPrompt = `Japanese calligraphy background, traditional washi paper texture, subtle beige and cream colors, minimalist zen aesthetic, soft lighting, 1080x1920 vertical format, elegant and serene atmosphere`;

      const strokeDuration = 10.0 / kanjiData.totalStrokes;

      const videoMetadata = {
        kanji: kanjiData.kanji,
        meaning: kanjiData.meaning,
        category: kanjiData.category,
        difficulty: kanjiData.difficulty,
        totalStrokes: kanjiData.totalStrokes,
        usageExample: kanjiData.usageExample,
        backgroundPrompt: backgroundPrompt,
        strokeDuration: strokeDuration,
        timeline: [
          {
            start: 0.0,
            duration: 1.0,
            scene: "opening",
            content: "Today's Kanji - Can you write this?",
            background: "black",
            textColor: "white"
          },
          {
            start: 1.0,
            duration: 3.0,
            scene: "category",
            content: `Why this Kanji? Category: ${kanjiData.category.toUpperCase()}`,
            background: "black",
            textColor: "white"
          },
          {
            start: 4.0,
            duration: 10.0,
            scene: "strokes",
            content: `Stroke-by-stroke demonstration (${kanjiData.totalStrokes} strokes total)`,
            background: "background_image",
            strokesPerSecond: strokeDuration,
            telop: "Stroke $i/$totalStrokes"
          },
          {
            start: 14.0,
            duration: 3.0,
            scene: "usage",
            content: `How to use it? ${kanjiData.usageExample.word} (${kanjiData.usageExample.reading})`,
            translation: kanjiData.usageExample.translation,
            background: "black",
            textColor: "white"
          },
          {
            start: 17.0,
            duration: 3.0,
            scene: "conclusion",
            content: `${kanjiData.kanji} = ${kanjiData.meaning}`,
            subtitle: `Level: ${kanjiData.difficulty}`,
            callToAction: "Share if you learned something new!",
            background: "black",
            textColor: "white"
          }
        ],
        processing: {
          step1_background: {
            tool: "Image Generation Tool (Stable Diffusion / Midjourney / DALL-E)",
            prompt: backgroundPrompt,
            resolution: "1080x1920",
            format: "jpg",
            output: `temp/background_${kanjiData.kanji}.jpg`
          },
          step2_strokes: {
            tool: "Image Generation Tool",
            logic: `Generate ${kanjiData.totalStrokes} sequential images, each adding one stroke`,
            format: "png",
            background: "Use background image as base layer",
            output: `temp/${kanjiData.kanji}/stroke_*.png`
          },
          step3_video: {
            tool: "Video Editing Tool (FFmpeg)",
            inputs: {
              images: "All stroke sequence images",
              bgm: "SFX/LoFi_Japanese_Chill.mp3",
              sfx: "SFX/brush_strike.wav"
            },
            composition: {
              opening: "4 seconds black background with telops",
              strokes: "10 seconds stroke animation (0.8s per stroke, auto-adjusted)",
              ending: "6 seconds usage and conclusion",
              totalDuration: "20 seconds"
            },
            telops: "Insert at specified timings (center or bottom of screen)",
            output: `output/KanjiFlow_${kanjiData.kanji}_${dateStr}.mp4`
          }
        }
      };

      const filename = `KanjiFlow_${kanjiData.kanji}_${dateStr}.mp4`;

      results.push({
        kanji: kanjiData.kanji,
        filename: filename,
        metadata: videoMetadata
      });

      const { error: insertError } = await supabase
        .from('video_generation_queue')
        .insert({
          kanji: kanjiData.kanji,
          metadata: videoMetadata,
          filename: filename,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (insertError && insertError.code !== '42P01') {
        console.error('Error inserting to queue:', insertError);
      }
    }

    const zipFilename = `KanjiFlow_Weekly_Download_${dateStr}.zip`;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${kanjiList.length} kanji videos queued for processing`,
        zipFilename: zipFilename,
        results: results,
        processingSteps: [
          "Step 1: Generate background images (1080x1920 jpg)",
          "Step 2: Generate stroke sequence images (png with background layer)",
          "Step 3: Compose video with FFmpeg (20 seconds, with BGM and SFX)",
          "Step 4: Add telops at specified timings",
          "Step 5: Export as MP4 files",
          "Step 6: Create ZIP archive of all videos",
          "Step 7: Cleanup temp files"
        ],
        requirements: [
          "Image Generation API (Stable Diffusion / Midjourney / DALL-E)",
          "FFmpeg for video composition and editing",
          "Audio files: LoFi_Japanese_Chill.mp3, brush_strike.wav",
          "Server storage and processing capacity"
        ],
        implementationNote: "Full implementation requires external services integration. This response provides the complete specification for video generation workflow."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-kanji-videos:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
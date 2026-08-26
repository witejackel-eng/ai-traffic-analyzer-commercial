import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { mkdir, writeFile, createReadStream, stat } from "fs/promises";
import { createWriteStream } from "fs";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";

export const maxDuration = 300; // 5 minutes for large video uploads on Vercel

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  const file = form.get("file") as File | null;
  const projectId = String(form.get("projectId") || "");
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const maxSize = config.maxUploadMb * 1024 * 1024;
  if (file.size > maxSize) return NextResponse.json({ error: `File exceeds ${config.maxUploadMb}MB limit (file is ${(file.size / 1024 / 1024).toFixed(0)}MB)` }, { status: 413 });

  // Validate extension — NEVER trust the browser-provided MIME type.
  const allowed = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];
  const ext = path.extname(file.name).toLowerCase();
  if (!allowed.includes(ext)) return NextResponse.json({ error: `Unsupported format. Allowed: ${allowed.join(", ")}` }, { status: 415 });

  // Reject empty files.
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });

  // Sanitize filename — strip path components and dangerous chars.
  const basename = file.name.replace(/[\\/]/g, "/").split("/").pop() || "upload";
  let safeBase = basename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").replace(/^\.+/, "");
  if (!safeBase) safeBase = "upload";
  safeBase = safeBase.slice(0, 80);

  const internalId = randomUUID();
  const dir = path.join(process.cwd(), config.videoStoragePath, projectId);
  await mkdir(dir, { recursive: true });
  const storedName = `${internalId}${ext}`;
  const fullPath = path.join(dir, storedName);
  const fileSizeMb = (file.size / 1024 / 1024).toFixed(1);

  // Validate the project exists before creating the video record.
  // This prevents a 500 FK constraint error (P2003) when the project was
  // deleted but the UI still shows its card.
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json(
      { error: `Project not found (id: ${projectId}). The project may have been deleted. Please refresh the page.` },
      { status: 404 },
    );
  }

  // Create the DB record FIRST — before writing the file — so the response
  // is instant. The file write + probe happen in the background.
  const video = await db.videoAsset.create({
    data: {
      projectId,
      filename: safeBase,
      filePath: `${config.videoStoragePath}/${projectId}/${storedName}`,
      duration: 0,
      width: 0,
      height: 0,
      fps: 30,
      frameCount: 0,
      status: "PROCESSING",
    },
  });

  const totalMs = Date.now() - t0;
  console.log(`[upload] ${safeBase} (${fileSizeMb}MB) DB record created in ${totalMs}ms, writing+probing in background`);

  // Background: write the file to disk, then probe it, then update the DB.
  // This runs AFTER the HTTP response has been sent.
  const backgroundWriteAndProbe = async () => {
    try {
      // Write the file to disk
      const fileStream = Readable.fromWeb(file.stream() as ReadableStream);
      const writeStream = createWriteStream(fullPath);
      await pipeline(fileStream, writeStream);
      console.log(`[upload] file written: ${safeBase} (${fileSizeMb}MB)`);

      // Probe the file with ffprobe (ultra-fast)
      try {
        const { probeVideo } = await import("@/lib/video-probe");
        const meta = await probeVideo(fullPath);
        await db.videoAsset.update({
          where: { id: video.id },
          data: {
            duration: meta.duration,
            width: meta.width,
            height: meta.height,
            fps: meta.fps,
            frameCount: meta.frameCount,
            status: "READY",
          },
        }).catch(() => {});
        console.log(`[upload] probe done: ${meta.width}x${meta.height} ${meta.duration}s`);
      } catch (probeErr) {
        // Probe failed — still mark READY
        await db.videoAsset.update({
          where: { id: video.id },
          data: { status: "READY" },
        }).catch(() => {});
        console.warn(`[upload] probe failed:`, (probeErr as Error).message.slice(0, 100));
      }
    } catch (writeErr) {
      // Write failed — mark the video as failed
      await db.videoAsset.update({
        where: { id: video.id },
        data: { status: "FAILED" },
      }).catch(() => {});
      console.error(`[upload] write failed:`, (writeErr as Error).message.slice(0, 150));
    }
  };

  // Fire-and-forget: start writing in the background.
  // On Vercel/serverless, this may be cut short — but the DB record exists.
  if (typeof (globalThis as any).waitUntil === "function") {
    (globalThis as any).waitUntil(backgroundWriteAndProbe());
  } else {
    backgroundWriteAndProbe();
  }

  // Return IMMEDIATELY — the file is being written in the background.
  return NextResponse.json(
    {
      video,
      codec: "probing",
      uploadStats: {
        sizeMb: parseFloat(fileSizeMb),
        totalMs,
        backgroundProbe: true,
      },
    },
    { status: 201 },
  );
}

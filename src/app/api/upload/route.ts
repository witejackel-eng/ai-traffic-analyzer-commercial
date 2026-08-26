import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";

export const maxDuration = 300;

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

  const allowed = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];
  const ext = path.extname(file.name).toLowerCase();
  if (!allowed.includes(ext)) return NextResponse.json({ error: `Unsupported format. Allowed: ${allowed.join(", ")}` }, { status: 415 });
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });

  // Sanitize filename
  const basename = file.name.replace(/[\\/]/g, "/").split("/").pop() || "upload";
  let safeBase = basename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, ".").replace(/^\.+/, "");
  if (!safeBase) safeBase = "upload";
  safeBase = safeBase.slice(0, 80);

  // Validate project exists
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found. Please refresh the page." }, { status: 404 });
  }

  const internalId = randomUUID();
  const dir = path.join(process.cwd(), config.videoStoragePath, projectId);
  await mkdir(dir, { recursive: true });
  const storedName = `${internalId}${ext}`;
  const fullPath = path.join(dir, storedName);
  const fileSizeMb = (file.size / 1024 / 1024).toFixed(1);

  // STEP 1: Write the file to disk SYNCHRONOUSLY (stream-to-disk).
  // This MUST complete before returning, because file.stream() is tied
  // to the request body — if we return first, Next.js closes the body
  // and the stream crashes.
  try {
    const fileStream = Readable.fromWeb(file.stream() as ReadableStream);
    const writeStream = createWriteStream(fullPath);
    await pipeline(fileStream, writeStream);
  } catch (e) {
    console.error("[upload] write failed:", (e as Error).message.slice(0, 150));
    return NextResponse.json({ error: "Failed to write video file to disk." }, { status: 500 });
  }
  const writeMs = Date.now() - t0;

  // STEP 2: Probe the file with ffprobe (ultra-fast, <200ms with -analyzeduration 0)
  let duration = 0, width = 0, height = 0, fps = 30, frameCount = 0, codec = "unknown";
  try {
    const { probeVideo } = await import("@/lib/video-probe");
    const meta = await probeVideo(fullPath);
    duration = meta.duration;
    width = meta.width;
    height = meta.height;
    fps = meta.fps;
    frameCount = meta.frameCount;
    codec = meta.codec;
  } catch (e) {
    console.warn("[upload] probe failed:", (e as Error).message.slice(0, 100));
  }

  // STEP 3: Create the DB record with real metadata + status READY
  const video = await db.videoAsset.create({
    data: {
      projectId,
      filename: safeBase,
      filePath: `${config.videoStoragePath}/${projectId}/${storedName}`,
      duration,
      width,
      height,
      fps,
      frameCount,
      status: "READY",
    },
  });

  const totalMs = Date.now() - t0;
  console.log(`[upload] ${safeBase} (${fileSizeMb}MB) write=${writeMs}ms probe+db=${totalMs - writeMs}ms total=${totalMs}ms`);

  return NextResponse.json(
    {
      video,
      codec,
      uploadStats: { sizeMb: parseFloat(fileSizeMb), writeMs, totalMs },
    },
    { status: 201 },
  );
}

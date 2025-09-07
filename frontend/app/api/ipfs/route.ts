// frontend/app/api/ipfs/route.ts
import { NextResponse } from "next/server";

const PINATA = "https://api.pinata.cloud";
const AUTH = { Authorization: `Bearer ${process.env.PINATA_JWT!}` };

async function pinFile(file: File, name: string) {
    const form = new FormData();
    form.append("file", file, file.name || name);
    form.append("pinataMetadata", JSON.stringify({ name }));

    const r = await fetch(`${PINATA}/pinning/pinFileToIPFS`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.PINATA_JWT!}` },
        body: form,
    });

    const txt = await r.text();
    if (!r.ok) throw new Error(txt);

    const j = JSON.parse(txt); // { IpfsHash }
    return `ipfs://${j.IpfsHash}`;
}

async function pinJSON(obj: any, name: string) {
    const r = await fetch(`${PINATA}/pinning/pinJSONToIPFS`, {
        method: "POST",
        headers: { ...AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ pinataMetadata: { name }, pinataContent: obj }),
    });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    return `ipfs://${j.IpfsHash}`;
}

export async function POST(req: Request) {
    try {
        const form = await req.formData();

        const title = (form.get("title") as string) || "Untitled";
        const description = (form.get("description") as string) || "";

        // Cover image (required)
        const image = form.get("file");
        if (!image || typeof image === "string") {
            return NextResponse.json(
                { error: "Cover image is required." },
                { status: 400 }
            );
        }

        const imgFile = image as File;
        if (!imgFile.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "Image must be an image file." },
                { status: 400 }
            );
        }
        if (imgFile.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: "Image too large (max 10MB)." },
                { status: 400 }
            );
        }

        // Unified optional media field (audio or video)
        const media = form.get("media");
        let animationURI: string | undefined;

        if (media && typeof media !== "string") {
            const mediaFile = media as File;
            const okType =
                mediaFile.type.startsWith("audio/") || mediaFile.type.startsWith("video/");
            if (!okType) {
                return NextResponse.json(
                    { error: "Media must be audio or video." },
                    { status: 400 }
                );
            }

            if (mediaFile.type.startsWith("audio/") && mediaFile.size > 30 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "Audio too large (max 30MB)." },
                    { status: 400 }
                );
            }
            if (mediaFile.type.startsWith("video/") && mediaFile.size > 150 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "Video too large (max 150MB)." },
                    { status: 400 }
                );
            }

            animationURI = await pinFile(mediaFile, `${title}-media`);
        }

        // Pin image
        const imageURI = await pinFile(imgFile, `${title}-image`);

        // Build metadata
        const metadata: any = { name: title, description, image: imageURI };
        if (animationURI) metadata.animation_url = animationURI;

        // Pin metadata JSON → tokenURI
        const tokenURI = await pinJSON(metadata, `${title}-metadata`);

        return NextResponse.json({ tokenURI, imageURI, animationURI }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message || "Upload failed" },
            { status: 500 }
        );
    }
}

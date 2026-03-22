import { Worker } from "bullmq";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  mergeAndUpload,
  mergeAndUploadSideBySide,
} from "../selfRecording/controller.js";
import { sendRecordingEmail } from "../mail.js";
import dotenv from "dotenv";
dotenv.config();

const connection = {
  url: process.env.REDIS_URL || "",
};

const prisma = new PrismaClient();

new Worker("video-processing", async (job) => {
  console.log("Processing job:", job.name);
  

  if (job.name === "process-recording") {
    const { sessionId, userEmail } = job.data;

    const room = await prisma.room.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!room) throw new Error("Room not found");

    const urls: string[] = [];
    const screenShareurls: string[] = [];

    for (let i = 0; i < room.participants.length; i++) {
      const p = room.participants[i];

      
      if (!p) {
        console.log("p is undefined");
        return;
      }


      urls[i] = await mergeAndUpload(`${sessionId}_${p.email}_`);
      screenShareurls[i] = await mergeAndUpload(
        `${sessionId}_${p.email}-screen`,
      );
    }

    await prisma.room.update({
      where: { id: sessionId },
      data: {
        recordings: {
          create: room.participants.flatMap((p, i) => {
            const recs: any[] = [];

            if (urls[i]) {
              recs.push({
                url: urls[i],
                type: "individual",
                userId: p.id,
              });
            }

            if (screenShareurls[i]) {
              recs.push({
                url: screenShareurls[i],
                type: "individual-screen",
                userId: p.id,
              });
            }

            return recs;
          }),
        },
      },
    });

    const finalUrl = await mergeAndUploadSideBySide(urls);

    await prisma.room.update({
      where: { id: sessionId },
      data: {
        recordings: {
          create: {
            url: finalUrl!,
            type: "mixed",
          },
        },
      },
    });


    console.log("FULL PIPELINE DONE");
    if(process.env.FRONTEND_URL){
      const link = `${process.env.FRONTEND_URL}/preStudio/${sessionId}`

      await sendRecordingEmail(userEmail, link);
    }

    return { urls, screenShareurls, finalUrl };
  }

}, {connection});

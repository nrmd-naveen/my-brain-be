import { ContentType, PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const REGION = process.env.S3_REGION || "";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  }
})


export const getScreenshot = async (
    url: string,
    screenshotKey: string
) => {
  try {
    // Launch Puppeteer
    const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setViewport({
        width: 1280, 
        height: 720
    });
    await page.goto(url);
    // await page.goto(url,{ timeout: 60000 });

    // Takes a screenshot of the page
    const screenshotBuffer = await page.screenshot();

    // Uploads to S3
    const params = {
      Bucket: "my-brain-store",
      Key: screenshotKey, // Unique filename with path
      Body: screenshotBuffer,
      ContentType: 'image/png',
    };

    const command = new PutObjectCommand(params);
    const uploadResponse = await s3.send(command);

    console.log('Screenshot uploaded successfully:', uploadResponse);

    // Close Puppeteer
    await browser.close();
    const s3URL = `https://${params.Bucket}.s3.${REGION}.amazonaws.com/${screenshotKey}`
    return s3URL; // Returns the S3 URL

  } catch (error) {
    console.error('Error uploading screenshot to S3:', error);
    throw error;
  }
};


export const getContentType = (link: string): ContentType => {
  //https://stackoverflow.com/questions/
  link = link.toLowerCase();
  if (link.includes("youtube.com") || link.includes("youtu.be")) {
    return ContentType.Youtube;
  } else if (link.includes("twitter.com") || link.includes("x.com")) {
    return ContentType.Twitter;
  } else if (link.includes("facebook.com")) {
    return ContentType.Facebook;
  } else if (link.includes("instagram.com")) {
    return ContentType.Instagram;
  } else if (link.includes("linkedin.com")) {
    return ContentType.LinkedIn
  }
  return ContentType.Others
}

export const validateURL = (
  link: string
): {
  url: string,
  isValid: boolean
} => {
  let newLink = link;
  if (!(link.startsWith("https://") || link.startsWith("http://"))) {
    newLink = `https://` + link;
  }
  let isValid = true;
  try {
    const parsedURL = new URL(newLink);
    if (parsedURL.protocol !== "http:" && parsedURL.protocol !== "https:") {
      isValid = false
    }
  } catch (err) {
    isValid = false
    console.error("Invalid URL : ", err)
  }
  return {
    url: newLink,
    isValid
  };
}
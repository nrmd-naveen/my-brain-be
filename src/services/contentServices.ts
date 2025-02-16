import { ContentType, PrismaClient } from "@prisma/client";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
const cheerio = require('cheerio');

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
    const ImageReqURL = `https://image.thum.io/get/png/width/1280/crop/720/${url}`
    const response = await fetch(ImageReqURL);
    console.log(response);
    if (!response.ok) {
      throw new Error(`Failed to fetch image. Status: ${response.status}`);
    }
    //@ts-ignore
    const image = await response.arrayBuffer();
    const params = {
      Bucket: "my-brain-store",
      Key: screenshotKey,
      Body: Buffer.from(image), 
      ContentType: 'image/png',
    };
    const command = new PutObjectCommand(params);
    const uploadResponse = await s3.send(command);
    console.log('Screenshot uploaded successfully:', uploadResponse);
    const s3URL = `https://${params.Bucket}.s3.${REGION}.amazonaws.com/${screenshotKey}`
    return s3URL;
  } catch (error) {
    console.error('Error uploading screenshot to S3:', error);
    return null;
  }

}

// export const getScreenshot = async (
//     url: string,
//     screenshotKey: string
// ) => {
//   try {
//     // Launch Puppeteer
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.setViewport({ width: 1280, height: 720 });
//     await page.goto(url);

//     // Wait for the popup close button to appear (if present)
//     await page.waitForSelector('[aria-label="Dismiss"]', { visible: true, timeout: 5000 })
//       .then(async () => {
//         // Once the button is visible, click it
//         const closeButton = await page.$('[aria-label="Dismiss"]');
//         if (closeButton) {
//           await closeButton.click();
//         }
//       })
//       .catch(() => {
//         console.log('Dismiss button not found or not visible');
//       });

//     // Get the page title
//     const title = await page.title();

//     // Take a screenshot
//     const screenshotBuffer = await page.screenshot();

//     // Upload to S3
//     const params = {
//       Bucket: "my-brain-store",
//       Key: screenshotKey, // Unique filename with path
//       Body: screenshotBuffer,
//       ContentType: 'image/png',
//     };

//     const command = new PutObjectCommand(params);
//     const uploadResponse = await s3.send(command);

//     console.log('Screenshot uploaded successfully:', uploadResponse);

//     // Close Puppeteer
//     await browser.close();

//     // Generate the S3 URL
//     const s3URL = `https://${params.Bucket}.s3.${REGION}.amazonaws.com/${screenshotKey}`;

//     // Return the S3 URL and the page title
//     return { s3URL, title };

//   } catch (error) {
//     console.error('Error uploading screenshot to S3:', error);
//     throw error;
//   }
// };

export async function getPageTitle(url: string) {
  try {
    // Fetch the HTML of the page
    const response = await fetch(url);
    const html = await response.text();

    // Load the HTML into cheerio
    const $ = cheerio.load(html);

    // Extract the title from the <title> tag
    const title = $('title').text();

    return title;
  } catch (error) {
    console.error('Error fetching title:', error);
    return null;
  }
}


// export const getPageTitle = async (
//     url: string
// ) => {
//   try {
//     // Launch Puppeteer
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.goto(url); 

//     // Get the page title
//     const title = await page.title();

//     // Close Puppeteer
//     await browser.close();

//     return title ;

//   } catch (error) {
//     console.error('Error in getting page title:', error);
//     throw error;
//   }
// };


export const getContentType = (link: string): ContentType => {
  //https://stackoverflow.com/questions/
  link = link.toLowerCase();
  if (link.includes("youtube.com") || link.includes("youtu.be")) {
    return ContentType.Youtube;
  } else if (link.includes("twitter.com") || link.includes("x.com")) {
    return ContentType.Twitter;
  // } else if (link.includes("facebook.com")) {
  //   return ContentType.Facebook;
  } else if (link.includes("instagram.com")) {
    return ContentType.Instagram;
  // } else if (link.includes("linkedin.com")) {
  //   return ContentType.LinkedIn
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

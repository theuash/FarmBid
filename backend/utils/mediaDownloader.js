const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.resolve(process.cwd(), 'uploads/listings');

/**
 * Downloads a file from a URL (e.g., Twilio Media URL) and saves it locally.
 * Returns the local filename relative to the uploads/listings directory.
 */
async function downloadMedia(url, contentType) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Determine extension from content-type
  let extension = 'jpg';
  if (contentType.includes('png')) extension = 'png';
  if (contentType.includes('jpeg')) extension = 'jpg';
  if (contentType.includes('webp')) extension = 'webp';

  const filename = `${uuidv4()}.${extension}`;
  const localPath = path.join(uploadDir, filename);

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filename));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('[MediaDownloader] Error downloading media:', error);
    throw error;
  }
}

/**
 * Saves base64 media data (from WhatsApp) to a local file.
 */
async function saveBase64Media(base64Data, contentType) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let extension = 'jpg';
  if (contentType?.includes('png')) extension = 'png';
  if (contentType?.includes('webp')) extension = 'webp';

  const filename = `${uuidv4()}.${extension}`;
  const localPath = path.join(uploadDir, filename);

  try {
    fs.writeFileSync(localPath, Buffer.from(base64Data, 'base64'));
    return filename;
  } catch (error) {
    console.error('[MediaDownloader] Error saving base64 media:', error);
    throw error;
  }
}

module.exports = { downloadMedia, saveBase64Media };

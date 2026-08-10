require('dotenv').config();
const cloudinary = require('./config/cloudinary');
const fs = require('fs');

async function test() {
  console.log('Testing Cloudinary upload...');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API Key:', process.env.CLOUDINARY_API_KEY);
  
  // Create a tiny text file to test upload
  const filePath = './test-upload.txt';
  fs.writeFileSync(filePath, 'Hello Cloudinary!');

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'taskflow/avatars'
    });
    console.log('Upload successful!');
    console.log('Result URL:', result.secure_url);
  } catch (err) {
    console.error('Upload failed:', err);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

test();

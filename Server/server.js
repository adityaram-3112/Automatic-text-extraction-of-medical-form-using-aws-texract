// Server.js
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const dotenv = require('dotenv');
// Import the cors package
const cors = require('cors'); 
dotenv.config();

const app = express();
const port = 5000;

// Enable CORS
app.use(cors());

// Create S3 and Textract clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Set up Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
});

// Upload file to S3 and process with Textract
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    // Upload the file to S3
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      // Unique file name
      Key: `${Date.now()}-${file.originalname}`, 
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const uploadCommand = new PutObjectCommand(s3Params);
    await s3Client.send(uploadCommand);

    // Invoke Textract on the uploaded file
    const textractParams = {
      Document: {
        S3Object: {
          Bucket: process.env.S3_BUCKET_NAME,
          Name: s3Params.Key,
        },
      },
      // Specify the types of information you want to extract
      FeatureTypes: ['TABLES', 'FORMS'], 
    };

    const analyzeCommand = new AnalyzeDocumentCommand(textractParams);
    const textractResult = await textractClient.send(analyzeCommand);

    // Process the Textract response and prepare to save the output
    const outputFileName = `textract-output-${Date.now()}.json`;
    const outputParams = {
    // Change this to another bucket if desired
      Bucket: process.env.S3_BUCKET_NAME, 
      Key: outputFileName,
      Body: JSON.stringify(textractResult, null, 2),
      ContentType: 'application/json',
    };

    // Upload Textract result to S3
    const outputCommand = new PutObjectCommand(outputParams);
    await s3Client.send(outputCommand);

    res.status(200).json({
      message: 'File processed successfully.',
      s3OutputFile: outputFileName,
    // Optional: Include the Textract result in the response
      textractData: textractResult, 
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send(`Error processing file: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// ============================================================================
// ADMIN API - Image Upload Endpoint
// POST: Upload images to public/uploads directory
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File, Fields, Files } from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

interface ParsedFormData {
  fields: Fields;
  files: Files;
}

async function parseForm(req: NextApiRequest): Promise<ParsedFormData> {
  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB max
    filter: ({ mimetype }) => {
      // Only allow image types
      return mimetype ? mimetype.includes('image') : false;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = await parseForm(req);
    const uploadedFile = files.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Handle single file or array
    const file: File = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

    if (!file.filepath) {
      return res.status(400).json({ error: 'File upload failed' });
    }

    // Generate unique filename
    const ext = path.extname(file.originalFilename || '.jpg');
    const uniqueName = `${uuidv4()}${ext}`;
    const newPath = path.join(uploadDir, uniqueName);

    // Move file to final location with unique name
    fs.renameSync(file.filepath, newPath);

    // Return the public URL
    const publicUrl = `/uploads/${uniqueName}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      originalName: file.originalFilename,
      size: file.size,
      mimeType: file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

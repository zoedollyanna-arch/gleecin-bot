/**
 * Certificate Generation Service
 * Generates PDF certificates for course completion
 */

import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuid } from 'uuid';
import { run, get } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERTS_DIR = path.join(__dirname, '../../uploads/certificates');

// Ensure certificates directory exists
if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

/**
 * Generate PDF Certificate
 * Returns path to generated PDF
 */
export async function generateCertificate(userId, courseName, completionDate = new Date()) {
  try {
    // Get user info
    const user = await get('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) throw new Error('User not found');

    // Generate unique certificate ID
    const certId = `GLEECIN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const filename = `${certId}.pdf`;
    const filePath = path.join(CERTS_DIR, filename);

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Pipe to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Background color
    doc.rect(0, 0, 595, 842).fill('#f5f5f5');

    // Top border
    doc.rect(30, 30, 535, 782)
      .lineWidth(2)
      .stroke('#7B61FF');

    doc.rect(35, 35, 525, 772)
      .lineWidth(1)
      .stroke('#7B61FF');

    // Title
    doc.fontSize(12).fillColor('#666').text('CERTIFICATE OF COMPLETION', 50, 80, {
      align: 'center',
      width: 495
    });

    // Main heading
    doc.fontSize(48).fillColor('#7B61FF').font('Helvetica-Bold')
      .text('GLEECIN Academy', 50, 140, {
        align: 'center',
        width: 495
      });

    // Subtitle
    doc.fontSize(14).fillColor('#333').font('Helvetica').text('This certifies that', 50, 220, {
      align: 'center',
      width: 495
    });

    // Student name
    doc.fontSize(32).fillColor('#000').font('Helvetica-Bold')
      .text(user.username, 50, 260, {
        align: 'center',
        width: 495
      });

    // Has successfully
    doc.fontSize(14).fillColor('#333').font('Helvetica')
      .text('has successfully completed the course', 50, 320, {
        align: 'center',
        width: 495
      });

    // Course name
    doc.fontSize(20).fillColor('#7B61FF').font('Helvetica-Bold')
      .text(courseName, 50, 360, {
        align: 'center',
        width: 495
      });

    // Details section
    doc.fontSize(11).fillColor('#666').font('Helvetica')
      .text(`Completion Date: ${completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 80, 450);

    doc.text(`Certificate ID: ${certId}`, 80, 475);

    // Footer message
    doc.fontSize(10).fillColor('#999')
      .text('This certificate represents the verified completion of the course requirements', 50, 700, {
        align: 'center',
        width: 495
      });

    doc.text('and is recognized by the GLEECIN Academy community.', 50, 720, {
      align: 'center',
      width: 495
    });

    // Close PDF
    doc.end();

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return { path: filePath, filename, certId };
  } catch (error) {
    console.error('[CERTIFICATE GENERATION ERROR]', error);
    throw error;
  }
}

/**
 * Issue Certificate to User
 * Creates database entry and returns certificate
 */
export async function issueCertificate(userId, courseName) {
  try {
    const { path: filePath, filename, certId } = await generateCertificate(userId, courseName);

    // Save relative path for database
    const relativePath = `/uploads/certificates/${filename}`;

    // Insert into database
    const cert = await run(
      `INSERT INTO certificates (user_id, certificate_type, course_name, certificate_url, issued_at, certificate_id, is_custom)
       VALUES ($1, $2, $3, $4, NOW(), $5, false)
       RETURNING *`,
      [userId, 'course_completion', courseName, relativePath, certId]
    );

    return {
      id: cert.id,
      certificateId: certId,
      pdfUrl: relativePath,
      downloadUrl: `/api/certifications/${cert.id}/download`
    };
  } catch (error) {
    console.error('[ISSUE CERTIFICATE ERROR]', error);
    throw error;
  }
}

/**
 * Get Certificate File
 * Returns path to certificate PDF for download
 */
export async function getCertificateFile(certificateId) {
  try {
    const cert = await get(
      'SELECT * FROM certifications WHERE id = $1',
      [certificateId]
    );

    if (!cert) throw new Error('Certificate not found');

    const filePath = path.join(CERTS_DIR, path.basename(cert.pdf_url));
    if (!fs.existsSync(filePath)) {
      throw new Error('Certificate file not found');
    }

    return filePath;
  } catch (error) {
    console.error('[GET CERTIFICATE ERROR]', error);
    throw error;
  }
}

/**
 * Verify Certificate
 * Checks if a certificate is valid
 */
export async function verifyCertificate(certificateId) {
  try {
    const cert = await get(
      `SELECT c.*, u.username 
       FROM certifications c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [certificateId]
    );

    if (!cert) return null;

    return {
      id: cert.id,
      studentName: cert.username,
      courseName: cert.course_name,
      completionDate: cert.completion_date,
      certificateId: cert.certificate_id,
      issued: true
    };
  } catch (error) {
    console.error('[VERIFY CERTIFICATE ERROR]', error);
    throw error;
  }
}

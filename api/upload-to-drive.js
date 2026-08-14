// 이 파일도 Vercel 서버리스 함수예요.
// 사장님의 구글 드라이브 특정 폴더에, 서비스 계정(로봇 계정) 권한으로
// 초상화 이미지를 주문자 정보가 담긴 파일명으로 업로드해요.

const { google } = require('googleapis');
const { Readable } = require('stream');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  try {
    const { imageBase64, mimeType, filename } = req.body || {};
    if (!imageBase64 || !filename) {
      return res.status(400).json({ error: '이미지(imageBase64) 또는 파일명(filename)이 없습니다.' });
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!clientEmail || !rawKey || !folderId) {
      return res.status(500).json({
        error: '서버에 GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_DRIVE_FOLDER_ID 환경변수가 설정되어 있지 않습니다.',
      });
    }

    // Vercel 환경변수에 줄바꿈을 그대로 못 넣는 경우가 많아서 \n 문자를 실제 줄바꿈으로 변환해줘요.
    const privateKey = rawKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const buffer = Buffer.from(imageBase64, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const file = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType || 'image/png',
        body: stream,
      },
      fields: 'id, name, webViewLink',
    });

    return res.status(200).json({
      success: true,
      fileId: file.data.id,
      fileName: file.data.name,
      link: file.data.webViewLink,
    });
  } catch (err) {
    return res.status(500).json({ error: '드라이브 업로드 실패', detail: String(err && err.message ? err.message : err) });
  }
};

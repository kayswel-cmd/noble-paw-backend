// 이 파일도 Vercel 서버리스 함수예요.
// 서비스 계정은 개인 Gmail 드라이브에 저장 용량이 없어서 쓸 수 없기 때문에,
// 사장님이 한 번 OAuth로 승인해서 얻은 refresh token으로 "사장님 본인 자격"으로 업로드해요.

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

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      return res.status(500).json({
        error: '서버에 GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN / GOOGLE_DRIVE_FOLDER_ID 환경변수가 설정되어 있지 않습니다.',
      });
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

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

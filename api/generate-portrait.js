// 이 파일은 Vercel 서버리스 함수예요.
// 브라우저(프론트엔드)는 이 주소(/api/generate-portrait)로만 사진을 보내고,
// 실제 Gemini API 키와 프롬프트는 이 서버 안에서만 사용돼서 외부에 노출되지 않아요.

// ===== 여기서 프롬프트를 미리 고정해둘 수 있어요 =====
const FIXED_PROMPT = `이 반려동물 사진을 17세기 유럽 궁정 유화 초상화 스타일로 변환해줘.
동물의 얼굴 생김새, 털 색, 무늬는 원본 사진과 최대한 동일하게 유지해줘.
목에는 화려한 러프 칼라나 벨벳 소재의 귀족 의상을 입혀줘.
배경은 짙은 버건디 또는 짙은 갈색 톤의 궁정 배경으로 그려줘.
전체적으로 유화 붓터치가 느껴지는 고전 회화 질감으로, 사진이 아니라 그림처럼 보이게 해줘.`;

module.exports = async function handler(req, res) {
  // CORS 허용 (프론트엔드가 다른 주소에서 이 서버를 호출할 수 있게)
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
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: '이미지 데이터(imageBase64)가 없습니다.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '서버에 GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다.' });
    }

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: FIXED_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return res.status(502).json({ error: 'Gemini API 호출에 실패했습니다.', detail: errText });
    }

    const data = await geminiResponse.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content
      ? data.candidates[0].content.parts
      : [];

    const imagePart = (parts || []).find(p => p.inline_data || p.inlineData);
    const inline = imagePart && (imagePart.inline_data || imagePart.inlineData);

    if (!inline) {
      return res.status(502).json({ error: 'Gemini 응답 안에 이미지가 없습니다.', raw: data });
    }

    return res.status(200).json({
      imageBase64: inline.data,
      mimeType: inline.mime_type || inline.mimeType || 'image/png',
    });
  } catch (err) {
    return res.status(500).json({ error: '서버 내부 오류', detail: String(err) });
  }
};

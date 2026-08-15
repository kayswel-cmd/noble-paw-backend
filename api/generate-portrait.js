// 이 파일은 Vercel 서버리스 함수예요.
// 브라우저(프론트엔드)는 이 주소(/api/generate-portrait)로만 사진을 보내고,
// 실제 Gemini API 키와 프롬프트는 이 서버 안에서만 사용돼서 외부에 노출되지 않아요.

// ===== 여기서 컨셉별 프롬프트를 미리 고정해둘 수 있어요 =====
const PROMPTS = {
  baroque: `A vertical master oil painting in the style of 17th-century European baroque noble portraiture, depicting the specific animal seen in the attached photo as a grand nobleman/noblewoman. The pet retains its exact facial features, markings, and expression from the attached photo, dressed in royal velvet and silk attire with ornate gold embroidery, jewel-encrusted collar, and pearls. The portrait is enclosed directly within a luxurious, ornate medieval baroque gilded gold picture frame with intricate filigree, baroque scrollwork, and deep relief carvings. The gold frame forms the exact border of the canvas with no wall or external background visible outside the frame. Rich oil texture, chiaroscuro lighting, deep chiaroscuro contrast, ultra-high resolution, extremely detailed, masterpiece.`,

  y2k: `Transform the pet shown in the provided input image into a charismatic, hip K-pop artist album cover from the early 2000s Y2K millennium era. Keep the pet's facial structure, fur pattern, color, and unique features completely identical to the input image. Dress the pet in iconic millennium fashion: a shiny metallic puffer vest, chunky silver chain necklace, wrap-around tinted visor sunglasses worn on the head, and retro oversized headphones. Set the background to a late-90s/early-2000s cyber aesthetic with futuristic chrome textures, holographic lens flares, subtle wireframe grids, and retro CD-ROM jewel case vibes. Use direct flash photography lighting with a slight fish-eye lens perspective. Render the final output in a vertical 3:4 aspect ratio with ultra-high resolution and 300 DPI print-ready clarity. Do not generate text or frames.`,

  baby: `Core Objective: Place the baby's face, taken exactly as depicted in the provided input photo, at the absolute center of a modern smartphone screen. Make the baby look as if they are forcefully pressed against the front glass surface from inside the display, trying to peek out. The outermost edge of the image canvas must be defined strictly by the thin, sleek outer bezel of the smartphone, with absolutely nothing rendered outside the phone's physical frame.
Character & Expression (Crucial): Maintain the identical facial features, eye shape, identity, and unique characteristics of the baby in the input photo. Do not generate a generic baby. Ensure the expression is engaging, looking directly out from inside the screen.
Compression & Deformity (The Key):

* Cheeks: Emphasize exceptionally chubby, soft, and squishy cheeks. They must appear profoundly pressed and flattened against the glass, creating a comical squished face effect. The skin around the compression area should appear soft, flattened, and spreading slightly with natural pinkish flushing.
* Hands: Crucially, depict chubby baby palms and fingers flattened against the glass surface. Each palm must show distinct pressure points, with the skin spreading. All five fingers on each hand must be rendered correctly, plump but compressed, without any anatomical or finger count errors.
* Nose & Lips: The tip of the nose and the lips should also appear slightly flattened and pressed against the glass.

Overall Aesthetic:

* Style: A soft, semi-realistic style, blending photorealism with the charming aesthetic of high-quality 3D digital illustration. Endearing, playful, and completely free of artificial AI artifacts.
* Skin & Eyes: Render the skin as soft, smooth, and fair with a healthy glow. The eyes must remain very distinct, large, round, and sparkling with clear catchlights, maintaining the true likeness to the source photo.

Composition & Strict Boundary Constraints:

* Framing: The composition terminates precisely at the smartphone's outer bezel. The phone bezel tightly frames the entire canvas edge-to-edge.
* Negative/Strict Constraints: Zero background, tables, hands holding the device, or surrounding room outside the smartphone bezel. No generated text, UI icons, watermarks, or screen notch overlays. Exactly 5 fingers per hand.`,

  mugshot: `Core Objective: Transform the baby from the provided input image into a comical, adorable police mugshot portrait while retaining the baby's exact facial features, eye shape, and identity.
Character & Pose:

* Likeness: Maintain the identical facial structure, cute chubby cheeks, and unique features of the baby in the source photo.
* Pose: Front-facing, centered chest-up bust shot looking straight at the camera with a hilariously serious, grumpy, or playfully mischievous baby expression.
* Hands & Prop: The baby holds a classic black-and-white booking placard (mugshot letter board) with both chubby little hands. Ensure exactly five plump fingers on each hand without anatomical distortion.

Setting & Background:

* Background: A classic neutral gray police height chart backdrop with clear horizontal measurement lines (height marks in centimeters/inches) directly behind the baby.
* Lighting & Aesthetic: Direct, slightly harsh flash police station photography lighting with sharp, clean shadows, blended with smooth, soft skin texture and clear catchlights in the round eyes.

Constraints:

* Keep text on the placard either subtle, blurred, or standard humorous placeholder numbers.
* No extra people, no severe prison bars, no dark or scary themes.
* Full focus on an endearing, high-resolution humorous baby mugshot`,

  petmugshot: `Core Objective: Transform the pet from the provided input image into a hilarious, adorable police booking mugshot portrait while preserving the pet's exact breed, facial features, fur colors, markings, and distinct identity.
Character & Pose:

* Likeness: Accurately retain the facial structure, eye shape, ear shape, and unique coat patterns of the pet in the source image.
* Pose: Centered, chest-up bust shot looking straight into the camera lens with a funny, guilty, grumpy, or completely unapologetic facial expression.
* Prop: The pet is holding (or wearing around its neck with paws resting on) a classic black-and-white booking placard (mugshot letter board). Ensure front paws are anatomically correct and natural.

Setting & Lighting:

* Background: A classic neutral gray/off-white police lineup height measurement chart backdrop with clear horizontal grid lines and height markings directly behind the pet.
* Lighting: Direct frontal flash photography characteristic of a police station booking photo, casting subtle, realistic shadows behind the pet while highlighting the rich texture and details of the fur.

Constraints:

* Keep placard text clean, simple, or minimal placeholder numbers.
* No additional animals or humans, no prison cell bars, no dark or disturbing mood.
* Maintain a bright, humorous, ultra-high-resolution pet portrait.`,
};

const ASPECT_RATIOS = {
  baroque: '3:4',
  y2k: '3:4',
  baby: '9:16',
  mugshot: '3:4',
  petmugshot: '3:4',
};

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
    const { imageBase64, mimeType, concept } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: '이미지 데이터(imageBase64)가 없습니다.' });
    }

    const selectedPrompt = PROMPTS[concept] || PROMPTS.y2k;
    const selectedRatio = ASPECT_RATIOS[concept] || '3:4';

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
                { text: selectedPrompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              // 컨셉별로 다른 화면비 사용 (반려동물: 3:4, 아기 폰스크린: 9:16)
              aspectRatio: selectedRatio,
            },
          },
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

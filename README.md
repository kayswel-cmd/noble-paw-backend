# noble-paw-backend

Gemini 2.5 Flash Image를 호출해서 반려동물 사진을 귀족 초상화로 변환하는 백엔드예요.

## 환경변수
Vercel 프로젝트 설정 > Environment Variables 에 아래 값을 추가해야 해요.

- `GEMINI_API_KEY` : Google AI Studio (https://aistudio.google.com/apikey) 에서 발급받은 키

## 엔드포인트
`POST /api/generate-portrait`

요청 body:
```json
{ "imageBase64": "...base64 문자열...", "mimeType": "image/jpeg" }
```

응답 body:
```json
{ "imageBase64": "...변환된 이미지...", "mimeType": "image/png" }
```

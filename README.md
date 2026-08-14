# noble-paw-backend

Gemini 2.5 Flash Image를 호출해서 반려동물 사진을 귀족 초상화로 변환하고,
완성된 이미지를 구글 드라이브 특정 폴더에 자동 저장하는 백엔드예요.

## 환경변수
Vercel 프로젝트 설정 > Environment Variables 에 아래 값을 추가해야 해요.

- `GEMINI_API_KEY` : Google AI Studio (https://aistudio.google.com/apikey) 에서 발급받은 키
- `GOOGLE_OAUTH_CLIENT_ID` : Google Cloud OAuth 클라이언트 ID
- `GOOGLE_OAUTH_CLIENT_SECRET` : Google Cloud OAuth 클라이언트 시크릿
- `GOOGLE_OAUTH_REFRESH_TOKEN` : OAuth Playground 등에서 발급받은 refresh token (사장님 본인 계정으로 승인)
- `GOOGLE_DRIVE_FOLDER_ID` : 이미지를 저장할 구글 드라이브 폴더의 ID (사장님 본인 드라이브 안의 폴더)

## 엔드포인트

### POST /api/generate-portrait
요청 body:
```json
{ "imageBase64": "...base64 문자열...", "mimeType": "image/jpeg" }
```
응답 body:
```json
{ "imageBase64": "...변환된 이미지...", "mimeType": "image/png" }
```

### POST /api/upload-to-drive
요청 body:
```json
{ "imageBase64": "...base64 문자열...", "mimeType": "image/png", "filename": "홍길동_1234.png" }
```
응답 body:
```json
{ "success": true, "fileId": "...", "fileName": "홍길동_1234.png", "link": "..." }
```

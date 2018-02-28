# shift-moe-bot

[사용 예 - @shift_moe](https://twitter.com/shift_moe)

이 트위터 봇은 Node.js로 돌아갑니다. 멘션을 하면 한화로 바꿔 답해줍니다.
1시간마다 헤더 이미지도 현재 환율로 업데이트해 줍니다. ImageMagick이 설치되어 있어야 합니다.
아직 코드가 정리되어 있지 않습니다.

## 사용법

프로젝트 루트에 [`.env`](https://github.com/motdotla/dotenv) 파일을 만들어서 아래 정보를 입력해주세요. (파일명이 그냥 .env입니다)

```env
BOT_SCREEN_NAME= (봇의 트위터 계정 이름, @을 제외하고)

CONSUMER_KEY= (트위터 API 소비자 키)
CONSUMER_SECRET= (트위터 API 소비자 비밀번호)
ACCESS_TOKEN_KEY= (트위터 API 접근 키)
ACCESS_TOKEN_SECRET= (트위터 API 접근 비밀번호)

HEADER_TEMPLATE_FILE_NAME= (헤더 템플릿 이미지 이름)
HEADER_TEMPLATE_FONT_NAME= (헤더 템플릿에 사용될 폰트 이름)
```

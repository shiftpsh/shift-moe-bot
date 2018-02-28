# shift-moe-bot

[사용 예 - @shift_moe](https://twitter.com/shift_moe)

이 트위터 봇은 Node.js로 돌아갑니다. 멘션을 하면 한화로 바꿔 답해줍니다. Free Currency Converter(FCC)와 Korbit의 API를 사용합니다.

1시간마다 헤더 이미지도 현재 환율로 업데이트해 줍니다. ImageMagick이 설치되어 있어야 합니다.

아직 코드가 정리되어 있지 않습니다.

## 사용법

### 트위터 연동

프로젝트 루트에 [`.env`](https://github.com/motdotla/dotenv) 파일을 만들어서 아래 정보를 입력해주세요. 전부 필수입니다. (파일명이 그냥 .env입니다)

```env
BOT_SCREEN_NAME= (봇의 트위터 계정 이름, @을 제외하고)

CONSUMER_KEY= (트위터 API 소비자 키)
CONSUMER_SECRET= (트위터 API 소비자 비밀번호)
ACCESS_TOKEN_KEY= (트위터 API 접근 키)
ACCESS_TOKEN_SECRET= (트위터 API 접근 비밀번호)

HEADER_TEMPLATE_FILE_NAME= (헤더 템플릿 이미지 이름)
HEADER_TEMPLATE_FONT_NAME= (헤더 템플릿에 사용될 폰트 이름)
```

### 지원 화폐 수정

봇을 한 번 실행하면 `/modules/auto_xchange/config.json`이 자동 생성됩니다. `"default"` 부분을 수정해 지원하는 화폐를 추가, 수정, 삭제할 수 있습니다.

```json
{
    "code": "USD",
    "criteria": ["usd", "dollar", "달러", "딸라", "$", "사달라", "사딸라"],
    "name": "달러",
    "screen": "달러는",
    "prefix": "💵",
    "psuedo": false,
    "endpoint": "fcc"
}
```

* `code`: 화폐 코드. FCC 혹은 Korbit에서 환전을 하는 데 쓰입니다.
* `criteria`: 환전 조건 문자열. 이 문자열이 들어가 있는 멘션은 이 화폐를 환전하라는 것으로 생각합니다.
* `name`: 화폐 이름.
* `screen`: 답글 트윗에 보이게 될 문맥에 맞는 화폐 이름.
* `prefix`: 답글 트윗 앞에 붙일 문자열. 꼭 이모지가 아니어도 괜찮습니다만 이미지를 첨부하는 것보다야 이모지 하나가 더 나을 수도 있습니다.
* `psuedo`: `true`면 환전을 한 이후에 미리 정해진 조건에 따라 계산을 합니다. `false`면 그냥 환전만 합니다. 보통 게임 내 가상 재화를 처리할 때 `true`로 설정합니다.
* `endpoint`: 사용할 API. `fcc` 혹은 `korbit`입니다.

```json
{
    "code": "STAR_JEWEL",
    "criteria": ["쥬얼", "주얼", "ジュエル"],
    "name": "스타 쥬얼",
    "screen": "데레스테 스타 쥬얼은",
    "prefix": "🌟",
    "psuedo": true,
    "original_code": "JPY",
    "calculate": "if (value < 360) { value / 0.5 * 1.1 } else if (value < 760) { value / 0.75 * 1.1 } else if (value < 1300) { value / 0.79 * 1.1 } else if (value < 2650) { value / 0.81 * 1.1 } else if (value < 4200) { value / 0.83 * 1.1 } else if (value < 8400) { value / 0.84 * 1.1 } else { value / 0.86 * 1.1 }",
    "endpoint": "fcc"
}
```

* `original_code`: 게임 내 가상 재화 등의 기반 화폐 코드.
* `calculate`: 가상 재화 계산 식. `value`가 가상 재화의 개수입니다. 사칙연산뿐만 아니라 함수도 쓸 수 있습니다. 복잡한 코드를 짜는 것도 가능합니다.

위에서 아래로 내려가면서 `criteria`를 검사하므로, AUD와 USD를 판단하겠다면 "호주 달러"가 "달러" 위에 있어야만 합니다.
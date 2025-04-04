# IFDO 리포트 API 분석

IFDO 방문 로그 데이터를 시각화하고 GPT를 활용하여 분석하는 웹 애플리케이션입니다.

## 기능

- IFDO 방문 로그 데이터 조회 및 표시
- 데이터 페이지네이션 및 표시 개수 설정
- GPT를 활용한 데이터 분석 기능

## 기술 스택

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- API 통신: Axios
- 인공지능 분석: OpenAI API (GPT)

## Render.com 배포 가이드

### 1. Render.com 계정 생성

- [Render.com](https://render.com/)에 접속하여 계정을 생성하거나 로그인합니다.

### 2. 새 웹 서비스 생성

1. 대시보드에서 `New +` 버튼을 클릭하고 `Web Service`를 선택합니다.
2. GitHub 계정과 연결하여 저장소를 선택합니다:
   - 저장소: `https://github.com/alisyos/ifdo2`

### 3. 서비스 설정

- **Name**: 원하는 서비스 이름 (예: ifdo-api-analyzer)
- **Region**: 가장 가까운 리전 선택
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free 또는 필요에 따라 선택

### 4. 환경 변수 설정

'Environment' 섹션에서 다음 환경 변수를 추가합니다:

- `OPENAI_API_KEY`: OpenAI API 키
- `PORT`: 포트 번호 (기본값: 3000, Render에서는 자동으로 설정됨)

```
OPENAI_API_KEY=your_openai_api_key
```

### 5. 배포 진행

- `Create Web Service` 버튼을 클릭하여 배포를 시작합니다.
- 배포가 완료되면 제공된 URL로 웹사이트에 접속할 수 있습니다.

## 로컬 개발 환경 설정

1. 저장소 클론:
```bash
git clone https://github.com/alisyos/ifdo2.git
cd ifdo2
```

2. 의존성 설치:
```bash
npm install
```

3. `.env` 파일 생성 및 환경 변수 설정:
```
OPENAI_API_KEY=your_openai_api_key
```

4. 애플리케이션 실행:
```bash
npm start
```

5. 브라우저에서 `http://localhost:3000`으로 접속

## API 키 및 보안

- OpenAI API 키는 `.env` 파일에 저장되며 GitHub에 커밋되지 않습니다.
- Render.com에서는 환경 변수로 API 키를 안전하게 설정할 수 있습니다.

## 참고 사항

- 웹 애플리케이션이 제대로 작동하려면 유효한 OpenAI API 키가 필요합니다.
- API 키가 없어도 애플리케이션은 작동하지만, GPT 분석 기능은 모의 응답만 제공합니다. 
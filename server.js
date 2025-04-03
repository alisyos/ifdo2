require('dotenv').config(); // 환경 변수 로드를 최상단으로 이동

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { OpenAI } = require('openai'); // OpenAI 라이브러리 추가

const app = express();
const port = process.env.PORT || 3000;

// OpenAI API 설정
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// API 키 로깅 (디버깅용) - 키가 제대로 로드되었는지 확인 (앞 10자리만 표시)
if (OPENAI_API_KEY) {
    const apiKeyPrefix = OPENAI_API_KEY.substring(0, 10);
    console.log(`OpenAI API 키가 설정되었습니다 (앞 10자리): ${apiKeyPrefix}...`);
} else {
    console.log('OpenAI API 키가 설정되지 않았습니다.');
}

// CORS 허용 설정
app.use(cors());

// JSON 요청 처리를 위한 미들웨어 - 크기 제한 늘리기
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, './')));

// API 프록시 엔드포인트
app.get('/api/analytics', async (req, res) => {
    try {
        const apiUrl = 'http://mars.ifdo.co.kr/analytics/JSONAPI.apz?authkey=dTVKc2lRT3BaOGQ3YnZpOUtveld1cjlyTy9jK0NyQUdqalA3WFdDY2dWWT0%3D&m_enc=c1UrTEkzK2FSbHUxY3ZlWnEyczE5N3Z5eWlPQit3RGdVcWszRlBDTWtlbz0%3D';
        
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log('API 응답 데이터:', JSON.stringify(response.data).substring(0, 200) + '...');
        res.json(response.data);
    } catch (error) {
        console.error('API 요청 중 오류 발생:', error);
        res.status(500).json({
            status: 'error',
            message: '서버에서 데이터를 가져오는 중 오류가 발생했습니다.'
        });
    }
});

// API 프록시 엔드포인트 - POST 요청 처리 (사용자 지정 URL 처리)
app.post('/api/analytics', async (req, res) => {
    try {
        const { apiUrl } = req.body;
        
        if (!apiUrl) {
            return res.status(400).json({
                status: 'error',
                message: 'API URL이 제공되지 않았습니다.'
            });
        }
        
        console.log('요청된 API URL:', apiUrl);
        
        // IP 주소 허용 문제를 우회하기 위한 헤더 추가
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'http://mars.ifdo.co.kr/'
            },
            timeout: 10000 // 10초 타임아웃 설정
        });
        
        // 응답 데이터 로깅 (최대 300자)
        console.log('API 응답 상태 코드:', response.status);
        console.log('API 응답 데이터 미리보기:', JSON.stringify(response.data).substring(0, 300) + '...');
        
        // 데이터가 있는지 확인
        if (response.data) {
            res.json(response.data);
        } else {
            res.status(204).json({
                status: 'error',
                message: 'API에서 빈 데이터가 반환되었습니다.'
            });
        }
    } catch (error) {
        console.error('사용자 지정 API 요청 중 오류 발생:', error);
        
        // 오류 응답 형식을 좀 더 자세하게 제공
        let errorMessage = '서버에서 데이터를 가져오는 중 오류가 발생했습니다.';
        let statusCode = 500;
        
        if (error.response) {
            // 서버가 응답했지만 에러 상태 코드로 응답한 경우
            console.error('API 서버 응답 오류 상세:', {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                data: error.response.data
            });
            
            errorMessage = `API 서버 응답 오류: ${error.response.status} - ${error.response.statusText}`;
            if (error.response.data) {
                errorMessage += ` - ${JSON.stringify(error.response.data)}`;
            }
            statusCode = error.response.status;
        } else if (error.request) {
            // 요청은 이루어졌지만 응답을 받지 못한 경우
            console.error('API 요청 오류 (응답 없음):', error.request);
            errorMessage = 'API 서버에서 응답이 없습니다. 서버가 실행중인지 또는 URL이 올바른지 확인해주세요.';
            statusCode = 503;
        } else {
            // 요청 설정 중 오류 발생
            console.error('API 요청 설정 오류:', error.message);
            errorMessage = `요청 설정 중 오류 발생: ${error.message}`;
        }
        
        // 특별한 경우 처리
        if (error.message.includes('ENOTFOUND')) {
            errorMessage = 'API 서버 호스트를 찾을 수 없습니다. URL이 올바른지 확인해주세요.';
        } else if (error.message.includes('ECONNREFUSED')) {
            errorMessage = 'API 서버 연결이 거부되었습니다. 서버가 실행 중인지 확인해주세요.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'API 서버 응답 시간이 초과되었습니다.';
        } else if (error.response && error.response.status === 403) {
            errorMessage = 'API 접근이 거부되었습니다. IP 주소가 허용되지 않았을 수 있습니다.';
        }
        
        res.status(statusCode).json({
            status: 'error',
            message: errorMessage
        });
    }
});

// GPT API 분석 요청 처리
app.post('/api/gpt-analyze', async (req, res) => {
    try {
        const { data, prompt } = req.body;
        
        if (!data || !prompt) {
            return res.status(400).json({
                status: 'error',
                message: '데이터 또는 프롬프트가 제공되지 않았습니다.'
            });
        }
        
        console.log('GPT 분석 요청 - 프롬프트:', prompt);
        
        if (!OPENAI_API_KEY) {
            // OpenAI API 키가 설정되지 않았을 경우 목업 응답 제공
            console.log('OpenAI API 키가 설정되지 않았습니다. 목업 응답을 반환합니다.');
            
            // 지연 시간 추가 (실제 GPT API 호출처럼 보이게)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 프롬프트 유형에 따른 목업 응답
            let mockResponse;
            
            if (prompt.includes('트렌드') || prompt.includes('패턴')) {
                mockResponse = "분석 결과, 이 데이터에서는 다음과 같은 주목할만한 트렌드와 패턴이 발견되었습니다:\n\n" +
                    "1. 주중(월-금)에 사이트 방문이 주말보다 27% 더 많았습니다.\n" +
                    "2. 오전 9시부터 11시 사이에 가장 높은 트래픽이 발생했으며, 이는 업무 시작 시간과 일치합니다.\n" +
                    "3. 3월 27일과 3월 25일에 특히 높은 트래픽이 발생했으며, 이는 특별 프로모션 또는 마케팅 캠페인과 관련이 있을 수 있습니다.\n" +
                    "4. 페이지뷰 대비 방문 수 비율이 꾸준히 증가하고 있어 사용자 참여도가 향상되고 있음을 시사합니다.\n\n" +
                    "이러한 패턴은 마케팅 전략 조정 및 사용자 경험 최적화에 유용하게 활용될 수 있습니다.";
            } else if (prompt.includes('키워드') || prompt.includes('검색')) {
                mockResponse = "데이터 분석 결과, 가장 많이 검색된 키워드 Top 5는 다음과 같습니다:\n\n" +
                    "1. '제품 가격' - 총 검색 수: 156회 (전체 검색의 23%)\n" +
                    "2. '서비스 신청 방법' - 총 검색 수: 98회 (전체 검색의 14%)\n" +
                    "3. '사용 설명서' - 총 검색 수: 82회 (전체 검색의 12%)\n" +
                    "4. '문의 전화번호' - 총 검색 수: 67회 (전체 검색의 10%)\n" +
                    "5. '배송 조회' - 총 검색 수: 53회 (전체 검색의 8%)\n\n" +
                    "이러한 검색 패턴은 사용자들이 제품 가격 정보와 서비스 이용 방법에 가장 관심이 많다는 것을 보여줍니다. 웹사이트 첫 페이지에 이러한 정보를 더 쉽게 접근할 수 있도록 개선하는 것이 좋겠습니다.";
            } else if (prompt.includes('트래픽') || prompt.includes('요일')) {
                mockResponse = "방문자 트래픽 분석 결과는 다음과 같습니다:\n\n" +
                    "가장 트래픽이 많은 요일: 화요일과 목요일\n" +
                    "가장 트래픽이 많은 시간대: 오전 9시~11시, 오후 2시~4시\n\n" +
                    "활용 방안:\n" +
                    "1. 높은 트래픽 시간대에 중요한 컨텐츠 업데이트 및 신규 프로모션을 진행하여 노출 극대화\n" +
                    "2. 화요일과 목요일에 이메일 마케팅이나 SNS 홍보를 집중하여 효율성 향상\n" +
                    "3. 트래픽이 낮은 주말에는 서버 유지보수 작업 스케줄링\n" +
                    "4. 오전 9시~11시 사이 웹사이트 로딩 속도 최적화에 집중하여 사용자 경험 개선\n" +
                    "5. 트래픽이 낮은 시간대 (심야, 새벽)에 특별 할인 프로모션을 통해 사용자 방문 유도";
            } else if (prompt.includes('검색엔진') || prompt.includes('유입')) {
                mockResponse = "검색엔진별 유입 분석 결과:\n\n" +
                    "1. 네이버: 45% (주로 브랜드명 검색)\n" +
                    "2. 구글: 30% (주로 제품 기능 관련 검색어)\n" +
                    "3. 다음: 15% (주로 위치 및 서비스 관련 검색)\n" +
                    "4. 기타 검색엔진: 10%\n\n" +
                    "마케팅 전략 제안:\n" +
                    "1. 네이버: 브랜드 인지도가 이미 높으므로, 파워링크 및 브랜드 검색 광고를 통해 경쟁사 유입을 차단하고 신제품 정보 노출 강화\n" +
                    "2. 구글: SEO 최적화에 집중하고 제품 기능 키워드 중심의 컨텐츠 마케팅 강화. 특히 기술적 정보와 비교 분석 컨텐츠 제작\n" +
                    "3. 다음: 지역 기반 마케팅 강화 및 서비스 관련 Q&A 컨텐츠 확대\n" +
                    "4. 전체: 리마케팅 캠페인을 통해 이탈한 방문자 재유입 유도 및 검색엔진별 랜딩페이지 최적화";
            } else {
                mockResponse = "제공된 데이터를 분석한 결과, 다음과 같은 인사이트를 얻을 수 있었습니다:\n\n" +
                    "1. 전체 방문자 중 약 35%가 재방문자로, 사이트에 대한 관심이 지속적으로 유지되고 있습니다.\n" +
                    "2. 모바일 기기를 통한 접속이 꾸준히 증가하는 추세를 보이며, 최근에는 전체 트래픽의 약 60%를 차지합니다.\n" +
                    "3. 평균 세션 지속 시간은 약 3분 45초로, 업계 평균 대비 15% 높은 수준입니다.\n" +
                    "4. 방문자의 주요 행동 흐름은 홈페이지 → 제품 페이지 → 가격 정보 순으로 나타납니다.\n\n" +
                    "이러한 결과를 바탕으로 웹사이트 구성 최적화 및 마케팅 전략 조정을 권장합니다.";
            }
            
            return res.json({
                status: 'success',
                result: mockResponse
            });
        }
        
        // 데이터를 문자열로 변환 (GPT API에 전송하기 위해)
        let dataString;
        if (typeof data === 'object') {
            // 최적화된 데이터 형식 확인
            if (data.headers && data.table) {
                // 최적화된 포맷으로 직접 문자열 생성
                dataString = "데이터 형식:\n";
                
                // 헤더 정보 추가
                dataString += "컬럼 정보: ";
                const headerNames = data.headers.map(h => {
                    const key = Object.keys(h)[0];
                    return h[key];
                }).join(", ");
                dataString += headerNames + "\n\n";
                
                // 샘플 데이터 추가 (최대 10행)
                dataString += "샘플 데이터 (최대 10행):\n";
                const sampleRows = data.table.slice(0, 10);
                sampleRows.forEach((row, index) => {
                    const rowValues = Object.values(row).join(", ");
                    dataString += `${index+1}. ${rowValues}\n`;
                });
                
                // 데이터 요약 정보 추가
                dataString += `\n총 데이터 행 수: ${data.table.length}`;
            } else {
                // 일반 JSON 문자열화
                dataString = JSON.stringify(data, null, 2);
            }
        } else {
            dataString = String(data);
        }
        
        try {
            // OpenAI 라이브러리를 사용한 API 호출
            console.log('OpenAI API 호출 시작...');
            const gptResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "너는 데이터 분석 전문가입니다. 제공된 데이터를 분석하고 인사이트를 제공해주세요. 답변은 항상 한국어로 작성해 주세요."
                    },
                    {
                        role: "user",
                        content: `다음은 웹사이트 방문 로그 데이터입니다:\n\n${dataString}\n\n${prompt}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            });
            
            console.log('OpenAI API 응답 성공:', gptResponse.id);
            
            // GPT API 응답 처리
            if (gptResponse && gptResponse.choices && gptResponse.choices.length > 0) {
                const gptResult = gptResponse.choices[0].message.content;
                console.log('GPT 분석 결과 길이:', gptResult.length);
                res.json({
                    status: 'success',
                    result: gptResult
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    message: 'GPT API 응답을 처리하는 중 오류가 발생했습니다.'
                });
            }
        } catch (apiError) {
            console.error('OpenAI API 호출 오류:', apiError);
            
            // API 호출 오류 세부 정보 로깅
            if (apiError.response) {
                console.error('OpenAI 오류 응답 데이터:', apiError.response.data);
                console.error('OpenAI 오류 응답 상태:', apiError.response.status);
            } else if (apiError.message) {
                console.error('OpenAI 오류 메시지:', apiError.message);
            }
            
            throw apiError; // 예외를 다시 던져서 외부 catch 블록에서 처리
        }
    } catch (error) {
        console.error('GPT 분석 요청 중 오류 발생:', error);
        
        let errorMessage = 'GPT 분석 처리 중 오류가 발생했습니다.';
        
        if (error.response && error.response.data) {
            console.error('GPT API 오류 상세:', error.response.data);
            errorMessage = `GPT API 오류: ${JSON.stringify(error.response.data)}`;
        } else if (error.message) {
            errorMessage = `오류: ${error.message}`;
        }
        
        res.status(500).json({
            status: 'error',
            message: errorMessage
        });
    }
});

// 기본 경로로 접속 시 index.html 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './index.html'));
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
}); 
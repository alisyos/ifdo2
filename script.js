document.addEventListener('DOMContentLoaded', () => {
    const dataTable = document.getElementById('dataTable');
    const tableHead = dataTable.querySelector('thead tr');
    const tableBody = dataTable.querySelector('tbody');
    const refreshBtn = document.getElementById('refreshBtn');
    const loadingIndicator = document.getElementById('loading');
    const apiUrlInput = document.getElementById('apiUrl');
    
    // GPT 분석 관련 요소
    const analyzeBtn = document.getElementById('analyzeBtn');
    const gptLoading = document.getElementById('gptLoading');
    const gptResult = document.getElementById('gptResult');
    const gptPromptSelect = document.getElementById('gptPrompt');
    const customPromptInput = document.getElementById('customPrompt');
    
    // 현재 데이터 저장 변수
    let currentData = null;
    
    // 데이터 가져오기 함수
    async function fetchData() {
        showLoading(true);
        
        try {
            // 사용자가 입력한 API URL 사용
            const customApiUrl = apiUrlInput.value.trim();
            
            if (!customApiUrl) {
                throw new Error('API URL을 입력해주세요');
            }
            
            // 로컬 프록시 서버를 통해 데이터 요청
            const response = await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiUrl: customApiUrl })
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.message || `HTTP 오류! 상태: ${response.status}`);
            }
            
            return responseData;
        } catch (error) {
            console.error('데이터를 가져오는 중 오류 발생:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    }
    
    // 테이블 헤더 생성 함수 - IFDO API 응답 구조에 맞게 수정
    function createTableHeaders(data) {
        if (!data || !data.data || data.data.length === 0) {
            return;
        }
        
        tableHead.innerHTML = '';
        
        // data_header에서 헤더 정보 추출
        const headerData = data.data.find(item => item.data_header);
        
        if (headerData && headerData.data_header) {
            // 각 헤더 항목을 테이블에 추가
            headerData.data_header.forEach(headerItem => {
                const key = Object.keys(headerItem)[0];
                const value = headerItem[key];
                
                const th = document.createElement('th');
                th.textContent = value;
                tableHead.appendChild(th);
            });
        } else {
            showErrorMessage('헤더 데이터를 찾을 수 없습니다');
        }
    }
    
    // 테이블 내용 생성 함수 - IFDO API 응답 구조에 맞게 수정
    function populateTable(data) {
        if (!data || !data.data || data.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="100%">데이터가 없습니다</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        // data_table에서 데이터 추출
        const tableData = data.data.find(item => item.data_table);
        
        if (tableData && tableData.data_table && tableData.data_table.length > 0) {
            // 각 행의 데이터를 테이블에 추가
            tableData.data_table.forEach(rowData => {
                const row = document.createElement('tr');
                
                // 각 셀의 데이터를 행에 추가
                Object.keys(rowData).forEach(key => {
                    const cell = document.createElement('td');
                    cell.textContent = rowData[key];
                    row.appendChild(cell);
                });
                
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="100%">테이블 데이터가 없습니다</td></tr>';
        }
    }
    
    // 오류 메시지 표시 함수
    function showErrorMessage(message) {
        tableHead.innerHTML = '<tr><th>오류</th></tr>';
        tableBody.innerHTML = `<tr><td>${message}</td></tr>`;
    }
    
    // 로딩 표시 함수
    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        refreshBtn.disabled = isLoading;
    }
    
    // GPT 로딩 표시 함수
    function showGptLoading(isLoading) {
        gptLoading.style.display = isLoading ? 'block' : 'none';
        analyzeBtn.disabled = isLoading;
    }
    
    // GPT 분석 결과 표시 함수
    function displayGptResult(result) {
        gptResult.innerHTML = '';
        
        if (typeof result === 'string') {
            // 줄바꿈을 HTML에서 적용하기 위한 처리
            const formattedResult = result.replace(/\n/g, '<br>');
            gptResult.innerHTML = formattedResult;
        } else {
            gptResult.textContent = '분석 결과를 표시할 수 없습니다.';
        }
    }
    
    // GPT 분석 요청 함수
    async function requestGptAnalysis() {
        if (!currentData) {
            alert('분석할 데이터가 없습니다. 먼저 데이터를 불러와주세요.');
            return;
        }
        
        showGptLoading(true);
        
        try {
            // 선택된 프롬프트 또는 사용자 정의 프롬프트 사용
            let prompt = customPromptInput.value.trim();
            if (!prompt) {
                prompt = gptPromptSelect.value;
            }
            
            // 데이터 크기 줄이기 - 테이블 데이터만 추출
            let optimizedData = null;
            if (currentData && currentData.data) {
                const tableData = currentData.data.find(item => item.data_table);
                const headerData = currentData.data.find(item => item.data_header);
                
                if (tableData && headerData) {
                    // 필요한 데이터만 포함
                    optimizedData = {
                        headers: headerData.data_header,
                        table: tableData.data_table.slice(0, 100) // 최대 100개 행만 사용
                    };
                }
            }
            
            // GPT 분석 요청
            const response = await fetch('/api/gpt-analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: optimizedData || currentData,
                    prompt: prompt
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                displayGptResult(result.result);
            } else {
                throw new Error(result.message || '분석 요청에 실패했습니다.');
            }
        } catch (error) {
            console.error('GPT 분석 요청 중 오류 발생:', error);
            gptResult.innerHTML = `<p class="error-message">분석 중 오류가 발생했습니다: ${error.message}</p>`;
        } finally {
            showGptLoading(false);
        }
    }
    
    // 데이터 로드 및 표시 함수
    async function loadAndDisplayData() {
        try {
            const result = await fetchData();
            
            if (result && result.data) {
                // 현재 데이터 저장
                currentData = result;
                
                // IFDO API 응답 구조에 맞게 처리
                createTableHeaders(result);
                populateTable(result);
                
                // GPT 분석 버튼 활성화
                analyzeBtn.disabled = false;
            } else {
                // API 응답 구조가 예상과 다른 경우 응답 확인용 출력
                const formattedResponse = JSON.stringify(result, null, 2);
                console.log('API 응답 형식:', formattedResponse);
                
                // 응답 구조를 표시
                tableHead.innerHTML = '<tr><th>API 응답 구조</th></tr>';
                tableBody.innerHTML = `<tr><td><pre>${formattedResponse}</pre></td></tr>`;
                
                // 현재 데이터 저장
                currentData = result;
                
                // GPT 분석 버튼 활성화
                analyzeBtn.disabled = false;
            }
        } catch (error) {
            console.error('데이터 처리 중 오류 발생:', error);
            showErrorMessage(`데이터를 불러오는 데 실패했습니다: ${error.message}`);
            
            // GPT 분석 버튼 비활성화
            analyzeBtn.disabled = true;
            currentData = null;
        }
    }
    
    // 새로고침 버튼 이벤트 연결
    refreshBtn.addEventListener('click', loadAndDisplayData);
    
    // GPT 분석 버튼 이벤트 연결
    analyzeBtn.addEventListener('click', requestGptAnalysis);
    
    // 초기 상태 설정
    analyzeBtn.disabled = true; // 데이터가 로드되기 전에는 분석 버튼 비활성화
    
    // 초기 데이터 로드
    loadAndDisplayData();
}); 
document.addEventListener('DOMContentLoaded', () => {
    const dataTable = document.getElementById('dataTable');
    const tableHead = dataTable.querySelector('thead tr');
    const tableBody = dataTable.querySelector('tbody');
    const refreshBtn = document.getElementById('refreshBtn');
    const loadingIndicator = document.getElementById('loading');
    const apiUrlInput = document.getElementById('apiUrl');
    
    // 페이징 관련 요소
    const pageSizeSelect = document.getElementById('pageSize');
    const pageInfo = document.getElementById('pageInfo');
    const firstPageBtn = document.getElementById('firstPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const lastPageBtn = document.getElementById('lastPageBtn');
    
    // GPT 분석 관련 요소
    const analyzeBtn = document.getElementById('analyzeBtn');
    const gptLoading = document.getElementById('gptLoading');
    const gptResult = document.getElementById('gptResult');
    const gptPromptSelect = document.getElementById('gptPrompt');
    const customPromptInput = document.getElementById('customPrompt');
    const gptResultSection = document.getElementById('gptResultSection');
    
    // 모달 관련 요소
    const gptModal = document.getElementById('gptModal');
    const closeModalBtn = document.querySelector('.close');
    const cancelAnalysisBtn = document.getElementById('cancelAnalysisBtn');
    const runAnalysisBtn = document.getElementById('runAnalysisBtn');
    
    // 현재 데이터 저장 변수
    let currentData = null;
    
    // 페이징 관련 변수
    let currentPage = 1;
    let pageSize = parseInt(pageSizeSelect.value);
    let totalItems = 0;
    let totalPages = 0;
    let tableDataCache = []; // 전체 데이터를 저장하는 캐시
    
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
    
    // 테이블 내용 생성 함수 - 페이징 기능 추가
    function populateTable(data) {
        if (!data || !data.data || data.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="100%">데이터가 없습니다</td></tr>';
            updatePaginationInfo(0, 0);
            return;
        }
        
        // data_table에서 데이터 추출
        const tableData = data.data.find(item => item.data_table);
        
        if (tableData && tableData.data_table && tableData.data_table.length > 0) {
            // 전체 데이터를 캐시에 저장
            tableDataCache = tableData.data_table;
            totalItems = tableDataCache.length;
            totalPages = Math.ceil(totalItems / pageSize);
            
            // 현재 페이지가 총 페이지 수를 초과하지 않도록 조정
            if (currentPage > totalPages) {
                currentPage = totalPages;
            }
            
            displayCurrentPage();
        } else {
            tableBody.innerHTML = '<tr><td colspan="100%">테이블 데이터가 없습니다</td></tr>';
            updatePaginationInfo(0, 0);
        }
    }
    
    // 현재 페이지 데이터 표시 함수
    function displayCurrentPage() {
        tableBody.innerHTML = '';
        
        if (tableDataCache.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="100%">데이터가 없습니다</td></tr>';
            updatePaginationInfo(0, 0);
            return;
        }
        
        // 현재 페이지에 해당하는 데이터 추출
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalItems);
        const currentPageData = tableDataCache.slice(startIndex, endIndex);
        
        // 현재 페이지 데이터 표시
        currentPageData.forEach(rowData => {
            const row = document.createElement('tr');
            
            // 각 셀의 데이터를 행에 추가
            Object.keys(rowData).forEach(key => {
                const cell = document.createElement('td');
                cell.textContent = rowData[key];
                row.appendChild(cell);
            });
            
            tableBody.appendChild(row);
        });
        
        // 페이지네이션 정보 업데이트
        updatePaginationInfo(startIndex + 1, endIndex);
        updatePaginationButtons();
    }
    
    // 페이지네이션 정보 업데이트 함수
    function updatePaginationInfo(start, end) {
        if (totalItems === 0) {
            pageInfo.textContent = '0-0 / 전체 0';
        } else {
            pageInfo.textContent = `${start}-${end} / 전체 ${totalItems}`;
        }
    }
    
    // 페이지네이션 버튼 상태 업데이트 함수
    function updatePaginationButtons() {
        firstPageBtn.disabled = currentPage === 1;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
        lastPageBtn.disabled = currentPage === totalPages;
    }
    
    // 오류 메시지 표시 함수
    function showErrorMessage(message) {
        tableHead.innerHTML = '<tr><th>오류</th></tr>';
        tableBody.innerHTML = `<tr><td>${message}</td></tr>`;
        updatePaginationInfo(0, 0);
    }
    
    // 로딩 표시 함수
    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        refreshBtn.disabled = isLoading;
    }
    
    // GPT 로딩 표시 함수
    function showGptLoading(isLoading) {
        gptLoading.style.display = isLoading ? 'block' : 'none';
        runAnalysisBtn.disabled = isLoading;
        cancelAnalysisBtn.disabled = isLoading;
    }
    
    // 모달 열기 함수
    function openModal() {
        gptModal.style.display = 'block';
        customPromptInput.value = '';
        gptPromptSelect.selectedIndex = 0;
    }
    
    // 모달 닫기 함수
    function closeModal() {
        gptModal.style.display = 'none';
    }
    
    // GPT 분석 결과 표시 함수
    function displayGptResult(result) {
        gptResultSection.style.display = 'block';
        gptResult.innerHTML = '';
        
        if (typeof result === 'string') {
            // 줄바꿈을 HTML에서 적용하기 위한 처리
            const formattedResult = result.replace(/\n/g, '<br>');
            gptResult.innerHTML = formattedResult;
            
            // 스크롤하여 결과 섹션으로 이동
            gptResultSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            gptResult.textContent = '분석 결과를 표시할 수 없습니다.';
        }
    }
    
    // GPT 분석 요청 함수
    async function requestGptAnalysis() {
        if (!currentData) {
            alert('분석할 데이터가 없습니다. 먼저 데이터를 불러와주세요.');
            closeModal();
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
                closeModal();
                displayGptResult(result.result);
            } else {
                throw new Error(result.message || '분석 요청에 실패했습니다.');
            }
        } catch (error) {
            console.error('GPT 분석 요청 중 오류 발생:', error);
            gptResult.innerHTML = `<p class="error-message">분석 중 오류가 발생했습니다: ${error.message}</p>`;
            gptResultSection.style.display = 'block';
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
                
                // 페이지 초기화
                currentPage = 1;
                
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
    
    // 페이지 이동 함수
    function goToPage(page) {
        if (page < 1 || page > totalPages || page === currentPage) {
            return;
        }
        
        currentPage = page;
        displayCurrentPage();
    }
    
    // 이벤트 리스너 등록
    
    // 페이징 이벤트
    firstPageBtn.addEventListener('click', () => goToPage(1));
    prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    lastPageBtn.addEventListener('click', () => goToPage(totalPages));
    
    // 페이지 크기 변경 이벤트
    pageSizeSelect.addEventListener('change', () => {
        pageSize = parseInt(pageSizeSelect.value);
        totalPages = Math.ceil(totalItems / pageSize);
        
        // 현재 페이지가 총 페이지 수를 초과하지 않도록 조정
        if (currentPage > totalPages) {
            currentPage = totalPages || 1;
        }
        
        displayCurrentPage();
    });
    
    // 데이터 새로고침 이벤트
    refreshBtn.addEventListener('click', loadAndDisplayData);
    
    // GPT 분석 버튼 이벤트 (모달 열기)
    analyzeBtn.addEventListener('click', () => {
        if (currentData) {
            openModal();
        } else {
            alert('분석할 데이터가 없습니다. 먼저 데이터를 불러와주세요.');
        }
    });
    
    // 모달 닫기 이벤트
    closeModalBtn.addEventListener('click', closeModal);
    cancelAnalysisBtn.addEventListener('click', closeModal);
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target === gptModal) {
            closeModal();
        }
    });
    
    // 분석 실행 버튼 이벤트
    runAnalysisBtn.addEventListener('click', requestGptAnalysis);
    
    // 초기 상태 설정
    analyzeBtn.disabled = true; // 데이터가 로드되기 전에는 분석 버튼 비활성화
    updatePaginationButtons(); // 페이지네이션 버튼 초기 상태 설정
    
    // 초기 테이블 상태 설정
    tableHead.innerHTML = '<tr><th>안내</th></tr>';
    tableBody.innerHTML = '<tr><td>데이터 로드 버튼을 클릭하여 데이터를 불러와주세요.</td></tr>';
    updatePaginationInfo(0, 0);
    
    // 이제 페이지 로드 시 자동 데이터 로드를 하지 않습니다.
    // 사용자가 '데이터 로드' 버튼을 클릭할 때만 데이터를 로드합니다.
}); 
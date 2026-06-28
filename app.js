/**
 * 🎒 우리들의 배움터 - Q&A 게시판 앱 핵심 스크립트
 * 모든 언어 설정 및 설명 주석은 한국어로 작성되었습니다.
 * 비개발자 학생 사용자도 이해하기 쉽도록 설명이 기재되어 있습니다.
 */

// ==========================================================================
// 1. 초기 더미 데이터 (데이터가 비어 있을 때 화면을 채우는 기본 질문과 답변들)
// ==========================================================================
const INITIAL_KEYWORDS = ['수학', '과학', '영어', '국어', '기타'];

const INITIAL_QUESTIONS = [
    {
        id: 'q_1',
        userId: 'user_02', // 작성자 고유 아이디
        userName: '수학천재 이지우', // 화면에 보여줄 작성자 이름
        title: '수학 II 미분계수의 기하학적 정의가 헷갈려요.',
        content: '평균변화율의 극한값으로서 미분계수를 배울 때, 그래프 상에서 두 점이 만나는 접선의 기울기가 되는 과정이 잘 이해되지 않아요. 직관적으로 어떻게 생각하면 쉬울까요?',
        keyword: '수학',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2시간 전
        comments: [
            {
                id: 'c_1',
                userId: 'user_03',
                userName: '멘토 박민우',
                content: '곡선 위에 점 A와 점 B를 잡고 두 점을 연결하는 직선(할선)을 그어보세요. 이제 점 B를 점 A에 무한히 가깝게 옮기면, 두 점을 잇던 선이 점 A에서의 한 선(접선)처럼 보이게 됩니다! 그 찰나의 기울기가 바로 미분계수랍니다.',
                createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString() // 1.5시간 전
            }
        ]
    },
    {
        id: 'q_2',
        userId: 'user_04',
        userName: '뉴턴의후예 김하준',
        title: '물리 F = ma 공식에서 가속도가 의미하는 바가 정확히 뭔가요?',
        content: '속도와 가속도의 차이를 잘 모르겠어요. 힘을 주면 가속도가 생긴다는 게 단순히 빨라진다는 뜻인가요? 질량이 커지면 왜 가속도가 느려지는지도 알고 싶습니다.',
        keyword: '과학',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5시간 전
        comments: [
            {
                id: 'c_2',
                userId: 'user_05',
                userName: '알파고선생님',
                content: '속도는 "지금 초당 얼마나 빠르게 가고 있는가"이고, 가속도는 "그 속도가 초당 얼마나 더 빨라지고(혹은 느려지고) 있는가"의 변화율이에요! 질량은 움직임에 저항하려는 성질(관성)이라서, 몸무게가 많이 나갈수록 밀어내기 힘든 것과 같아 가속도가 줄어든답니다.',
                createdAt: new Date(Date.now() - 3600000 * 4).toISOString() // 4시간 전
            }
        ]
    },
    {
        id: 'q_3',
        userId: 'user_06',
        userName: '영어영문 임서연',
        title: '관계대명사 that과 what을 한 번에 구분하는 꿀팁 있나요?',
        content: '시험에 맨날 나오는데 매번 찍어서 맞추거나 틀려요. 둘 다 무언가를 꾸며주는 것 같은데 어떤 문장 구조적 특징이 있는지 쉽게 알려주세요!',
        keyword: '영어',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24시간 전 (하루 전)
        comments: [] // 답변 없음
    }
];

// ==========================================================================
// 2. 앱 상태 관리 (State - 애플리케이션의 현재 정보 기억창고)
// ==========================================================================
const state = {
    // 테스트 유저 정보 (나중에 실제 로그인 기능을 쉽게 연동하도록 구조화)
    currentUser: {
        id: 'user_01',
        name: 'user_01'
    },
    keywords: [],           // 전체 키워드 목록
    questions: [],          // 전체 질문 목록
    selectedKeyword: '전체', // 현재 왼쪽 1단에서 선택된 키워드 필터
    searchQuery: '',        // 현재 검색 창에 입력된 검색어
    activeQuestionId: null  // 현재 우측 메인 영역에 띄워진 질문의 ID (null이면 목록 표시)
};

// ==========================================================================
// 3. 로컬 저장소 (LocalStorage) 연동 함수
// ==========================================================================
// 데이터를 브라우저에 저장하여 새로고침해도 유지되게 만듭니다.
function loadDataFromStorage() {
    const storedKeywords = localStorage.getItem('school_qna_keywords');
    const storedQuestions = localStorage.getItem('school_qna_questions');

    if (storedKeywords) {
        state.keywords = JSON.parse(storedKeywords);
    } else {
        state.keywords = [...INITIAL_KEYWORDS];
        saveDataToStorage();
    }

    if (storedQuestions) {
        state.questions = JSON.parse(storedQuestions);
    } else {
        state.questions = [...INITIAL_QUESTIONS];
        saveDataToStorage();
    }
}

function saveDataToStorage() {
    localStorage.setItem('school_qna_keywords', JSON.stringify(state.keywords));
    localStorage.setItem('school_qna_questions', JSON.stringify(state.questions));
}

// ==========================================================================
// 4. 유틸리티 함수 (Helper Functions)
// ==========================================================================
// 작성 시각을 "방금 전", "N분 전", "N일 전" 처럼 직관적인 친절한 표현으로 바꾸어 줍니다.
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHr < 24) return `${diffHr}시간 전`;
    if (diffDay === 1) return '어제';
    return `${diffDay}일 전`;
}

// 텍스트를 입력할 때 발생할 수 있는 보안 취약점(XSS)을 방지하기 위한 이스케이프 함수
function escapeHtml(unsafeText) {
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================================================
// 5. UI 렌더링 함수 (화면에 데이터를 그리는 핵심 로직들)
// ==========================================================================

// [1단] 키워드 목록 렌더링
function renderKeywords() {
    const listEl = document.getElementById('keywords-list');
    const selectEl = document.getElementById('question-keyword-select');
    
    // 1-1. 왼쪽 사이드바 키워드 버튼 목록 생성
    let html = `<li class="${state.selectedKeyword === '전체' ? 'active' : ''}">
        <button type="button" onclick="selectKeyword('전체')">
            <span>전체 보기</span>
            <span class="kw-count">${state.questions.length}</span>
        </button>
    </li>`;

    state.keywords.forEach(kw => {
        const count = state.questions.filter(q => q.keyword === kw).length;
        const isActive = state.selectedKeyword === kw;
        html += `<li class="${isActive ? 'active' : ''}">
            <button type="button" onclick="selectKeyword('${kw}')">
                <span>${kw}</span>
                <span class="kw-count">${count}</span>
            </button>
        </li>`;
    });

    listEl.innerHTML = html;

    // 1-2. 중앙 질문 등록 폼 내부의 키워드 선택 드롭다운 갱신
    let selectHtml = '<option value="" disabled selected>학습 과목/키워드 선택</option>';
    state.keywords.forEach(kw => {
        selectHtml += `<option value="${kw}">${kw}</option>`;
    });
    selectEl.innerHTML = selectHtml;
}

// [2단] 메인 영역 토글 렌더러 (목록 창과 상세 창 전환)
function renderMainArea() {
    const feedView = document.getElementById('feed-view');
    const threadView = document.getElementById('thread-view');

    if (!state.activeQuestionId) {
        // 활성화된 질문이 없을 때 -> 질문 목록(피드) 보여주기
        feedView.classList.remove('hidden');
        threadView.classList.add('hidden');
        renderQuestionsFeed(); // 피드 내용 갱신
    } else {
        // 활성화된 질문이 있을 때 -> 상세 답변 스레드 보여주기
        feedView.classList.add('hidden');
        threadView.classList.remove('hidden');
        renderThreadDetail(); // 상세 내용 갱신
    }
}

// 피드(질문 목록) 내부 그리기
function renderQuestionsFeed() {
    const container = document.getElementById('question-cards-container');
    const countBadge = document.getElementById('question-count-badge');
    const filterTitle = document.getElementById('current-filter-title');

    // 키워드 및 검색어에 따라 질문 필터링 수행
    let filtered = state.questions;

    // 키워드 필터 적용
    if (state.selectedKeyword !== '전체') {
        filtered = filtered.filter(q => q.keyword === state.selectedKeyword);
        filterTitle.textContent = `'${state.selectedKeyword}' 질문 목록`;
    } else {
        filterTitle.textContent = `전체 질문 목록`;
    }

    // 검색어 필터 적용
    if (state.searchQuery.trim() !== '') {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(q => 
            q.title.toLowerCase().includes(query) || 
            q.content.toLowerCase().includes(query)
        );
        filterTitle.textContent = `'${state.searchQuery}' 검색 결과`;
    }

    // 최신 등록 질문이 위로 오도록 정렬 (역순 정렬)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 개수 배지 업데이트
    countBadge.textContent = filtered.length;

    // 목록이 비었을 때 안내 메시지
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--color-text-sub); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
                <p style="font-size: 0.9rem;">등록된 질문이 없어요. 첫 번째 질문을 남겨보세요!</p>
            </div>
        `;
        return;
    }

    // 질문 카드 그리기
    let html = '';
    filtered.forEach(q => {
        const commentCount = q.comments ? q.comments.length : 0;
        
        html += `
            <div class="question-card" onclick="selectQuestion('${q.id}')" data-id="${q.id}">
                <div class="question-card-meta">
                    <span class="tag-badge">${escapeHtml(q.keyword)}</span>
                    <span class="author">${escapeHtml(q.userName)}</span>
                    <span class="time">${timeAgo(q.createdAt)}</span>
                </div>
                <h4 class="question-card-title">${escapeHtml(q.title)}</h4>
                <p class="question-card-preview">${escapeHtml(q.content)}</p>
                <div class="question-card-footer">
                    <div class="comment-count-indicator">
                        <span>답변 ${commentCount}개</span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--color-primary); font-weight:600;">답변하기 &rarr;</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 스레드(상세 질문 및 댓글) 내부 그리기
function renderThreadDetail() {
    const question = state.questions.find(q => q.id === state.activeQuestionId);
    if (!question) {
        // 찾을 수 없는 경우 강제로 목록으로 되돌림
        state.activeQuestionId = null;
        renderMainArea();
        return;
    }

    // 질문 상세 내용 주입
    document.getElementById('detail-keyword').textContent = question.keyword;
    document.getElementById('detail-author').textContent = question.userName;
    document.getElementById('detail-time').textContent = timeAgo(question.createdAt);
    document.getElementById('detail-title').textContent = question.title;
    document.getElementById('detail-content').textContent = question.content;
    
    const commentsCountEl = document.getElementById('detail-comments-count');
    const commentsContainer = document.getElementById('comments-container');
    const commentsCount = question.comments ? question.comments.length : 0;
    
    commentsCountEl.textContent = commentsCount;

    // 답변 목록 렌더링
    if (commentsCount === 0) {
        commentsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--color-text-muted); font-size: 0.8rem;">
                아직 등록된 답변이 없습니다.<br>도움이 되는 첫 번째 답변을 달아주세요!
            </div>
        `;
    } else {
        let commentsHtml = '';
        // 시간순으로 정렬하여 보여줌
        const sortedComments = [...question.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        sortedComments.forEach(comment => {
            commentsHtml += `
                <div class="comment-card">
                    <div class="comment-card-meta">
                        <span class="comment-author">${escapeHtml(comment.userName)}</span>
                        <span>${timeAgo(comment.createdAt)}</span>
                    </div>
                    <p class="comment-card-content">${escapeHtml(comment.content)}</p>
                </div>
            `;
        });
        commentsContainer.innerHTML = commentsHtml;
    }
}

// ==========================================================================
// 6. 상태 전이 및 이벤트 처리 함수 (동작을 작동시키는 액션들)
// ==========================================================================

// 키워드 필터링 선택 기능
window.selectKeyword = function(keyword) {
    state.selectedKeyword = keyword;
    state.searchQuery = ''; // 키워드 변경 시 검색어는 비워줍니다.
    state.activeQuestionId = null; // 상세 창에 있었다면 목록으로 강제 복귀
    document.getElementById('search-input').value = '';
    
    renderKeywords();
    renderMainArea();
};

// 질문 선택 시 상세 스레드 호출
window.selectQuestion = function(questionId) {
    state.activeQuestionId = questionId;
    renderMainArea(); // 피드를 숨기고 스레드 뷰를 활성화
};

// 뒤로 가기 처리
function handleBackToFeed() {
    state.activeQuestionId = null;
    renderMainArea(); // 스레드 뷰를 숨기고 피드를 활성화
}

// 키워드 추가 처리
function handleAddKeyword() {
    const input = document.getElementById('new-keyword-input');
    const value = input.value.trim();

    if (value === '') {
        alert('추가할 키워드를 입력해 주세요!');
        return;
    }

    if (state.keywords.includes(value)) {
        alert('이미 존재하는 키워드입니다.');
        return;
    }

    if (value.length > 10) {
        alert('키워드는 최대 10자까지만 입력이 가능합니다.');
        return;
    }

    state.keywords.push(value);
    saveDataToStorage();
    renderKeywords();
    input.value = '';
}

// 질문 등록 처리
function handleAddQuestion(e) {
    e.preventDefault(); // 폼 제출 시 브라우저 새로고침(기본동작) 차단

    const titleInput = document.getElementById('question-title');
    const contentInput = document.getElementById('question-content');
    const keywordSelect = document.getElementById('question-keyword-select');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const keyword = keywordSelect.value;

    if (!keyword) {
        alert('과목 또는 키워드를 선택해 주세요!');
        return;
    }

    // 새 질문 객체 생성
    const newQuestion = {
        id: 'q_' + Date.now(), // 고유한 ID 생성
        userId: state.currentUser.id, // 테스트 유저 user_01
        userName: `학생 ${state.currentUser.name}`, // 화면 표시명
        title: title,
        content: content,
        keyword: keyword,
        createdAt: new Date().toISOString(),
        comments: [] // 빈 답변 목록으로 시작
    };

    state.questions.push(newQuestion);
    saveDataToStorage();

    // 입력란 초기화
    titleInput.value = '';
    contentInput.value = '';
    keywordSelect.value = '';

    // 키워드 버튼 숫자 갱신을 위한 렌더링
    renderKeywords();
    
    // 방금 등록한 질문 바로 상세 보기로 전환
    selectQuestion(newQuestion.id);
}

// 답변(댓글) 등록 처리
function handleAddComment(e) {
    e.preventDefault();

    const textarea = document.getElementById('comment-content');
    const content = textarea.value.trim();

    if (content === '') {
        alert('답변 내용을 입력해 주세요!');
        return;
    }

    if (!state.activeQuestionId) {
        alert('답변을 작성할 질문이 지정되지 않았습니다.');
        return;
    }

    // 해당 질문 찾기
    const questionIndex = state.questions.findIndex(q => q.id === state.activeQuestionId);
    if (questionIndex === -1) return;

    // 새 답변 객체 생성
    const newComment = {
        id: 'c_' + Date.now(),
        userId: state.currentUser.id,
        userName: `학생 ${state.currentUser.name}`,
        content: content,
        createdAt: new Date().toISOString()
    };

    state.questions[questionIndex].comments.push(newComment);
    saveDataToStorage();

    // 입력란 비우기 및 스레드 창만 다시 갱신
    textarea.value = '';
    renderThreadDetail();
}

// ==========================================================================
// 7. 앱 초기화 (Initialization - 브라우저 로딩 완료 후 시작점)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 7-1. 로컬 저장소로부터 저장된 데이터 로드
    loadDataFromStorage();

    // 7-2. UI 최초 렌더링
    renderKeywords();
    renderMainArea();

    // 7-3. 이벤트 리스너(동작 감지기) 연결

    // 새 키워드 추가 이벤트
    document.getElementById('add-keyword-btn').addEventListener('click', handleAddKeyword);
    document.getElementById('new-keyword-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddKeyword();
        }
    });

    // 질문 등록 폼 제출 이벤트
    document.getElementById('question-form').addEventListener('submit', handleAddQuestion);

    // 실시간 검색창 입력 이벤트
    document.getElementById('search-input').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        // 검색어 입력 시 상세창에 있었다면 강제로 목록으로 되돌림
        if(state.activeQuestionId !== null) {
            state.activeQuestionId = null;
            renderMainArea();
        } else {
            renderQuestionsFeed();
        }
    });

    // 상세 스레드에서 '질문 목록으로 돌아가기' 클릭 이벤트
    document.getElementById('back-to-feed-btn').addEventListener('click', handleBackToFeed);

    // 답변 등록 폼 제출 이벤트
    document.getElementById('comment-form').addEventListener('submit', handleAddComment);
});

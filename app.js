/**
 * 🎒 우리들의 배움터 - Q&A 게시판 앱 핵심 스크립트 (Firebase 연동 버전)
 */

// ==========================================================================
// 1. Firebase 라이브러리 불러오기 (모듈 방식)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================================================
// 2. Firebase 설정 정보 (사용자가 직접 입력해야 하는 영역)
// ==========================================================================
// [중요] 아래 빈칸들에 발급받으신 Firebase 설정 키 정보들을 따옴표 안에 채워 넣어주세요!
const firebaseConfig = {
  apiKey: "AIzaSyBaBFpc8KafjW2YZuZVJbAD52O0XjdoUNU",
  authDomain: "test-72f32.firebaseapp.com",
  projectId: "test-72f32",
  storageBucket: "test-72f32.firebasestorage.app",
  messagingSenderId: "136391901350",
  appId: "1:136391901350:web:298a61e4b1ed501deb7467"
};

// ==========================================================================
// 3. 앱 상태 관리 (State)
// ==========================================================================
const state = {
    currentUser: { id: 'user_01', name: 'user_01' }, // 현재 테스트 로그인 유저
    keywords: [],           // 전체 키워드 목록
    questions: [],          // 전체 질문 목록
    selectedKeyword: '전체', // 현재 필터링된 키워드
    searchQuery: '',        // 현재 검색어
    activeQuestionId: null  // 현재 띄워진 질문의 ID (null이면 목록 표시)
};

let db; // Firestore 데이터베이스 인스턴스를 담을 변수

// ==========================================================================
// 4. 유틸리티 함수 (시간 변환 및 텍스트 보안)
// ==========================================================================
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

function escapeHtml(unsafeText) {
    if (!unsafeText) return '';
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================================================
// 5. Firebase 데이터 동기화 함수 (실시간 구독)
// ==========================================================================
function initFirebase() {
    // 사용자가 API 키를 입력하지 않았다면 경고창 띄우기
    if (firebaseConfig.apiKey === "여기에_입력하세요") {
        alert("🚨 코드 상단(app.js 14번째 줄)에 Firebase 설정 키를 먼저 입력해 주세요!");
        return;
    }

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        // 데이터 실시간 구독 시작
        subscribeToKeywords();
        subscribeToQuestions();
    } catch (error) {
        console.error("Firebase 초기화 에러:", error);
        alert("Firebase 연동 중 문제가 발생했습니다. 키 정보를 확인해 주세요.");
    }
}

// 키워드 목록 실시간 가져오기
function subscribeToKeywords() {
    const keywordsRef = doc(db, 'settings', 'keywordsDoc');
    
    onSnapshot(keywordsRef, (docSnap) => {
        if (docSnap.exists()) {
            state.keywords = docSnap.data().list || [];
        } else {
            // 처음이라 문서가 없다면 기본 키워드를 생성해 줍니다
            state.keywords = ['수학', '과학', '영어', '국어', '기타'];
            setDoc(keywordsRef, { list: state.keywords });
        }
        renderKeywords(); // 데이터가 바뀔 때마다 화면 자동 갱신
    }, (error) => {
        console.error("키워드 로드 실패:", error);
    });
}

// 질문 목록 실시간 가져오기
function subscribeToQuestions() {
    const questionsCollection = collection(db, 'questions');
    
    // onSnapshot은 누군가 글을 쓰면 새로고침 없이 즉시 반응(실시간)하게 해줍니다.
    onSnapshot(questionsCollection, (snapshot) => {
        const loadedQuestions = [];
        snapshot.forEach((docSnap) => {
            loadedQuestions.push({ id: docSnap.id, ...docSnap.data() });
        });
        state.questions = loadedQuestions;
        
        renderMainArea(); // 피드 또는 상세 스레드 자동 갱신
        renderKeywords(); // 키워드별 개수 뱃지도 갱신되어야 함
    }, (error) => {
        console.error("질문 목록 로드 실패:", error);
    });
}

// ==========================================================================
// 6. UI 렌더링 함수 (기존 로컬 방식과 동일)
// ==========================================================================
function renderKeywords() {
    const listEl = document.getElementById('keywords-list');
    const selectEl = document.getElementById('question-keyword-select');
    
    if(!listEl) return;

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

    let selectHtml = '<option value="" disabled selected>학습 과목/키워드 선택</option>';
    state.keywords.forEach(kw => {
        selectHtml += `<option value="${kw}">${kw}</option>`;
    });
    if(selectEl) selectEl.innerHTML = selectHtml;
}

function renderMainArea() {
    const feedView = document.getElementById('feed-view');
    const threadView = document.getElementById('thread-view');
    if(!feedView || !threadView) return;

    if (!state.activeQuestionId) {
        feedView.classList.remove('hidden');
        threadView.classList.add('hidden');
        renderQuestionsFeed();
    } else {
        feedView.classList.add('hidden');
        threadView.classList.remove('hidden');
        renderThreadDetail();
    }
}

function renderQuestionsFeed() {
    const container = document.getElementById('question-cards-container');
    const countBadge = document.getElementById('question-count-badge');
    const filterTitle = document.getElementById('current-filter-title');

    let filtered = state.questions;

    if (state.selectedKeyword !== '전체') {
        filtered = filtered.filter(q => q.keyword === state.selectedKeyword);
        filterTitle.textContent = `'${state.selectedKeyword}' 질문 목록`;
    } else {
        filterTitle.textContent = `전체 질문 목록`;
    }

    if (state.searchQuery.trim() !== '') {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(q => 
            q.title.toLowerCase().includes(query) || 
            q.content.toLowerCase().includes(query)
        );
        filterTitle.textContent = `'${state.searchQuery}' 검색 결과`;
    }

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    countBadge.textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--color-text-sub); background: var(--color-bg-card); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
                <p style="font-size: 0.9rem;">등록된 질문이 없어요. 첫 번째 질문을 남겨보세요!</p>
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach(q => {
        const commentCount = q.comments ? q.comments.length : 0;
        html += `
            <div class="question-card" onclick="selectQuestion('${q.id}')">
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

function renderThreadDetail() {
    const question = state.questions.find(q => q.id === state.activeQuestionId);
    if (!question) {
        state.activeQuestionId = null;
        renderMainArea();
        return;
    }

    document.getElementById('detail-keyword').textContent = question.keyword;
    document.getElementById('detail-author').textContent = question.userName;
    document.getElementById('detail-time').textContent = timeAgo(question.createdAt);
    document.getElementById('detail-title').textContent = question.title;
    document.getElementById('detail-content').textContent = question.content;
    
    const commentsCountEl = document.getElementById('detail-comments-count');
    const commentsContainer = document.getElementById('comments-container');
    const commentsCount = question.comments ? question.comments.length : 0;
    
    commentsCountEl.textContent = commentsCount;

    if (commentsCount === 0) {
        commentsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--color-text-muted); font-size: 0.8rem;">
                아직 등록된 답변이 없습니다.<br>도움이 되는 첫 번째 답변을 달아주세요!
            </div>
        `;
    } else {
        let commentsHtml = '';
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
// 7. 사용자 액션 (Firebase 쓰기 작업)
// ==========================================================================
window.selectKeyword = function(keyword) {
    state.selectedKeyword = keyword;
    state.searchQuery = '';
    state.activeQuestionId = null;
    document.getElementById('search-input').value = '';
    
    renderKeywords();
    renderMainArea();
};

window.selectQuestion = function(questionId) {
    state.activeQuestionId = questionId;
    renderMainArea();
};

function handleBackToFeed() {
    state.activeQuestionId = null;
    renderMainArea();
}

async function handleAddKeyword() {
    if(!db) return alert("Firebase 연결이 안되어 있습니다.");

    const input = document.getElementById('new-keyword-input');
    const value = input.value.trim();

    if (value === '') return alert('추가할 키워드를 입력해 주세요!');
    if (state.keywords.includes(value)) return alert('이미 존재하는 키워드입니다.');
    if (value.length > 10) return alert('키워드는 최대 10자까지만 입력이 가능합니다.');

    try {
        const keywordsRef = doc(db, 'settings', 'keywordsDoc');
        await updateDoc(keywordsRef, {
            list: arrayUnion(value)
        });
        input.value = '';
    } catch (e) {
        console.error("키워드 추가 실패:", e);
        alert("키워드 추가 중 에러가 발생했습니다.");
    }
}

async function handleAddQuestion(e) {
    e.preventDefault();
    if(!db) return alert("Firebase 연결이 안되어 있습니다.");

    const titleInput = document.getElementById('question-title');
    const contentInput = document.getElementById('question-content');
    const keywordSelect = document.getElementById('question-keyword-select');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const keyword = keywordSelect.value;

    if (!keyword) return alert('과목 또는 키워드를 선택해 주세요!');

    const newQuestion = {
        userId: state.currentUser.id,
        userName: `학생 ${state.currentUser.name}`,
        title: title,
        content: content,
        keyword: keyword,
        createdAt: new Date().toISOString(),
        comments: []
    };

    try {
        // Firebase에 새 문서(질문) 추가
        const docRef = await addDoc(collection(db, "questions"), newQuestion);
        
        // 입력란 초기화 및 뷰 전환
        titleInput.value = '';
        contentInput.value = '';
        keywordSelect.value = '';
        
        // 방금 작성한 질문 상세 뷰로 이동 (Firebase의 실시간 동기화보다 빠르게 뷰를 바꾸려면 강제 선택도 가능)
        selectQuestion(docRef.id);
    } catch (e) {
        console.error("질문 등록 에러: ", e);
        alert("질문을 등록하는 중 에러가 발생했습니다.");
    }
}

async function handleAddComment(e) {
    e.preventDefault();
    if(!db) return alert("Firebase 연결이 안되어 있습니다.");

    const textarea = document.getElementById('comment-content');
    const content = textarea.value.trim();

    if (content === '') return alert('답변 내용을 입력해 주세요!');
    if (!state.activeQuestionId) return alert('답변을 작성할 질문이 지정되지 않았습니다.');

    const newComment = {
        id: 'c_' + Date.now(), // 코멘트 고유 식별자 임시 부여
        userId: state.currentUser.id,
        userName: `학생 ${state.currentUser.name}`,
        content: content,
        createdAt: new Date().toISOString()
    };

    try {
        const questionRef = doc(db, 'questions', state.activeQuestionId);
        // 질문 문서 내부의 comments 배열에 새 답변을 추가합니다
        await updateDoc(questionRef, {
            comments: arrayUnion(newComment)
        });
        
        textarea.value = '';
        // 화면은 onSnapshot 덕분에 자동으로 갱신됩니다!
    } catch(e) {
        console.error("답변 등록 에러: ", e);
        alert("답변을 등록하는 중 에러가 발생했습니다.");
    }
}

// ==========================================================================
// 8. 브라우저 로딩 완료 시 초기 실행
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 이벤트 리스너 연결
    document.getElementById('add-keyword-btn').addEventListener('click', handleAddKeyword);
    document.getElementById('new-keyword-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddKeyword();
    });

    document.getElementById('question-form').addEventListener('submit', handleAddQuestion);
    
    document.getElementById('search-input').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if(state.activeQuestionId !== null) {
            state.activeQuestionId = null;
            renderMainArea();
        } else {
            renderQuestionsFeed();
        }
    });

    document.getElementById('back-to-feed-btn').addEventListener('click', handleBackToFeed);
    document.getElementById('comment-form').addEventListener('submit', handleAddComment);

    // [중요] Firebase 연동 함수 실행
    initFirebase();
});

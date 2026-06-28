/**
 * 🎒 우리들의 배움터 - Q&A 게시판 앱 핵심 스크립트 (Firebase 로그인 연동)
 */

// ==========================================================================
// 1. Firebase 라이브러리 불러오기 (모듈 방식)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// [새로 추가] 인증 관련 라이브러리 모음
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==========================================================================
// 2. Firebase 설정 정보
// ==========================================================================
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
    currentUser: null,      // 로그인이 완료되면 실제 유저 정보가 여기에 담깁니다.
    keywords: [],           
    questions: [],          
    selectedKeyword: '전체', 
    searchQuery: '',        
    activeQuestionId: null  
};

let db;   // Firestore 인스턴스
let auth; // Auth 인스턴스
let unsubscribeKeywords = null;
let unsubscribeQuestions = null;

// ==========================================================================
// 4. 유틸리티 함수
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
// 5. Firebase 인증(로그인) 기능
// ==========================================================================
function initFirebaseApp() {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // [중요] 사용자의 로그인 상태를 실시간으로 감시하는 센서입니다.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 로그인 된 상태 (메인 화면 보여주기)
            document.getElementById('login-overlay').classList.add('hidden');
            document.getElementById('main-app-wrapper').classList.remove('hidden');

            // 유저 정보 저장 (구글 이름이 없으면 이메일 앞부분을 닉네임으로 사용)
            let userName = user.displayName || user.email.split('@')[0];
            state.currentUser = {
                id: user.uid,
                name: userName,
                email: user.email
            };
            
            // 헤더와 답변창에 로그인한 이름 표시
            document.getElementById('header-user-name').textContent = userName;
            document.getElementById('comment-author-name').textContent = userName;

            // 데이터 동기화 시작
            startDatabaseSync();
        } else {
            // 로그인 안 된 상태 (로그인 화면 보여주기)
            state.currentUser = null;
            document.getElementById('login-overlay').classList.remove('hidden');
            document.getElementById('main-app-wrapper').classList.add('hidden');
            
            // 구독 해제 (다른 유저가 로그인 전이면 데이터 연결 차단)
            if (unsubscribeKeywords) unsubscribeKeywords();
            if (unsubscribeQuestions) unsubscribeQuestions();
        }
    });
}

// 5-1. 이메일 로그인
async function handleEmailSignIn() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    if (!email || !password) return alert("이메일과 비밀번호를 입력해주세요.");

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // 성공하면 onAuthStateChanged 가 자동으로 다음 화면으로 넘겨줍니다!
    } catch (error) {
        console.error(error);
        alert("로그인 실패: 아이디와 비밀번호를 확인해주세요.");
    }
}

// 5-2. 이메일 회원가입
async function handleEmailSignUp() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    if (!email || !password) return alert("가입할 이메일과 비밀번호를 입력해주세요.");
    if (password.length < 6) return alert("비밀번호는 최소 6자리 이상이어야 합니다.");

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("회원가입이 완료되었습니다! 환영합니다.");
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') alert("이미 가입된 이메일입니다.");
        else alert("회원가입 실패: " + error.message);
    }
}

// 5-3. 구글 로그인
async function handleGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        alert("구글 로그인 중 에러가 발생했습니다.");
    }
}

// 5-4. 로그아웃
function handleSignOut() {
    if(confirm("정말 로그아웃 하시겠습니까?")) {
        signOut(auth);
    }
}

// ==========================================================================
// 6. Firestore 데이터 실시간 동기화
// ==========================================================================
function startDatabaseSync() {
    // 키워드 동기화
    const keywordsRef = doc(db, 'settings', 'keywordsDoc');
    unsubscribeKeywords = onSnapshot(keywordsRef, (docSnap) => {
        if (docSnap.exists()) {
            state.keywords = docSnap.data().list || [];
        } else {
            state.keywords = ['수학', '과학', '영어', '국어', '기타'];
            setDoc(keywordsRef, { list: state.keywords });
        }
        renderKeywords();
    });

    // 질문 동기화
    const questionsCollection = collection(db, 'questions');
    unsubscribeQuestions = onSnapshot(questionsCollection, (snapshot) => {
        const loadedQuestions = [];
        snapshot.forEach((docSnap) => {
            loadedQuestions.push({ id: docSnap.id, ...docSnap.data() });
        });
        state.questions = loadedQuestions;
        renderMainArea();
        renderKeywords(); 
    });
}

// ==========================================================================
// 7. UI 렌더링 함수
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
// 8. 사용자 액션 (Firebase 쓰기 작업)
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
    if(!db) return;
    const input = document.getElementById('new-keyword-input');
    const value = input.value.trim();

    if (value === '') return alert('추가할 키워드를 입력해 주세요!');
    if (state.keywords.includes(value)) return alert('이미 존재하는 키워드입니다.');
    if (value.length > 10) return alert('키워드는 최대 10자까지만 입력이 가능합니다.');

    try {
        const keywordsRef = doc(db, 'settings', 'keywordsDoc');
        await updateDoc(keywordsRef, { list: arrayUnion(value) });
        input.value = '';
    } catch (e) {
        console.error(e);
        alert("키워드 추가 중 에러가 발생했습니다.");
    }
}

async function handleAddQuestion(e) {
    e.preventDefault();
    if(!db || !state.currentUser) return alert("로그인이 필요합니다.");

    const titleInput = document.getElementById('question-title');
    const contentInput = document.getElementById('question-content');
    const keywordSelect = document.getElementById('question-keyword-select');

    if (!keywordSelect.value) return alert('과목 또는 키워드를 선택해 주세요!');

    const newQuestion = {
        userId: state.currentUser.id,
        userName: state.currentUser.name, // [변경] 실제 로그인한 아이디 사용
        title: titleInput.value.trim(),
        content: contentInput.value.trim(),
        keyword: keywordSelect.value,
        createdAt: new Date().toISOString(),
        comments: []
    };

    try {
        const docRef = await addDoc(collection(db, "questions"), newQuestion);
        titleInput.value = ''; contentInput.value = ''; keywordSelect.value = '';
        selectQuestion(docRef.id);
    } catch (e) {
        console.error(e);
        alert("질문을 등록하는 중 에러가 발생했습니다.");
    }
}

async function handleAddComment(e) {
    e.preventDefault();
    if(!db || !state.currentUser) return alert("로그인이 필요합니다.");

    const textarea = document.getElementById('comment-content');
    const content = textarea.value.trim();
    if (content === '') return alert('답변 내용을 입력해 주세요!');
    if (!state.activeQuestionId) return;

    const newComment = {
        id: 'c_' + Date.now(), 
        userId: state.currentUser.id,
        userName: state.currentUser.name, // [변경] 실제 로그인한 아이디 사용
        content: content,
        createdAt: new Date().toISOString()
    };

    try {
        const questionRef = doc(db, 'questions', state.activeQuestionId);
        await updateDoc(questionRef, { comments: arrayUnion(newComment) });
        textarea.value = '';
    } catch(e) {
        console.error(e);
        alert("답변을 등록하는 중 에러가 발생했습니다.");
    }
}

// ==========================================================================
// 9. 브라우저 로딩 완료 시 이벤트 바인딩
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 9-1. 로그인 관련 버튼 이벤트
    document.getElementById('btn-login-email').addEventListener('click', handleEmailSignIn);
    document.getElementById('btn-signup-email').addEventListener('click', handleEmailSignUp);
    document.getElementById('btn-login-google').addEventListener('click', handleGoogleSignIn);
    document.getElementById('btn-logout').addEventListener('click', handleSignOut);

    // 9-2. 기존 앱 기능 버튼 이벤트
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

    // [중요] Firebase 연동 및 상태 감시 시작
    initFirebaseApp();
});

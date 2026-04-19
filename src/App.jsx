import React, { useState, useEffect } from 'react';
// ⚠️ getApps, getApp을 추가로 불러옵니다.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// ⚠️ deleteDoc을 추가로 불러옵니다.
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  Calendar, 
  Utensils, 
  Sun, 
  Bell, 
  User, 
  LogOut, 
  Gift, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  PlusCircle,
  Upload,
  X,
  ExternalLink
} from 'lucide-react';

// --- [가상 데이터 설정 (Mock Data)] ---
// 실제 개발 시 이 부분은 서버(DB)나 외부 API(NEIS, 컴시간 등)에서 가져오게 됩니다.

// ⚠️ 우리 반 학생 26명의 명단과 생일 데이터를 관리하는 '명부'를 만듭니다.
// 선생님께서 나중에 이 부분의 이름과 월(birthMonth), 일(birthDay)을 실제 정보로 수정해 주시면 됩니다!
const STUDENT_DATA = [];
for (let i = 1; i <= 26; i++) {
  const studentId = `102${String(i).padStart(2, '0')}`;
  
  // 임시로 n번 학생이라는 이름과 임의의 생일을 부여합니다.
  let name = `${i}번 학생`;
  let month = 1;
  let day = i;

  // 🚨 배너 테스트를 위해 1번 학생은 오늘(4/17), 2번 학생은 3일 뒤(4/20)로 설정해 두었습니다.
  // (실제 오늘 날짜 기준으로 배너가 즉시 뜨는지 확인하기 위함입니다.)
  if (i === 1) { name = '쭈애'; month = 4; day = 12; }
  if (i === 2) { name = '민주바라'; month = 10; day = 16; }
  if (i === 3) { name = '서현'; month = 10; day = 25; }
  if (i === 4) { name = '도훈'; month = 10; day = 4; }
  if (i === 5) { name = '세훈'; month = 1; day = 31; }
  if (i === 6) { name = '태훈'; month = 7; day = 4; }
  if (i === 7) { name = '가은'; month = 4; day = 18; }
  if (i === 8) { name = '상일'; month = 7; day = 19; }
  if (i === 9) { name = '수하'; month = 4; day = 3; }
  if (i === 10) { name = '원진'; month = 3; day = 20; }
  if (i === 11) { name = '은찬'; month = 1; day = 20; }
  if (i === 12) { name = '지휼'; month = 5; day = 22; }
  if (i === 13) { name = '지효'; month = 10; day = 29; }
  if (i === 14) { name = '현성'; month = 10; day = 20; }
  if (i === 15) { name = '다율'; month = 8; day = 4; }
  if (i === 16) { name = '소현'; month = 6; day = 18; }
  if (i === 17) { name = '맹꽁'; month = 9; day = 5; }
  if (i === 18) { name = '여찬'; month = 3; day = 12; }
  if (i === 19) { name = '은비'; month = 10; day = 28; }
  if (i === 20) { name = '까막'; month = 1; day = 15; }
  if (i === 21) { name = '연호'; month = 11; day = 25; }
  if (i === 22) { name = '아연'; month = 2; day = 7; }
  if (i === 23) { name = '하영'; month = 4; day = 23; }
  if (i === 24) { name = '다윤'; month = 2; day = 7; }
  if (i === 25) { name = '성준'; month = 11; day = 29; }
  if (i === 26) { name = '예준'; month = 6; day = 1; }

  STUDENT_DATA.push({ id: studentId, name: name, birthMonth: month, birthDay: day });
}

// 위에서 만든 STUDENT_DATA를 바탕으로 초기 로그인 정보를 자동으로 생성합니다.
const INITIAL_USERS = {
  'teacher': { id: 'teacher', name: '담임선생님', role: 'teacher', password: 'teacher', isFirstLogin: false }
};

STUDENT_DATA.forEach(student => {
  INITIAL_USERS[student.id] = { 
    id: student.id, 
    name: student.name, 
    role: 'student', 
    // ⚠️ 10207(가은) 학생에게만 알림장 관리자(isManager) 권한을 부여합니다.
    isManager: student.id === '10207', 
    password: '1234', // 초기 비밀번호는 모두 1234
    isFirstLogin: true 
  };
});

const MOCK_NOTICES = [
  { id: 1, title: '학부모 상담 주간 안내', type: 'pdf', content: '다음 주부터 학부모 상담 주간입니다. 가정통신문을 확인해 주세요.', dDay: 3, date: '2026-04-15' },
  { id: 2, title: '봄소풍 장소 투표 결과', type: 'image', content: '우리 반 봄소풍 장소는 에버랜드로 결정되었습니다!', dDay: null, date: '2026-04-16' },
  { id: 3, title: '수학 수행평가 범위 안내', type: 'text', content: '수학 수행평가는 교과서 45쪽부터 60쪽까지입니다. 잊지 말고 준비하세요.', dDay: 7, date: '2026-04-17' },
];

const MOCK_MEALS = {
  lunch: ['현미밥', '돼지고기김치찌개', '계란말이', '시금치나물', '깍두기', '요구르트'],
  dinner: ['카레라이스', '미소장국', '수제돈까스', '배추김치', '과일샐러드']
};

// ⚠️ MOCK_TIMETABLE은 이제 사용하지 않으므로 삭제해도 됩니다. (코드 정리를 위해 삭제 처리)

// --- [Firebase 초기화: 선생님의 진짜 프로젝트 연결!] ---
const firebaseConfig = {
  apiKey: "AIzaSyAElHK41lbDUNenYx_ALElMtVGg_RKmFNE",
  authDomain: "dongmul-and-pachungryu.firebaseapp.com",
  projectId: "dongmul-and-pachungryu",
  storageBucket: "dongmul-and-pachungryu.firebasestorage.app",
  messagingSenderId: "600320768294",
  appId: "1:600320768294:web:1ce849e6d0213cd6ca69e7",
  measurementId: "G-PK9Y4C8LPW"
};

// ⚠️ 새로고침 시 화면이 하얗게 뜨는 현상(Firebase 중복 초기화 에러) 방지
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- [메인 컴포넌트] ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Firebase 관련 상태 (DB 연결 확인 및 실제 공지사항 데이터)
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [notices, setNotices] = useState([]);
  
  // 새 공지사항 작성을 위한 팝업창(모달) 상태 관리
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [submitError, setSubmitError] = useState(''); // ⚠️ 에러 메시지를 보여줄 상태 추가
  
  // ⚠️ 삭제 확인 팝업 상태 추가
  const [noticeToDelete, setNoticeToDelete] = useState(null);

  // 파일 업로드를 위한 상태 추가
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileType, setFileType] = useState('text'); // 'text', 'image', 'pdf'

  // 급식 데이터를 저장할 새로운 상태 추가
  const [meals, setMeals] = useState({ lunch: [], dinner: [], loading: true, error: null });
  
  // ⚠️ 시간표 데이터를 저장할 상태 추가
  const [timetable, setTimetable] = useState({ subjects: [], loading: true, error: null });

  // --- [급식 API (NEIS) 연동] ---
  useEffect(() => {
    const fetchMeals = async () => {
      try {
        // 1. 오늘 날짜 구하기 (YYYYMMDD 형식)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}${mm}${dd}`;

        // 2. 서전고등학교 정보: 교육청코드 M10, 학교코드 8000376
        const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=M10&SD_SCHUL_CODE=8000376&MLSV_YMD=${formattedDate}`;

        const response = await fetch(url);
        const data = await response.json();

        // 3. 데이터가 존재할 경우 (휴일이 아닐 경우)
        if (data.mealServiceDietInfo) {
          const mealList = data.mealServiceDietInfo[1].row;
          let fetchedLunch = [];
          let fetchedDinner = [];

          mealList.forEach(meal => {
            // 알레르기 정보(숫자, 점, 괄호) 및 줄바꿈 기호 제거하여 요리 이름만 추출
            const cleanMenu = meal.DDISH_NM
              .replace(/<br\/>/g, ',')
              .replace(/[0-9.()]/g, '')
              .split(',')
              .map(m => m.trim())
              .filter(m => m);

            if (meal.MMEAL_SC_NM === '중식') fetchedLunch = cleanMenu;
            if (meal.MMEAL_SC_NM === '석식') fetchedDinner = cleanMenu;
          });

          setMeals({ lunch: fetchedLunch, dinner: fetchedDinner, loading: false, error: null });
        } else {
          setMeals({ lunch: [], dinner: [], loading: false, error: '오늘의 급식 정보가 없습니다. (휴일/방학)' });
        }
      } catch (error) {
        console.error("급식 정보 에러:", error);
        setMeals({ lunch: [], dinner: [], loading: false, error: '급식을 불러오지 못했습니다.' });
      }
    };

    fetchMeals();
  }, []);

  // --- [시간표 API (NEIS) 연동] ---
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}${mm}${dd}`;

        // ⚠️ 서전고(8000376) 1학년 2반의 오늘 날짜 시간표를 요청하는 주소 (hisTtimetable = 고등학교 시간표)
        const url = `https://open.neis.go.kr/hub/hisTtimetable?Type=json&ATPT_OFCDC_SC_CODE=M10&SD_SCHUL_CODE=8000376&GRADE=1&CLASS_NM=2&ALL_TI_YMD=${formattedDate}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.hisTtimetable) {
          const rows = data.hisTtimetable[1].row;
          
          // 교시(PERIO) 순서대로 정렬
          rows.sort((a, b) => parseInt(a.PERIO) - parseInt(b.PERIO));
          
          // 과목명(ITRT_CNTNT)만 뽑아서 배열로 만듦
          const fetchedSubjects = rows.map(row => row.ITRT_CNTNT.replace(/\*/g, '')); // 별표 등 특수기호 제거

          setTimetable({ subjects: fetchedSubjects, loading: false, error: null });
        } else {
          setTimetable({ subjects: [], loading: false, error: '오늘의 시간표가 없습니다. (휴일/방학)' });
        }
      } catch (error) {
        console.error("시간표 정보 에러:", error);
        setTimetable({ subjects: [], loading: false, error: '시간표를 불러오지 못했습니다.' });
      }
    };

    fetchTimetable();
  }, []);

  // --- [Firebase 인증 및 데이터 실시간 연동] ---
  useEffect(() => {
    // 1. 데이터베이스 접근을 위한 익명 로그인
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("DB 접속 에러:", error);
      }
    };
    initAuth();
    
    // 로그인 상태 추적
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // DB 연결이 안 되었으면 실행하지 않음
    if (!firebaseUser) return;

    // 2. 선생님 프로젝트의 'notices' 컬렉션에 직접 연결!
    // 기존의 복잡했던 경로를 단순화했습니다.
    const noticesRef = collection(db, 'notices');
    
    // 데이터베이스에 변화가 생길 때마다 실시간으로 화면을 업데이트함
    const unsubscribe = onSnapshot(noticesRef, (snapshot) => {
      const loadedNotices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 최신 글이 위로 오도록 정렬
      loadedNotices.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      
      // 이제 MOCK 데이터는 쓰지 않고, 무조건 DB 데이터만 보여줍니다.
      setNotices(loadedNotices);
    }, (error) => {
      console.error("데이터 불러오기 실패:", error);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  // --- [공지 추가 함수 (선생님용)] ---
  const handleAddNoticeClick = () => {
    setIsNoticeModalOpen(true);
  };

  // 파일 선택 시 처리하는 함수
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // 파일 타입 분류
    if (file.type.startsWith('image/')) {
      setFileType('image');
      // 이미지 미리보기 URL 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFileType('pdf');
      setFilePreviewUrl(file.name); // PDF는 미리보기 대신 파일 이름 저장
    } else {
      alert('이미지 또는 PDF 파일만 업로드 가능합니다.');
      setSelectedFile(null);
      setFileType('text');
      setFilePreviewUrl(null);
    }
  };

  const submitNewNotice = async (e) => {
    e.preventDefault(); 
    setSubmitError(''); // ⚠️ 시도할 때마다 이전 에러 초기화

    // ⚠️ 익명 로그인이 안 되어 접근이 차단된 경우 에러 메시지 표시
    if (!firebaseUser) {
      setSubmitError('데이터베이스 연결(인증)이 지연되고 있습니다. Firebase Authentication 설정에서 "익명 로그인"이 켜져 있는지 확인해 주세요.');
      return;
    }
    
    if (!newNoticeTitle || !newNoticeContent) return;

    try {
      // 저장 경로도 단순화!
      const noticesRef = collection(db, 'notices');
      
      // 저장할 데이터 객체
      const noticeData = {
        title: newNoticeTitle,
        type: fileType, 
        content: newNoticeContent,
        dDay: null,
        date: new Date().toISOString().split('T')[0], 
        createdAt: serverTimestamp(),
        attachmentUrl: filePreviewUrl || null,
        fileName: selectedFile ? selectedFile.name : null
      };

      await addDoc(noticesRef, noticeData);
      
      closeModal();
    } catch (error) {
      console.error("공지 추가 실패:", error);
      // ⚠️ 브라우저 기본 알림(alert) 대신 화면에 예쁘게 에러 표시
      setSubmitError(`데이터 저장 실패: ${error.message}`);
    }
  };

  // 모달 닫기 및 상태 초기화 함수
  const closeModal = () => {
    setIsNoticeModalOpen(false);
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileType('text');
    setSubmitError(''); 
  };

  // ⚠️ 공지사항 삭제 함수
  const executeDeleteNotice = async () => {
    if (!firebaseUser || !noticeToDelete) return;
    
    try {
      const noticeRef = doc(db, 'notices', noticeToDelete.id);
      await deleteDoc(noticeRef);
      
      // 삭제 성공 시 창 닫기
      setNoticeToDelete(null);
      setSelectedNotice(null);
    } catch (error) {
      console.error("공지 삭제 실패:", error);
      alert("공지사항 삭제에 실패했습니다.");
    }
  };

  // 1. ⚠️ 로그인 로직 변경 (Firebase DB 연동)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    // ⚠️ 빈 칸으로 제출 시 오류 방지
    if (!loginId || !loginPw) {
      setLoginError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (!firebaseUser) {
      setLoginError('데이터베이스 접속 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    try {
      // 1. Firebase users 컬렉션에서 해당 학번(아이디)의 정보가 있는지 찾습니다.
      const cleanLoginId = loginId.trim(); // 띄어쓰기 실수 방지
      const userRef = doc(db, 'users', cleanLoginId);
      const userSnap = await getDoc(userRef);

      let userData = null;

      if (userSnap.exists()) {
        // DB에 이미 정보가 저장된 학생 (비밀번호를 바꾼 적이 있음)
        userData = userSnap.data();
      } else {
        // DB에 정보가 없으면 초기 세팅 명단(INITIAL_USERS)에 있는지 확인
        userData = INITIAL_USERS[cleanLoginId];
      }

      // 2. 유저 정보가 있고, 비밀번호가 일치하는지 확인
      if (userData && userData.password === loginPw) {
        if (userData.isFirstLogin) {
          setShowPasswordReset(true);
          setCurrentUser(userData);
        } else {
          setCurrentUser(userData);
        }
      } else {
        setLoginError('학번(아이디) 또는 비밀번호가 틀렸습니다.');
      }
    } catch (error) {
      console.error("로그인 처리 에러:", error);
      setLoginError('로그인 중 문제가 발생했습니다.');
    }
  };

  // 2. ⚠️ 비밀번호 재설정 시 DB에 저장하는 로직
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    try {
      // 해당 유저의 문서를 가리키는 주소
      const userRef = doc(db, 'users', currentUser.id);
      
      // 업데이트할 유저 정보 생성 (새 비밀번호 적용, 첫 로그인 상태 해제)
      const updatedUser = {
        ...currentUser,
        password: newPassword,
        isFirstLogin: false
      };

      // Firebase에 유저 정보 저장 (setDoc은 없으면 만들고, 있으면 덮어씁니다)
      await setDoc(userRef, updatedUser);

      // 화면 상태 업데이트
      setCurrentUser(updatedUser);
      setShowPasswordReset(false);
      alert('비밀번호가 성공적으로 변경되었습니다!');
    } catch (error) {
      console.error("비밀번호 저장 에러:", error);
      alert('비밀번호 변경에 실패했습니다. (DB 권한 확인)');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginId('');
    setLoginPw('');
  };

  // 2. ⚠️ 생일 D-Day 계산 로직 업데이트 (실제 날짜 및 STUDENT_DATA 연동)
  const getUpcomingBirthdays = () => {
    const today = new Date(); // 항상 기기의 '진짜 오늘 날짜'를 가져옵니다.
    today.setHours(0, 0, 0, 0); // 정확한 D-Day 계산을 위해 시간을 자정(0시 0분)으로 초기화
    
    const upcoming = [];
    
    STUDENT_DATA.forEach(student => {
      // 학생의 올해 생일 날짜 생성
      let bday = new Date(today.getFullYear(), student.birthMonth - 1, student.birthDay);
      
      // 생일이 이미 올해 지났다면, 내년 생일로 계산해서 D-Day를 구함
      if (bday < today) {
        bday.setFullYear(today.getFullYear() + 1);
      }
      
      // 날짜 차이 계산 (밀리초 단위 -> 일 단위 변환)
      const diffTime = bday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      // D-Day가 0일(오늘)부터 5일 이내인 학생만 선별
      if (diffDays >= 0 && diffDays <= 5) {
        upcoming.push({ ...student, dDay: diffDays });
      }
    });
    
    // 날짜가 적게 남은 순서대로 정렬 (오늘 생일인 사람이 맨 앞에 오도록)
    upcoming.sort((a, b) => a.dDay - b.dDay);
    return upcoming;
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  // --- [상단 날짜 표시 로직 추가] ---
  const todayDate = new Date();
  const formattedToday = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][todayDate.getDay()]}요일`;

  // --- [화면 렌더링] ---

  // A. 로그인 화면
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-orange-500 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">서전고 1학년 2반</h1>
          <p className="text-slate-500 mb-8 text-sm">동물과 파충류 통합 알림장</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="학번 (예: 10201) 또는 아이디" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
            <div>
              <input 
                type="password" 
                placeholder="비밀번호" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
              />
            </div>
            {loginError && <p className="text-red-500 text-sm text-left">{loginError}</p>}
            <button 
              type="submit"
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition duration-200 shadow-md"
            >
              입장하기
            </button>
          </form>
          <div className="mt-6 text-sm text-slate-400">
            <p>테스트용 접속 정보</p>
            <p>학생 - ID: 10201 / PW: 1234</p>
            <p>교사 - ID: teacher / PW: teacher</p>
          </div>
        </div>
      </div>
    );
  }

  // B. 최초 로그인 시 비밀번호 변경 화면
  if (showPasswordReset) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold text-slate-800 mb-4">비밀번호 재설정</h2>
          <p className="text-slate-600 mb-6 text-sm">최초 로그인입니다. 안전을 위해 새로운 비밀번호를 설정해 주세요.</p>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <input 
              type="password" 
              placeholder="새 비밀번호 입력" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700">
              변경 및 시작하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  // C. 메인 대시보드 화면
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans pb-10">
      {/* 헤더 영역 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <BookOpen className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">서전고 1-2 동물과 파충류</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* 오늘 날짜 표시 추가 */}
            <div className="hidden md:flex items-center text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              <span>{formattedToday}</span>
            </div>
            <div className="hidden sm:flex items-center text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <Sun className="w-4 h-4 mr-2 text-orange-400" />
              <span>진천군 맑음, 22°C</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {currentUser.name}
              </span>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        
        {/* 생일 알림 배너 */}
        {upcomingBirthdays.length > 0 && (
          <div className="bg-gradient-to-r from-pink-100 to-orange-100 border border-pink-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-full shadow-sm">
                <Gift className="text-pink-500 w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-pink-800">
                  {upcomingBirthdays.map(s => s.name).join(', ')} 친구의 생일이 다가옵니다! 🎉
                </p>
                <p className="text-sm text-pink-600">
                  {upcomingBirthdays[0].dDay === 0 ? '오늘이 바로 생일이에요! 축하해주세요!' : `생일 D-${upcomingBirthdays[0].dDay}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 메인 그리드 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 좌측: 스마트 알림장 (공지사항) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-500" /> 
                우리학급 알림장
              </h2>
              {/* ⚠️ 선생님이거나 알림장 관리자(isManager)인 경우에만 작성 버튼 표시 */}
              {(currentUser.role === 'teacher' || currentUser.isManager) && (
                <button 
                  onClick={handleAddNoticeClick}
                  className="flex items-center text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition shadow-sm"
                >
                  <PlusCircle className="w-4 h-4 mr-1" /> 공지 작성
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {notices.map((notice) => (
                <div 
                  key={notice.id} 
                  onClick={() => setSelectedNotice(notice)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        notice.type === 'pdf' ? 'bg-red-100 text-red-600' : 
                        notice.type === 'image' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {notice.type === 'pdf' ? <FileText className="inline w-3 h-3 mr-1"/> : null}
                        {notice.type === 'image' ? <ImageIcon className="inline w-3 h-3 mr-1"/> : null}
                        {notice.type.toUpperCase()}
                      </span>
                      {notice.dDay !== null && (
                        <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-md">
                          D-{notice.dDay}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition">{notice.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{notice.content}</p>
                  </div>
                  <div className="mt-4 text-xs text-slate-400 text-right">
                    {notice.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 시간표 및 급식 */}
          <div className="space-y-6">
            
            {/* --- [시간표 확인 버튼] --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-lg font-bold flex items-center mb-4"><Clock className="w-5 h-5 mr-2 text-indigo-500" /> 오늘의 시간표</h2>
              <a 
                href="http://www.xn--s39aj90b0nb2xw6xh.kr/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center w-full py-8 bg-indigo-50 border border-indigo-100 rounded-2xl group hover:bg-indigo-100 transition shadow-sm"
              >
                <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition">
                  <ExternalLink className="text-indigo-600 w-6 h-6" />
                </div>
                <span className="font-bold text-indigo-700">시간표 확인하기</span>
                <span className="text-xs text-indigo-400 mt-1">(컴시간 알리미로 연결됩니다)</span>
              </a>
            </div>

            {/* 오늘의 급식 위젯 (NEIS 연동 반영) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <Utensils className="w-5 h-5 mr-2 text-orange-500" /> 
                오늘의 급식
              </h2>
              
              {meals.loading ? (
                <div className="text-center text-sm text-slate-500 py-6 animate-pulse">
                  🍽️ 오늘의 급식을 불러오는 중입니다...
                </div>
              ) : meals.error ? (
                <div className="text-center text-sm text-red-500 py-6 font-semibold">
                  {meals.error}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-orange-700 mb-2 border-b border-orange-200 pb-1">점심 메뉴</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {meals.lunch.length > 0 ? meals.lunch.join(', ') : '점심 급식이 없습니다.'}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-blue-700 mb-2 border-b border-blue-200 pb-1">저녁 메뉴</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {meals.dinner.length > 0 ? meals.dinner.join(', ') : '저녁 급식이 없습니다.'}
                    </p>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-slate-400 mt-4 text-center">* NEIS 공공데이터 실시간 연동</p>
            </div>

          </div>
        </div>
      </main>

      {/* 공지사항 상세 보기 모달 */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">{selectedNotice.title}</h3>
              <button 
                onClick={() => setSelectedNotice(null)}
                className="p-1 rounded-full hover:bg-slate-200 transition"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {/* 이미지 타입일 경우 실제 이미지 보여주기 */}
              {selectedNotice.type === 'image' && (
                <div className="w-full mb-4 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                   {selectedNotice.attachmentUrl ? (
                     <img src={selectedNotice.attachmentUrl} alt="첨부 이미지" className="max-w-full h-auto object-contain" style={{ maxHeight: '300px' }} />
                   ) : (
                     <div className="w-full h-48 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                       [이미지 파일이 없습니다]
                     </div>
                   )}
                </div>
              )}
              
              {/* PDF 타입일 경우 파일 이름 보여주기 */}
              {selectedNotice.type === 'pdf' && (
                <div className="w-full p-4 bg-red-50 rounded-xl mb-4 flex items-center justify-between border border-red-100">
                  <div className="flex items-center text-red-700">
                    <FileText className="w-5 h-5 mr-2" />
                    <span className="text-sm font-semibold truncate max-w-[200px]">
                      {selectedNotice.fileName || '첨부파일.pdf'}
                    </span>
                  </div>
                  <button className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold hover:bg-red-200 transition">
                    다운로드
                  </button>
                </div>
              )}
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedNotice.content}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {/* ⚠️ 선생님이거나 권한이 있는 학생에게만 삭제 버튼 노출 */}
              {(currentUser.role === 'teacher' || currentUser.isManager) ? (
                <button 
                  onClick={() => setNoticeToDelete(selectedNotice)}
                  className="text-red-500 font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition"
                >
                  삭제
                </button>
              ) : (
                <div></div> // 간격 유지를 위한 빈 div
              )}
              <button 
                onClick={() => setSelectedNotice(null)}
                className="bg-slate-800 text-white px-6 py-2 rounded-xl font-semibold hover:bg-slate-700 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ 공지사항 삭제 확인 팝업 (Custom Confirm) */}
      {noticeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">공지사항 삭제</h3>
            <p className="text-slate-500 mb-6 text-sm">
              정말 이 공지사항을 삭제할까요?<br/>삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setNoticeToDelete(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                취소
              </button>
              <button 
                onClick={executeDeleteNotice}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-md"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 공지사항 작성 팝업 모달 */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center">
                <PlusCircle className="w-5 h-5 mr-2 text-blue-500" />
                새 공지사항 작성
              </h3>
              <button 
                onClick={closeModal}
                className="text-slate-500 hover:bg-slate-100 p-1 rounded-full transition"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={submitNewNotice} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="공지 제목을 입력하세요 (예: 체육복 지참 안내)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50"
                  value={newNoticeTitle}
                  onChange={e => setNewNoticeTitle(e.target.value)}
                  required
                />
              </div>
              
              {/* 파일 업로드 영역 추가 */}
              <div>
                <label className="block w-full cursor-pointer">
                  <div className="w-full px-4 py-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition flex flex-col items-center justify-center space-y-2">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-sm text-slate-500">
                      사진 또는 PDF 파일 첨부 (선택)
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*, application/pdf"
                      onChange={handleFileChange}
                    />
                  </div>
                </label>
                
                {/* 파일 미리보기 영역 */}
                {fileType === 'image' && filePreviewUrl && (
                  <div className="mt-2 relative inline-block">
                    <img src={filePreviewUrl} alt="미리보기" className="h-24 rounded-lg object-cover border border-slate-200" />
                    <button type="button" onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); setFileType('text'); }} className="absolute -top-2 -right-2 bg-white rounded-full shadow-md p-1 hover:bg-slate-100">
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                )}
                {fileType === 'pdf' && (
                  <div className="mt-2 p-3 bg-red-50 rounded-lg flex items-center justify-between border border-red-100">
                    <div className="flex items-center text-red-700 text-sm">
                       <FileText className="w-4 h-4 mr-2" />
                       <span className="truncate max-w-[200px]">{filePreviewUrl}</span>
                    </div>
                    <button type="button" onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); setFileType('text'); }} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <textarea
                  placeholder="학생들에게 전달할 내용을 자세히 적어주세요."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl h-32 resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50"
                  value={newNoticeContent}
                  onChange={e => setNewNoticeContent(e.target.value)}
                  required
                />
              </div>

              {/* ⚠️ 에러 발생 시 사용자에게 보여줄 메시지 창 추가 */}
              {submitError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span>{submitError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition shadow-md"
              >
                알림장에 등록하기
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 아이콘 렌더링을 위한 임시 더미 컴포넌트 (실제 환경에서는 lucide-react에서 import 됩니다)
function BookOpen(props) { return <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> }
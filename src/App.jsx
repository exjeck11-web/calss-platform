import './index.css'; //
import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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
  X
} from 'lucide-react';

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

// --- [우리 반 명단 및 생일 데이터] ---
const STUDENT_DATA = [];
for (let i = 1; i <= 26; i++) {
  const studentId = `102${String(i).padStart(2, '0')}`;
  
  let name = `${i}번 학생`;
  let month = 1;
  let day = i;

  // 배너 테스트용 임시 생일 (실제 데이터로 수정 필요)
  if (i === 1) { name = '김파충'; month = 4; day = 17; }
  if (i === 2) { name = '이동물'; month = 4; day = 20; }
  if (i === 7) { name = '가은'; month = 5; day = 1; }

  STUDENT_DATA.push({ id: studentId, name: name, birthMonth: month, birthDay: day });
}

// 초기 로그인 정보 생성
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
    password: '1234', 
    isFirstLogin: true 
  };
});

// --- [메인 컴포넌트] ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Firebase 및 공지사항 관련 상태
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [notices, setNotices] = useState([]);
  
  // 모달 및 작성 폼 상태
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [submitError, setSubmitError] = useState(''); 
  const [noticeToDelete, setNoticeToDelete] = useState(null);

  // 파일 업로드 상태
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileType, setFileType] = useState('text'); 

  // 외부 API 상태 (급식, 시간표)
  const [meals, setMeals] = useState({ lunch: [], dinner: [], loading: true, error: null });
  const [timetable, setTimetable] = useState({ subjects: [], loading: true, error: null });

  // --- [급식 API (NEIS) 연동] ---
  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}${mm}${dd}`;

        const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=M10&SD_SCHUL_CODE=8000376&MLSV_YMD=${formattedDate}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.mealServiceDietInfo) {
          const mealList = data.mealServiceDietInfo[1].row;
          let fetchedLunch = [];
          let fetchedDinner = [];

          mealList.forEach(meal => {
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

        const url = `https://open.neis.go.kr/hub/hisTtimetable?Type=json&ATPT_OFCDC_SC_CODE=M10&SD_SCHUL_CODE=8000376&GRADE=1&CLASS_NM=2&ALL_TI_YMD=${formattedDate}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.hisTtimetable) {
          const rows = data.hisTtimetable[1].row;
          rows.sort((a, b) => parseInt(a.PERIO) - parseInt(b.PERIO));
          const fetchedSubjects = rows.map(row => row.ITRT_CNTNT.replace(/\*/g, '')); 
          setTimetable({ subjects: fetchedSubjects, loading: false, error: null });
        } else {
          setTimetable({ subjects: [], loading: false, error: '오늘의 시간표가 없습니다. (휴일/방학)' });
        }
      } catch (error) {
        setTimetable({ subjects: [], loading: false, error: '시간표를 불러오지 못했습니다.' });
      }
    };
    fetchTimetable();
  }, []);

  // --- [Firebase 인증 및 데이터 실시간 연동] ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("DB 접속 에러:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const noticesRef = collection(db, 'notices');
    const unsubscribe = onSnapshot(noticesRef, (snapshot) => {
      const loadedNotices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loadedNotices.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotices(loadedNotices);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  // --- [상호작용 함수들] ---
  const handleAddNoticeClick = () => setIsNoticeModalOpen(true);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFileType('image');
      const reader = new FileReader();
      reader.onloadend = () => setFilePreviewUrl(reader.result);
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFileType('pdf');
      setFilePreviewUrl(file.name); 
    } else {
      alert('이미지 또는 PDF 파일만 업로드 가능합니다.');
      setSelectedFile(null);
      setFileType('text');
      setFilePreviewUrl(null);
    }
  };

  const submitNewNotice = async (e) => {
    e.preventDefault(); 
    setSubmitError('');

    if (!firebaseUser) {
      setSubmitError('데이터베이스 연결(인증)이 지연되고 있습니다.');
      return;
    }
    if (!newNoticeTitle || !newNoticeContent) return;

    try {
      const noticesRef = collection(db, 'notices');
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
      setSubmitError(`데이터 저장 실패: ${error.message}`);
    }
  };

  const executeDeleteNotice = async () => {
    if (!firebaseUser || !noticeToDelete) return;
    try {
      const noticeRef = doc(db, 'notices', noticeToDelete.id);
      await deleteDoc(noticeRef);
      setNoticeToDelete(null);
      setSelectedNotice(null);
    } catch (error) {
      alert("공지사항 삭제에 실패했습니다.");
    }
  };

  const closeModal = () => {
    setIsNoticeModalOpen(false);
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileType('text');
    setSubmitError(''); 
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginId || !loginPw) {
      setLoginError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }
    if (!firebaseUser) {
      setLoginError('데이터베이스 접속 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    try {
      const cleanLoginId = loginId.trim();
      const userRef = doc(db, 'users', cleanLoginId);
      const userSnap = await getDoc(userRef);

      let userData = null;
      if (userSnap.exists()) {
        userData = userSnap.data();
      } else {
        userData = INITIAL_USERS[cleanLoginId];
      }

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
      setLoginError('로그인 중 문제가 발생했습니다.');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', currentUser.id);
      const updatedUser = { ...currentUser, password: newPassword, isFirstLogin: false };
      await setDoc(userRef, updatedUser);
      setCurrentUser(updatedUser);
      setShowPasswordReset(false);
      alert('비밀번호가 성공적으로 변경되었습니다!');
    } catch (error) {
      alert('비밀번호 변경에 실패했습니다. (DB 권한 확인)');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginId('');
    setLoginPw('');
  };

  const getUpcomingBirthdays = () => {
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 
    const upcoming = [];
    
    STUDENT_DATA.forEach(student => {
      let bday = new Date(today.getFullYear(), student.birthMonth - 1, student.birthDay);
      if (bday < today) bday.setFullYear(today.getFullYear() + 1);
      
      const diffTime = bday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays >= 0 && diffDays <= 5) upcoming.push({ ...student, dDay: diffDays });
    });
    
    upcoming.sort((a, b) => a.dDay - b.dDay);
    return upcoming;
  };

  const upcomingBirthdays = getUpcomingBirthdays();
  const todayDate = new Date();
  const formattedToday = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][todayDate.getDay()]}요일`;

  // --- [화면 렌더링] ---
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
            <input 
              type="text" 
              placeholder="학번 (예: 10201) 또는 아이디" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="비밀번호" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-slate-50"
              value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
            />
            {loginError && <p className="text-red-500 text-sm text-left">{loginError}</p>}
            <button type="submit" className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-md">
              입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans pb-10">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-emerald-600 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">서전고 1-2 동물과 파충류</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-500" /> 
                우리학급 알림장
              </h2>
              {(currentUser.role === 'teacher' || currentUser.isManager) && (
                <button onClick={handleAddNoticeClick} className="flex items-center text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition shadow-sm">
                  <PlusCircle className="w-4 h-4 mr-1" /> 공지 작성
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {notices.map((notice) => (
                <div key={notice.id} onClick={() => setSelectedNotice(notice)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        notice.type === 'pdf' ? 'bg-red-100 text-red-600' : 
                        notice.type === 'image' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {notice.type === 'pdf' && <FileText className="inline w-3 h-3 mr-1"/>}
                        {notice.type === 'image' && <ImageIcon className="inline w-3 h-3 mr-1"/>}
                        {notice.type.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition">{notice.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{notice.content}</p>
                  </div>
                  <div className="mt-4 text-xs text-slate-400 text-right">{notice.date}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <Clock className="w-5 h-5 mr-2 text-indigo-500" /> 
                오늘의 시간표
              </h2>
              {timetable.loading ? (
                <div className="text-center text-sm text-slate-500 py-6 animate-pulse">🕒 시간표를 불러오는 중입니다...</div>
              ) : timetable.error ? (
                <div className="text-center text-sm text-red-500 py-6 font-semibold">{timetable.error}</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {timetable.subjects.map((subject, index) => (
                    <div key={index} className="flex flex-col items-center bg-indigo-50 rounded-xl p-2 w-[calc(33.333%-0.5rem)] text-center">
                      <span className="text-xs text-indigo-400 font-bold mb-1">{index + 1}교시</span>
                      <span className="font-semibold text-slate-700">{subject}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-lg font-bold flex items-center mb-4">
                <Utensils className="w-5 h-5 mr-2 text-orange-500" /> 
                오늘의 급식
              </h2>
              {meals.loading ? (
                <div className="text-center text-sm text-slate-500 py-6 animate-pulse">🍽️ 급식을 불러오는 중입니다...</div>
              ) : meals.error ? (
                <div className="text-center text-sm text-red-500 py-6 font-semibold">{meals.error}</div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-orange-700 mb-2 border-b border-orange-200 pb-1">점심 메뉴</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{meals.lunch.length > 0 ? meals.lunch.join(', ') : '점심 급식이 없습니다.'}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-blue-700 mb-2 border-b border-blue-200 pb-1">저녁 메뉴</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{meals.dinner.length > 0 ? meals.dinner.join(', ') : '저녁 급식이 없습니다.'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {selectedNotice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">{selectedNotice.title}</h3>
              <button onClick={() => setSelectedNotice(null)} className="p-1 rounded-full hover:bg-slate-200 transition">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {selectedNotice.type === 'image' && (
                <div className="w-full mb-4 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                   {selectedNotice.attachmentUrl ? (
                     <img src={selectedNotice.attachmentUrl} alt="첨부 이미지" className="max-w-full h-auto object-contain" style={{ maxHeight: '300px' }} />
                   ) : (
                     <div className="w-full h-48 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">[이미지 파일이 없습니다]</div>
                   )}
                </div>
              )}
              {selectedNotice.type === 'pdf' && (
                <div className="w-full p-4 bg-red-50 rounded-xl mb-4 flex items-center justify-between border border-red-100">
                  <div className="flex items-center text-red-700">
                    <FileText className="w-5 h-5 mr-2" />
                    <span className="text-sm font-semibold truncate max-w-[200px]">{selectedNotice.fileName || '첨부파일.pdf'}</span>
                  </div>
                </div>
              )}
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedNotice.content}</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {(currentUser.role === 'teacher' || currentUser.isManager) ? (
                <button onClick={() => setNoticeToDelete(selectedNotice)} className="text-red-500 font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition">삭제</button>
              ) : <div/>}
              <button onClick={() => setSelectedNotice(null)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-semibold hover:bg-slate-700 transition">확인</button>
            </div>
          </div>
        </div>
      )}

      {noticeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">공지사항 삭제</h3>
            <p className="text-slate-500 mb-6 text-sm">정말 이 공지사항을 삭제할까요?<br/>삭제 후에는 복구할 수 없습니다.</p>
            <div className="flex space-x-3">
              <button onClick={() => setNoticeToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition">취소</button>
              <button onClick={executeDeleteNotice} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-md">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center">
                <PlusCircle className="w-5 h-5 mr-2 text-blue-500" /> 새 공지사항 작성
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:bg-slate-100 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={submitNewNotice} className="space-y-4">
              <input type="text" placeholder="공지 제목을 입력하세요" className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50" value={newNoticeTitle} onChange={e => setNewNoticeTitle(e.target.value)} required />
              <label className="block w-full cursor-pointer">
                <div className="w-full px-4 py-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 flex flex-col items-center">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-500">사진 또는 PDF 파일 첨부 (선택)</span>
                  <input type="file" className="hidden" accept="image/*, application/pdf" onChange={handleFileChange} />
                </div>
              </label>
              {fileType === 'image' && filePreviewUrl && (
                <div className="mt-2 relative inline-block">
                  <img src={filePreviewUrl} alt="미리보기" className="h-24 rounded-lg object-cover border border-slate-200" />
                  <button type="button" onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); setFileType('text'); }} className="absolute -top-2 -right-2 bg-white rounded-full shadow-md p-1 hover:bg-slate-100"><X className="w-3 h-3 text-red-500" /></button>
                </div>
              )}
              {fileType === 'pdf' && (
                <div className="mt-2 p-3 bg-red-50 rounded-lg flex items-center justify-between border border-red-100">
                  <span className="text-red-700 text-sm truncate">{filePreviewUrl}</span>
                  <button type="button" onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); setFileType('text'); }} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                </div>
              )}
              <textarea placeholder="전달할 내용을 적어주세요." className="w-full px-4 py-3 border border-slate-200 rounded-xl h-32 resize-none bg-slate-50" value={newNoticeContent} onChange={e => setNewNoticeContent(e.target.value)} required />
              {submitError && <div className="text-red-500 text-sm">{submitError}</div>}
              <button type="submit" className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition shadow-md">등록하기</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
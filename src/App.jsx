import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  Camera,
  ExternalLink,
  BookOpen,
  Users,
  MessageCircle,
  Lock,
  Send,
  ShieldCheck,
  ZoomIn
} from 'lucide-react';

// --- [선생님 학급 명단 데이터 (수정 금지! 완벽하게 보존했습니다)] ---
const STUDENT_DATA = [];
for (let i = 1; i <= 26; i++) {
  const studentId = `102${String(i).padStart(2, '0')}`;
  
  let name = `${i}번 학생`;
  let month = 1;
  let day = i;

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

// 초기 유저 권한 정보 생성
const INITIAL_USERS = {
  'teacher': { id: 'teacher', name: '담임선생님', role: 'teacher', password: 'teacher', isFirstLogin: false }
};

STUDENT_DATA.forEach(student => {
  INITIAL_USERS[student.id] = { 
    id: student.id, 
    name: student.name, 
    role: 'student', 
    canPostAssessment: student.id === '10207' || student.id === '10214', 
    canPostOther: student.id === '10207' || student.id === '10209' || student.id === '10214', 
    canPostPhoto: student.id === '10207' || student.id === '10209', 
    password: '1234', 
    isFirstLogin: true 
  };
});

// --- [Firebase 초기화] ---
const firebaseConfig = {
  apiKey: "AIzaSyAElHK41lbDUNenYx_ALElMtVGg_RKmFNE",
  authDomain: "dongmul-and-pachungryu.firebaseapp.com",
  projectId: "dongmul-and-pachungryu",
  storageBucket: "dongmul-and-pachungryu.firebasestorage.app",
  messagingSenderId: "600320768294",
  appId: "1:600320768294:web:1ce849e6d0213cd6ca69e7",
  measurementId: "G-PK9Y4C8LPW"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- [메인 컴포넌트 시작] ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [isStudentManageModalOpen, setIsStudentManageModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [resetMessage, setResetMessage] = useState('');

  const [activeTab, setActiveTab] = useState('teacher_notice');

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [notices, setNotices] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [secretMessages, setSecretMessages] = useState([]);

  const [meals, setMeals] = useState({ today: { lunch: [], dinner: [] }, tomorrow: { lunch: [], dinner: [] }, loading: true, error: null });
  const [mealDayTab, setMealDayTab] = useState('today');

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [itemToDelete, setItemToDelete] = useState(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState('teacher');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileType, setFileType] = useState('text');
  const [isCompressing, setIsCompressing] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const getFormattedDate = (dateObj) => {
          return `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
        };

        const fetchForDate = async (dateStr) => {
          const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=M10&SD_SCHUL_CODE=8000376&MLSV_YMD=${dateStr}`;
          const response = await fetch(url);
          const data = await response.json();
          let lunch = [], dinner = [];

          if (data.mealServiceDietInfo) {
            data.mealServiceDietInfo[1].row.forEach(meal => {
              const cleanMenu = meal.DDISH_NM.replace(/<br\/>/g, ',').replace(/[0-9.()]/g, '').split(',').map(m => m.trim()).filter(m => m);
              if (meal.MMEAL_SC_NM === '중식') lunch = cleanMenu;
              if (meal.MMEAL_SC_NM === '석식') dinner = cleanMenu;
            });
          }
          return { lunch, dinner };
        };

        const [todayMeals, tomorrowMeals] = await Promise.all([
          fetchForDate(getFormattedDate(today)),
          fetchForDate(getFormattedDate(tomorrow))
        ]);

        setMeals({ today: todayMeals, tomorrow: tomorrowMeals, loading: false, error: null });
      } catch (error) {
        setMeals({ today: { lunch: [], dinner: [] }, tomorrow: { lunch: [], dinner: [] }, loading: false, error: '급식을 불러오지 못했습니다.' });
      }
    };
    fetchMeals();
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } 
      catch (error) { console.error("DB 접속 에러:", error); }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const noticesRef = collection(db, 'notices');
    const unsubNotices = onSnapshot(noticesRef, (snapshot) => {
      const loadedNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedNotices.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotices(loadedNotices);
    });

    const galleryRef = collection(db, 'gallery');
    const unsubGallery = onSnapshot(galleryRef, (snapshot) => {
      const loadedPhotos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedPhotos.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setPhotos(loadedPhotos);
    });

    const secretRef = collection(db, 'secretMessages');
    const unsubSecret = onSnapshot(secretRef, (snapshot) => {
      const loadedSecrets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedSecrets.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setSecretMessages(loadedSecrets);
    });

    return () => { unsubNotices(); unsubGallery(); unsubSecret(); };
  }, [firebaseUser]);

  const loadAllUsersForTeacher = async () => {
    if (currentUser?.role !== 'teacher') return;
    try {
      const snap = await getDocs(collection(db, 'users'));
      const dbUsers = {};
      snap.forEach(doc => { dbUsers[doc.id] = doc.data(); });
      
      const merged = Object.keys(INITIAL_USERS)
        .filter(id => id !== 'teacher')
        .map(id => dbUsers[id] || INITIAL_USERS[id]);
      
      setAllUsers(merged.sort((a,b) => a.id.localeCompare(b.id)));
      setIsStudentManageModalOpen(true);
      setResetMessage('');
    } catch(e) {
      console.error(e);
    }
  };

  const resetStudentPassword = async (studentId) => {
    try {
      const targetUser = allUsers.find(u => u.id === studentId);
      const updatedUser = { ...targetUser, password: '1234', isFirstLogin: true };
      
      await setDoc(doc(db, 'users', studentId), updatedUser);
      
      setAllUsers(prev => prev.map(u => u.id === studentId ? updatedUser : u));
      setResetMessage(`${targetUser.name} 학생의 비밀번호가 1234로 초기화되었습니다.`);
      setTimeout(() => setResetMessage(''), 3000);
    } catch(e) {
      setResetMessage('초기화에 실패했습니다.');
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
      };
    });
  };

  const openNoticeModal = () => {
    let defaultCategory = 'teacher';
    if (activeTab === 'assessment_notice') defaultCategory = 'assessment';
    if (activeTab === 'other_notice') defaultCategory = 'other';
    
    setNewNoticeCategory(defaultCategory);
    setIsNoticeModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setSubmitError('이미지 또는 PDF 파일만 업로드 가능합니다.');
      return;
    }

    setSelectedFile(file);
    setSubmitError('');

    if (file.type.startsWith('image/')) {
      setFileType('image');
      setIsCompressing(true);
      const compressedBase64 = await compressImage(file);
      setFilePreviewUrl(compressedBase64);
      setIsCompressing(false);
    } else {
      setFileType('pdf');
      setFilePreviewUrl(file.name); 
    }
  };

  const submitNewNotice = async (e) => {
    e.preventDefault(); 
    setSubmitError('');
    if (!firebaseUser) return setSubmitError('DB 연결 중입니다.');
    if (!newTitle || !newContent || isCompressing) return;

    try {
      await addDoc(collection(db, 'notices'), {
        title: newTitle, content: newContent, type: fileType,
        category: newNoticeCategory,
        date: new Date().toISOString().split('T')[0], 
        createdAt: serverTimestamp(),
        attachmentUrl: filePreviewUrl || null,
        fileName: selectedFile ? selectedFile.name : null,
        author: currentUser.name,
        uploaderId: currentUser.id
      });
      closeModal();
    } catch (error) { setSubmitError(`저장 실패: ${error.message}`); }
  };

  const submitNewPhoto = async (e) => {
    e.preventDefault(); 
    setSubmitError('');
    if (!firebaseUser) return setSubmitError('DB 연결 중입니다.');
    if (!filePreviewUrl || isCompressing) return;

    try {
      await addDoc(collection(db, 'gallery'), {
        title: newTitle || '무제',
        imageUrl: filePreviewUrl,
        date: new Date().toISOString().split('T')[0], 
        createdAt: serverTimestamp(),
        uploaderName: currentUser.name,
        uploaderId: currentUser.id
      });
      closeModal();
    } catch (error) { setSubmitError(`사진 업로드 실패: ${error.message}`); }
  };

  const submitNewSecretMessage = async (e) => {
    e.preventDefault(); 
    setSubmitError('');
    if (!firebaseUser) return setSubmitError('DB 연결 중입니다.');
    if (!newContent) return;

    try {
      await addDoc(collection(db, 'secretMessages'), {
        content: newContent,
        date: new Date().toISOString().split('T')[0], 
        createdAt: serverTimestamp(),
        senderName: currentUser.name,
        senderId: currentUser.id
      });
      closeModal();
    } catch (error) { setSubmitError(`전송 실패: ${error.message}`); }
  };

  // --- [새로 추가된 기능: 카테고리 이동] ---
  const handleMoveCategory = async (newCategory) => {
    if (!firebaseUser || !selectedItem || !selectedItem.hasOwnProperty('type')) return;
    try {
      await updateDoc(doc(db, 'notices', selectedItem.id), { category: newCategory });
      setSelectedItem(prev => ({ ...prev, category: newCategory }));
    } catch (error) {
      console.error('카테고리 변경 실패:', error);
    }
  };

  const executeDelete = async () => {
    if (!firebaseUser || !itemToDelete) return;
    try {
      const collectionName = itemToDelete.collectionType || (itemToDelete.imageUrl ? 'gallery' : 'notices');
      await deleteDoc(doc(db, collectionName, itemToDelete.id));
      setItemToDelete(null);
      setSelectedItem(null);
    } catch (error) { 
      setItemToDelete(null); 
    }
  };

  const closeModal = () => {
    setIsNoticeModalOpen(false); 
    setIsPhotoModalOpen(false);
    setIsSecretModalOpen(false);
    setNewTitle(''); 
    setNewContent(''); 
    setNewNoticeCategory('teacher'); 
    setSelectedFile(null);
    setFilePreviewUrl(null); 
    setFileType('text'); 
    setIsCompressing(false);
    setSubmitError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginId || !loginPw) return setLoginError('아이디와 비밀번호를 입력해주세요.');
    if (!firebaseUser) return setLoginError('데이터베이스 접속 중입니다.');

    try {
      const cleanId = loginId.trim();
      const userRef = doc(db, 'users', cleanId);
      const userSnap = await getDoc(userRef);
      
      const baseData = INITIAL_USERS[cleanId];
      if (!baseData) {
        return setLoginError('존재하지 않는 아이디(학번)입니다.');
      }

      let userData = { ...baseData };
      if (userSnap.exists()) {
        const dbData = userSnap.data();
        userData.password = dbData.password || baseData.password;
        userData.isFirstLogin = dbData.isFirstLogin !== undefined ? dbData.isFirstLogin : baseData.isFirstLogin;
      }

      if (userData.password === loginPw) {
        if (userData.isFirstLogin) setShowPasswordReset(true);
        setCurrentUser(userData);
      } else {
        setLoginError('학번 또는 비밀번호가 틀렸습니다.');
      }
    } catch (error) { setLoginError('로그인 에러 발생'); }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = { ...currentUser, password: newPassword, isFirstLogin: false };
      await setDoc(doc(db, 'users', currentUser.id), updatedUser);
      
      setCurrentUser(null);
      setLoginId('');
      setLoginPw('');
      setShowPasswordReset(false);
      setLoginError('✅ 비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.');
    } catch (error) { 
      setLoginError('비밀번호 변경 실패');
      setShowPasswordReset(false);
    }
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
      
      if (diffDays >= 0 && diffDays <= 5) {
        upcoming.push({ ...student, dDay: diffDays });
      }
    });
    
    return upcoming.sort((a, b) => a.dDay - b.dDay);
  };

  // --- [한국어 받침 판별기 (이/가, 의/이의)] ---
  const getPostposition = (name) => {
    if (!name) return '의';
    const lastChar = name.charCodeAt(name.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '의';
    return (lastChar - 0xAC00) % 28 > 0 ? '이의' : '의'; 
  };

  // --- [UI 로직 변수들] ---
  const isNoticeTab = activeTab.endsWith('_notice');
  const filteredNotices = notices.filter(notice => {
    if (activeTab === 'teacher_notice') return notice.category === 'teacher' || !notice.category;
    if (activeTab === 'assessment_notice') return notice.category === 'assessment';
    if (activeTab === 'other_notice') return notice.category === 'other';
    return false;
  });

  const canPostInCurrentTab = 
    currentUser?.role === 'teacher' ||
    (activeTab === 'assessment_notice' && currentUser?.canPostAssessment) ||
    (activeTab === 'other_notice' && currentUser?.canPostOther);


  // --- [화면 렌더링 (UI)] ---

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
            <input type="text" placeholder="학번 (예: 10201) 또는 아이디" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-400 bg-slate-50" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
            <input type="password" placeholder="비밀번호" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-400 bg-slate-50" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
            {loginError && <p className="text-red-500 text-sm text-left">{loginError}</p>}
            <button type="submit" className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-md">입장하기</button>
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
          <p className="text-slate-600 mb-6 text-sm">안전을 위해 새로운 비밀번호를 설정해 주세요.</p>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <input type="password" placeholder="새 비밀번호 입력" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-400" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700">변경 및 시작하기</button>
          </form>
        </div>
      </div>
    );
  }

  const upcomingBirthdays = getUpcomingBirthdays();
  const todayDate = new Date();
  const formattedToday = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][todayDate.getDay()]}요일`;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans pb-10">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <BookOpen className="text-emerald-600 w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">서전고 1-2 동물과 파충류</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full border shadow-sm">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" /> <span>{formattedToday}</span>
            </div>
            <div className="hidden sm:flex items-center text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <Sun className="w-4 h-4 mr-2 text-orange-400" /> <span>진천군 맑음, 22°C</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">{currentUser.name}</span>
              
              {currentUser.role === 'teacher' && (
                 <button onClick={loadAllUsersForTeacher} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition" title="학생 계정 관리">
                   <Users className="w-5 h-5" />
                 </button>
              )}

              <button onClick={() => { setCurrentUser(null); setLoginId(''); setLoginPw(''); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition" title="로그아웃"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {upcomingBirthdays.length > 0 && (
          <div className="bg-gradient-to-r from-pink-100 to-orange-100 border border-pink-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-full shadow-sm"><Gift className="text-pink-500 w-6 h-6" /></div>
              <div>
                <p className="font-bold text-pink-800 text-lg">
                  {upcomingBirthdays.map(s => s.name).join(', ')}{getPostposition(upcomingBirthdays[upcomingBirthdays.length - 1].name)} 생일이 다가옵니다! 🎂🎉🎁✨💖
                </p>
                <p className="text-sm text-pink-600 mt-0.5 font-medium">
                  {upcomingBirthdays[0].dDay === 0 ? '오늘이 바로 생일이에요! 🥳 다 같이 축하해주세요!! 🎊' : `두근두근 생일 D-${upcomingBirthdays[0].dDay} 🎈`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            {/* --- 탭 전환 버튼 --- */}
            <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto" style={{scrollbarWidth: 'none'}}>
              <button onClick={() => setActiveTab('teacher_notice')} className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'teacher_notice' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>선생님 공지</button>
              <button onClick={() => setActiveTab('assessment_notice')} className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'assessment_notice' ? 'bg-pink-50 text-pink-600 border-b-2 border-pink-600' : 'text-slate-400 hover:text-slate-600'}`}>수행평가</button>
              <button onClick={() => setActiveTab('other_notice')} className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'other_notice' ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}>기타 공지</button>
              <button onClick={() => setActiveTab('gallery')} className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'gallery' ? 'bg-green-50 text-green-600 border-b-2 border-green-600' : 'text-slate-400 hover:text-slate-600'}`}>사진첩</button>
              <button onClick={() => setActiveTab('secret')} className={`px-4 py-2 font-bold rounded-t-lg transition whitespace-nowrap ${activeTab === 'secret' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                비밀 쪽지 <Lock className="inline w-3 h-3 ml-1 mb-0.5" />
              </button>
            </div>

            {/* 분리된 공지사항 화면 */}
            {isNoticeTab && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold flex items-center">
                    {activeTab === 'teacher_notice' ? <Bell className="w-5 h-5 mr-2 text-blue-500" /> :
                     activeTab === 'assessment_notice' ? <FileText className="w-5 h-5 mr-2 text-pink-500" /> :
                     <Bell className="w-5 h-5 mr-2 text-orange-500" /> }
                    {activeTab === 'teacher_notice' ? '선생님 공지사항' : activeTab === 'assessment_notice' ? '수행평가 안내' : '기타 학급 공지'}
                  </h2>
                  {canPostInCurrentTab && (
                    <button onClick={openNoticeModal} className="flex items-center text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition shadow-sm">
                      <PlusCircle className="w-4 h-4 mr-1" /> 글 쓰기
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredNotices.map((notice) => (
                    <div key={notice.id} onClick={() => setSelectedItem(notice)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer flex flex-col justify-between group">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${notice.type === 'pdf' ? 'bg-red-100 text-red-600' : notice.type === 'image' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                            {notice.type === 'pdf' ? <FileText className="inline w-3 h-3 mr-1"/> : null}
                            {notice.type === 'image' ? <ImageIcon className="inline w-3 h-3 mr-1"/> : null}
                            {notice.type.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition">{notice.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{notice.content}</p>
                      </div>
                      <div className="mt-4 text-xs text-slate-400 flex justify-between">
                         <span>{notice.author}</span>
                         <span>{notice.date}</span>
                      </div>
                    </div>
                  ))}
                  {filteredNotices.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 bg-white rounded-2xl border border-dashed">등록된 내용이 없습니다.</div>}
                </div>
              </>
            )}

            {/* 사진첩 화면 */}
            {activeTab === 'gallery' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold flex items-center"><Camera className="w-5 h-5 mr-2 text-green-500" /> 추억 사진첩</h2>
                  {(currentUser.role === 'teacher' || currentUser.canPostPhoto) && (
                    <button onClick={() => setIsPhotoModalOpen(true)} className="flex items-center text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition shadow-sm">
                      <Camera className="w-4 h-4 mr-1" /> 사진 올리기
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} onClick={() => setSelectedItem(photo)} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer overflow-hidden group">
                      <div className="aspect-square bg-slate-100 overflow-hidden relative">
                        <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{photo.title}</h3>
                        <div className="mt-1 text-xs text-slate-400 flex justify-between"><span>{photo.uploaderName}</span></div>
                      </div>
                    </div>
                  ))}
                  {photos.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 bg-white rounded-2xl border border-dashed">첫 번째 사진을 올려주세요! 📸</div>}
                </div>
              </>
            )}

            {/* --- 비밀 쪽지 화면 --- */}
            {activeTab === 'secret' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold flex items-center"><Lock className="w-5 h-5 mr-2 text-purple-500" /> 비밀 쪽지함</h2>
                  {currentUser.role === 'student' && (
                    <button onClick={() => setIsSecretModalOpen(true)} className="flex items-center text-sm bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition shadow-sm">
                      <Send className="w-4 h-4 mr-1" /> 쪽지 쓰기
                    </button>
                  )}
                </div>

                <div className="bg-purple-50 p-4 rounded-2xl mb-4 border border-purple-100 flex items-start">
                   <ShieldCheck className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                   <p className="text-sm text-purple-700">
                     {currentUser.role === 'teacher' 
                       ? '아이들이 보낸 비밀 쪽지함입니다. 선생님만 볼 수 있습니다.' 
                       : '선생님에게만 보이는 비밀 쪽지함입니다. 고민이나 하고 싶은 말을 편하게 남겨주세요!'}
                   </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {secretMessages
                    .filter(msg => currentUser.role === 'teacher' || msg.senderId === currentUser.id)
                    .map((msg) => (
                    <div key={msg.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="bg-purple-100 p-1.5 rounded-full"><User className="w-4 h-4 text-purple-600"/></div>
                          <span className="font-bold text-slate-800">{currentUser.role === 'teacher' ? msg.senderName : '내가 보낸 쪽지'}</span>
                        </div>
                        <span className="text-xs text-slate-400">{msg.date}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-xl leading-relaxed">{msg.content}</p>
                      
                      {currentUser.role === 'teacher' && (
                         <button 
                           onClick={() => setItemToDelete({ ...msg, collectionType: 'secretMessages' })} 
                           className="absolute top-4 right-4 text-xs text-red-400 hover:text-red-600 font-bold opacity-0 group-hover:opacity-100 transition"
                         >
                           삭제
                         </button>
                      )}
                    </div>
                  ))}
                  {secretMessages.filter(msg => currentUser.role === 'teacher' || msg.senderId === currentUser.id).length === 0 && (
                    <div className="py-10 text-center text-slate-400 bg-white rounded-2xl border border-dashed flex flex-col items-center">
                      <MessageCircle className="w-8 h-8 mb-2 text-slate-300" />
                      {currentUser.role === 'teacher' ? '아직 도착한 비밀 쪽지가 없습니다.' : '선생님께 보낸 비밀 쪽지가 없습니다.'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            {/* 컴시간 알리미 링크 버튼 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-lg font-bold flex items-center mb-4"><Clock className="w-5 h-5 mr-2 text-indigo-500" /> 오늘의 시간표</h2>
              <a href="http://www.xn--s39aj90b0nb2xw6xh.kr/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full py-8 bg-indigo-50 border border-indigo-100 rounded-2xl group hover:bg-indigo-100 transition shadow-sm">
                <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition"><ExternalLink className="text-indigo-600 w-6 h-6" /></div>
                <span className="font-bold text-indigo-700">시간표 확인하기</span>
                <span className="text-xs text-indigo-400 mt-1">(컴시간 알리미로 연결됩니다)</span>
              </a>
            </div>

            {/* 급식 영역 (오늘/내일 선택 기능) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center"><Utensils className="w-5 h-5 mr-2 text-orange-500" /> 급식 메뉴</h2>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setMealDayTab('today')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${mealDayTab === 'today' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}>오늘</button>
                  <button onClick={() => setMealDayTab('tomorrow')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${mealDayTab === 'tomorrow' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500'}`}>내일</button>
                </div>
              </div>

              {meals.loading ? <div className="text-center text-sm text-slate-500 py-6 animate-pulse">🍽️ 불러오는 중...</div> : meals.error ? <div className="text-center text-sm text-red-500 py-6 font-semibold">{meals.error}</div> : (
                <div className="space-y-4">
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-orange-700 mb-2 border-b border-orange-200 pb-1">점심</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{meals[mealDayTab].lunch.length > 0 ? meals[mealDayTab].lunch.join(', ') : '급식이 없습니다.'}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-blue-700 mb-2 border-b border-blue-200 pb-1">저녁</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{meals[mealDayTab].dinner.length > 0 ? meals[mealDayTab].dinner.join(', ') : '급식이 없습니다.'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 모달: 선생님 전용 학생 관리 (비밀번호 리셋) */}
      {isStudentManageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center"><Users className="w-5 h-5 mr-2 text-blue-500" /> 학생 계정 관리</h3>
              <button onClick={() => setIsStudentManageModalOpen(false)} className="text-slate-500 hover:bg-slate-100 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-2 flex-1">
              {allUsers.map(user => (
                 <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="font-bold text-slate-700 flex items-center">
                      <span className="w-12 text-slate-400 text-sm">{user.id.slice(3)}번</span>
                      <span>{user.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                       <span className="text-xs text-slate-400 w-24 text-right truncate">PW: {user.password}</span>
                       <button 
                          onClick={() => resetStudentPassword(user.id)} 
                          className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 transition"
                       >
                          1234로 초기화
                       </button>
                    </div>
                 </div>
              ))}
            </div>
            
            {resetMessage && (
               <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm font-bold rounded-xl text-center">
                 {resetMessage}
               </div>
            )}
          </div>
        </div>
      )}

      {/* 모달: 공지사항 및 사진 상세보기 (확대 기능 및 카테고리 이동 기능 포함) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg">{selectedItem.title}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded-full hover:bg-slate-200 transition"><X className="w-6 h-6 text-slate-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {(selectedItem.type === 'image' || selectedItem.imageUrl) && (
                <div 
                  className="w-full mb-4 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer relative group border border-slate-200"
                  onClick={() => setZoomedImageUrl(selectedItem.attachmentUrl || selectedItem.imageUrl)}
                  title="사진을 클릭하면 확대됩니다"
                >
                   {selectedItem.attachmentUrl || selectedItem.imageUrl ? (
                     <>
                       <img src={selectedItem.attachmentUrl || selectedItem.imageUrl} alt="첨부 이미지" className="max-w-full h-auto object-contain" style={{ maxHeight: '300px' }} />
                       <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                         <ZoomIn className="text-white w-10 h-10" />
                       </div>
                     </>
                   ) : (
                     <div className="w-full h-48 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">[이미지 파일이 없습니다]</div>
                   )}
                </div>
              )}
              {selectedItem.type === 'pdf' && (
                <div className="w-full p-4 bg-red-50 rounded-xl mb-4 flex items-center justify-between border border-red-100">
                  <div className="flex items-center text-red-700"><FileText className="w-5 h-5 mr-2" /><span className="text-sm font-semibold truncate max-w-[200px]">{selectedItem.fileName || '첨부파일.pdf'}</span></div>
                  <button className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold hover:bg-red-200 transition">다운로드</button>
                </div>
              )}
              {selectedItem.content && <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedItem.content}</p>}
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
              
              {/* 카테고리 이동 드롭다운 */}
              <div className="flex items-center space-x-2">
                {selectedItem.hasOwnProperty('type') && (currentUser.role === 'teacher' || currentUser.id === selectedItem.uploaderId) && (
                  <select
                    className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm transition"
                    value={selectedItem.category || 'teacher'}
                    onChange={(e) => handleMoveCategory(e.target.value)}
                  >
                    <option value="" disabled>카테고리 이동</option>
                    <option value="teacher" disabled={currentUser.role !== 'teacher'}>➡️ 선생님 공지</option>
                    <option value="assessment" disabled={currentUser.role !== 'teacher' && !currentUser.canPostAssessment}>➡️ 수행평가</option>
                    <option value="other" disabled={currentUser.role !== 'teacher' && !currentUser.canPostOther}>➡️ 기타 공지</option>
                  </select>
                )}
              </div>

              <div className="flex space-x-2">
                {(currentUser.role === 'teacher' || currentUser.id === selectedItem.uploaderId) && (
                  <button onClick={() => setItemToDelete(selectedItem)} className="text-red-500 font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition">삭제</button>
                )}
                <button onClick={() => setSelectedItem(null)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-semibold hover:bg-slate-700 transition">확인</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 전체화면 사진 확대 모달 (최상단) --- */}
      {zoomedImageUrl && (
        <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImageUrl(null)}>
          <button className="absolute top-4 right-4 text-white p-2 bg-white/10 hover:bg-white/30 rounded-full transition" onClick={() => setZoomedImageUrl(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={zoomedImageUrl} alt="확대된 이미지" className="max-w-full max-h-[95vh] object-contain shadow-2xl" />
        </div>
      )}

      {/* 모달: 삭제 확인 */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">게시물 삭제</h3>
            <p className="text-slate-500 mb-6 text-sm">정말 이 게시물을 삭제할까요?<br/>삭제 후에는 복구할 수 없습니다.</p>
            <div className="flex space-x-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition">취소</button>
              <button onClick={executeDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-md">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 알림장 새 공지 작성 */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center"><PlusCircle className="w-5 h-5 mr-2 text-blue-500" /> 새 공지사항 작성</h3>
              <button onClick={closeModal} className="text-slate-500 hover:bg-slate-100 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={submitNewNotice} className="space-y-4">
              
              <div className="flex space-x-2">
                {currentUser.role === 'teacher' && (
                  <label className={`flex-1 text-center py-2.5 rounded-xl cursor-pointer font-bold text-sm transition ${newNoticeCategory === 'teacher' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <input type="radio" name="category" value="teacher" checked={newNoticeCategory === 'teacher'} onChange={(e) => setNewNoticeCategory(e.target.value)} className="hidden" />
                    선생님 공지
                  </label>
                )}
                {(currentUser.role === 'teacher' || currentUser.canPostAssessment) && (
                  <label className={`flex-1 text-center py-2.5 rounded-xl cursor-pointer font-bold text-sm transition ${newNoticeCategory === 'assessment' ? 'bg-pink-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <input type="radio" name="category" value="assessment" checked={newNoticeCategory === 'assessment'} onChange={(e) => setNewNoticeCategory(e.target.value)} className="hidden" />
                    수행평가
                  </label>
                )}
                {(currentUser.role === 'teacher' || currentUser.canPostOther) && (
                  <label className={`flex-1 text-center py-2.5 rounded-xl cursor-pointer font-bold text-sm transition ${newNoticeCategory === 'other' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    <input type="radio" name="category" value="other" checked={newNoticeCategory === 'other'} onChange={(e) => setNewNoticeCategory(e.target.value)} className="hidden" />
                    기타 공지
                  </label>
                )}
              </div>

              <input type="text" placeholder="공지 제목" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
              <label className="block w-full cursor-pointer">
                <div className="w-full px-4 py-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition flex flex-col items-center justify-center space-y-2">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-500">{isCompressing ? '사진 용량 줄이는 중...' : '사진 또는 PDF 첨부 (선택)'}</span>
                  <input type="file" className="hidden" accept="image/*, application/pdf" onChange={handleFileChange} disabled={isCompressing} />
                </div>
              </label>
              {fileType === 'image' && filePreviewUrl && (
                <div className="mt-2 relative inline-block">
                  <img src={filePreviewUrl} alt="미리보기" className="h-24 rounded-lg object-cover border" />
                  <button type="button" onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); setFileType('text'); }} className="absolute -top-2 -right-2 bg-white rounded-full shadow-md p-1"><X className="w-3 h-3 text-red-500" /></button>
                </div>
              )}
              <textarea placeholder="내용을 적어주세요." className="w-full px-4 py-3 border rounded-xl h-32 resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none bg-slate-50" value={newContent} onChange={e => setNewContent(e.target.value)} required />
              {submitError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">⚠️ {submitError}</div>}
              <button type="submit" disabled={isCompressing} className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md ${isCompressing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}>알림장에 등록하기</button>
            </form>
          </div>
        </div>
      )}

      {/* 모달: 사진첩 업로드 */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center"><Camera className="w-5 h-5 mr-2 text-green-500" /> 사진 올리기</h3>
              <button onClick={closeModal} className="text-slate-500 hover:bg-slate-100 p-1 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={submitNewPhoto} className="space-y-4">
              <input type="text" placeholder="사진 제목을 적어주세요" className="w-full px-4 py-3 border rounded-xl bg-slate-50" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
              <label className="block w-full cursor-pointer">
                <div className="w-full px-4 py-10 border-2 border-dashed border-green-300 rounded-xl bg-green-50 hover:bg-green-100 flex flex-col items-center justify-center">
                  <Camera className="w-10 h-10 text-green-400 mb-2" />
                  <span className="text-sm font-bold text-green-700">{isCompressing ? '사진 최적화 중...' : '여기를 눌러 사진 선택'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} required disabled={isCompressing} />
                </div>
              </label>
              {filePreviewUrl && <div className="w-full rounded-xl overflow-hidden bg-slate-100 flex justify-center"><img src={filePreviewUrl} alt="미리보기" className="max-h-48 object-contain" /></div>}
              {submitError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">⚠️ {submitError}</div>}
              <button type="submit" disabled={isCompressing || !filePreviewUrl} className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md ${(isCompressing || !filePreviewUrl) ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>사진첩에 올리기</button>
            </form>
          </div>
        </div>
      )}

      {/* 모달: 비밀 쪽지 작성 */}
      {isSecretModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center"><Lock className="w-5 h-5 mr-2 text-purple-500" /> 선생님께 비밀 쪽지 쓰기</h3>
              <button onClick={closeModal} className="text-slate-500 hover:bg-slate-100 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={submitNewSecretMessage} className="space-y-4">
              <div className="bg-purple-50 p-3 rounded-xl mb-4 text-xs text-purple-700 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 flex-shrink-0" />
                이 쪽지는 담임선생님만 읽을 수 있어요. 안심하고 편하게 적어주세요!
              </div>
              <textarea 
                placeholder="선생님께 하고 싶은 말을 자유롭게 적어주세요..." 
                className="w-full px-4 py-3 border rounded-xl h-40 resize-none focus:ring-2 focus:ring-purple-400 focus:outline-none bg-slate-50" 
                value={newContent} 
                onChange={e => setNewContent(e.target.value)} 
                required 
              />
              {submitError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">⚠️ {submitError}</div>}
              <button type="submit" className="w-full bg-purple-500 text-white font-bold py-3 rounded-xl hover:bg-purple-600 transition shadow-md flex items-center justify-center">
                <Send className="w-5 h-5 mr-2" /> 선생님께 보내기
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
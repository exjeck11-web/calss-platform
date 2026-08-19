import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Calendar, 
  Utensils, 
  Sun, 
  Cloud,
  CloudRain,
  Snowflake,
  CloudLightning,
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

// --- [선생님 학급 명단 데이터] ---
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

// --- [초기 유저 및 권한 정보 생성] ---
const INITIAL_USERS = {
  'teacher': { id: 'teacher', name: '담임선생님', role: 'teacher', password: 'teacher', isFirstLogin: false },
  'teacher2': { id: 'teacher2', name: '교생선생님', role: 'student_teacher', password: 'dladydgkqrur!', isFirstLogin: false, canPostPhoto: true }
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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
  const [comments, setComments] = useState([]);

  const [meals, setMeals] = useState({ today: { lunch: [], dinner: [] }, tomorrow: { lunch: [], dinner: [] }, loading: true, error: null });
  const [mealDayTab, setMealDayTab] = useState('today');

  const [weather, setWeather] = useState({ temp: null, description: '날씨 정보 없음', icon: Sun, color: 'text-orange-400' });

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
  
  const [newComment, setNewComment] = useState(''); 

  // --- 날씨 API ---
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const lat = 36.8553;
        const lon = 127.4356;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia%2FSeoul`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          
          let desc = '맑음';
          let WIcon = Sun;
          let color = 'text-orange-400';

          if (code === 0) { desc = '맑음'; WIcon = Sun; color = 'text-orange-400'; }
          else if (code === 1 || code === 2) { desc = '구름 조금'; WIcon = Cloud; color = 'text-slate-400'; }
          else if (code === 3) { desc = '흐림'; WIcon = Cloud; color = 'text-slate-500'; }
          else if (code >= 45 && code <= 48) { desc = '안개'; WIcon = Cloud; color = 'text-slate-400'; }
          else if (code >= 51 && code <= 67) { desc = '비'; WIcon = CloudRain; color = 'text-blue-500'; }
          else if (code >= 71 && code <= 77) { desc = '눈'; WIcon = Snowflake; color = 'text-blue-300'; }
          else if (code >= 80 && code <= 82) { desc = '소나기'; WIcon = CloudRain; color = 'text-blue-500'; }
          else if (code >= 85 && code <= 86) { desc = '눈'; WIcon = Snowflake; color = 'text-blue-300'; }
          else if (code >= 95) { desc = '천둥번개'; WIcon = CloudLightning; color = 'text-yellow-500'; }

          setWeather({ temp, description: desc, icon: WIcon, color });
        }
      } catch (error) {
        console.error("날씨 정보를 불러오지 못했습니다.", error);
      }
    };
    fetchWeather();
  }, []);

  // --- 급식 API ---
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

  // --- Firebase 연결 ---
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

    const commentsRef = collection(db, 'comments');
    const unsubComments = onSnapshot(commentsRef, (snapshot) => {
      const loadedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loadedComments.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setComments(loadedComments);
    });

    return () => { unsubNotices(); unsubGallery(); unsubSecret(); unsubComments(); };
  }, [firebaseUser]);

  const loadAllUsersForTeacher = async () => {
    if (currentUser?.role !== 'teacher') return;
    try {
      const snap = await getDocs(collection(db, 'users'));
      const dbUsers = {};
      snap.forEach(doc => { dbUsers[doc.id] = doc.data(); });
      
      const merged = Object.keys(INITIAL_USERS)
        .filter(id => INITIAL_USERS[id].role === 'student')
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

  const submitNewComment = async (e) => {
    e.preventDefault();
    if (!firebaseUser || !currentUser) return;
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, 'comments'), {
        noticeId: selectedItem.id,
        content: newComment,
        authorName: currentUser.name,
        authorId: currentUser.id,
        createdAt: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });
      setNewComment('');
    } catch (error) {
      console.error("댓글 작성 실패:", error);
    }
  };

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
      
      if (itemToDelete.collectionType !== 'comments') {
        setSelectedItem(null);
      }
      setItemToDelete(null);
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
    setNewComment('');
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginId('');
    setLoginPw('');
    setLoginError('');
    if (showPasswordReset) {
      setCurrentUser(null);
      setShowPasswordReset(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginId || !loginPw) return setLoginError('아이디와 비밀번호를 입력해주세요.');
    if (!firebaseUser) return setLoginError('데이터베이스 접속 중입니다.');

    try {
      const cleanId = loginId.trim().toLowerCase();
      const cleanPw = loginPw.trim();
      
      const userRef = doc(db, 'users', cleanId);
      const userSnap = await getDoc(userRef);
      
      const baseData = INITIAL_USERS[cleanId];
      if (!baseData) {
        return setLoginError('존재하지 않는 아이디(학번)입니다.');
      }

      let userData = { ...baseData };
      if (userSnap.exists()) {
        const dbData = userSnap.data();
        if (cleanId === 'teacher' || cleanId === 'teacher2') {
           userData.password = baseData.password;
        } else {
           userData.password = dbData.password || baseData.password;
        }
        userData.isFirstLogin = dbData.isFirstLogin !== undefined ? dbData.isFirstLogin : baseData.isFirstLogin;
      }

      let isPasswordCorrect = false;
      if (userData.password === loginPw || userData.password === cleanPw) {
        isPasswordCorrect = true;
      } else if (cleanId === 'teacher2' && (cleanPw === 'Dladydgkqrur!' || cleanPw === 'dladydgkqrur!')) {
        isPasswordCorrect = true;
      } else if (cleanId === 'teacher' && (cleanPw === 'Teacher' || cleanPw === 'teacher')) {
        isPasswordCorrect = true;
      }

      if (isPasswordCorrect) {
        if (userData.isFirstLogin) {
          setShowPasswordReset(true);
          setCurrentUser(userData);
        } else {
          setCurrentUser(userData);
          closeLoginModal();
        }
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

  const getPostposition = (name) => {
    if (!name) return '의';
    const lastChar = name.charCodeAt(name.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '의';
    return (lastChar - 0xAC00) % 28 > 0 ? '이의' : '의'; 
  };

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

  const todayDate = new Date();
  const formattedToday = `${todayDate.getFullYear()}년 ${todayDate.getMonth() + 1}월 ${todayDate.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][todayDate.getDay()]}요일`;
  const upcomingBirthdays = getUpcomingBirthdays();
  
  const WeatherIcon = weather.icon;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans pb-10">
      {/* 둥글고 얇은 귀여운 '고운돋움' 폰트 적용 */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap');
          .cute-font { font-family: 'Gowun Dodum', sans-serif; font-weight: 600; letter-spacing: -0.3px; }
        `}
      </style>

      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <BookOpen className="text-emerald-600 w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">서전고 1-2 맹꽁몽구스 1기</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full border shadow-sm">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" /> <span>{formattedToday}</span>
            </div>
            
            <div className="hidden sm:flex items-center text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <WeatherIcon className={`w-4 h-4 mr-2 ${weather.color}`} /> 
              <span>{weather.temp !== null ? `진천군 ${weather.description}, ${weather.temp}°C` : '날씨 불러오는 중...'}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {!currentUser ? (
                <button 
                  onClick={() => setIsLoginModalOpen(true)} 
                  className="text-sm font-bold bg-blue-500 text-white px-4 py-1.5 rounded-full hover:bg-blue-600 transition shadow-sm"
                >
                  로그인
                </button>
              ) : (
                <>
                  <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">{currentUser.name}</span>
                  
                  {currentUser.role === 'teacher' && (
                     <button onClick={loadAllUsersForTeacher} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition" title="학생 계정 관리">
                       <Users className="w-5 h-5" />
                     </button>
                  )}

                  <button onClick={() => { setCurrentUser(null); setLoginId(''); setLoginPw(''); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition" title="로그아웃"><LogOut className="w-5 h-5" /></button>
                </>
              )}
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
            
            {/* 3가지 공지사항 탭 + 2가지 추가 탭이 모두 포함된 부분입니다. */}
            <div className="flex space-x-6 border-b border-slate-200 overflow-x-auto mb-6 px-1" style={{scrollbarWidth: 'none'}}>
              <button onClick={() => setActiveTab('teacher_notice')} className={`pb-3 font-bold transition whitespace-nowrap relative top-[1px] border-b-2 ${activeTab === 'teacher_notice' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>학급 공지</button>
              <button onClick={() => setActiveTab('assessment_notice')} className={`pb-3 font-bold transition whitespace-nowrap relative top-[1px] border-b-2 ${activeTab === 'assessment_notice' ? 'text-pink-600 border-pink-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>수행평가 공지</button>
              <button onClick={() => setActiveTab('other_notice')} className={`pb-3 font-bold transition whitespace-nowrap relative top-[1px] border-b-2 ${activeTab === 'other_notice' ? 'text-orange-600 border-orange-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>학교 행사 공지</button>
              <button onClick={() => setActiveTab('gallery')} className={`pb-3 font-bold transition whitespace-nowrap relative top-[1px] border-b-2 ${activeTab === 'gallery' ? 'text-green-600 border-green-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>사진첩</button>
              <button onClick={() => setActiveTab('secret')} className={`pb-3 font-bold transition whitespace-nowrap flex items-center relative top-[1px] border-b-2 ${activeTab === 'secret' ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                비밀 쪽지 <Lock className="w-3 h-3 ml-1" />
              </button>
            </div>

            {isNoticeTab && (
              <>
                <div className="flex justify-between items-center mb-4 mt-2">
                  <h2 className="text-lg font-bold flex items-center">
                    {activeTab === 'teacher_notice' ? <Bell className="w-5 h-5 mr-2 text-blue-500" /> :
                     activeTab === 'assessment_notice' ? <FileText className="w-5 h-5 mr-2 text-pink-500" /> :
                     <Bell className="w-5 h-5 mr-2 text-orange-500" /> }
                    {activeTab === 'teacher_notice' ? '학급 공지' : activeTab === 'assessment_notice' ? '수행평가 공지' : '학교 행사 공지'}
                  </h2>
                  {currentUser && canPostInCurrentTab && (
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
                          {notice.type === 'pdf' ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-50 text-red-500 flex items-center w-fit">
                              <FileText className="w-3 h-3 mr-1"/>PDF
                            </span>
                          ) : notice.type === 'image' ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-50 text-green-600 flex items-center w-fit">
                              <ImageIcon className="w-3 h-3 mr-1"/>IMAGE
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 flex items-center w-fit">
                              TEXT
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition">{notice.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{notice.content}</p>
                      </div>
                      <div className="mt-4 text-xs text-slate-400 flex justify-between items-center">
                         <span>{notice.author}</span>
                         <div className="flex items-center space-x-2">
                           <span className="flex items-center text-blue-400">
                             <MessageCircle className="w-3 h-3 mr-0.5" /> 
                             {comments.filter(c => c.noticeId === notice.id).length}
                           </span>
                           <span>{notice.date}</span>
                         </div>
                      </div>
                    </div>
                  ))}
                  {filteredNotices.length === 0 && <div className="col-span-full py-10 text-center text-slate-400 bg-white rounded-2xl border border-dashed">등록된 내용이 없습니다.</div>}
                </div>
              </>
            )}

            {activeTab === 'gallery' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold flex items-center"><Camera className="w-5 h-5 mr-2 text-green-500" /> 추억 사진첩</h2>
                  {currentUser && (currentUser.role === 'teacher' || currentUser.role === 'student_teacher' || currentUser.canPostPhoto) && (
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

            {activeTab === 'secret' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold flex items-center"><Lock className="w-5 h-5 mr-2 text-purple-500" /> 비밀 쪽지함</h2>
                  {currentUser?.role === 'student' && (
                    <button onClick={() => setIsSecretModalOpen(true)} className="flex items-center text-sm bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition shadow-sm">
                      <Send className="w-4 h-4 mr-1" /> 쪽지 쓰기
                    </button>
                  )}
                </div>

                {!currentUser ? (
                  <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed flex flex-col items-center">
                    <Lock className="w-10 h-10 mb-3 text-purple-200" />
                    <p className="mb-4 text-slate-500">선생님과 학생만 확인할 수 있는 비밀 공간입니다.</p>
                    <button onClick={() => setIsLoginModalOpen(true)} className="bg-purple-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-600 transition shadow-sm">
                      로그인하고 비밀 쪽지 확인하기
                    </button>
                  </div>
                ) : (
                  <>
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
              </>
            )}
          </div>

          <div className="space-y-6 mt-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold flex items-center mb-4"><Clock className="w-5 h-5 mr-2 text-indigo-500" /> 오늘의 시간표</h2>
              <div className="bg-indigo-50/50 p-6 rounded-2xl flex flex-col items-center justify-center border border-indigo-50">
                <a href="http://www.xn--s39aj90b0nb2xw6xh.kr/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full bg-white py-6 rounded-xl hover:shadow-md transition shadow-sm border border-indigo-100/50 group">
                  <div className="mb-2 group-hover:scale-110 transition bg-indigo-50 p-3 rounded-full text-indigo-600">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-indigo-700">시간표 확인하기</span>
                  <span className="text-xs text-indigo-400 mt-1">(컴시간 알리미로 연결됩니다)</span>
                </a>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border-2 border-orange-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 opacity-50"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center cute-font text-orange-600">

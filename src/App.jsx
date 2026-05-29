import { useState, useEffect, useRef } from "react";
import { supabase } from './supabase.js';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const CLEAN_LEVELS = [
  { key: "깨", caption: "완전 '깨'끗 ✨" },
  { key: "애", caption: "깨'애'끗한걸? 👌" },
  { key: "에", caption: "그냥 깨'에'끗 🤏" },
  { key: "끄", caption: "여긴 깨'끄'... 😬" },
  { key: "읏", caption: "'읏'... 언니들... 🫠" },
];

const RATING_CONFIG = {
  best: { label: "언니 여기로 와! 💕",    short: "여기로 와!",    color: "#FF6B9D", bg: "#FFF0F5", emoji: "🌸", pinBg: "#FF6B9D" },
  good: { label: "언니 써도 돼 👌",       short: "써도 돼",       color: "#E91E8C", bg: "#FFF5F8", emoji: "✨", pinBg: "#E91E8C" },
  mid:  { label: "언니 급하면... 🥲",     short: "급하면...",     color: "#FFB347", bg: "#FFF8F0", emoji: "⚠️", pinBg: "#FFB347" },
  bad:  { label: "전 가게 들렸지? 🫠",    short: "전 가게 ㄱㄱ",  color: "#FF4757", bg: "#FFF0F0", emoji: "🫠", pinBg: "#FF4757" },
};

const ACCESS_ICONS = { 개방: "🆓", 비밀번호: "🔐", 열쇠: "🔑" };

const LOCATION_LABELS = {
  매장내부:  { icon: "🏪", label: "매장 내부" },
  매장외부:  { icon: "🚪", label: "매장 외부" },
  건물외부:  { icon: "🌳", label: "건물 외부" },
};

function genderDisplay(gender, stalls) {
  if (gender === "공용") return { icon: "🚻", label: "남녀공용" };
  if (gender === "분리" && stalls === "한칸") return { icon: "👨👩", label: "남녀분리·한칸" };
  if (gender === "분리" && stalls === "여러칸") return { icon: "👨👩", label: "남녀분리·여러칸" };
  return { icon: "🚻", label: "남녀공용" };
}

const EXTRAS_CONFIG = [
  { key: "soap",    icon: "🧼", label: "비누" },
  { key: "tissue",  icon: "🧻", label: "휴지" },
  { key: "bidet",   icon: "🚿", label: "비데" },
  { key: "dryer",   icon: "💨", label: "손건조기·타월" },
  { key: "mirror",  icon: "🪞", label: "거울 쪼아 👌" },
  { key: "powder",  icon: "💄", label: "파우더룸" },
  { key: "gargle",  icon: "😮‍💨", label: "가글" },
];

const MIN_REVIEWS_FOR_RATING = 3;

// 홍대 좌표 (위치 거부 시 기본값)
const DEFAULT_CENTER = { lat: 37.5563, lng: 126.9236 };

const MOCK_SPOTS = [];


const EMPTY_DATA = { place: null, kakao_place_id: null, gender: "", stalls: "", access: "", location: "", clean: "", final: "", extras: [] };

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

export default function UnniMapMobile() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLocationAsk, setShowLocationAsk] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [sheetState, setSheetState] = useState("collapsed");
  const [selected, setSelected] = useState(null);
  const [noInfoPos, setNoInfoPos] = useState(null);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("map"); // map | add | detail
  const [addStep, setAddStep] = useState(0);
  const [addData, setAddData] = useState(EMPTY_DATA);
  const [spots, setSpots] = useState([]);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [searchDropdown, setSearchDropdown] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [isMaster, setIsMaster] = useState(() => localStorage.getItem('__um') === '1');
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [masterPw, setMasterPw] = useState('');
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const installPrompt = useRef(null);
  const mapControl = useRef(null); // KakaoMap 직접 제어용

  // Supabase에서 spots 불러오기
  useEffect(() => {
    supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSpots(data);
        setSpotsLoading(false);
      });
  }, []);

  // 스플래시 + 위치 권한 요청 흐름
  useEffect(() => {
    const t = setTimeout(() => {
      setShowSplash(false);
      setTimeout(() => setShowLocationAsk(true), 300);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  // 홈 화면 추가 — beforeinstallprompt 이벤트가 올 때만 배너 표시
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      installPrompt.current = e;
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleLocationGrant = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setShowLocationAsk(false);
        },
        () => setShowLocationAsk(false)
      );
    } else {
      setShowLocationAsk(false);
    }
  };

  const handleLocationDeny = () => setShowLocationAsk(false);

  const filteredSpots = spots.filter(spot => {
    const reviews = typeof spot.reviews === 'string' ? parseInt(spot.reviews) : spot.reviews;
    const hasEnoughReviews = reviews >= MIN_REVIEWS_FOR_RATING;
    const matchFilter = filter === "all" || (hasEnoughReviews && spot.rating === filter);
    const matchSearch = spot.name.includes(searchText) || spot.category.includes(searchText);
    return matchFilter && matchSearch;
  });

  const INDOOR = ["매장내부", "매장외부"];

  const getNextStep = (step, data) => {
    if (step === 1 && data.gender === "공용") return 3;          // 공용 → 칸수 스킵
    if (step === 3 && INDOOR.includes(data.location)) return 5;  // 실내 → 접근방법 스킵
    return step + 1;
  };
  const getPrevStep = (step, data) => {
    if (step === 3 && data.gender === "공용") return 1;          // 공용 뒤로 → 칸수 스킵
    if (step === 5 && INDOOR.includes(data.location)) return 3;  // 실내 뒤로 → 접근방법 스킵
    return step - 1;
  };

  const handleAddNext = async () => {
    if (addStep >= 7) {
      if (!addData.kakao_place_id) {
        alert("장소를 선택해주세요!");
        return;
      }

      // kakao_place_id로 기존 평가 확인
      const { data: existing } = await supabase
        .from('spots')
        .select('id, reviews')
        .eq('kakao_place_id', addData.kakao_place_id)
        .single();

      if (existing) {
        // 기존 장소: reviews +1, 최신 평가로 업데이트
        const newReviews = (parseInt(existing.reviews) || 0) + 1;
        const { data, error } = await supabase
          .from('spots')
          .update({
            reviews: newReviews,
            clean: addData.clean,
            rating: addData.final,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          alert("평가 추가 실패: " + error.message);
          return;
        }
        if (data) {
          setSpots(prev => prev.map(s => s.id === existing.id ? data : s));
          setSelected(data);
        }
      } else {
        // 신규 장소 등록
        const cycle = [4, 5, 6, 7, 8];
        const idx = parseInt(localStorage.getItem('__um_i') || '0');
        const reviews = isMaster ? cycle[idx] : 1;
        if (isMaster) localStorage.setItem('__um_i', String((idx + 1) % cycle.length));

        const newSpot = {
          name: addData.place?.name || "내가 추가한 장소",
          lat: addData.place?.lat,
          lng: addData.place?.lng,
          category: addData.place?.category || "직접추가",
          rating: addData.final,
          gender: addData.gender,
          stalls: addData.gender === "공용" ? null : addData.stalls,
          access: addData.access || null,
          location: addData.location,
          clean: addData.clean,
          extras: addData.extras,
          kakao_place_id: addData.kakao_place_id,
          reviews,
        };

        const { data, error } = await supabase
          .from('spots')
          .insert(newSpot)
          .select()
          .single();

        if (error) {
          alert("등록 실패: " + error.message);
          return;
        }
        if (data) setSpots(prev => [data, ...prev]);
      }

      setView("done");
      setAddStep(0);
      setAddData(EMPTY_DATA);
      return;
    }
    setAddStep(getNextStep(addStep, addData));
  };

  const handleAddBack = () => {
    if (addStep === 0) {
      setView("map");
      setAddData(EMPTY_DATA);
      return;
    }
    setAddStep(getPrevStep(addStep, addData));
  };

  const metersBetween = (a, b) => {
    const R = 6371000;
    const φ1 = a.lat * Math.PI / 180, φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  };

  const selectSpot = (spot) => {
    setSelected(spot);
    setSheetState("half");
    setNoInfoPos(null);
    if (spot.lat && spot.lng) mapControl.current?.panTo(spot.lat, spot.lng);
  };

  const handleMapClick = ({ lat, lng }) => {
    if (sheetState !== "collapsed") { setSelected(null); setSheetState("collapsed"); return; }
    const nearest = spots
      .filter(s => s.lat && s.lng)
      .map(s => ({ s, d: metersBetween({ lat, lng }, { lat: s.lat, lng: s.lng }) }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest && nearest.d < 100) {
      selectSpot(nearest.s);
    } else {
      setNoInfoPos({ lat, lng });
    }
  };

  const handleInstall = async () => {
    if (installPrompt.current) {
      installPrompt.current.prompt();
      await installPrompt.current.userChoice;
      installPrompt.current = null;
    }
    setShowInstallBanner(false);
  };

  const handleLogoTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    if (tapCount.current >= 6) {
      tapCount.current = 0;
      setShowMasterLogin(true);
    }
  };

  const handleMasterLogin = () => {
    const key = [48,54,50,48].map(c => String.fromCharCode(c)).join('');
    if (masterPw === key) {
      localStorage.setItem('__um', '1');
      setIsMaster(true);
      setShowMasterLogin(false);
    }
    setMasterPw('');
  };

  const kakaoSearch = (term, onResult) => {
    if (!term.trim() || !window.kakao?.maps?.services?.Places) return;
    // 전국 bounds 명시 → 지도 뷰포트가 검색 범위를 제한하는 현상 방지
    const koreaBounds = new window.kakao.maps.LatLngBounds(
      new window.kakao.maps.LatLng(33.0, 124.6),
      new window.kakao.maps.LatLng(38.6, 131.9)
    );
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(term, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) onResult(data.slice(0, 10));
    }, { size: 10, bounds: koreaBounds });
  };

  const handleMapSearch = () => {
    kakaoSearch(searchText, (results) => {
      setSearchDropdown(results);
      setShowDrop(true);
    });
  };

  // 타이핑 후 600ms 자동 검색
  useEffect(() => {
    if (!searchText.trim()) { setShowDrop(false); setSearchDropdown([]); return; }
    const t = setTimeout(() => {
      kakaoSearch(searchText, (results) => {
        setSearchDropdown(results);
        setShowDrop(results.length > 0);
      });
    }, 600);
    return () => clearTimeout(t);
  }, [searchText]);

  // 화면 상태 분기
  if (showSplash) return <Splash />;

  return (
    <div style={s.app}>
      {/* 마스터 로그인 (비공개) */}
      {showMasterLogin && (
        <div style={s.masterOverlay} onClick={() => { setShowMasterLogin(false); setMasterPw(''); }}>
          <div style={s.masterModal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🔐</div>
            <input
              style={s.masterInput}
              type="password"
              inputMode="numeric"
              value={masterPw}
              onChange={e => setMasterPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMasterLogin()}
              placeholder="••••"
              autoFocus
            />
            <button style={s.masterBtn} onClick={handleMasterLogin}>확인</button>
          </div>
        </div>
      )}

      {/* 위치 권한 모달 */}
      {showLocationAsk && (
        <LocationModal onGrant={handleLocationGrant} onDeny={handleLocationDeny} />
      )}

      {/* 홈 화면 추가 배너 */}
      {showInstallBanner && view === "map" && (
        <InstallBanner
          onClose={() => setShowInstallBanner(false)}
          onInstall={handleInstall}
        />
      )}

      {/* ===== ADD / DONE VIEW (전체화면 오버레이) ===== */}
      {view === "add" && (
        <AddScreen
          step={addStep}
          data={addData}
          setData={setAddData}
          onNext={handleAddNext}
          onBack={handleAddBack}
        />
      )}
      {view === "done" && (
        <DoneScreen onBack={() => setView("map")} />
      )}

      {/* ===== MAP VIEW — display:none으로 숨겨도 KakaoMap 마운트 유지 ===== */}
      <div style={{
        display: view === "map" ? "flex" : "none",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        position: "relative",
      }}>
        {/* 상단 검색바 */}
        <div style={{ ...s.topBar, position: "relative" }}>
          <div style={s.logo} onClick={handleLogoTap}>
            <span style={{ fontSize: 18 }}>🚻</span>
            <span style={s.logoText}>언니맵</span>
            {isMaster && (
              <span
                style={s.masterBadge}
                onClick={e => { e.stopPropagation(); localStorage.removeItem('__um'); setIsMaster(false); }}
              >👑</span>
            )}
          </div>
          <div style={s.searchWrap}>
            <input
              style={s.searchInput}
              placeholder="장소명 검색..."
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setShowDrop(false); }}
              onKeyDown={e => e.key === 'Enter' && handleMapSearch()}
            />
            {searchText
              ? <button style={s.searchClearBtn} onClick={() => { setSearchText(""); setShowDrop(false); setSearchDropdown([]); }}>✕</button>
              : null
            }
            <button style={s.searchGoBtn} onClick={handleMapSearch}>🔍</button>
          </div>

          {/* 카카오 장소 검색 드롭다운 */}
          {showDrop && searchDropdown.length > 0 && (
            <div style={s.searchDrop}>
              {searchDropdown.map(r => (
                <button
                  key={r.id}
                  style={s.searchDropItem}
                  onClick={() => {
                    setAddData({
                      ...EMPTY_DATA,
                      kakao_place_id: r.id,
                      place: {
                        name: r.place_name,
                        lat: parseFloat(r.y),
                        lng: parseFloat(r.x),
                        address: r.road_address_name || r.address_name,
                        category: r.category_group_name || '기타',
                      }
                    });
                    setAddStep(1);
                    setView("add");
                    setSearchText('');
                    setShowDrop(false);
                  }}
                >
                  <div style={s.searchDropName}>{r.place_name}</div>
                  <div style={s.searchDropAddr}>{r.road_address_name || r.address_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 필터 칩 */}
        <div style={s.filterRow}>
          {[["all","전체"], ["best","여기로 와!"], ["good","써도 돼"], ["mid","급하면..."], ["bad","전 가게 ㄱㄱ"]].map(([key, label]) => (
            <button
              key={key}
              style={{ ...s.chip, ...(filter === key ? s.chipActive : {}) }}
              onClick={() => setFilter(key)}
            >{label}</button>
          ))}
        </div>

        {/* 지도 영역 */}
        <div style={s.mapArea}>
          {spotsLoading && (
            <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', background:'rgba(255,107,157,0.9)', color:'#fff', borderRadius:20, padding:'6px 16px', fontSize:12, fontWeight:700, zIndex:200 }}>
              화장실 정보 불러오는 중...
            </div>
          )}
          <KakaoMap
            spots={filteredSpots}
            userLocation={userLocation}
            selected={selected}
            onSelectSpot={selectSpot}
            onMapClick={handleMapClick}
            controlRef={mapControl}
          />
          <button style={s.fab} onClick={() => { setView("add"); setAddStep(0); setAddData(EMPTY_DATA); }}>
            <span style={{ fontSize: 20 }}>+</span>
            <span style={{ fontSize: 12, fontWeight: 800 }}>정보 올리기</span>
          </button>
        </div>

        {/* 정보 없는 위치 클릭 시 안내 카드 */}
        {noInfoPos && !selected && (
          <div style={s.noInfoCard}>
            <button style={s.noInfoClose} onClick={() => setNoInfoPos(null)}>✕</button>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🥲</div>
            <div style={s.noInfoTitle}>아직 정보가 없어요 언니!</div>
            <div style={s.noInfoSub}>여기 화장실 써봤으면 정보 올려줘요</div>
            <button style={s.noInfoBtn} onClick={() => {
              setNoInfoPos(null);
              setView("add");
              setAddStep(0);
              setAddData(EMPTY_DATA);
            }}>+ 정보 올리기</button>
          </div>
        )}

        {/* 바텀시트 */}
        {selected && sheetState !== "collapsed" && (
          <BottomSheet
            spot={selected}
            sheetState={sheetState}
            setSheetState={setSheetState}
            onClose={() => { setSelected(null); setSheetState("collapsed"); }}
            onAddReview={() => {
              setAddData({
                place: {
                  name: selected.name,
                  lat: selected.lat,
                  lng: selected.lng,
                  category: selected.category,
                },
                kakao_place_id: selected.kakao_place_id,
                gender: selected.gender,
                stalls: selected.stalls || "",
                access: selected.access || "",
                location: selected.location,
                clean: "",
                final: "",
                extras: [],
              });
              setAddStep(2);
              setView("add");
              setSelected(null);
              setSheetState("collapsed");
            }}
          />
        )}

        {/* 하단 미니 카드 */}
        {!selected && (
          <div style={s.miniList}>
            <div style={s.miniListTitle}>👩 내 주변 화장실 {filteredSpots.length}곳</div>
            <div style={s.miniListScroll}>
              {filteredSpots.slice(0, 5).map(spot => {
                const cfg = RATING_CONFIG[spot.rating];
                const reviews = typeof spot.reviews === 'string' ? parseInt(spot.reviews) : (spot.reviews || 0);
                const hasEnough = reviews >= MIN_REVIEWS_FOR_RATING;
                return (
                  <button key={spot.id} style={s.miniCard} onClick={() => selectSpot(spot)}>
                    {hasEnough ? (
                      <div style={{ ...s.miniCardBadge, background: cfg.bg, color: cfg.color }}>
                        {cfg.emoji} {cfg.short}
                      </div>
                    ) : (
                      <div style={s.miniCardBadgePending}>👩 {reviews}명</div>
                    )}
                    <div style={s.miniCardName}>{spot.name}</div>
                    <div style={s.miniCardCat}>{spot.category}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SPLASH
// ─────────────────────────────────────────────

function Splash() {
  return (
    <div style={s.splash}>
      <div style={s.splashIcon}>🚻</div>
      <div style={s.splashTitle}>언니맵</div>
      <div style={s.splashSub}>언니가 언니를 위해<br/>화장실 정보를 나눠요</div>
      <div style={s.splashDots}>
        <span style={{ ...s.dot, animationDelay: "0s" }} />
        <span style={{ ...s.dot, animationDelay: "0.2s" }} />
        <span style={{ ...s.dot, animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOCATION MODAL
// ─────────────────────────────────────────────

function LocationModal({ onGrant, onDeny }) {
  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
        <div style={s.modalTitle}>언니 어디야?</div>
        <div style={s.modalSub}>
          내 주변 깨끗한 화장실을<br/>
          빠르게 찾으려면 위치가 필요해요!
        </div>
        <button style={s.modalPrimary} onClick={onGrant}>
          📍 위치 알려주기
        </button>
        <button style={s.modalSecondary} onClick={onDeny}>
          나중에 (홍대로 시작)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// INSTALL BANNER
// ─────────────────────────────────────────────

function InstallBanner({ onClose, onInstall }) {
  return (
    <div style={s.installBanner} onClick={onInstall}>
      <div style={s.installEmoji}>📲</div>
      <div style={s.installText}>
        <div style={s.installTitle}>홈 화면에 추가하기</div>
        <div style={s.installSub}>탭하면 앱으로 설치돼요</div>
      </div>
      <button style={s.installClose} onClick={e => { e.stopPropagation(); onClose(); }}>✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTTOM SHEET (DETAIL)
// ─────────────────────────────────────────────

function BottomSheet({ spot, sheetState, setSheetState, onClose, onAddReview }) {
  const cfg = RATING_CONFIG[spot.rating];
  const reviews = typeof spot.reviews === 'string' ? parseInt(spot.reviews) : (spot.reviews || 0);
  const hasEnough = reviews >= MIN_REVIEWS_FOR_RATING;
  const g = genderDisplay(spot.gender, spot.stalls);
  const loc = LOCATION_LABELS[spot.location];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const heightMap = { collapsed: "0", half: "55vh", full: "calc(100% - 8px)" };
  const isFull = sheetState === "full";

  return (
    <div style={{ ...s.bottomSheet, height: heightMap[sheetState] }}>
      {/* 핸들바 */}
      <div
        style={s.sheetHandle}
        onClick={() => setSheetState(isFull ? "half" : "full")}
      >
        <div style={s.handleBar} />
      </div>

      {/* 점 3개 메뉴 */}
      <div style={s.menuWrap} ref={menuRef}>
        <button style={s.menuBtn} onClick={() => setMenuOpen(!menuOpen)}>⋯</button>
        {menuOpen && (
          <div style={s.menuDropdown}>
            <button style={s.menuItem} onClick={() => { alert("신고 접수: 운영팀이 확인 후 처리해요."); setMenuOpen(false); }}>
              🚩 정보 잘못됐어요
            </button>
            <button style={s.menuItem} onClick={() => { alert("점주 신고: 운영팀이 확인 후 처리해요."); setMenuOpen(false); }}>
              🏪 점주예요 / 삭제 요청
            </button>
          </div>
        )}
      </div>

      {/* 닫기 */}
      <button style={s.closeBtn} onClick={onClose}>✕</button>

      {/* 내용 */}
      <div style={s.sheetContent}>
        {/* 헤로 */}
        <div style={{ ...s.sheetHero, background: hasEnough ? `linear-gradient(135deg, ${cfg.color}18, ${cfg.bg})` : "#F8F8F8" }}>
          <div style={s.sheetEmoji}>{hasEnough ? cfg.emoji : "❓"}</div>
          {hasEnough ? (
            <div style={{ ...s.sheetRating, background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </div>
          ) : (
            <div style={{ ...s.sheetRating, background: "#EEE", color: "#888" }}>
              👩 {reviews}명이 다녀감
            </div>
          )}
          <div style={s.sheetName}>{spot.name}</div>
          <div style={s.sheetCat}>{spot.category}</div>

          {/* 평가 버튼 */}
          <button
            onClick={onAddReview}
            style={{
              width: "calc(100% - 48px)",
              marginTop: 12,
              marginBottom: 12,
              padding: "10px 16px",
              border: "2px solid #FF6B9D",
              background: "transparent",
              color: "#FF6B9D",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            언니도 평가할래? 💕
          </button>
        </div>

        <div style={s.sheetBody}>
          {!hasEnough && (
            <div style={s.pendingNote}>
              💡 평가가 {MIN_REVIEWS_FOR_RATING}명 이상 모이면 종합 점수가 공개돼요
            </div>
          )}

          {/* 청결도 슬라이더 */}
          <div style={s.sectionTitle}>청결도</div>
          <CleanSlider value={spot.clean} color={hasEnough ? cfg.color : "#888"} />

          {/* 화장실 정보 - 라벨 없이 */}
          <div style={s.sectionTitle}>화장실 정보</div>
          <div style={s.infoGrid}>
            <InfoBox icon={g.icon} value={g.label} />
            <InfoBox icon={spot.access ? ACCESS_ICONS[spot.access] : "❓"} value={spot.access || "정보 없음"} />
            <InfoBox icon={loc.icon} value={loc.label} />
          </div>

          {/* 편의시설 */}
          {spot.extras && spot.extras.length > 0 && (
            <>
              <div style={s.sectionTitle}>편의 시설</div>
              <div style={s.extrasGrid}>
                {EXTRAS_CONFIG.filter(e => spot.extras.includes(e.key)).map(e => (
                  <div key={e.key} style={s.extraTag}>
                    <span style={{ fontSize: 14 }}>{e.icon}</span>
                    <span>{e.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={s.reviewCount}>👩 {reviews}명의 언니가 평가했어요</div>
        </div>
      </div>
    </div>
  );
}

function CleanSlider({ value, color }) {
  const idx = CLEAN_LEVELS.findIndex(l => l.key === value);
  const cur = CLEAN_LEVELS[idx];
  if (idx < 0) return null;

  return (
    <div style={s.cleanWrap}>
      <div style={s.cleanCaption}>{cur?.caption}</div>
      <div style={s.cleanTrack}>
        <div style={s.cleanLine} />
        {CLEAN_LEVELS.map((lvl, i) => {
          const isActive = i === idx;
          return (
            <div key={lvl.key} style={s.cleanStop}>
              <div style={{
                ...s.cleanDot,
                ...(isActive ? { background: color, borderColor: color, transform: "scale(1.25)" } : {}),
              }}>
                <span style={{
                  ...s.cleanDotChar,
                  color: isActive ? "#fff" : "#CCB7C2",
                }}>{lvl.key}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoBox({ icon, value }) {
  return (
    <div style={s.infoBox}>
      <div style={s.infoIcon}>{icon}</div>
      <div style={s.infoValue}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KAKAO MAP
// ─────────────────────────────────────────────

function KakaoMap({ spots, userLocation, selected, onSelectSpot, onMapClick, controlRef }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // 지도 초기화 (한 번만 실행)
  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = () => {
      window.kakao.maps.load(() => {
        try {
          const center = new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
          mapRef.current = new window.kakao.maps.Map(containerRef.current, {
            center,
            level: 4,
          });
          window.kakao.maps.event.addListener(mapRef.current, 'click', (e) => {
            if (onMapClick) onMapClick({ lat: e.latLng.getLat(), lng: e.latLng.getLng() });
          });
          setMapReady(true);
        } catch (e) {
          setMapError('지도 초기화 실패: ' + e.message);
        }
      });
    };

    if (window.kakao?.maps?.load) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=489bd3b776dd000de4ced50483b81295&autoload=false&libraries=services';
    script.onload = initMap;
    script.onerror = () => setMapError('카카오맵 SDK를 불러오지 못했어요.\n잠시 후 새로고침 해주세요.');
    document.head.appendChild(script);
  }, []);

  // controlRef로 pan 메서드 노출
  useEffect(() => {
    if (!mapReady || !mapRef.current || !controlRef) return;
    controlRef.current = {
      panTo: (lat, lng) => mapRef.current?.panTo(new window.kakao.maps.LatLng(lat, lng)),
    };
  }, [mapReady, controlRef]);

  // selected 변경 시 지도 center로 이동
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selected) return;
    mapRef.current.panTo(new window.kakao.maps.LatLng(selected.lat, selected.lng));
  }, [mapReady, selected]);

  // 내 위치 마커 업데이트
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const pos = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    if (userLocation.lat !== DEFAULT_CENTER.lat || userLocation.lng !== DEFAULT_CENTER.lng) {
      mapRef.current.panTo(pos);
    }
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    const el = document.createElement('div');
    el.style.cssText = 'width:14px;height:14px;background:#3742FA;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(55,66,250,0.4);transform:translate(-50%,-50%)';
    userMarkerRef.current = new window.kakao.maps.CustomOverlay({ position: pos, content: el, zIndex: 5 });
    userMarkerRef.current.setMap(mapRef.current);
  }, [mapReady, userLocation]);

  // 화장실 핀 업데이트
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];

    spots.forEach(spot => {
      if (!spot.lat || !spot.lng || !spot.rating) return;
      const cfg = RATING_CONFIG[spot.rating];
      if (!cfg) return;
      const reviews = typeof spot.reviews === 'string' ? parseInt(spot.reviews) : (spot.reviews || 0);
      const hasEnough = reviews >= MIN_REVIEWS_FOR_RATING;
      if (spot.name === '오뜨하우스') {
        console.log(`[DEBUG] ${spot.name}: reviews=${spot.reviews} (타입:${typeof spot.reviews}), 변환후=${reviews}, hasEnough=${hasEnough}, MIN=${MIN_REVIEWS_FOR_RATING}`);
      }
      const pinColor = hasEnough ? cfg.pinBg : '#CCCCCC';
      const pinEmoji = hasEnough ? cfg.emoji : '❓';
      const isSelected = selected?.id === spot.id;
      const size = isSelected ? 48 : 38;

      const el = document.createElement('div');
      el.style.cssText = [
        `width:${size}px`, `height:${size}px`,
        `background:${pinColor}`,
        'border-radius:50%', 'border:3px solid #fff',
        `font-size:${isSelected ? 20 : 16}px`,
        'display:flex', 'align-items:center', 'justify-content:center',
        'cursor:pointer',
        `box-shadow:${isSelected ? `0 0 0 4px ${pinColor}44,0 4px 16px rgba(0,0,0,0.2)` : '0 3px 10px rgba(0,0,0,0.15)'}`,
        'transform:translate(-50%,-50%)',
        'transition:all 0.2s',
      ].join(';');
      el.textContent = pinEmoji;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectSpot(spot);
      });

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(spot.lat, spot.lng),
        content: el,
        zIndex: isSelected ? 10 : 1,
      });
      overlay.setMap(mapRef.current);
      overlaysRef.current.push(overlay);
    });
  }, [mapReady, spots, selected]);

  if (mapError) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFF5F8', gap: 10, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 36 }}>🗺️</div>
        <div style={{ fontSize: 13, color: '#FF6B9D', fontWeight: 700, whiteSpace: 'pre-line' }}>{mapError}</div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}

// ─────────────────────────────────────────────
// ADD SCREEN
// ─────────────────────────────────────────────

function AddScreen({ step, data, setData, onNext, onBack }) {
  const isPublic = data.gender === "공용";
  const isIndoor = ["매장내부", "매장외부"].includes(data.location);
  const totalSteps = 8 - (isPublic ? 1 : 0) - (isIndoor ? 1 : 0);
  let displayStep = step;
  if (isPublic && step >= 3) displayStep -= 1;
  if (isIndoor && step >= 5) displayStep -= 1;

  const stepConfig = [
    { title: "어디 화장실이야?", sub: "장소를 검색해서 선택해줘", key: "place", isPlaceSearch: true },
    { title: "언니! 여기 화장실은?", sub: "", options: [
      { value: "분리", label: "👨👩 남녀 분리", desc: "\"여자랑 남자 따로 있어\"" },
      { value: "공용", label: "🚻 남녀 공용", desc: "\"같이 써\"" },
    ], key: "gender" },
    { title: "칸은 몇 개야?", sub: "", options: [
      { value: "한칸",   label: "🚪 한 칸",    desc: "\"딱 하나뿐이야\"" },
      { value: "여러칸", label: "🚻 여러 칸",  desc: "\"여유 있어\"" },
    ], key: "stalls" },
    { title: "어디 있어?", sub: "", options: [
      { value: "매장내부", label: "🏪 매장 내부", desc: "\"매장 안에 있어\"" },
      { value: "매장외부", label: "🚪 매장 외부", desc: "\"매장 밖, 같은 건물이야\"" },
      { value: "건물외부", label: "🌳 건물 외부", desc: "\"건물 밖에 있어\"" },
    ], key: "location" },
    { title: "어떻게 들어가?", sub: "건물 외부 화장실 기준이에요", options: [
      { value: "개방",     label: "🆓 개방",     desc: "\"그냥 들어가면 돼\"" },
      { value: "비밀번호", label: "🔐 비밀번호", desc: "\"비번 알아야 해\"" },
      { value: "열쇠",     label: "🔑 열쇠",     desc: "\"열쇠 받아야 해\"" },
    ], key: "access" },
    { title: "뭐가 있었어?", sub: "있는 거 다 골라줘! 없어도 OK", key: "extras", isMulti: true },
    { title: "솔직히 어땠어?", sub: "", options: CLEAN_LEVELS.map(l => ({ value: l.key, label: l.key, desc: l.caption })), key: "clean", isCleanSlider: true },
    { title: "그래서 언니, 한 마디로?", sub: "", options: [
      { value: "best", label: "💕 언니 여기로 와!",    desc: "\"강추! 무조건 여기\"" },
      { value: "good", label: "👌 언니 써도 돼",       desc: "\"믿고 써도 OK\"" },
      { value: "mid",  label: "🥲 언니 급하면...",     desc: "\"급할 때만\"" },
      { value: "bad",  label: "🫠 전 가게 들렸지?",   desc: "\"여기는 패스...\"" },
    ], key: "final" },
  ];

  const cur = stepConfig[step];
  const progress = (displayStep + 1) / totalSteps * 100;
  const sel = cur.isMulti ? null : data[cur.key];
  const canProceed = cur.isPlaceSearch ? !!data.place : cur.isMulti ? true : !!sel;

  const toggleExtra = (key) => {
    const extras = data.extras || [];
    if (extras.includes(key)) {
      setData({ ...data, extras: extras.filter(e => e !== key) });
    } else {
      setData({ ...data, extras: [...extras, key] });
    }
  };

  return (
    <div style={s.addScreen}>
      <div style={s.addHeader}>
        <button style={s.addBackBtn} onClick={onBack}>← 뒤로</button>
        <span style={s.addStepText}>{displayStep + 1} / {totalSteps}</span>
      </div>
      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      <div style={s.addBody}>
        <div style={s.addTitle}>{cur.title}</div>
        {cur.sub && <div style={s.addSub}>{cur.sub}</div>}

        {cur.isPlaceSearch && (
          <PlaceSearch
            selected={data.place}
            onSelect={(place) => setData({ ...data, place })}
          />
        )}

        {cur.isCleanSlider && (
          <CleanSliderPicker
            value={data.clean}
            onChange={(v) => setData({ ...data, clean: v })}
          />
        )}

        {cur.isMulti && (
          <div style={s.extrasList}>
            {EXTRAS_CONFIG.map(e => {
              const isSelected = (data.extras || []).includes(e.key);
              return (
                <button
                  key={e.key}
                  style={{ ...s.extraBtn, ...(isSelected ? s.extraBtnActive : {}) }}
                  onClick={() => toggleExtra(e.key)}
                >
                  <span style={{ fontSize: 18 }}>{e.icon}</span>
                  <span style={s.extraLabel}>{e.label}</span>
                  {isSelected && <span style={s.checkIcon}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {!cur.isMulti && !cur.isCleanSlider && !cur.isPlaceSearch && (
          <div style={s.optList}>
            {cur.options.map(opt => (
              <button
                key={opt.value}
                style={{ ...s.optBtn, ...(sel === opt.value ? s.optBtnActive : {}) }}
                onClick={() => setData({ ...data, [cur.key]: opt.value })}
              >
                <span style={s.optLabel}>{opt.label}</span>
                <span style={s.optDesc}>{opt.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={s.addFooter}>
        <button
          style={{ ...s.nextBtn, opacity: canProceed ? 1 : 0.35 }}
          disabled={!canProceed}
          onClick={onNext}
        >
          {displayStep + 1 < totalSteps ? "다음 →" : "✅ 정보 올리기"}
        </button>
      </div>
    </div>
  );
}

function CleanSliderPicker({ value, onChange }) {
  const idx = CLEAN_LEVELS.findIndex(l => l.key === value);
  const cur = CLEAN_LEVELS[idx];

  return (
    <div style={s.cleanPicker}>
      <div style={s.cleanPickerCaption}>
        {cur ? cur.caption : "어디쯤이야?"}
      </div>
      <div style={s.cleanPickerTrack}>
        <div style={s.cleanPickerLine} />
        {CLEAN_LEVELS.map((lvl, i) => {
          const isActive = i === idx;
          return (
            <button
              key={lvl.key}
              style={{
                ...s.cleanPickerDot,
                ...(isActive ? s.cleanPickerDotActive : {}),
              }}
              onClick={() => onChange(lvl.key)}
            >
              <span style={isActive ? s.cleanPickerCharActive : s.cleanPickerChar}>
                {lvl.key}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PLACE SEARCH
// ─────────────────────────────────────────────

function PlaceSearch({ selected, onSelect }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('idle'); // idle | searching | done | error

  const search = () => {
    const q = keyword.trim();
    if (!q) return;
    if (!window.kakao?.maps?.services?.Places) {
      setSearchStatus('error');
      return;
    }
    setSearchStatus('searching');
    try {
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(q, (data, stat) => {
        if (stat === window.kakao.maps.services.Status.OK) {
          setResults(data.slice(0, 10));
        } else {
          setResults([]);
        }
        setSearchStatus('done');
      }, { size: 10, sort: window.kakao.maps.services.SortBy.ACCURACY });
    } catch (e) {
      setSearchStatus('error');
    }
  };

  if (selected) {
    return (
      <div style={s.placeSelected}>
        <div style={{ fontSize: 28 }}>✅</div>
        <div style={s.placeSelectedInfo}>
          <div style={s.placeSelectedName}>{selected.name}</div>
          <div style={s.placeSelectedAddr}>{selected.address}</div>
        </div>
        <button style={s.placeResetBtn} onClick={() => { onSelect(null); setResults([]); setSearchStatus('idle'); }}>
          변경
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={s.placeSearchBar}>
        <input
          style={s.placeInput}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="예: 스타벅스 홍대점, 올리브영..."
          autoFocus
        />
        <button style={s.placeSearchBtn} onClick={search}>검색</button>
      </div>

      {searchStatus === 'searching' && <div style={s.placeMsg}>🔍 검색 중...</div>}
      {searchStatus === 'done' && results.length === 0 && <div style={s.placeMsg}>검색 결과가 없어요 😢<br/>다른 이름으로 검색해봐요!</div>}
      {searchStatus === 'error' && <div style={s.placeMsg}>지도가 아직 로딩 중이에요.<br/>잠깐 후 다시 시도해봐요!</div>}

      {results.length > 0 && (
        <div style={s.placeResults}>
          {results.map(r => (
            <button
              key={r.id}
              style={s.placeResultItem}
              onClick={() => onSelect({
                name: r.place_name,
                lat: parseFloat(r.y),
                lng: parseFloat(r.x),
                address: r.road_address_name || r.address_name,
                category: r.category_group_name || '기타',
              })}
            >
              <div style={s.placeResultName}>{r.place_name}</div>
              <div style={s.placeResultAddr}>{r.road_address_name || r.address_name}</div>
              {r.category_group_name && (
                <span style={s.placeResultCat}>{r.category_group_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DONE SCREEN
// ─────────────────────────────────────────────

function DoneScreen({ onBack }) {
  return (
    <div style={s.doneScreen}>
      <div style={s.doneEmoji}>💕</div>
      <div style={s.doneTitle}>정보 공유 완료!</div>
      <div style={s.doneSub}>
        언니 덕분에 다른 언니들이<br />
        더 쾌적하게 다닐 수 있어요 🙏
      </div>
      <button style={s.doneBtn} onClick={onBack}>
        지도로 돌아가기
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const s = {
  app: {
    fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
    maxWidth: 480,
    margin: "0 auto",
    minHeight: "100vh",
    height: "100vh",
    background: "#FAFAFA",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  // SPLASH
  splash: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #FF6B9D 0%, #FF8FB3 50%, #FFB3CC 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    padding: 32,
  },
  splashIcon: { fontSize: 72, marginBottom: 12 },
  splashTitle: { fontSize: 42, fontWeight: 900, letterSpacing: "-2px", marginBottom: 8 },
  splashSub: { fontSize: 16, opacity: 0.9, lineHeight: 1.6, marginBottom: 32, textAlign: "center" },
  splashDots: { display: "flex", gap: 8 },
  dot: {
    width: 8, height: 8,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.7)",
  },

  // LOCATION MODAL
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "#fff",
    borderRadius: 24,
    padding: "32px 24px 20px",
    textAlign: "center",
    maxWidth: 360,
    width: "100%",
  },
  modalTitle: { fontSize: 22, fontWeight: 900, color: "#FF6B9D", marginBottom: 8 },
  modalSub: { fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 24 },
  modalPrimary: {
    width: "100%",
    background: "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "14px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: 8,
  },
  modalSecondary: {
    width: "100%",
    background: "transparent",
    color: "#999",
    border: "none",
    padding: "8px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  // INSTALL BANNER
  installBanner: {
    position: "fixed",
    bottom: 90,
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 32px)",
    maxWidth: 420,
    background: "linear-gradient(135deg, #FF6B9D, #FFB3CC)",
    color: "#fff",
    borderRadius: 16,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 4px 20px rgba(255,107,157,0.4)",
    zIndex: 500,
    cursor: "pointer",
  },
  installEmoji: { fontSize: 24 },
  installText: { flex: 1 },
  installTitle: { fontSize: 13, fontWeight: 800 },
  installSub: { fontSize: 11, opacity: 0.9 },
  installClose: {
    background: "rgba(255,255,255,0.3)",
    border: "none",
    borderRadius: "50%",
    width: 22, height: 22,
    color: "#fff",
    fontSize: 11,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  // TOP BAR
  topBar: {
    background: "#fff",
    padding: "12px 16px 8px",
    borderBottom: "1px solid #FFE0EC",
    flexShrink: 0,
    zIndex: 100,
  },
  logo: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  logoText: { fontSize: 18, fontWeight: 900, color: "#FF6B9D", letterSpacing: "-0.5px" },
  searchWrap: {
    background: "#FFF5F8",
    border: "1.5px solid #FFE0EC",
    borderRadius: 20,
    padding: "8px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    flex: 1,
    color: "#333",
  },

  // FILTER
  filterRow: {
    display: "flex",
    gap: 6,
    padding: "10px 16px",
    overflowX: "auto",
    background: "#fff",
    flexShrink: 0,
    zIndex: 100,
  },
  chip: {
    border: "1.5px solid #FFE0EC",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    background: "#fff",
    color: "#999",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  chipActive: { background: "#FF6B9D", borderColor: "#FF6B9D", color: "#fff" },

  // MAP
  mapArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  mapBg: {
    width: "100%",
    height: "100%",
    background: "#F0EBF4",
    backgroundImage: `
      linear-gradient(rgba(255,224,236,0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,224,236,0.3) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    position: "relative",
  },
  road: { position: "absolute", background: "#fff", opacity: 0.7 },
  mapLabel: {
    position: "absolute",
    top: "32%", left: "35%",
    fontSize: 13, fontWeight: 700, color: "#ccc",
    letterSpacing: 1, pointerEvents: "none",
  },
  pin: {
    position: "absolute",
    width: 38, height: 38,
    borderRadius: "50%",
    border: "3px solid #fff",
    fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  myDot: {
    position: "absolute",
    bottom: 16,
    right: 80,
    zIndex: 100,
    background: "#3742FA",
    color: "#fff",
    borderRadius: "50%",
    width: 36, height: 36,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14,
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  fab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 100,
    background: "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
    color: "#fff",
    border: "none",
    borderRadius: 28,
    padding: "12px 18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    boxShadow: "0 4px 14px rgba(255,107,157,0.4)",
  },

  // MINI LIST (지도 하단)
  miniList: {
    background: "#fff",
    borderTop: "1px solid #FFE0EC",
    padding: "10px 0 14px",
    flexShrink: 0,
    boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
  },
  miniListTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#FF6B9D",
    padding: "0 16px 8px",
  },
  miniListScroll: {
    display: "flex",
    gap: 8,
    padding: "0 16px",
    overflowX: "auto",
  },
  miniCard: {
    background: "#fff",
    border: "1.5px solid #FFE0EC",
    borderRadius: 12,
    padding: "10px 12px",
    minWidth: 150,
    cursor: "pointer",
    textAlign: "left",
    flexShrink: 0,
  },
  miniCardBadge: {
    display: "inline-block",
    borderRadius: 6,
    padding: "2px 6px",
    fontSize: 10,
    fontWeight: 800,
    marginBottom: 4,
  },
  miniCardBadgePending: {
    display: "inline-block",
    borderRadius: 6,
    padding: "2px 6px",
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
    background: "#EEE",
    color: "#888",
  },
  miniCardName: { fontSize: 12, fontWeight: 700, color: "#222", marginBottom: 1 },
  miniCardCat: { fontSize: 10, color: "#aaa" },

  // BOTTOM SHEET
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
    transition: "height 0.3s ease",
    zIndex: 200,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  sheetHandle: {
    padding: "10px 0 6px",
    display: "flex",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  handleBar: {
    width: 40,
    height: 4,
    background: "#FFE0EC",
    borderRadius: 2,
  },
  menuWrap: { position: "absolute", top: 14, left: 14, zIndex: 11 },
  menuBtn: {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #FFE0EC",
    borderRadius: "50%",
    width: 28, height: 28,
    fontSize: 18, fontWeight: 900,
    cursor: "pointer", color: "#999",
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0,
  },
  menuDropdown: {
    position: "absolute",
    top: 32, left: 0,
    background: "#fff",
    border: "1px solid #FFE0EC",
    borderRadius: 10,
    padding: 4,
    minWidth: 180,
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    display: "flex", flexDirection: "column",
  },
  menuItem: {
    background: "none", border: "none",
    padding: "8px 12px",
    fontSize: 12, color: "#666",
    textAlign: "left", cursor: "pointer",
    borderRadius: 6, fontWeight: 600,
  },
  closeBtn: {
    position: "absolute",
    top: 14, right: 14,
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #FFE0EC",
    borderRadius: "50%",
    width: 28, height: 28,
    fontSize: 12, cursor: "pointer", color: "#999",
    zIndex: 301,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sheetContent: {
    flex: 1,
    overflowY: "auto",
  },
  sheetHero: {
    padding: "12px 24px 18px",
    textAlign: "center",
  },
  sheetEmoji: { fontSize: 40, marginBottom: 8 },
  sheetRating: {
    display: "inline-block",
    borderRadius: 20,
    padding: "5px 14px",
    fontSize: 13, fontWeight: 800,
    marginBottom: 10,
  },
  sheetName: { fontSize: 19, fontWeight: 900, color: "#222", letterSpacing: "-0.5px", marginBottom: 4 },
  sheetCat: { fontSize: 12, color: "#aaa" },
  sheetBody: { padding: "12px 16px 30px" },
  pendingNote: {
    background: "#FFF8E1",
    border: "1px solid #FFE082",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 11, color: "#9A7B00", fontWeight: 600,
    marginBottom: 14, textAlign: "center",
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 800, color: "#FF6B9D",
    letterSpacing: 1, marginBottom: 10, marginTop: 14,
    textTransform: "uppercase",
  },

  // 청결도 슬라이더
  cleanWrap: {
    background: "#FFF5F8",
    border: "1.5px solid #FFE0EC",
    borderRadius: 14,
    padding: "16px 14px",
  },
  cleanCaption: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: 800,
    color: "#FF6B9D",
    marginBottom: 14,
  },
  cleanTrack: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 4px",
  },
  cleanLine: {
    position: "absolute",
    left: 16, right: 16,
    top: "50%",
    height: 2,
    background: "#FFE0EC",
    transform: "translateY(-50%)",
    zIndex: 0,
  },
  cleanStop: {
    position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  cleanDot: {
    width: 32, height: 32,
    borderRadius: "50%",
    background: "#fff",
    border: "2px solid #FFE0EC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  cleanDotChar: {
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
  },

  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 },
  infoBox: {
    border: "1.5px solid #FFE0EC",
    borderRadius: 12,
    padding: "10px 6px",
    textAlign: "center",
    background: "#fff",
  },
  infoIcon: { fontSize: 18, marginBottom: 4 },
  infoValue: { fontSize: 11, fontWeight: 700, color: "#333" },
  extrasGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  extraTag: {
    background: "#FFF0F5",
    color: "#FF6B9D",
    borderRadius: 10,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  reviewCount: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 12, color: "#ccc", fontWeight: 600,
  },

  // ADD SCREEN
  addScreen: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    overflow: "hidden",
  },
  addHeader: {
    padding: "14px 16px 8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  addBackBtn: {
    background: "none", border: "none",
    color: "#FF6B9D",
    fontSize: 14, fontWeight: 700,
    cursor: "pointer", padding: 0,
  },
  addStepText: { fontSize: 12, color: "#FFB3CC", fontWeight: 700 },
  progressBar: {
    height: 3,
    background: "#FFE0EC",
    margin: "0 16px 20px",
    borderRadius: 4,
    overflow: "hidden",
    flexShrink: 0,
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #FF6B9D, #FFB3CC)",
    transition: "width 0.3s",
  },
  addBody: {
    flex: 1,
    overflowY: "auto",
    padding: "0 20px",
  },
  addTitle: { fontSize: 24, fontWeight: 900, color: "#222", letterSpacing: "-0.5px", marginBottom: 16 },
  addSub: { fontSize: 14, color: "#aaa", marginTop: -12, marginBottom: 20 },

  optList: { display: "flex", flexDirection: "column", gap: 10, paddingBottom: 20 },
  optBtn: {
    border: "2px solid #FFE0EC",
    borderRadius: 14,
    padding: "16px 18px",
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    transition: "all 0.15s",
  },
  optBtnActive: { border: "2px solid #FF6B9D", background: "#FFF0F5" },
  optLabel: { fontSize: 16, fontWeight: 800, color: "#222" },
  optDesc: { fontSize: 12, color: "#aaa" },

  cleanPicker: {
    background: "#FFF5F8",
    border: "2px solid #FFE0EC",
    borderRadius: 16,
    padding: "30px 16px 36px",
  },
  cleanPickerCaption: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 900,
    color: "#FF6B9D",
    marginBottom: 26,
    minHeight: 24,
  },
  cleanPickerTrack: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 4px",
  },
  cleanPickerLine: {
    position: "absolute",
    left: 20, right: 20, top: "50%",
    height: 3, background: "#FFE0EC",
    transform: "translateY(-50%)",
    zIndex: 0,
  },
  cleanPickerDot: {
    position: "relative", zIndex: 1,
    width: 40, height: 40,
    borderRadius: "50%",
    background: "#fff",
    border: "2px solid #FFE0EC",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  cleanPickerDotActive: {
    width: 48, height: 48,
    background: "#FF6B9D",
    border: "3px solid #fff",
    boxShadow: "0 0 0 3px #FF6B9D, 0 4px 12px rgba(255,107,157,0.3)",
  },
  cleanPickerChar: { fontSize: 14, fontWeight: 800, color: "#999" },
  cleanPickerCharActive: { fontSize: 18, fontWeight: 900, color: "#fff" },

  extrasList: { display: "flex", flexDirection: "column", gap: 8, paddingBottom: 20 },
  extraBtn: {
    border: "1.5px solid #FFE0EC",
    borderRadius: 12,
    padding: "14px 16px",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    transition: "all 0.15s",
  },
  extraBtnActive: { border: "1.5px solid #FF6B9D", background: "#FFF0F5" },
  extraLabel: { fontSize: 14, fontWeight: 600, color: "#444", flex: 1, textAlign: "left" },
  checkIcon: { color: "#FF6B9D", fontWeight: 900, fontSize: 18 },

  addFooter: {
    padding: "12px 20px 20px",
    borderTop: "1px solid #FFF0F5",
    background: "#fff",
    flexShrink: 0,
  },
  nextBtn: {
    background: "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "16px",
    fontSize: 16, fontWeight: 800,
    cursor: "pointer",
    width: "100%",
  },

  // NO INFO CARD
  noInfoCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    padding: '20px 20px 36px',
    zIndex: 200, textAlign: 'center',
  },
  noInfoClose: {
    position: 'absolute', top: 12, right: 14,
    background: 'rgba(255,255,255,0.9)', border: '1px solid #FFE0EC',
    borderRadius: '50%', width: 28, height: 28,
    fontSize: 12, cursor: 'pointer', color: '#999',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  noInfoTitle: { fontSize: 16, fontWeight: 800, color: '#333', marginBottom: 6 },
  noInfoSub: { fontSize: 13, color: '#aaa', marginBottom: 18 },
  noInfoBtn: {
    background: 'linear-gradient(135deg, #FF6B9D, #FF8FB3)',
    color: '#fff', border: 'none', borderRadius: 14,
    padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },

  // MASTER
  masterBadge: { fontSize: 13, marginLeft: 3, cursor: 'pointer' },
  masterOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  },
  masterModal: {
    background: '#fff', borderRadius: 20, padding: '24px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 180,
  },
  masterInput: {
    width: '100%', border: '2px solid #FFE0EC', borderRadius: 12,
    padding: '10px 0', fontSize: 22, textAlign: 'center',
    outline: 'none', letterSpacing: 8,
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  masterBtn: {
    background: 'linear-gradient(135deg, #FF6B9D, #FF8FB3)', color: '#fff',
    border: 'none', borderRadius: 12, padding: '10px 0',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
  },

  // TOP SEARCH DROPDOWN
  searchClearBtn: {
    background: 'none', border: 'none', color: '#ccc',
    fontSize: 14, cursor: 'pointer', padding: '0 2px', flexShrink: 0,
  },
  searchGoBtn: {
    background: 'none', border: 'none', color: '#FF6B9D',
    fontSize: 16, cursor: 'pointer', padding: '0 2px', flexShrink: 0,
  },
  searchDrop: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    background: '#fff', border: '1px solid #FFE0EC', borderTop: 'none',
    borderRadius: '0 0 16px 16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 301,
    maxHeight: 260, overflowY: 'auto',
  },
  searchDropItem: {
    width: '100%', background: 'none', border: 'none',
    borderBottom: '1px solid #FFF5F8',
    padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
  },
  searchDropName: { fontSize: 14, fontWeight: 700, color: '#222', marginBottom: 2 },
  searchDropAddr: { fontSize: 12, color: '#aaa' },

  // PLACE SEARCH
  placeSearchBar: { display: 'flex', gap: 8, marginBottom: 12 },
  placeInput: {
    flex: 1, border: '2px solid #FFE0EC', borderRadius: 12,
    padding: '12px 14px', fontSize: 14, outline: 'none',
    fontFamily: "'Noto Sans KR', sans-serif", color: '#333',
  },
  placeSearchBtn: {
    background: 'linear-gradient(135deg, #FF6B9D, #FF8FB3)',
    color: '#fff', border: 'none', borderRadius: 12,
    padding: '12px 16px', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  placeMsg: {
    textAlign: 'center', color: '#bbb', fontSize: 13,
    padding: '24px 0', lineHeight: 1.7,
  },
  placeResults: { display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20 },
  placeResultItem: {
    border: '2px solid #FFE0EC', borderRadius: 14, padding: '14px 16px',
    background: '#fff', textAlign: 'left', cursor: 'pointer', width: '100%',
  },
  placeResultName: { fontSize: 15, fontWeight: 800, color: '#222', marginBottom: 3 },
  placeResultAddr: { fontSize: 12, color: '#999', marginBottom: 4 },
  placeResultCat: {
    fontSize: 11, color: '#FF6B9D', background: '#FFF0F5',
    borderRadius: 6, padding: '2px 7px', fontWeight: 700,
  },
  placeSelected: {
    border: '2px solid #FF6B9D', borderRadius: 14, padding: '16px',
    background: '#FFF0F5', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
  },
  placeSelectedInfo: { flex: 1, minWidth: 0 },
  placeSelectedName: { fontSize: 15, fontWeight: 800, color: '#FF6B9D', marginBottom: 3 },
  placeSelectedAddr: { fontSize: 12, color: '#FF8FB3' },
  placeResetBtn: {
    background: 'none', border: '1.5px solid #FFE0EC', borderRadius: 8,
    padding: '6px 12px', fontSize: 12, fontWeight: 700,
    color: '#FF6B9D', cursor: 'pointer', flexShrink: 0,
  },

  // DONE
  doneScreen: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    textAlign: "center",
    background: "#fff",
  },
  doneEmoji: { fontSize: 72, marginBottom: 20 },
  doneTitle: { fontSize: 28, fontWeight: 900, color: "#FF6B9D", marginBottom: 12 },
  doneSub: { fontSize: 16, color: "#999", lineHeight: 1.7, marginBottom: 40 },
  doneBtn: {
    background: "linear-gradient(135deg, #FF6B9D, #FF8FB3)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "14px 32px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
};

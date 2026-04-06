# TimeMaster (타임마스터) 개발 로그

## 🚀 구현 완료된 핵심 기능 (Finalized Features)

### 1. 코어 디자인 & 레이아웃
- **Glassmorphism UI**: 다크 테마 기반의 반투명 유리 질감 디자인 적용 (`backdrop-filter: blur(25px)`).
- **2단 분할 리사이징**: 좌측(Master Tasks) / 우측(Timebox Grid) 사이의 경계선을 드래그하여 자유로운 너비 조절 가능.
- **제로 패딩 레이아웃**: 투명 창 특유의 잔상을 없애기 위해 외곽 패딩을 제거하고 직각 레이아웃으로 최적화.

### 2. 날짜 및 일정 관리 시스템
- **Capsule Date Navigator**: 상단 날짜 표시 영역을 세련된 캡슐형 디자인으로 개선.
- **Interactive Calendar**:
  - 날짜 클릭 시 팝업 달력 노출.
  - **Data Markers (Dots)**: 계획이나 할 일이 있는 날짜에 파란색 점 표시 기능 구현.
  - **Date Sync Fix**: `toISOString()` 대신 로컬 시간 기준(`formatLocalDate`) 포맷팅을 적용하여 UTC 날짜 오차(하루 차이) 해결.
- **Go to Today**: 달력 팝업 내에 오늘로 즉시 복귀하는 기능 추가.

### 3. 기능성 컴포넌트
- **Centered Modal**: 일정 추가/수정 모달을 화면 중앙에 배치하고, `Fade-in` & `Slide-up` 애니메이션 적용.
- **Bi-directional Resizing**: 일정 블록의 상단과 하단을 모두 드래그하여 자유롭게 시간 조절 가능 (충돌 방지 로직 포함).
- **Daily Notepad**:
  - 날짜별로 별도 저장되는 자유 메모 영역 추가.
  - 메뉴에서 노출 여부 설정 가능 (`Show Notepad`).
  - 영어 Placeholder ("Write your notes here...") 적용.

### 4. 사용자 설정 및 시스템 로직
- **Accordion Menu**: `Grid Interval` 및 `Font Size` 설정을 아코디언 방식으로 개선하여 메뉴 직관성 확보.
- **Precision Opacity Slider**:
  - 30%~100% 범위를 **1% 단위**로 조절 가능한 가로 슬라이더 UI 구현.
  - 드래그 시 실시간으로 배경 투명도가 부드럽게 반영되며, 설정값이 자동 저장됨.
- **Robust LocalStorage**: 
  - 빈 배열(`[]`) 저장 시에도 즉시 동기화되도록 로직 개선.
  - **Reset All Data**: 모든 데이터를 초기화하고 공장 초기 상태로 되돌리는 기능 추가.
- **Time Indicator**: 현재 시간을 가로선과 배지로 실시간 표시 (1분 단위 갱신).
- **Auto-launch Fix**: 
  - 개발 모드에서 `electron.exe`가 부팅 시 단독 실행되어 빈 화면이 뜨는 버그 해결.
  - 개발 모드 진입 시 기존에 등록된 잘못된 자동 실행 항목을 자동으로 정리하는 로직 추가.
  - 설정 메뉴에서 개발 모드 중에도 자동 실행 해제가 가능하도록 수정.

## 🛠 시스템 설정 공식 (Current Logic)
- `dateKey`: `formatLocalDate(date)` 함수를 통한 `YYYY-MM-DD` 문자열.
- `pixelsPerMinute`: `(fontSize * 1.8) / 5`.
- `rowHeight`: `pixelsPerMinute * interval`.
- `dataStore`: `blocks-{dateKey}`, `tasks-{dateKey}`, `notepad-{dateKey}` 키로 분할 관리.

### 5. UI/UX 버그 수정 (Recent Bug Fixes)
- **Modal Z-Index Fix**: `BlockModal`이 `drag-handle`이나 `context-menu` 뒤에 가려지는 현상을 해결하기 위해 `z-index`를 `11000`으로 상향 조정.
- **Drag-and-Drop Reliability**:
  - `onDragStart` 시 리사이즈 핸들과의 간섭을 최소화하기 위해 핸들 감지 영역을 `5px`에서 `3px`로 축소하여 작은 블록도 쉽게 드래그할 수 있도록 개선.
  - `setTimeout`을 이용한 상태 업데이트 지연 처리를 통해 브라우저의 네이티브 드래그 시작 시점을 안정화.
  - 드래그 중인 블록에 `opacity: 0.6` 시각적 피드백을 추가하고, `onDrag` 시 `lastMouseY`를 갱신하여 긴 일정 드래그 시 오토 스크롤이 원활하게 작동하도록 수정.
- **Window Focus & Menu UX**:
  - **Force Focus**: 웹페이지 등 다른 창에 가려져 있을 때도 계획표(블록)나 그리드를 클릭하면 프로그램이 즉시 최상단으로 튀어나오도록 `focus-window` 로직 개선 (Windows 전용 강제 포커스 트릭 적용).
  - **Menu Auto-Close**: '최상단 모드(Widget Mode)' 등 고급 설정을 변경할 때 메뉴가 자동으로 닫히도록 수정하여 조작 편의성 증대.

### 6. 코드 아키텍처 및 확장성 (Architecture & Scalability)
- **Folder Restructuring**: `src/` 디렉토리를 논리적 단위로 재구성하여 확장성 확보.
  - `components/layout/`: 앱의 메인 레이아웃 및 헤더.
  - `components/features/`: 기능별(Timebox, Tasks, Calendar) 컴포넌트 분리.
  - `components/common/`: 범용 모달 등 재사용 가능한 컴포넌트.
  - `styles/`: 변수 및 글로벌 스타일 분리.
- **Modular CSS**: 거대한 `index.css`를 컴포넌트 및 기능별 CSS 파일로 쪼개어 유지보수성 향상 (`@import` 기반 관리).

---
*Last Updated: 2026-03-29 by Gemini CLI*

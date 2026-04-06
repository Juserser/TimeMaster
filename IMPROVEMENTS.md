# TimeMaster 차기 개발 로드맵 (Next Step Roadmap)

본 문서는 현재 구현된 정밀 인터랙션 및 위젯 모드를 기반으로, 사용자의 데이터 관리 편의성과 시각적 효율성을 극대화하기 위한 차기 개발 과제입니다.

---

### 1. 할 일 관리 고도화 (Advanced Task Management)
*   **드래그 앤 드롭 정렬 (Task Reordering)**: 
    *   `MasterTasksPanel` 내에서 할 일 목록의 순서를 사용자가 자유롭게 드래그하여 바꿀 수 있도록 구현 (`react-beautiful-dnd` 또는 네이티브 DnD 활용).
*   ** 우선순위 및 색상 지정 (Priority & Color Context Menu)**: 
    *   할 일을 우클릭하여 개별 색상을 지정할 수 있는 컨텍스트 메뉴 구현.
    *   지정된 색상은 할 일 좌측 바(Bar)에 표시되어 중요도를 직관적으로 파악 가능.

### 2. 시각적 커스텀 기능 (Visual Customization)
*   ** 타임 블록 개별 색상 지정 (Individual Block Colors)**: 
    *   타임 블록을 우클릭하여 개별 색상을 지정할 수 있는 컨텍스트 메뉴 구현.
    *   지정된 색상은 블록 배경 및 테두리에 적용되어 테마와 차별화된 강조 가능.
*   **다국어 및 로컬라이징 (Full Localization)**: 
    *   현재 영어 위주인 메뉴와 UI를 한국어/영어 선택이 가능하도록 `i18next` 기반의 다국어 시스템 도입.
    *   한국 사용자 환경에 최적화된 날짜/시간 표기법 고정.

### 3. 데이터 안전 및 외부 연동 (Data Security & Connectivity)
*   **자동 백업 시스템 (Auto-Backup)**: 
    *   앱 종료 시 또는 매일 특정 시간에 `timemaster-backup-[date].json` 형태의 백업 파일을 지정된 폴더에 자동으로 생성하는 로직 구현.
*   **외부 캘린더 동기화 (External Sync)**: 
    *   Google Calendar API를 연동하여 외부 일정을 타임박스에 불러오거나, 반대로 타임마스터의 일정을 구글 캘린더로 내보내는 기능 검토.

### 4. 사용성 미세 조정 (UX Fine-tuning)
*   ** 저사양 모드 도입 (Performance Mode)**:
    *   CPU/GPU 자원을 많이 사용하는 배경 블러, 애니메이션, 그림자 효과를 일괄 비활성화하는 기능 구현.
    *   저사양 환경에서도 안정적인 프레임 유지 지원.
*   **스마트 포커스 개선 (Smart Focus v2)**: 
    *   자동 스크롤 시 단순히 1/3 지점이 아니라, 현재 진행 중인 블록이 있다면 해당 블록이 가려지지 않도록 지능적으로 스크롤 위치 계산.
*   **단축키 시스템 (Global Hotkeys)**: 
    *   앱이 숨겨져 있을 때도 `Ctrl + Alt + T`와 같은 전역 단축키를 통해 즉시 위젯을 화면에 띄우거나 숨기는 기능.

---
*Last Updated: 2026-03-28 by Gemini CLI*
